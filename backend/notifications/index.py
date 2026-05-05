"""
Уведомления пользователя.
GET  /        — список непрочитанных + последние 20
GET  /poll    — polling: новые уведомления + новые сообщения чата с ?since=id
POST /read    — отметить как прочитанные { ids: [1,2,3] } или {} для всех
"""
import json, os
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    token = (event.get("headers") or {}).get("X-Session-Token", "")
    qp = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if not token:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS,
                "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}

    cur.execute(f"SELECT * FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS,
                "body": json.dumps({"error": "Сессия недействительна"}, ensure_ascii=False)}

    user_id = user["id"]
    clan_id = user["clan_id"]

    # POST /read — отметить прочитанными
    if method == "POST" and "/read" in path:
        body = json.loads(event.get("body") or "{}")
        ids = body.get("ids")
        if ids:
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"""
                UPDATE {SCHEMA}.notifications SET is_read = TRUE
                WHERE user_id = %s AND id IN ({placeholders})
            """, [user_id] + list(ids))
        else:
            cur.execute(f"""
                UPDATE {SCHEMA}.notifications SET is_read = TRUE WHERE user_id = %s
            """, (user_id,))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    # GET /poll — быстрый опрос: новые уведомления + сообщения чата
    if "/poll" in path:
        since_notif = int(qp.get("since_notif", 0))
        since_msg = int(qp.get("since_msg", 0))

        # Новые уведомления
        cur.execute(f"""
            SELECT id, type, title, body, link, is_read, created_at
            FROM {SCHEMA}.notifications
            WHERE user_id = %s AND id > %s
            ORDER BY created_at DESC LIMIT 10
        """, (user_id, since_notif))
        new_notifs = [dict(r) for r in cur.fetchall()]

        # Новые сообщения в чате
        new_msgs = []
        if clan_id:
            cur.execute(f"""
                SELECT m.id, m.text, m.created_at,
                       u.steam_nick AS user_nick, u.steam_id, u.role, u.steam_avatar
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON u.id = m.user_id
                WHERE m.clan_id = %s AND m.id > %s
                ORDER BY m.created_at ASC
                LIMIT 30
            """, (clan_id, since_msg))
            new_msgs = [dict(r) for r in cur.fetchall()]

        # Кол-во непрочитанных
        cur.execute(f"""
            SELECT COUNT(*) AS cnt FROM {SCHEMA}.notifications
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        unread_count = cur.fetchone()["cnt"]

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "notifications": new_notifs,
            "messages": new_msgs,
            "unread_count": unread_count,
        }, default=str, ensure_ascii=False)}

    # GET / — список уведомлений
    cur.execute(f"""
        SELECT id, type, title, body, link, is_read, created_at
        FROM {SCHEMA}.notifications
        WHERE user_id = %s
        ORDER BY created_at DESC LIMIT 20
    """, (user_id,))
    notifs = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT COUNT(*) AS cnt FROM {SCHEMA}.notifications
        WHERE user_id = %s AND is_read = FALSE
    """, (user_id,))
    unread_count = cur.fetchone()["cnt"]

    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({
        "notifications": notifs,
        "unread_count": unread_count,
    }, default=str, ensure_ascii=False)}

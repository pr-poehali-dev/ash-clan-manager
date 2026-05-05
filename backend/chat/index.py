"""
Чат клана.
GET  /        — последние 50 сообщений клана
POST /        — отправить сообщение (+ уведомление офлайн-участникам)
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
    token = (event.get("headers") or {}).get("X-Session-Token", "")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if not token:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS,
                "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}

    cur.execute(f"SELECT * FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    user = cur.fetchone()
    if not user or not user["clan_id"]:
        cur.close(); conn.close()
        return {"statusCode": 403, "headers": CORS,
                "body": json.dumps({"error": "Нет доступа к чату"}, ensure_ascii=False)}

    clan_id = user["clan_id"]

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        text = body.get("text", "").strip()
        if not text or len(text) > 2000:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Текст обязателен (макс 2000 символов)"}, ensure_ascii=False)}
        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages (clan_id, user_id, text)
            VALUES (%s, %s, %s)
            RETURNING id, text, created_at
        """, (clan_id, user["id"], text))
        msg = dict(cur.fetchone())
        msg["user_nick"] = user["steam_nick"]
        msg["role"] = user["role"]

        # Уведомление остальным участникам клана
        preview = text[:80] + ("..." if len(text) > 80 else "")
        cur.execute(f"""
            INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link)
            SELECT id, 'chat', %s, %s, 'chat'
            FROM {SCHEMA}.users
            WHERE clan_id = %s AND id != %s
        """, (f"💬 {user['steam_nick']}", preview, clan_id, user["id"]))

        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(msg, default=str, ensure_ascii=False)}

    # GET — последние 50 сообщений
    cur.execute(f"""
        SELECT m.id, m.text, m.created_at,
               u.steam_nick AS user_nick, u.steam_id, u.role, u.steam_avatar
        FROM {SCHEMA}.messages m
        JOIN {SCHEMA}.users u ON u.id = m.user_id
        WHERE m.clan_id = %s
        ORDER BY m.created_at ASC
        LIMIT 50
    """, (clan_id,))
    msgs = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS,
            "body": json.dumps(msgs, default=str, ensure_ascii=False)}

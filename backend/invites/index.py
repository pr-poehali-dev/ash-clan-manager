"""
Приглашения в клан.
GET  /search?q=ник   — поиск пользователей по steam_nick (зарегистрированных)
POST /send            — отправить приглашение { to_user_id }
GET  /my              — мои входящие приглашения
POST /accept          — принять приглашение { invite_id }
POST /decline         — отклонить приглашение { invite_id }
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

    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if not token:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}

    cur.execute(f"SELECT * FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"}, ensure_ascii=False)}

    if method == "GET" and "/search" in path:
        q = (event.get("queryStringParameters") or {}).get("q", "").strip()
        if len(q) < 2:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT id, steam_nick, steam_avatar, rank, games, clan_id
            FROM {SCHEMA}.users
            WHERE steam_nick ILIKE %s AND id != %s
            LIMIT 10
        """, (f"%{q}%", user["id"]))
        results = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(results, default=str, ensure_ascii=False)}

    if method == "GET" and "/my" in path:
        cur.execute(f"""
            SELECT i.id, i.status, i.created_at,
                   c.name AS clan_name, c.tag AS clan_tag,
                   u.steam_nick AS from_nick
            FROM {SCHEMA}.invites i
            JOIN {SCHEMA}.clans c ON c.id = i.clan_id
            JOIN {SCHEMA}.users u ON u.id = i.from_user_id
            WHERE i.to_user_id = %s AND i.status = 'pending'
            ORDER BY i.created_at DESC
        """, (user["id"],))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(rows, default=str, ensure_ascii=False)}

    if method == "POST" and "/send" in path:
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Вы не состоите в клане"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        to_id = body.get("to_user_id")
        if not to_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "to_user_id обязателен"}, ensure_ascii=False)}
        cur.execute(f"SELECT clan_id FROM {SCHEMA}.users WHERE id = %s", (to_id,))
        target = cur.fetchone()
        if not target:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Пользователь не найден"}, ensure_ascii=False)}
        if target["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Игрок уже в клане"}, ensure_ascii=False)}
        cur.execute(f"""
            INSERT INTO {SCHEMA}.invites (clan_id, from_user_id, to_user_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (clan_id, to_user_id) DO UPDATE SET status = 'pending', created_at = NOW()
            RETURNING id
        """, (user["clan_id"], user["id"], to_id))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if method == "POST" and "/accept" in path:
        body = json.loads(event.get("body") or "{}")
        invite_id = body.get("invite_id")
        cur.execute(f"""
            SELECT * FROM {SCHEMA}.invites WHERE id = %s AND to_user_id = %s AND status = 'pending'
        """, (invite_id, user["id"]))
        invite = cur.fetchone()
        if not invite:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Приглашение не найдено"}, ensure_ascii=False)}
        cur.execute(f"UPDATE {SCHEMA}.invites SET status = 'accepted' WHERE id = %s", (invite_id,))
        cur.execute(f"UPDATE {SCHEMA}.users SET clan_id = %s, role = 'member' WHERE id = %s",
                    (invite["clan_id"], user["id"]))
        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s, %s, %s, 'join')
        """, (invite["clan_id"], user["id"], f"вступил в клан"))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if method == "POST" and "/decline" in path:
        body = json.loads(event.get("body") or "{}")
        invite_id = body.get("invite_id")
        cur.execute(f"""
            UPDATE {SCHEMA}.invites SET status = 'declined'
            WHERE id = %s AND to_user_id = %s
        """, (invite_id, user["id"]))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    cur.close(); conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"}, ensure_ascii=False)}
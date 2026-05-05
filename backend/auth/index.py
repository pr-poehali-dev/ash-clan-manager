"""
Аутентификация через Steam-ник (упрощённая регистрация).
POST /register — регистрация/вход по steam_id + steam_nick
GET  /me       — получить текущего пользователя по session_token
"""
import json, os, secrets
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
    session_token = (event.get("headers") or {}).get("X-Session-Token", "")

    if method == "POST" and "/register" in path:
        body = json.loads(event.get("body") or "{}")
        steam_id = body.get("steam_id", "").strip()
        steam_nick = body.get("steam_nick", "").strip()
        steam_avatar = body.get("steam_avatar", "")
        if not steam_id or not steam_nick:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "steam_id и steam_nick обязательны"}, ensure_ascii=False)}

        token = secrets.token_hex(32)
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f"""
            INSERT INTO {SCHEMA}.users (steam_id, steam_nick, steam_avatar, session_token)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (steam_id) DO UPDATE
              SET steam_nick = EXCLUDED.steam_nick,
                  steam_avatar = EXCLUDED.steam_avatar,
                  session_token = EXCLUDED.session_token,
                  last_seen_at = NOW()
            RETURNING id, steam_id, steam_nick, steam_avatar, clan_id, role, session_token
        """, (steam_id, steam_nick, steam_avatar, token))
        user = dict(cur.fetchone())
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(user, ensure_ascii=False)}

    if method == "GET":
        if not session_token:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f"""
            SELECT u.id, u.steam_id, u.steam_nick, u.steam_avatar, u.clan_id, u.role,
                   c.name AS clan_name, c.tag AS clan_tag
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.clans c ON c.id = u.clan_id
            WHERE u.session_token = %s
        """, (session_token,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"}, ensure_ascii=False)}
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(dict(row), default=str, ensure_ascii=False)}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"}, ensure_ascii=False)}
"""
Управление кланами.
GET  /        — получить клан текущего пользователя
POST /create  — создать клан (владелец)
GET  /members — список участников клана
GET  /activity — лента активности клана
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


def get_user(cur, token):
    cur.execute(f"SELECT * FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    return cur.fetchone()


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

    user = get_user(cur, token)
    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия недействительна"}, ensure_ascii=False)}

    if method == "POST" and "/create" in path:
        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        tag = body.get("tag", "").strip()
        if not name or not tag:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "name и tag обязательны"}, ensure_ascii=False)}
        if user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Вы уже состоите в клане"}, ensure_ascii=False)}
        cur.execute(f"""
            INSERT INTO {SCHEMA}.clans (name, tag, owner_id)
            VALUES (%s, %s, %s) RETURNING *
        """, (name, tag, user["id"]))
        clan = dict(cur.fetchone())
        cur.execute(f"""
            UPDATE {SCHEMA}.users SET clan_id = %s, role = 'owner' WHERE id = %s
        """, (clan["id"], user["id"]))
        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s, %s, %s, 'join')
        """, (clan["id"], user["id"], f"создал клан {name}"))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(clan, default=str, ensure_ascii=False)}

    if method == "GET" and "/members" in path:
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT id, steam_nick, steam_avatar, role, kda, wins, winrate, status, rank, games, steam_id
            FROM {SCHEMA}.users WHERE clan_id = %s ORDER BY
              CASE role WHEN 'owner' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, wins DESC
        """, (user["clan_id"],))
        members = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(members, default=str, ensure_ascii=False)}

    if method == "GET" and "/activity" in path:
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT a.id, a.action, a.type, a.game, a.created_at,
                   u.steam_nick AS user_nick, u.steam_id
            FROM {SCHEMA}.activity a
            LEFT JOIN {SCHEMA}.users u ON u.id = a.user_id
            WHERE a.clan_id = %s
            ORDER BY a.created_at DESC LIMIT 30
        """, (user["clan_id"],))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(rows, default=str, ensure_ascii=False)}

    # GET / — clan info
    if not user["clan_id"]:
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(None, ensure_ascii=False)}
    cur.execute(f"""
        SELECT c.*, COUNT(u.id) AS members_count
        FROM {SCHEMA}.clans c
        LEFT JOIN {SCHEMA}.users u ON u.clan_id = c.id
        WHERE c.id = %s GROUP BY c.id
    """, (user["clan_id"],))
    clan = cur.fetchone()
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(dict(clan) if clan else None, default=str, ensure_ascii=False)}
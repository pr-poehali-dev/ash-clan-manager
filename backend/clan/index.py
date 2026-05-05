"""
Управление кланами + события.
GET  /           — клан текущего пользователя
POST /create     — создать клан
GET  /members    — участники
GET  /activity   — лента активности
GET  /events     — список событий
POST /events     — создать событие (owner/officer)
POST /events/join  — записаться { event_id }
POST /events/leave — отписаться { event_id }
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

    # ─── Events ───────────────────────────────────────────────────────────────

    if "/events/join" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        event_id = body.get("event_id")
        cur.execute(f"""
            INSERT INTO {SCHEMA}.event_participants (event_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (event_id, user["id"]))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if "/events/leave" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        event_id = body.get("event_id")
        cur.execute(f"""
            DELETE FROM {SCHEMA}.event_participants WHERE event_id = %s AND user_id = %s
        """, (event_id, user["id"]))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if "/events" in path and method == "POST":
        if user["role"] not in ("owner", "officer"):
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер или офицер может создавать события"}, ensure_ascii=False)}
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Вы не в клане"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        title = body.get("title", "").strip()
        event_date = body.get("event_date", "")
        etype = body.get("type", "Событие")
        description = body.get("description", "")
        game = body.get("game", "")
        max_p = int(body.get("max_participants", 10))
        if not title or not event_date:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "title и event_date обязательны"}, ensure_ascii=False)}
        cur.execute(f"""
            INSERT INTO {SCHEMA}.events
                (clan_id, created_by, title, type, description, game, event_date, max_participants)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (user["clan_id"], user["id"], title, etype, description, game, event_date, max_p))
        ev = dict(cur.fetchone())
        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s, %s, %s, 'event')
        """, (user["clan_id"], user["id"], f"создал событие «{title}»"))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(ev, default=str, ensure_ascii=False)}

    if "/events" in path and method == "GET":
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT e.id, e.title, e.type, e.description, e.game,
                   e.event_date, e.max_participants, e.created_at,
                   COUNT(ep.user_id) AS participants_count,
                   BOOL_OR(ep.user_id = %s) AS user_joined
            FROM {SCHEMA}.events e
            LEFT JOIN {SCHEMA}.event_participants ep ON ep.event_id = e.id
            WHERE e.clan_id = %s AND e.event_date >= NOW() - INTERVAL '1 hour'
            GROUP BY e.id
            ORDER BY e.event_date ASC
            LIMIT 20
        """, (user["id"], user["clan_id"]))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(rows, default=str, ensure_ascii=False)}

    # ─── Clan ─────────────────────────────────────────────────────────────────

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
        cur.execute(f"UPDATE {SCHEMA}.users SET clan_id = %s, role = 'owner' WHERE id = %s",
                    (clan["id"], user["id"]))
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
            FROM {SCHEMA}.users WHERE clan_id = %s
            ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, wins DESC
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
            WHERE a.clan_id = %s ORDER BY a.created_at DESC LIMIT 30
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
        FROM {SCHEMA}.clans c LEFT JOIN {SCHEMA}.users u ON u.clan_id = c.id
        WHERE c.id = %s GROUP BY c.id
    """, (user["clan_id"],))
    clan = cur.fetchone()
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS,
            "body": json.dumps(dict(clan) if clan else None, default=str, ensure_ascii=False)}

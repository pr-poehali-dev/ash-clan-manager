"""
События клана (вынесены из clan).
GET  /           — список предстоящих событий клана
POST /           — создать событие (owner/officer)
POST /join       — записаться { event_id }
POST /leave      — отписаться { event_id }
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


def notify(cur, user_id: int, clan_id: int, ntype: str, title: str, body: str, link: str):
    """Создать уведомление всем участникам клана (кроме инициатора)."""
    cur.execute(f"""
        INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link)
        SELECT id, %s, %s, %s, %s
        FROM {SCHEMA}.users
        WHERE clan_id = %s AND id != %s
    """, (ntype, title, body, link, clan_id, user_id))


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
        return {"statusCode": 401, "headers": CORS,
                "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}

    cur.execute(f"SELECT * FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    user = cur.fetchone()
    if not user or not user["clan_id"]:
        cur.close(); conn.close()
        return {"statusCode": 403, "headers": CORS,
                "body": json.dumps({"error": "Нет доступа"}, ensure_ascii=False)}

    clan_id = user["clan_id"]

    # POST /join
    if "/join" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        event_id = body.get("event_id")
        cur.execute(f"""
            SELECT title FROM {SCHEMA}.events WHERE id = %s
        """, (event_id,))
        ev_row = cur.fetchone()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.event_participants (event_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (event_id, user["id"]))
        if ev_row:
            notify(cur, user["id"], clan_id, "event_join",
                   f"{user['steam_nick']} записался на событие",
                   ev_row["title"], "calendar")
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    # POST /leave
    if "/leave" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        event_id = body.get("event_id")
        cur.execute(f"""
            DELETE FROM {SCHEMA}.event_participants WHERE event_id = %s AND user_id = %s
        """, (event_id, user["id"]))
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    # POST / — создать событие
    if method == "POST":
        if user["role"] not in ("owner", "officer"):
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер или офицер может создавать события"},
                                       ensure_ascii=False)}
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
        """, (clan_id, user["id"], title, etype, description, game, event_date, max_p))
        ev = dict(cur.fetchone())
        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s, %s, %s, 'event')
        """, (clan_id, user["id"], f"создал событие «{title}»"))
        notify(cur, user["id"], clan_id, "event_new",
               f"Новое событие: {title}",
               f"{etype} · {game or 'без игры'}", "calendar")
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(ev, default=str, ensure_ascii=False)}

    # GET / — список событий
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
    """, (user["id"], clan_id))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS,
            "body": json.dumps(rows, default=str, ensure_ascii=False)}

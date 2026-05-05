"""
Управление кланами.
GET  /            — клан текущего пользователя
POST /create      — создать клан
POST /update      — обновить профиль клана (owner/officer)
POST /emblem      — загрузить эмблему (base64, owner/officer) → CDN URL
POST /kick        — кик участника { user_id } (owner)
POST /promote     — повысить до офицера { user_id } (owner)
POST /demote      — понизить до участника { user_id } (owner)
GET  /members     — участники
GET  /activity    — лента активности
GET  /events      — список событий (legacy, теперь в /events function)
POST /events      — создать событие (legacy)
POST /events/join — записаться
POST /events/leave— отписаться
"""
import json, os, base64, uuid
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
AWS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

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


def upload_emblem(data_b64: str, clan_id: int) -> str:
    import boto3
    # Определяем формат
    if data_b64.startswith("data:"):
        header, data_b64 = data_b64.split(",", 1)
        ext = "png" if "png" in header else "jpg" if "jpg" in header or "jpeg" in header else "webp"
        content_type = f"image/{ext}"
    else:
        ext = "png"
        content_type = "image/png"

    raw = base64.b64decode(data_b64)
    if len(raw) > 5 * 1024 * 1024:
        raise ValueError("Файл слишком большой (макс 5 МБ)")

    key = f"clan-emblems/{clan_id}/{uuid.uuid4().hex}.{ext}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=AWS_KEY,
        aws_secret_access_key=AWS_SECRET,
    )
    s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
    cdn_url = f"https://cdn.poehali.dev/projects/{AWS_KEY}/bucket/{key}"
    return cdn_url


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

    user = get_user(cur, token)
    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS,
                "body": json.dumps({"error": "Сессия недействительна"}, ensure_ascii=False)}

    # ─── Events (legacy, основной обработчик в /events function) ─────────────

    if "/events/join" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        cur.execute(f"""
            INSERT INTO {SCHEMA}.event_participants (event_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (body.get("event_id"), user["id"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if "/events/leave" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        cur.execute(f"""
            DELETE FROM {SCHEMA}.event_participants WHERE event_id = %s AND user_id = %s
        """, (body.get("event_id"), user["id"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if "/events" in path and method == "POST":
        if user["role"] not in ("owner", "officer") or not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Нет доступа"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        title = body.get("title", "").strip()
        event_date = body.get("event_date", "")
        if not title or not event_date:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "title и event_date обязательны"}, ensure_ascii=False)}
        cur.execute(f"""
            INSERT INTO {SCHEMA}.events
                (clan_id, created_by, title, type, description, game, event_date, max_participants)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, (user["clan_id"], user["id"], title,
              body.get("type", "Событие"), body.get("description", ""),
              body.get("game", ""), event_date, int(body.get("max_participants", 10))))
        ev = dict(cur.fetchone())
        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s,%s,%s,'event')
        """, (user["clan_id"], user["id"], f"создал событие «{title}»"))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(ev, default=str, ensure_ascii=False)}

    if "/events" in path and method == "GET":
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT e.id, e.title, e.type, e.description, e.game,
                   e.event_date, e.max_participants, e.created_at,
                   COUNT(ep.user_id) AS participants_count,
                   BOOL_OR(ep.user_id = %s) AS user_joined
            FROM {SCHEMA}.events e
            LEFT JOIN {SCHEMA}.event_participants ep ON ep.event_id = e.id
            WHERE e.clan_id = %s AND e.event_date >= NOW() - INTERVAL '1 hour'
            GROUP BY e.id ORDER BY e.event_date ASC LIMIT 20
        """, (user["id"], user["clan_id"]))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(rows, default=str, ensure_ascii=False)}

    # ─── Emblem upload ────────────────────────────────────────────────────────

    if "/emblem" in path and method == "POST":
        if user["role"] not in ("owner", "officer") or not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер или офицер"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        data_b64 = body.get("image_base64", "")
        if not data_b64:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "image_base64 обязателен"}, ensure_ascii=False)}
        cdn_url = upload_emblem(data_b64, user["clan_id"])
        cur.execute(f"""
            UPDATE {SCHEMA}.clans SET emblem_url = %s, updated_at = NOW()
            WHERE id = %s
        """, (cdn_url, user["clan_id"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"emblem_url": cdn_url}, ensure_ascii=False)}

    # ─── Update clan profile ──────────────────────────────────────────────────

    if "/update" in path and method == "POST":
        if user["role"] not in ("owner", "officer") or not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер или офицер"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        allowed = ["name", "tag", "description", "accent_color",
                   "discipline", "region", "discord_url", "vk_url",
                   "website_url", "is_open", "min_rank"]
        updates = {k: v for k, v in body.items() if k in allowed}
        if not updates:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Нет полей для обновления"}, ensure_ascii=False)}

        # Проверка уникальности имени/тега (если меняем)
        if "name" in updates or "tag" in updates:
            cur.execute(f"""
                SELECT id FROM {SCHEMA}.clans
                WHERE (name = %s OR tag = %s) AND id != %s
            """, (updates.get("name", ""), updates.get("tag", ""), user["clan_id"]))
            if cur.fetchone():
                cur.close(); conn.close()
                return {"statusCode": 409, "headers": CORS,
                        "body": json.dumps({"error": "Клан с таким названием или тегом уже существует"},
                                           ensure_ascii=False)}

        set_parts = ", ".join([f"{k} = %s" for k in updates])
        set_parts += ", updated_at = NOW()"
        values = list(updates.values()) + [user["clan_id"]]
        cur.execute(f"""
            UPDATE {SCHEMA}.clans SET {set_parts} WHERE id = %s RETURNING *
        """, values)
        clan = dict(cur.fetchone())

        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s, %s, 'обновил профиль клана', 'info')
        """, (user["clan_id"], user["id"]))
        conn.commit()

        # Возвращаем обновлённый клан с числом участников
        cur.execute(f"""
            SELECT c.*, COUNT(u.id) AS members_count
            FROM {SCHEMA}.clans c
            LEFT JOIN {SCHEMA}.users u ON u.clan_id = c.id
            WHERE c.id = %s GROUP BY c.id
        """, (user["clan_id"],))
        clan = dict(cur.fetchone())
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(clan, default=str, ensure_ascii=False)}

    # ─── Kick / Promote / Demote ─────────────────────────────────────────────

    if "/kick" in path and method == "POST":
        if user["role"] != "owner":
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер может кикать"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        target_id = body.get("user_id")
        cur.execute(f"""
            UPDATE {SCHEMA}.users SET clan_id = NULL, role = 'member'
            WHERE id = %s AND clan_id = %s AND role != 'owner'
        """, (target_id, user["clan_id"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if "/promote" in path and method == "POST":
        if user["role"] != "owner":
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер может назначать офицеров"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        cur.execute(f"""
            UPDATE {SCHEMA}.users SET role = 'officer'
            WHERE id = %s AND clan_id = %s
        """, (body.get("user_id"), user["clan_id"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    if "/demote" in path and method == "POST":
        if user["role"] != "owner":
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS,
                    "body": json.dumps({"error": "Только лидер"}, ensure_ascii=False)}
        body = json.loads(event.get("body") or "{}")
        cur.execute(f"""
            UPDATE {SCHEMA}.users SET role = 'member'
            WHERE id = %s AND clan_id = %s
        """, (body.get("user_id"), user["clan_id"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True}, ensure_ascii=False)}

    # ─── Clan info / Members / Activity ──────────────────────────────────────

    if method == "POST" and "/create" in path:
        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        tag = body.get("tag", "").strip()
        if not name or not tag:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "name и tag обязательны"}, ensure_ascii=False)}
        if user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Вы уже состоите в клане"}, ensure_ascii=False)}
        cur.execute(f"""
            INSERT INTO {SCHEMA}.clans (name, tag, owner_id)
            VALUES (%s, %s, %s) RETURNING *
        """, (name, tag, user["id"]))
        clan = dict(cur.fetchone())
        cur.execute(f"UPDATE {SCHEMA}.users SET clan_id=%s, role='owner' WHERE id=%s",
                    (clan["id"], user["id"]))
        cur.execute(f"""
            INSERT INTO {SCHEMA}.activity (clan_id, user_id, action, type)
            VALUES (%s, %s, %s, 'join')
        """, (clan["id"], user["id"], f"создал клан {name}"))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(clan, default=str, ensure_ascii=False)}

    if method == "GET" and "/members" in path:
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT id, steam_nick, steam_avatar, role, kda, wins, winrate, status, rank, games, steam_id
            FROM {SCHEMA}.users WHERE clan_id = %s
            ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, wins DESC
        """, (user["clan_id"],))
        members = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(members, default=str, ensure_ascii=False)}

    if method == "GET" and "/activity" in path:
        if not user["clan_id"]:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps([], ensure_ascii=False)}
        cur.execute(f"""
            SELECT a.id, a.action, a.type, a.game, a.created_at,
                   u.steam_nick AS user_nick, u.steam_id
            FROM {SCHEMA}.activity a
            LEFT JOIN {SCHEMA}.users u ON u.id = a.user_id
            WHERE a.clan_id = %s ORDER BY a.created_at DESC LIMIT 30
        """, (user["clan_id"],))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(rows, default=str, ensure_ascii=False)}

    # GET / — clan info
    if not user["clan_id"]:
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(None, ensure_ascii=False)}
    cur.execute(f"""
        SELECT c.*, COUNT(u.id) AS members_count
        FROM {SCHEMA}.clans c
        LEFT JOIN {SCHEMA}.users u ON u.clan_id = c.id
        WHERE c.id = %s GROUP BY c.id
    """, (user["clan_id"],))
    clan = cur.fetchone()
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS,
            "body": json.dumps(dict(clan) if clan else None, default=str, ensure_ascii=False)}

"""
Чат клана — текст, фото, голосовые, GIF.
GET  /        — последние 50 сообщений
POST /        — отправить сообщение (text / image / voice / gif)
POST /upload  — загрузить медиафайл в S3, вернуть url
"""
import json, os, base64, mimetypes, uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VOICE = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 МБ


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def upload_to_s3(data: bytes, mime: str, folder: str) -> str:
    ext = mimetypes.guess_extension(mime) or ".bin"
    ext = ext.lstrip(".")
    key = f"chat/{folder}/{uuid.uuid4().hex}.{ext}"
    s3 = s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    project_id = os.environ["AWS_ACCESS_KEY_ID"]
    return f"https://cdn.poehali.dev/projects/{project_id}/bucket/{key}"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "")   # "upload" | ""
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

    # ── POST ?action=upload — загрузить медиафайл ───────────────────────────
    if method == "POST" and action == "upload":
        body = json.loads(event.get("body") or "{}")
        data_b64 = body.get("data", "")
        mime = body.get("mime", "")
        folder = body.get("folder", "files")  # "images" | "voice" | "gifs"

        if not data_b64 or not mime:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Нет данных"}, ensure_ascii=False)}

        allowed = ALLOWED_IMAGE | ALLOWED_VOICE
        if mime not in allowed:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": f"Недопустимый тип: {mime}"}, ensure_ascii=False)}

        # Декодируем base64 (может быть data:mime;base64,... или чистый base64)
        if "," in data_b64:
            data_b64 = data_b64.split(",", 1)[1]
        raw = base64.b64decode(data_b64)

        if len(raw) > MAX_FILE_BYTES:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Файл слишком большой (макс 10 МБ)"}, ensure_ascii=False)}

        url = upload_to_s3(raw, mime, folder)
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"url": url}, ensure_ascii=False)}

    # ── POST / — отправить сообщение ────────────────────────────────────────
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        msg_type = body.get("msg_type", "text")
        text = (body.get("text") or "").strip()
        image_url = body.get("image_url") or None
        voice_url = body.get("voice_url") or None
        gif_url = body.get("gif_url") or None
        duration = body.get("duration") or None

        # Валидация по типу
        if msg_type == "text":
            if not text or len(text) > 2000:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Текст обязателен (макс 2000 символов)"}, ensure_ascii=False)}
        elif msg_type == "image":
            if not image_url:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Нет ссылки на изображение"}, ensure_ascii=False)}
        elif msg_type == "voice":
            if not voice_url:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Нет ссылки на аудио"}, ensure_ascii=False)}
        elif msg_type == "gif":
            if not gif_url:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Нет ссылки на GIF"}, ensure_ascii=False)}
        else:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Неизвестный тип сообщения"}, ensure_ascii=False)}

        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages
              (clan_id, user_id, text, msg_type, image_url, voice_url, gif_url, duration)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, text, msg_type, image_url, voice_url, gif_url, duration, created_at
        """, (clan_id, user["id"], text or "", msg_type, image_url, voice_url, gif_url, duration))
        msg = dict(cur.fetchone())
        msg["user_nick"] = user["steam_nick"]
        msg["role"] = user["role"]
        msg["steam_avatar"] = user.get("steam_avatar")

        # Уведомление остальным
        preview = text[:80] if text else ("📷 Фото" if msg_type == "image" else
                                          "🎤 Голосовое" if msg_type == "voice" else
                                          "GIF" if msg_type == "gif" else "")
        if preview:
            preview_text = preview + ("..." if text and len(text) > 80 else "")
            cur.execute(f"""
                INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link)
                SELECT id, 'chat', %s, %s, 'chat'
                FROM {SCHEMA}.users
                WHERE clan_id = %s AND id != %s
            """, (f"💬 {user['steam_nick']}", preview_text, clan_id, user["id"]))

        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(msg, default=str, ensure_ascii=False)}

    # ── GET / — последние 50 сообщений ─────────────────────────────────────
    cur.execute(f"""
        SELECT m.id, m.text, m.msg_type, m.image_url, m.voice_url, m.gif_url,
               m.duration, m.created_at,
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
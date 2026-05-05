"""
Аутентификация: Steam OpenID + ручная регистрация + /me.
GET  /              — получить текущего пользователя (X-Session-Token)
POST /register      — ручная регистрация по steam_id + steam_nick
GET  /steam/login   — URL для редиректа на Steam OpenID
GET  /steam/callback— обработка ответа Steam OpenID (query params)
POST /steam/manual  — авторизация по Steam ID вручную (с загрузкой профиля)
GET  /steam/profile?steam_id= — предпросмотр профиля Steam
"""
import json, os, secrets, urllib.parse, urllib.request, re
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
STEAM_API_KEY = os.environ.get("STEAM_API_KEY", "")
STEAM_OPENID = "https://steamcommunity.com/openid/login"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


# ─── Steam helpers ────────────────────────────────────────────────────────────

def build_openid_url(return_to: str) -> str:
    realm = return_to.split("?")[0].rsplit("/", 1)[0] + "/"
    params = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm": realm,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }
    return STEAM_OPENID + "?" + urllib.parse.urlencode(params)


def validate_openid(params: dict) -> str:
    check = dict(params)
    check["openid.mode"] = "check_authentication"
    data = urllib.parse.urlencode(check).encode()
    req = urllib.request.Request(STEAM_OPENID, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = resp.read().decode()
    if "is_valid:true" not in result:
        return ""
    m = re.search(r"https://steamcommunity\.com/openid/id/(\d+)", params.get("openid.claimed_id", ""))
    return m.group(1) if m else ""


def fetch_steam_profile(steam_id: str) -> dict:
    base = {"steam_id": steam_id, "steam_nick": f"Player_{steam_id[-6:]}", "steam_avatar": "",
            "steam_profile_url": "", "steam_country": "", "games_count": 0}
    if not STEAM_API_KEY:
        return base
    url = (f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
           f"?key={STEAM_API_KEY}&steamids={steam_id}")
    with urllib.request.urlopen(urllib.request.Request(url), timeout=10) as r:
        data = json.loads(r.read().decode())
    players = data.get("response", {}).get("players", [])
    if not players:
        return base
    p = players[0]
    games_count = 0
    games_url = (f"https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"
                 f"?key={STEAM_API_KEY}&steamid={steam_id}&include_appinfo=false")
    with urllib.request.urlopen(urllib.request.Request(games_url), timeout=10) as gr:
        gdata = json.loads(gr.read().decode())
    games_count = gdata.get("response", {}).get("game_count", 0)
    return {
        "steam_id": steam_id,
        "steam_nick": p.get("personaname", base["steam_nick"]),
        "steam_avatar": p.get("avatarfull", p.get("avatarmedium", "")),
        "steam_profile_url": p.get("profileurl", ""),
        "steam_country": p.get("loccountrycode", ""),
        "games_count": games_count,
    }


def upsert_user(profile: dict) -> dict:
    token = secrets.token_hex(32)
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        INSERT INTO {SCHEMA}.users
            (steam_id, steam_nick, steam_avatar, steam_profile_url, steam_country, steam_games_count, session_token)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (steam_id) DO UPDATE SET
            steam_nick = EXCLUDED.steam_nick,
            steam_avatar = EXCLUDED.steam_avatar,
            steam_profile_url = EXCLUDED.steam_profile_url,
            steam_country = EXCLUDED.steam_country,
            steam_games_count = EXCLUDED.steam_games_count,
            session_token = EXCLUDED.session_token,
            last_seen_at = NOW()
        RETURNING id, steam_id, steam_nick, steam_avatar, steam_profile_url, steam_country,
                  steam_games_count, clan_id, role, session_token
    """, (
        profile["steam_id"], profile["steam_nick"], profile.get("steam_avatar", ""),
        profile.get("steam_profile_url", ""), profile.get("steam_country", ""),
        profile.get("games_count", 0), token,
    ))
    user = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    return user


# ─── Handler ──────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    session_token = (event.get("headers") or {}).get("X-Session-Token", "")
    qp = event.get("queryStringParameters") or {}

    # GET /steam/login — вернуть URL для OpenID + QR
    if "/steam/login" in path:
        return_to = qp.get("return_to", "")
        if not return_to:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "return_to обязателен"}, ensure_ascii=False)}
        openid_url = build_openid_url(return_to)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"openid_url": openid_url}, ensure_ascii=False)}

    # GET /steam/callback — обработка ответа Steam
    if "/steam/callback" in path:
        steam_id = validate_openid(qp)
        if not steam_id:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Steam авторизация не подтверждена"}, ensure_ascii=False)}
        profile = fetch_steam_profile(steam_id)
        user = upsert_user(profile)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(user, ensure_ascii=False)}

    # POST /steam/manual — авторизация по Steam ID (17-значный или URL)
    if "/steam/manual" in path and method == "POST":
        body = json.loads(event.get("body") or "{}")
        raw = body.get("steam_id", "").strip()
        # Поддерживаем: числовой ID, /id/nickname, /profiles/steamid
        steam_id = ""
        if re.match(r"^\d{17}$", raw):
            steam_id = raw
        else:
            m = re.search(r"/profiles/(\d{17})", raw)
            if m:
                steam_id = m.group(1)
        if not steam_id:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "Введите 17-значный Steam ID или ссылку на профиль"}, ensure_ascii=False)}
        profile = fetch_steam_profile(steam_id)
        user = upsert_user(profile)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(user, ensure_ascii=False)}

    # GET /steam/profile?steam_id= — предпросмотр без регистрации
    if "/steam/profile" in path:
        steam_id = qp.get("steam_id", "").strip()
        if not steam_id:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "steam_id обязателен"}, ensure_ascii=False)}
        profile = fetch_steam_profile(steam_id)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(profile, ensure_ascii=False)}

    # POST /register — простая регистрация по нику (fallback)
    if method == "POST" and "/register" in path:
        body = json.loads(event.get("body") or "{}")
        steam_id = body.get("steam_id", "").strip()
        steam_nick = body.get("steam_nick", "").strip()
        steam_avatar = body.get("steam_avatar", "")
        if not steam_id or not steam_nick:
            return {"statusCode": 400, "headers": CORS,
                    "body": json.dumps({"error": "steam_id и steam_nick обязательны"}, ensure_ascii=False)}
        profile = {"steam_id": steam_id, "steam_nick": steam_nick, "steam_avatar": steam_avatar,
                   "steam_profile_url": "", "steam_country": "", "games_count": 0}
        user = upsert_user(profile)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(user, ensure_ascii=False)}

    # GET / — вернуть текущего пользователя
    if method == "GET":
        if not session_token:
            return {"statusCode": 401, "headers": CORS,
                    "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f"""
            SELECT u.id, u.steam_id, u.steam_nick, u.steam_avatar, u.steam_profile_url,
                   u.steam_country, u.steam_games_count, u.clan_id, u.role,
                   c.name AS clan_name, c.tag AS clan_tag
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.clans c ON c.id = u.clan_id
            WHERE u.session_token = %s
        """, (session_token,))
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return {"statusCode": 401, "headers": CORS,
                    "body": json.dumps({"error": "Сессия недействительна"}, ensure_ascii=False)}
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps(dict(row), default=str, ensure_ascii=False)}

    return {"statusCode": 404, "headers": CORS,
            "body": json.dumps({"error": "Not found"}, ensure_ascii=False)}

const URLS = {
  auth: "https://functions.poehali.dev/e329aae7-e93b-4b16-8b31-c4ee65a04bde",
  clan: "https://functions.poehali.dev/b14c514c-f34c-45ea-81f7-1e705ad16ae2",
  chat: "https://functions.poehali.dev/2aa2d173-4cd7-4a2a-9993-4ad8c53fde8b",
  invites: "https://functions.poehali.dev/6557e11c-7bbf-429e-94c2-33182e7c6983",
  events: "https://functions.poehali.dev/28cb6ff3-5ac4-42c8-9b70-ee3ec0ed1e66",
  notifications: "https://functions.poehali.dev/e2fb0aba-dda7-4d5d-a33d-0e11612feb04",
};

export function getToken(): string {
  return localStorage.getItem("ash_token") || "";
}

export function saveToken(token: string) {
  localStorage.setItem("ash_token", token);
}

export function clearToken() {
  localStorage.removeItem("ash_token");
}

async function req<T>(
  base: keyof typeof URLS,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(URLS[base] + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session-Token": token } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown;
  try {
    const parsed = JSON.parse(text);
    data = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data as Record<string, string>)?.error || "Ошибка сервера";
    throw new Error(msg);
  }
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  steam_id: string;
  steam_nick: string;
  steam_avatar: string | null;
  steam_profile_url?: string;
  steam_country?: string;
  steam_games_count?: number;
  clan_id: number | null;
  role: string;
  clan_name?: string;
  clan_tag?: string;
  session_token?: string;
}

export interface SteamProfile {
  steam_id: string;
  steam_nick: string;
  steam_avatar: string;
  steam_profile_url: string;
  steam_country: string;
  games_count: number;
}

/** Получить URL для Steam OpenID редиректа */
export async function getSteamLoginUrl(returnTo: string): Promise<string> {
  const r = await req<{ openid_url: string }>(
    "auth",
    `/steam/login?return_to=${encodeURIComponent(returnTo)}`
  );
  return r.openid_url;
}

/** Авторизация по числовому Steam ID (ручной ввод) */
export async function steamManualAuth(steamId: string): Promise<User> {
  const user = await req<User>("auth", "/steam/manual", {
    method: "POST",
    body: JSON.stringify({ steam_id: steamId }),
  });
  if (user.session_token) saveToken(user.session_token);
  return user;
}

/** Предпросмотр профиля Steam по ID */
export async function previewSteamProfile(steamId: string): Promise<SteamProfile> {
  return req<SteamProfile>("auth", `/steam/profile?steam_id=${encodeURIComponent(steamId)}`);
}

/** Завершить Steam OpenID callback (вызывается после редиректа) */
export async function completeSteamCallback(queryString: string): Promise<User> {
  const user = await req<User>("auth", `/steam/callback?${queryString}`);
  if (user.session_token) saveToken(user.session_token);
  return user;
}

export async function register(steam_id: string, steam_nick: string, steam_avatar?: string): Promise<User> {
  const user = await req<User>("auth", "/register", {
    method: "POST",
    body: JSON.stringify({ steam_id, steam_nick, steam_avatar: steam_avatar || "" }),
  });
  if (user.session_token) saveToken(user.session_token);
  return user;
}

export async function getMe(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    return await req<User>("auth", "/");
  } catch {
    clearToken();
    return null;
  }
}

// ─── Clan ────────────────────────────────────────────────────────────────────

export interface Clan {
  id: number;
  name: string;
  tag: string;
  owner_id: number;
  level: number;
  rank: string;
  wins: number;
  losses: number;
  winrate: number;
  max_members: number;
  founded_year: string;
  members_count?: number;
  // profile fields
  description?: string;
  emblem_url?: string;
  accent_color?: string;
  discipline?: string;
  region?: string;
  discord_url?: string;
  vk_url?: string;
  website_url?: string;
  is_open?: boolean;
  min_rank?: string;
}

export interface ClanUpdatePayload {
  name?: string;
  tag?: string;
  description?: string;
  accent_color?: string;
  discipline?: string;
  region?: string;
  discord_url?: string;
  vk_url?: string;
  website_url?: string;
  is_open?: boolean;
  min_rank?: string;
}

export async function updateClan(payload: ClanUpdatePayload): Promise<Clan> {
  return req<Clan>("clan", "/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadClanEmblem(imageBase64: string): Promise<string> {
  const res = await req<{ emblem_url: string }>("clan", "/emblem", {
    method: "POST",
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  return res.emblem_url;
}

export async function kickMember(user_id: number): Promise<void> {
  await req("clan", "/kick", { method: "POST", body: JSON.stringify({ user_id }) });
}

export async function promoteMember(user_id: number): Promise<void> {
  await req("clan", "/promote", { method: "POST", body: JSON.stringify({ user_id }) });
}

export async function demoteMember(user_id: number): Promise<void> {
  await req("clan", "/demote", { method: "POST", body: JSON.stringify({ user_id }) });
}

export interface Member {
  id: number;
  steam_nick: string;
  steam_avatar: string | null;
  steam_id: string;
  role: string;
  kda: number;
  wins: number;
  winrate: number;
  status: string;
  rank: string;
  games: string[];
}

export interface ActivityItem {
  id: number;
  action: string;
  type: string;
  game: string | null;
  created_at: string;
  user_nick: string;
  steam_id: string;
}

export async function getClan(): Promise<Clan | null> {
  return req<Clan | null>("clan", "/");
}

export async function createClan(name: string, tag: string): Promise<Clan> {
  return req<Clan>("clan", "/create", {
    method: "POST",
    body: JSON.stringify({ name, tag }),
  });
}

export async function getMembers(): Promise<Member[]> {
  return req<Member[]>("clan", "/members");
}

export async function getActivity(): Promise<ActivityItem[]> {
  return req<ActivityItem[]>("clan", "/activity");
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface ClanEvent {
  id: number;
  title: string;
  type: string;
  description: string;
  game: string;
  event_date: string;
  max_participants: number;
  participants_count: number;
  user_joined: boolean;
  created_at: string;
}

export interface CreateEventPayload {
  title: string;
  type: string;
  description?: string;
  game?: string;
  event_date: string;
  max_participants?: number;
}

export async function getEvents(): Promise<ClanEvent[]> {
  return req<ClanEvent[]>("events", "/");
}

export async function createEvent(payload: CreateEventPayload): Promise<ClanEvent> {
  return req<ClanEvent>("events", "/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinEvent(event_id: number): Promise<void> {
  await req("events", "/join", {
    method: "POST",
    body: JSON.stringify({ event_id }),
  });
}

export async function leaveEvent(event_id: number): Promise<void> {
  await req("events", "/leave", {
    method: "POST",
    body: JSON.stringify({ event_id }),
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PollResult {
  notifications: Notification[];
  messages: ChatMessage[];
  unread_count: number;
}

// ChatMessage is defined in the Chat section below — TypeScript hoists interfaces

export async function getNotifications(): Promise<{ notifications: Notification[]; unread_count: number }> {
  return req("notifications", "/");
}

export async function pollUpdates(sinceNotif: number, sinceMsg: number): Promise<PollResult> {
  return req("notifications", `/poll?since_notif=${sinceNotif}&since_msg=${sinceMsg}`);
}

export async function markNotificationsRead(ids?: number[]): Promise<void> {
  await req("notifications", "/read", {
    method: "POST",
    body: JSON.stringify(ids ? { ids } : {}),
  });
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  text: string;
  created_at: string;
  user_nick: string;
  steam_id: string;
  role: string;
  steam_avatar?: string;
}

export async function getMessages(): Promise<ChatMessage[]> {
  return req<ChatMessage[]>("chat", "/");
}

export async function sendMessage(text: string): Promise<ChatMessage> {
  return req<ChatMessage>("chat", "/", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export interface SearchUser {
  id: number;
  steam_nick: string;
  steam_avatar: string | null;
  rank: string;
  games: string[];
  clan_id: number | null;
}

export interface Invite {
  id: number;
  clan_name: string;
  clan_tag: string;
  from_nick: string;
  status: string;
  created_at: string;
}

export async function searchUsers(q: string): Promise<SearchUser[]> {
  return req<SearchUser[]>("invites", `/search?q=${encodeURIComponent(q)}`);
}

export async function sendInvite(to_user_id: number): Promise<void> {
  await req("invites", "/send", {
    method: "POST",
    body: JSON.stringify({ to_user_id }),
  });
}

export async function getMyInvites(): Promise<Invite[]> {
  return req<Invite[]>("invites", "/my");
}

export async function acceptInvite(invite_id: number): Promise<void> {
  await req("invites", "/accept", {
    method: "POST",
    body: JSON.stringify({ invite_id }),
  });
}

export async function declineInvite(invite_id: number): Promise<void> {
  await req("invites", "/decline", {
    method: "POST",
    body: JSON.stringify({ invite_id }),
  });
}
const URLS = {
  auth: "https://functions.poehali.dev/e329aae7-e93b-4b16-8b31-c4ee65a04bde",
  clan: "https://functions.poehali.dev/b14c514c-f34c-45ea-81f7-1e705ad16ae2",
  chat: "https://functions.poehali.dev/2aa2d173-4cd7-4a2a-9993-4ad8c53fde8b",
  invites: "https://functions.poehali.dev/6557e11c-7bbf-429e-94c2-33182e7c6983",
};

function getToken(): string {
  return localStorage.getItem("ash_token") || "";
}

function saveToken(token: string) {
  localStorage.setItem("ash_token", token);
}

function clearToken() {
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
    // body may be double-serialized string
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
  clan_id: number | null;
  role: string;
  clan_name?: string;
  clan_tag?: string;
  session_token?: string;
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

export { saveToken, clearToken, getToken };

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
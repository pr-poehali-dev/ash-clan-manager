import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { User, Clan, Member, ActivityItem, ChatMessage, SearchUser, Invite, ClanEvent } from "@/lib/api";
import SteamConnect from "./SteamConnect";
import ClanSettings from "./ClanSettings";
import PlayerProfile from "./PlayerProfile";
import NotificationPanel from "@/components/NotificationPanel";
import ToastNotifications from "@/components/ToastNotification";
import { useRealtime } from "@/hooks/useRealtime";

type Tab = "feed" | "clan" | "calendar" | "chat" | "ratings";

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = { online: "bg-green-400", "in-game": "bg-orange-400", offline: "bg-gray-600" };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-gray-600"}`} />;
};

const MemberAvatar = ({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className={`${sizes[size]} rounded-md flex items-center justify-center font-display font-semibold flex-shrink-0`}
      style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-orange)" }}>
      {initials}
    </div>
  );
};

const ActivityTypeIcon = ({ type }: { type: string }) => {
  const map: Record<string, { icon: string; color: string }> = {
    win: { icon: "Trophy", color: "#facc15" }, join: { icon: "UserPlus", color: "#4ade80" },
    rank: { icon: "Star", color: "#fb923c" }, record: { icon: "Zap", color: "#fb923c" },
    steam: { icon: "RefreshCw", color: "#38bdf8" }, event: { icon: "Calendar", color: "#a78bfa" },
    info: { icon: "Info", color: "#9ca3af" },
  };
  const m = map[type] ?? { icon: "Circle", color: "#666" };
  return <Icon name={m.icon} size={12} style={{ color: m.color }} />;
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await api.searchUsers(query).catch(() => []);
      setResults(r); setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const invite = async (userId: number) => {
    setError("");
    await api.sendInvite(userId).catch(e => { setError(e.message); return null; });
    setSent(prev => [...prev, userId]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-md p-6 rounded-lg animate-fade-in"
        style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-white">Пригласить игрока</div>
          <button onClick={onClose}><Icon name="X" size={16} style={{ color: "var(--ash-text-dim)" }} /></button>
        </div>

        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по Steam-нику..."
          className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none transition-colors mb-3"
          style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />

        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading && <div className="text-xs text-center py-4" style={{ color: "var(--ash-text-dim)" }}>Поиск...</div>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-xs text-center py-4" style={{ color: "var(--ash-text-dim)" }}>Игроки не найдены</div>
          )}
          {results.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-md"
              style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}>
              <MemberAvatar initials={u.steam_nick.slice(0, 2).toUpperCase()} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{u.steam_nick}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>
                  {u.rank || "Без ранга"} · {u.clan_id ? "В клане" : "Без клана"}
                </div>
              </div>
              <button
                onClick={() => invite(u.id)}
                disabled={sent.includes(u.id) || !!u.clan_id}
                className={`px-3 py-1 text-xs transition-all ${sent.includes(u.id) ? "rounded" : "btn-lava"}`}
                style={sent.includes(u.id) ? {
                  backgroundColor: "var(--metal-mid)",
                  color: "var(--metal-dim)",
                  border: "1px solid var(--metal-edge)",
                  borderRadius: "2px",
                  opacity: u.clan_id ? 0.4 : 1,
                } : { opacity: u.clan_id ? 0.4 : 1 }}
              >
                {sent.includes(u.id) ? "Отправлено" : u.clan_id ? "В клане" : "Пригласить"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs" style={{ color: "var(--ash-text-dim)" }}>
          Игрок должен быть зарегистрирован в ASH чтобы появиться в поиске
        </div>
      </div>
    </div>
  );
}

// ─── Create Clan Modal ────────────────────────────────────────────────────────

function CreateClanModal({ onClose, onCreated }: { onClose: () => void; onCreated: (clan: Clan) => void }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !tag.trim()) { setError("Заполните все поля"); return; }
    setLoading(true); setError("");
    const clan = await api.createClan(name.trim(), tag.trim()).catch(e => { setError(e.message); return null; });
    setLoading(false);
    if (clan) onCreated(clan);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-sm p-6 rounded-lg animate-fade-in"
        style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-white">Создать клан</div>
          <button onClick={onClose}><Icon name="X" size={16} style={{ color: "var(--ash-text-dim)" }} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>
              Название клана
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="SHADOW WOLVES"
              className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
              style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
          </div>
          <div>
            <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>
              Тег (до 8 символов)
            </label>
            <input value={tag} onChange={e => setTag(e.target.value.slice(0, 8))}
              placeholder="[SW]"
              className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
              style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-2.5 btn-lava"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? "Создание..." : "Создать клан"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── No Clan Screen ───────────────────────────────────────────────────────────

function NoClanScreen({ user, invites, onCreateClan, onAccept, onDecline, refreshInvites }:
  { user: User; invites: Invite[]; onCreateClan: () => void; onAccept: (id: number) => void; onDecline: (id: number) => void; refreshInvites: () => void }) {

  useEffect(() => { refreshInvites(); }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="text-center">
        <div className="font-display font-bold text-2xl text-white mb-2">Вы не в клане</div>
        <div className="text-sm" style={{ color: "var(--ash-text-dim)" }}>Создайте свой клан или примите приглашение от другого игрока</div>
      </div>

      <div className="flex justify-center">
        <button onClick={onCreateClan}
          className="btn-lava flex items-center gap-2 px-6 py-3">
          <Icon name="Plus" size={15} />
          Создать клан
        </button>
      </div>

      {invites.length > 0 && (
        <div>
          <div className="text-xs uppercase font-display tracking-wider mb-3" style={{ color: "var(--ash-text-dim)" }}>
            Входящие приглашения ({invites.length})
          </div>
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-4 rounded-md"
                style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{inv.clan_name} <span style={{ color: "var(--ash-text-dim)" }}>{inv.clan_tag}</span></div>
                  <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>от {inv.from_nick} · {timeAgo(inv.created_at)}</div>
                </div>
                <button onClick={() => onAccept(inv.id)}
                  className="btn-lava px-3 py-1 text-xs">
                  Принять
                </button>
                <button onClick={() => onDecline(inv.id)}
                  className="px-3 py-1 rounded text-xs font-display transition-all"
                  style={{ border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}>
                  Отклонить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feed Section ─────────────────────────────────────────────────────────────

function FeedSection({ clan, activity }: { clan: Clan | null; activity: ActivityItem[] }) {
  return (
    <div className="space-y-2">
      {clan && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Побед", value: clan.wins.toLocaleString(), icon: "Trophy" },
            { label: "Winrate", value: `${clan.winrate}%`, icon: "TrendingUp" },
            { label: "Участников", value: `${clan.members_count ?? "—"}/${clan.max_members}`, icon: "Users" },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-md animate-fade-in"
              style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", animationDelay: `${i * 0.07}s`, opacity: 0 }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon name={s.icon} size={12} style={{ color: "var(--ash-orange)" }} />
                <span className="text-xs uppercase tracking-wider font-display" style={{ color: "var(--ash-text-dim)" }}>{s.label}</span>
              </div>
              <div className="font-display font-bold text-xl text-white">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <span className="font-display text-xs uppercase tracking-widest" style={{ color: "var(--ash-text-dim)" }}>Лента активности</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--ash-border)" }} />
        <span className="text-xs font-mono-ash" style={{ color: "var(--ash-text-dim)" }}>{activity.length} событий</span>
      </div>

      {activity.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: "var(--ash-text-dim)" }}>
          Пока нет активности. Начните играть — и она появится!
        </div>
      )}

      <div className="space-y-1">
        {activity.map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer animate-fade-in transition-colors"
            style={{ animationDelay: `${0.2 + i * 0.05}s`, opacity: 0 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--ash-surface-3)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
            <MemberAvatar initials={item.user_nick.slice(0, 2).toUpperCase()} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{item.user_nick}</span>
                <ActivityTypeIcon type={item.type} />
              </div>
              <div className="text-xs truncate" style={{ color: "var(--ash-text-dim)" }}>
                {item.action}
                {item.game && <span className="ml-1" style={{ color: "var(--ash-orange)", opacity: 0.7 }}>· {item.game}</span>}
              </div>
            </div>
            <span className="text-xs font-mono-ash whitespace-nowrap" style={{ color: "var(--ash-text-dim)" }}>{timeAgo(item.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Clan Section ─────────────────────────────────────────────────────────────

function ClanSection({ clan, members, user, onInviteClick, onSettingsClick, onPlayerClick }: {
  clan: Clan | null; members: Member[]; user: User | null;
  onInviteClick: () => void; onSettingsClick: () => void; onPlayerClick: (m: Member) => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "members">("info");

  if (!clan) return <div className="text-center py-10 text-sm" style={{ color: "var(--ash-text-dim)" }}>Вы не состоите в клане</div>;

  const accentColor = clan.accent_color ?? "var(--ash-orange)";
  const canManage = user?.role === "owner" || user?.role === "officer";

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 rounded-md w-fit" style={{ backgroundColor: "var(--ash-surface-2)" }}>
        {(["info", "members"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 py-1.5 rounded text-sm font-display font-medium transition-all"
            style={activeTab === t ? { backgroundColor: accentColor, color: "#000" } : { color: "var(--ash-text-dim)" }}>
            {t === "info" ? "Информация" : `Участники (${members.length})`}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="space-y-4 animate-fade-in">
          {/* Шапка клана */}
          <div className="p-5 rounded-md overflow-hidden relative"
            style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", borderLeft: `3px solid ${accentColor}` }}>
            {/* фоновый градиент от акцентного */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at top left, ${accentColor}, transparent 70%)` }} />
            <div className="relative flex items-start gap-4">
              {/* Эмблема */}
              {clan.emblem_url ? (
                <img src={clan.emblem_url} alt={clan.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border"
                  style={{ borderColor: accentColor + "40" }} />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center font-display font-black text-xl flex-shrink-0"
                  style={{ backgroundColor: accentColor + "20", color: accentColor, border: `1px solid ${accentColor}30` }}>
                  {clan.tag.replace(/[[\]]/g, "").slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-bold text-xl text-white tracking-wider leading-tight">{clan.name}</div>
                    <div className="font-mono-ash text-sm mt-0.5" style={{ color: accentColor }}>{clan.tag}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-display font-bold" style={{ color: accentColor }}>{clan.rank}</div>
                    <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>Ур. {clan.level}</div>
                  </div>
                </div>
                {clan.description && (
                  <div className="text-sm mt-2 leading-relaxed" style={{ color: "var(--ash-text-dim)" }}>
                    {clan.description}
                  </div>
                )}
                {/* Теги */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {clan.discipline && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-display"
                      style={{ backgroundColor: accentColor + "20", color: accentColor }}>
                      {clan.discipline}
                    </span>
                  )}
                  {clan.region && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--ash-surface-3)", color: "var(--ash-text-dim)" }}>
                      {clan.region}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (clan.is_open ?? true) ? "#10b98120" : "#ef444420",
                             color: (clan.is_open ?? true) ? "#10b981" : "#ef4444" }}>
                    {(clan.is_open ?? true) ? "Открытый набор" : "Набор закрыт"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Основан", value: clan.founded_year },
              { label: "Участников", value: `${members.length}/${clan.max_members}` },
              { label: "Побед", value: clan.wins.toLocaleString() },
              { label: "Winrate", value: `${clan.winrate}%` },
            ].map((r, i) => (
              <div key={i} className="p-3 rounded-md text-center"
                style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
                <div className="font-mono-ash font-bold text-sm text-white">{r.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--ash-text-dim)" }}>{r.label}</div>
              </div>
            ))}
          </div>

          {/* Winrate bar */}
          <div className="p-4 rounded-md" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--ash-surface-3)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${clan.winrate}%`, backgroundColor: accentColor }} />
              </div>
              <span className="font-display font-bold text-sm flex-shrink-0" style={{ color: accentColor }}>
                {clan.winrate}%
              </span>
            </div>
          </div>

          {/* Соцсети */}
          {(clan.discord_url || clan.vk_url || clan.website_url) && (
            <div className="flex flex-wrap gap-2">
              {clan.discord_url && (
                <a href={clan.discord_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs transition-all"
                  style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#7289da"; e.currentTarget.style.color = "#7289da"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text-dim)"; }}>
                  <Icon name="Hash" size={12} /> Discord
                </a>
              )}
              {clan.vk_url && (
                <a href={clan.vk_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs transition-all"
                  style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4c75a3"; e.currentTarget.style.color = "#4c75a3"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text-dim)"; }}>
                  <Icon name="Users" size={12} /> ВКонтакте
                </a>
              )}
              {clan.website_url && (
                <a href={clan.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded text-xs transition-all"
                  style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text-dim)"; }}>
                  <Icon name="Globe" size={12} /> Сайт
                </a>
              )}
            </div>
          )}

          {/* Действия */}
          {canManage && (
            <div className="flex gap-2">
              <button onClick={onInviteClick}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm transition-all"
                style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text)"; }}>
                <Icon name="UserPlus" size={13} />
                Пригласить
              </button>
              <button onClick={onSettingsClick}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm transition-all"
                style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text)"; }}>
                <Icon name="Settings" size={13} />
                Настройки клана
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-1 animate-fade-in">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all"
              style={{ border: "1px solid transparent" }}
              onClick={() => onPlayerClick(m)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--metal-mid)"; e.currentTarget.style.borderColor = "var(--metal-crack)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.borderColor = "transparent"; }}>
              <div className="relative">
                {m.steam_avatar ? (
                  <img src={m.steam_avatar} alt={m.steam_nick} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <MemberAvatar initials={m.steam_nick.slice(0, 2).toUpperCase()} size="md" />
                )}
                <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={m.status} /></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{m.steam_nick}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{m.role}</span>
                  {m.rank && <><span style={{ color: "var(--ash-text-dim)" }}>·</span><span className="text-xs" style={{ color: accentColor }}>{m.rank}</span></>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono-ash text-sm text-white">KDA {m.kda}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{m.wins} побед</div>
              </div>
              <Icon name="ChevronRight" size={13} style={{ color: "var(--metal-faint)", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ev: ClanEvent) => void }) {
  const [form, setForm] = useState({ title: "", type: "Клановый матч", game: "", date: "", time: "", max: "10" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const types = ["Клановый матч", "Турнир", "Тренировка", "Стрим", "Собрание"];

  const handle = async () => {
    if (!form.title.trim() || !form.date || !form.time) { setError("Заполните название, дату и время"); return; }
    setLoading(true); setError("");
    const event_date = new Date(`${form.date}T${form.time}`).toISOString();
    const ev = await api.createEvent({
      title: form.title.trim(), type: form.type,
      game: form.game.trim(), event_date,
      max_participants: parseInt(form.max) || 10,
    }).catch(e => { setError(e.message); return null; });
    setLoading(false);
    if (ev) onCreated(ev);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-sm p-6 rounded-lg animate-fade-in overflow-y-auto max-h-screen"
        style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-white">Новое событие</div>
          <button onClick={onClose}><Icon name="X" size={16} style={{ color: "var(--ash-text-dim)" }} /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Название", key: "title", placeholder: "Ночной рейд CS2" },
            { label: "Игра (необязательно)", key: "game", placeholder: "CS2, Dota 2..." },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>{f.label}</label>
              <input value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
            </div>
          ))}
          <div>
            <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>Тип</label>
            <div className="flex flex-wrap gap-2">
              {types.map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                  className="px-2.5 py-1 rounded text-xs font-display transition-all"
                  style={form.type === t
                    ? { backgroundColor: "var(--ash-orange)", color: "#000" }
                    : { backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>Дата</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", colorScheme: "dark" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
            </div>
            <div>
              <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>Время</label>
              <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", colorScheme: "dark" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>Макс. участников</label>
            <input type="number" value={form.max} min="1" max="100"
              onChange={e => setForm(p => ({ ...p, max: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none font-mono-ash"
              style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <button onClick={handle} disabled={loading}
            className="w-full py-2.5 btn-lava"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? "Создание..." : "Создать событие"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Section ─────────────────────────────────────────────────────────

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_RU = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS_RU[d.getMonth()],
    weekday: DAYS_RU[d.getDay()],
    time: d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
  };
}

function CalendarSection({ user }: { user: User | null }) {
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);

  const canManage = user?.role === "owner" || user?.role === "officer";

  useEffect(() => {
    if (!user?.clan_id) { setLoading(false); return; }
    api.getEvents().then(evs => { setEvents(evs); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  const handleJoin = async (ev: ClanEvent) => {
    setJoining(ev.id);
    if (ev.user_joined) {
      await api.leaveEvent(ev.id).catch(() => null);
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, user_joined: false, participants_count: e.participants_count - 1 } : e));
    } else {
      await api.joinEvent(ev.id).catch(() => null);
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, user_joined: true, participants_count: e.participants_count + 1 } : e));
    }
    setJoining(null);
  };

  return (
    <div className="space-y-4">
      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={ev => { setEvents(prev => [...prev, { ...ev, participants_count: 0, user_joined: false }]); setShowCreate(false); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-white">Предстоящие события</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--ash-text-dim)" }}>
            {loading ? "Загрузка..." : `${events.length} событий`}
          </div>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="btn-lava flex items-center gap-2 px-3 py-1.5 text-sm">
            <Icon name="Plus" size={13} />
            Событие
          </button>
        )}
      </div>

      {!user?.clan_id && (
        <div className="text-center py-10 text-sm" style={{ color: "var(--ash-text-dim)" }}>
          Вступите в клан, чтобы видеть события
        </div>
      )}

      {user?.clan_id && !loading && events.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: "var(--ash-text-dim)" }}>
          Событий пока нет. {canManage ? "Создайте первое!" : "Лидер клана сможет добавить события."}
        </div>
      )}

      <div className="space-y-2">
        {events.map((ev, i) => {
          const fd = formatEventDate(ev.event_date);
          const isFull = ev.participants_count >= ev.max_participants;
          const urgent = new Date(ev.event_date).getTime() - Date.now() < 48 * 3600 * 1000;
          return (
            <div key={ev.id} className="flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all animate-fade-in"
              style={{ backgroundColor: "var(--ash-surface-2)", border: `1px solid ${urgent ? "rgba(255,107,26,0.4)" : "var(--ash-border)"}`, animationDelay: `${i * 0.07}s`, opacity: 0 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = urgent ? "rgba(255,107,26,0.4)" : "var(--ash-border)")}>
              <div className="text-center flex-shrink-0 w-12">
                <div className="text-xs uppercase" style={{ color: "var(--ash-text-dim)" }}>{fd.month}</div>
                <div className="font-display font-bold text-xl text-white leading-none">{fd.day}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{fd.weekday}</div>
              </div>
              <div className="w-px h-10 flex-shrink-0" style={{ backgroundColor: "var(--ash-border)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {urgent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-orange" style={{ backgroundColor: "#fb923c" }} />}
                  <span className="text-sm font-medium text-white truncate">{ev.title}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{ev.type}</span>
                  {ev.game && <span className="text-xs" style={{ color: "var(--ash-text-dim)" }}>· {ev.game}</span>}
                  <span className="text-xs font-mono-ash" style={{ color: "var(--ash-orange)" }}>{fd.time}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                <div className="text-xs font-mono-ash text-white">{ev.participants_count}/{ev.max_participants}</div>
                {user && (
                  <button
                    onClick={e => { e.stopPropagation(); handleJoin(ev); }}
                    disabled={joining === ev.id || (isFull && !ev.user_joined)}
                    className="text-xs px-2 py-0.5 rounded transition-all"
                    style={ev.user_joined
                      ? { backgroundColor: "var(--ash-orange)", color: "#000" }
                      : { border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)", opacity: isFull ? 0.4 : 1 }}
                    onMouseEnter={e => { if (!ev.user_joined && !isFull) { e.currentTarget.style.borderColor = "var(--ash-orange)"; e.currentTarget.style.color = "var(--ash-orange)"; }}}
                    onMouseLeave={e => { if (!ev.user_joined) { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text-dim)"; }}}>
                    {joining === ev.id ? "..." : ev.user_joined ? "✓ Иду" : isFull ? "Полный" : "Участвовать"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chat Section ─────────────────────────────────────────────────────────────

function ChatSection({
  user,
  realtimeMessages,
  onSend,
}: {
  user: User | null;
  realtimeMessages: ChatMessage[];
  onSend: (msg: ChatMessage) => void;
}) {
  const [base, setBase] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Начальная загрузка истории
  useEffect(() => {
    api.getMessages().then(msgs => {
      setBase(msgs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Объединяем base + realtime, убирая дубли
  const allMessages = (() => {
    const ids = new Set(base.map(m => m.id));
    const fresh = realtimeMessages.filter(m => !ids.has(m.id));
    return [...base, ...fresh];
  })();

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const msg = await api.sendMessage(text).catch(() => null);
    setSending(false);
    if (msg) {
      setBase(prev => [...prev, msg]);
      onSend(msg);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--ash-border)" }}>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-orange" />
        <span className="text-xs uppercase font-display tracking-wider" style={{ color: "var(--ash-text-dim)" }}>
          Общий чат клана
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--ash-orange)" }} />
          <span className="text-xs font-mono-ash" style={{ color: "var(--ash-text-dim)" }}>live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {loading && (
          <div className="text-center py-8 text-sm" style={{ color: "var(--ash-text-dim)" }}>Загрузка...</div>
        )}
        {!loading && allMessages.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: "var(--ash-text-dim)" }}>
            Начните общение с кланом!
          </div>
        )}
        {allMessages.map((msg, i) => (
          <div
            key={msg.id}
            className="flex items-start gap-3 animate-fade-in"
            style={{ animationDelay: `${Math.min(i, 10) * 0.03}s`, opacity: 0 }}
          >
            {msg.steam_avatar ? (
              <img
                src={msg.steam_avatar}
                alt={msg.user_nick}
                className="w-7 h-7 rounded-md flex-shrink-0 object-cover"
              />
            ) : (
              <MemberAvatar initials={msg.user_nick.slice(0, 2).toUpperCase()} size="sm" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-sm font-medium"
                  style={{ color: msg.user_nick === user?.steam_nick ? "var(--ash-orange)" : "white" }}
                >
                  {msg.user_nick}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--ash-surface-3)", color: "var(--ash-text-dim)" }}
                >
                  {msg.role}
                </span>
                <span className="text-xs font-mono-ash ml-auto" style={{ color: "var(--ash-text-dim)" }}>
                  {new Date(msg.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-sm leading-relaxed" style={{ color: "var(--ash-text)" }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--ash-border)" }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder={user ? "Написать в чат..." : "Войдите чтобы писать в чат"}
            disabled={!user || sending}
            className="flex-1 px-3 py-2.5 text-sm text-white rounded-md focus:outline-none transition-colors"
            style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
          />
          <button
            onClick={send}
            disabled={!user || sending || !input.trim()}
            className="px-4 py-2.5 rounded-md text-black transition-all"
            style={{ backgroundColor: "var(--ash-orange)", opacity: user && !sending && input.trim() ? 1 : 0.4 }}
          >
            <Icon name={sending ? "RefreshCw" : "Send"} size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ratings Section ─────────────────────────────────────────────────────────

function RatingsSection({ members }: { members: Member[] }) {
  const [sortBy, setSortBy] = useState<"kda" | "wins" | "winrate">("kda");
  const sorted = [...members].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase font-display tracking-wider mr-2" style={{ color: "var(--ash-text-dim)" }}>Сортировка:</span>
        {(["kda", "wins", "winrate"] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className="px-3 py-1 rounded text-xs font-display uppercase tracking-wider transition-all"
            style={sortBy === s
              ? { backgroundColor: "var(--ash-orange)", color: "#000" }
              : { backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}>
            {s === "kda" ? "KDA" : s === "wins" ? "Победы" : "Winrate"}
          </button>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: "var(--ash-text-dim)" }}>
          Пока нет участников для рейтинга
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((p, i) => {
          const rankColor = i === 0 ? "#facc15" : i === 1 ? "#9ca3af" : i === 2 ? "#cd7c3a" : "var(--ash-text-dim)";
          return (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all animate-fade-in"
              style={{ backgroundColor: "var(--ash-surface-2)", border: `1px solid ${i === 0 ? "rgba(250,204,21,0.3)" : "var(--ash-border)"}`, animationDelay: `${i * 0.05}s`, opacity: 0 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = i === 0 ? "rgba(250,204,21,0.3)" : "var(--ash-border)")}>
              <div className="font-display font-bold text-base w-6 flex-shrink-0 text-center" style={{ color: rankColor }}>{i + 1}</div>
              <MemberAvatar initials={p.steam_nick.slice(0, 2).toUpperCase()} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{p.steam_nick}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{p.games?.join(", ") || "—"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                {[
                  { key: "kda", label: "KDA", val: p.kda },
                  { key: "wins", label: "Победы", val: p.wins },
                  { key: "winrate", label: "WR%", val: `${p.winrate}%` },
                ].map(col => (
                  <div key={col.key}>
                    <div className="font-mono-ash text-sm font-medium" style={{ color: sortBy === col.key ? "var(--ash-orange)" : "white" }}>{col.val}</div>
                    <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{col.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "feed", label: "Лента", icon: "Activity" },
  { id: "clan", label: "Клан", icon: "Shield" },
  { id: "calendar", label: "События", icon: "Calendar" },
  { id: "chat", label: "Чат", icon: "MessageSquare" },
  { id: "ratings", label: "Рейтинг", icon: "BarChart2" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [user, setUser] = useState<User | null>(null);
  const [clan, setClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSteamConnect, setShowSteamConnect] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateClan, setShowCreateClan] = useState(false);
  const [showClanSettings, setShowClanSettings] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Member | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Realtime: уведомления + новые сообщения чата
  const [realtimeState, realtimeControls] = useRealtime(!!user && !loading);

  const load = useCallback(async () => {
    const me = await api.getMe();
    setUser(me);
    if (me?.clan_id) {
      const [c, m, a] = await Promise.all([api.getClan(), api.getMembers(), api.getActivity()]);
      setClan(c);
      setMembers(m);
      setActivity(a);
    } else {
      setClan(null); setMembers([]); setActivity([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshInvites = async () => {
    if (!user) return;
    const inv = await api.getMyInvites().catch(() => []);
    setInvites(inv);
  };

  const handleAccept = async (invite_id: number) => {
    await api.acceptInvite(invite_id);
    setInvites(prev => prev.filter(i => i.id !== invite_id));
    await load();
  };

  const handleDecline = async (invite_id: number) => {
    await api.declineInvite(invite_id);
    setInvites(prev => prev.filter(i => i.id !== invite_id));
  };

  const onlineCount = members.filter(m => m.status !== "offline").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--ash-surface)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded mx-auto flex items-center justify-center" style={{ backgroundColor: "var(--ash-orange)" }}>
            <span className="font-display font-black text-black text-lg">A</span>
          </div>
          <div className="text-sm animate-pulse-orange" style={{ color: "var(--ash-text-dim)" }}>Загрузка ASH...</div>
        </div>
      </div>
    );
  }

  if (showSteamConnect) {
    return (
      <SteamConnect
        onSuccess={u => { setUser(u); setShowSteamConnect(false); load(); }}
        onBack={() => setShowSteamConnect(false)}
      />
    );
  }

  if (showClanSettings && clan && user) {
    return (
      <ClanSettings
        clan={clan}
        members={members}
        user={user}
        onBack={() => setShowClanSettings(false)}
        onUpdated={updatedClan => { setClan(updatedClan); }}
        onMembersChanged={() => { api.getMembers().then(setMembers).catch(() => {}); }}
      />
    );
  }

  if (selectedPlayer) {
    return (
      <PlayerProfile
        member={selectedPlayer}
        currentUser={user}
        clan={clan}
        onBack={() => setSelectedPlayer(null)}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "var(--ash-surface)", color: "var(--ash-text)" }}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showCreateClan && (
        <CreateClanModal onClose={() => setShowCreateClan(false)} onCreated={() => { setShowCreateClan(false); load(); }} />
      )}

      {/* Всплывающие уведомления */}
      <ToastNotifications
        notifications={realtimeState.notifications}
        onNavigate={link => {
          const tabMap: Record<string, Tab> = { chat: "chat", calendar: "calendar", clan: "clan" };
          if (tabMap[link]) setActiveTab(tabMap[link] as Tab);
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        backgroundColor: "var(--metal-deep)",
        borderBottom: "1px solid var(--metal-edge)",
        boxShadow: "0 1px 0 rgba(255,85,0,0.08), 0 4px 20px rgba(0,0,0,0.6)",
      }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Логотип — раскалённый металл */}
            <div
              className="logo-ash w-8 h-8 rounded-sm flex items-center justify-center relative overflow-hidden"
            >
              <span
                className="font-display font-black text-sm relative z-10 lava-text-glow"
                style={{ color: "var(--lava-bright)", letterSpacing: "0.05em" }}
              >A</span>
            </div>
            <div>
              <span
                className="font-display font-black text-sm tracking-widest"
                style={{ color: "#E8D5C0", letterSpacing: "0.2em" }}
              >ASH</span>
            </div>
            {clan && <span className="text-xs font-mono-ash ml-1" style={{ color: "var(--metal-dim)" }}>{clan.tag}</span>}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {clan && <span className="text-xs hidden sm:block" style={{ color: "var(--ash-text-dim)" }}>{clan.name}</span>}
            {clan && <div className="w-px h-4" style={{ backgroundColor: "var(--ash-border)" }} />}
            {onlineCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span style={{ color: "var(--ash-text-dim)" }}>{onlineCount} онлайн</span>
              </div>
            )}
            {user ? (
              <div className="flex items-center gap-2 ml-1">
                {/* Колокольчик уведомлений */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(p => !p);
                      if (!showNotifications && realtimeState.unreadCount > 0) {
                        realtimeControls.markRead();
                      }
                    }}
                    className="w-8 h-8 rounded flex items-center justify-center transition-colors relative"
                    style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
                  >
                    <Icon
                      name="Bell"
                      size={14}
                      style={{ color: realtimeState.unreadCount > 0 ? "var(--ash-orange)" : "var(--ash-text-dim)" }}
                    />
                    {realtimeState.unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-display font-bold animate-fade-in"
                        style={{ backgroundColor: "var(--ash-orange)", color: "#000" }}
                      >
                        {realtimeState.unreadCount > 9 ? "9+" : realtimeState.unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationPanel
                      notifications={realtimeState.notifications}
                      unreadCount={realtimeState.unreadCount}
                      onMarkRead={realtimeControls.markRead}
                      onNavigate={link => {
                        const tabMap: Record<string, Tab> = {
                          chat: "chat", calendar: "calendar", clan: "clan",
                        };
                        if (tabMap[link]) setActiveTab(tabMap[link] as Tab);
                      }}
                      onClose={() => setShowNotifications(false)}
                    />
                  )}
                </div>
                {user.steam_avatar && (
                  <img src={user.steam_avatar} alt={user.steam_nick}
                    className="w-7 h-7 rounded object-cover flex-shrink-0" />
                )}
                <div className="text-xs px-2 py-1 rounded hidden sm:block"
                  style={{ backgroundColor: "var(--metal-raised)", color: "var(--metal-dim)", border: "1px solid var(--metal-edge)" }}>
                  {user.steam_nick}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSteamConnect(true)}
                className="btn-lava px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Icon name="Gamepad2" size={12} />
                Подключить Steam
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="sticky top-14 z-40 overflow-x-auto" style={{
        backgroundColor: "var(--metal-dark)",
        borderBottom: "1px solid var(--metal-edge)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}>
        <div className="max-w-3xl mx-auto px-4 flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-xs font-display uppercase tracking-wider transition-all whitespace-nowrap relative"
              style={{
                color: activeTab === tab.id ? "var(--lava-bright)" : "var(--metal-dim)",
                borderBottom: `2px solid ${activeTab === tab.id ? "var(--lava-bright)" : "transparent"}`,
                marginBottom: "-1px",
                textShadow: activeTab === tab.id ? "0 0 10px rgba(255,122,26,0.6)" : "none",
              }}
            >
              <Icon name={tab.icon} size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* No clan screen for non-tab pages */}
        {user && !clan && activeTab !== "calendar" ? (
          <NoClanScreen user={user} invites={invites} onCreateClan={() => setShowCreateClan(true)}
            onAccept={handleAccept} onDecline={handleDecline} refreshInvites={refreshInvites} />
        ) : !user && activeTab !== "calendar" && activeTab !== "feed" ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-sm" style={{ color: "var(--ash-text-dim)" }}>Войдите чтобы получить доступ к этому разделу</div>
            <button onClick={() => setShowSteamConnect(true)}
              className="btn-lava px-5 py-2.5 flex items-center gap-2 mx-auto">
              <Icon name="Gamepad2" size={15} />
              Подключить Steam
            </button>
          </div>
        ) : (
          <>
            {activeTab === "feed" && <FeedSection clan={clan} activity={activity} />}
            {activeTab === "clan" && <ClanSection clan={clan} members={members} user={user} onInviteClick={() => setShowInvite(true)} onSettingsClick={() => setShowClanSettings(true)} onPlayerClick={setSelectedPlayer} />}
            {activeTab === "calendar" && <CalendarSection user={user} />}
            {activeTab === "chat" && (
              <ChatSection
                user={user}
                realtimeMessages={realtimeState.newMessages}
                onSend={realtimeControls.addOptimisticMessage}
              />
            )}
            {activeTab === "ratings" && <RatingsSection members={members} />}
          </>
        )}
      </main>
    </div>
  );
}
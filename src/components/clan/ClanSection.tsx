import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Clan, Member, ActivityItem, User } from "@/lib/api";
import { MemberAvatar, StatusDot, timeAgo } from "./Modals";

// ─── Activity type icon ───────────────────────────────────────────────────────

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

// ─── Feed Section ─────────────────────────────────────────────────────────────

export function FeedSection({ clan, activity }: { clan: Clan | null; activity: ActivityItem[] }) {
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

export function ClanSection({ clan, members, user, onInviteClick, onSettingsClick, onPlayerClick }: {
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
            <div className="absolute inset-0 opacity-5 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at top left, ${accentColor}, transparent 70%)` }} />
            <div className="relative flex items-start gap-4">
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
                style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ash-orange)"; e.currentTarget.style.color = "var(--ash-orange)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text-dim)"; }}>
                <Icon name="UserPlus" size={14} />
                Пригласить
              </button>
              <button onClick={onSettingsClick}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm transition-all"
                style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ash-orange)"; e.currentTarget.style.color = "var(--ash-orange)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ash-border)"; e.currentTarget.style.color = "var(--ash-text-dim)"; }}>
                <Icon name="Settings" size={14} />
                Настройки
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
                  <MemberAvatar initials={m.steam_nick.slice(0, 2).toUpperCase()} />
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

// ─── Ratings Section ─────────────────────────────────────────────────────────

export function RatingsSection({ members }: { members: Member[] }) {
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

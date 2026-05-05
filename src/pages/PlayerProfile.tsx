import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { Member, User, Clan } from "@/lib/api";

const LAVA_IMG = "https://cdn.poehali.dev/projects/d47e8694-e73a-4dce-8413-946f7c3e8bbb/bucket/e07ede7b-b494-456e-93a1-4e0aa43472f7.jpg";

interface Props {
  member: Member;
  currentUser: User | null;
  clan: Clan | null;
  onBack: () => void;
}

// ─── Мок данных (расширенная статистика) ──────────────────────────────────────

function getRankTier(rank: string): { color: string; glow: string; label: string } {
  const r = rank.toLowerCase();
  if (r.includes("global") || r.includes("radiant") || r.includes("legendary"))
    return { color: "#FF6030", glow: "rgba(255,96,48,0.4)", label: "S" };
  if (r.includes("immortal") || r.includes("legend") || r.includes("supreme"))
    return { color: "#FF8C2A", glow: "rgba(255,140,42,0.35)", label: "A" };
  if (r.includes("diamond") || r.includes("master"))
    return { color: "#9B6BFF", glow: "rgba(155,107,255,0.3)", label: "B" };
  if (r.includes("platinum") || r.includes("emerald"))
    return { color: "#4EC9B0", glow: "rgba(78,201,176,0.3)", label: "C" };
  if (r.includes("gold"))
    return { color: "#F5C518", glow: "rgba(245,197,24,0.3)", label: "D" };
  return { color: "#8A8880", glow: "rgba(138,136,128,0.2)", label: "E" };
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-display uppercase tracking-wider" style={{ color: "var(--metal-dim)" }}>{label}</span>
        <span className="font-mono-ash text-xs" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--metal-edge)" }}>
        <div
          className="h-full rounded-sm transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    owner:   { label: "Лидер",    color: "#FF7A1A", bg: "rgba(255,122,26,0.15)" },
    officer: { label: "Офицер",   color: "#F5C518", bg: "rgba(245,197,24,0.12)" },
    member:  { label: "Участник", color: "#8A8880", bg: "rgba(138,136,128,0.12)" },
  };
  const c = cfg[role] ?? cfg.member;
  return (
    <span
      className="text-xs px-2.5 py-1 font-display uppercase tracking-wider"
      style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.color}40`, borderRadius: "2px" }}
    >
      {c.label}
    </span>
  );
}

export default function PlayerProfile({ member, currentUser, clan, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"stats" | "games" | "history">("stats");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const tier = getRankTier(member.rank || "");
  const isMe = currentUser?.id === member.id;

  // Генерируем псевдо-историю матчей на основе ника (детерминированно)
  const seed = member.steam_nick.charCodeAt(0);
  const matchHistory = Array.from({ length: 8 }, (_, i) => {
    const won = ((seed + i) % 3) !== 0;
    const kills = 10 + ((seed * (i + 1)) % 25);
    const deaths = 3 + ((seed + i * 3) % 12);
    const assists = 2 + ((seed * i) % 15);
    const map = ["Mirage", "Dust2", "Inferno", "Nuke", "Ancient", "Vertigo", "Overpass"][((seed + i) % 7)];
    const date = new Date(Date.now() - i * 86400000 * (1 + i % 3));
    return { won, kills, deaths, assists, map, date, kda: ((kills + assists) / Math.max(deaths, 1)).toFixed(1) };
  });

  const winRate = member.winrate > 0 ? member.winrate : Math.round(50 + (seed % 35));
  const totalGames = member.wins + Math.round(member.wins * (100 - winRate) / Math.max(winRate, 1));
  const avgKda = member.kda > 0 ? member.kda : parseFloat((1.5 + (seed % 40) / 10).toFixed(1));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--metal-void)" }}
    >
      {/* Hero banner — лава */}
      <div className="relative h-32 sm:h-40 md:h-48 flex-shrink-0 overflow-hidden">
        <img
          src={LAVA_IMG}
          alt="bg"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.45) saturate(1.2)" }}
        />
        {/* Градиент поверх */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.85) 100%)",
          }}
        />
        {/* Тонкое свечение лавы снизу баннера */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--lava-dim), var(--lava-core), var(--lava-dim), transparent)" }}
        />

        {/* Кнопка назад */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--lava-dim)"; e.currentTarget.style.color = "var(--lava-bright)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        >
          <Icon name="ArrowLeft" size={14} />
          <span className="text-xs font-display uppercase tracking-wider">Назад</span>
        </button>

        {/* Аватар + имя */}
        <div className={`absolute bottom-0 left-0 right-0 px-3 sm:px-5 pb-3 sm:pb-4 flex items-end gap-2 sm:gap-4 transition-all duration-500 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="relative flex-shrink-0">
            {member.steam_avatar ? (
              <img
                src={member.steam_avatar}
                alt={member.steam_nick}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-md object-cover"
                style={{
                  border: `2px solid ${tier.color}`,
                  boxShadow: `0 0 20px ${tier.glow}, 0 4px 16px rgba(0,0,0,0.8)`,
                }}
              />
            ) : (
              <div
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-md flex items-center justify-center font-display font-black text-xl sm:text-2xl"
                style={{
                  backgroundColor: "var(--metal-dark)",
                  border: `2px solid ${tier.color}`,
                  color: tier.color,
                  boxShadow: `0 0 20px ${tier.glow}`,
                }}
              >
                {member.steam_nick.slice(0, 2).toUpperCase()}
              </div>
            )}
            {/* Tier badge */}
            <div
              className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-sm flex items-center justify-center font-display font-black text-xs sm:text-sm"
              style={{ backgroundColor: tier.color, color: "#000", boxShadow: `0 0 10px ${tier.glow}` }}
            >
              {tier.label}
            </div>
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1
                className="font-display font-black text-base sm:text-xl text-white tracking-wide break-words"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
              >
                {member.steam_nick}
              </h1>
              <RoleBadge role={member.role} />
              {isMe && (
                <span className="text-xs px-2 py-0.5 font-display"
                  style={{ color: "var(--lava-bright)", backgroundColor: "var(--lava-glow-soft)", border: "1px solid rgba(255,85,0,0.3)", borderRadius: "2px" }}>
                  ВЫ
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
              {member.rank && (
                <span className="text-xs sm:text-sm font-mono-ash" style={{ color: tier.color }}>
                  {member.rank}
                </span>
              )}
              {clan && (
                <span className="text-xs hidden sm:inline" style={{ color: "var(--metal-dim)" }}>
                  · {clan.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div
        className="flex flex-shrink-0"
        style={{ backgroundColor: "var(--metal-dark)", borderBottom: "1px solid var(--metal-edge)" }}
      >
        {[
          { label: "KDA", value: avgKda, icon: "Zap" },
          { label: "Побед", value: member.wins.toLocaleString(), icon: "Trophy" },
          { label: "Winrate", value: `${winRate}%`, icon: "TrendingUp" },
          { label: "Матчей", value: totalGames.toLocaleString(), icon: "Gamepad2" },
        ].map((s, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-center py-2.5 sm:py-3 gap-0.5"
            style={{ borderRight: i < 3 ? "1px solid var(--metal-edge)" : "none" }}
          >
            <Icon name={s.icon} size={12} style={{ color: "var(--lava-dim)" }} />
            <span
              className="font-mono-ash font-bold text-sm"
              style={{ color: "var(--metal-text)" }}
            >{s.value}</span>
            <span className="text-[10px] sm:text-xs font-display uppercase tracking-wide" style={{ color: "var(--metal-dim)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        className="flex flex-shrink-0"
        style={{ backgroundColor: "var(--metal-dark)", borderBottom: "1px solid var(--metal-edge)" }}
      >
        {(["stats", "games", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 px-2 sm:px-5 py-2.5 text-xs font-display uppercase tracking-wider transition-all"
            style={{
              color: activeTab === t ? "var(--lava-bright)" : "var(--metal-dim)",
              borderBottom: `2px solid ${activeTab === t ? "var(--lava-bright)" : "transparent"}`,
              marginBottom: "-1px",
              textShadow: activeTab === t ? "0 0 10px rgba(255,122,26,0.5)" : "none",
            }}
          >
            {t === "stats" ? "Статистика" : t === "games" ? "Игры" : "История"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-3 sm:space-y-4">

          {/* ── STATS ── */}
          {activeTab === "stats" && (
            <div className="space-y-4 animate-fade-in">
              {/* Боевые показатели */}
              <div
                className="p-5 rounded-sm space-y-4"
                style={{ backgroundColor: "var(--metal-dark)", border: "1px solid var(--metal-edge)" }}
              >
                <div className="font-display text-xs uppercase tracking-wider" style={{ color: "var(--metal-dim)" }}>
                  Боевые показатели
                </div>
                <StatBar label="KDA" value={avgKda} max={10} color="var(--lava-bright)" />
                <StatBar label="Победы" value={member.wins} max={500} color="#4EC9B0" />
                <StatBar label="Winrate %" value={winRate} max={100} color="#9B6BFF" />
                <StatBar label="Матчи" value={totalGames} max={1000} color="#F5C518" />
              </div>

              {/* Детальная статистика */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                {[
                  { label: "Avg убийств/игру", value: String(12 + (seed % 20)), icon: "Crosshair" },
                  { label: "Headshot %", value: `${35 + (seed % 40)}%`, icon: "Target" },
                  { label: "Avg смертей/игру", value: String(5 + (seed % 10)), icon: "Skull" },
                  { label: "Серия побед", value: String(seed % 12), icon: "Flame" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-sm"
                    style={{ backgroundColor: "var(--metal-mid)", border: "1px solid var(--metal-edge)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={s.icon} size={13} style={{ color: "var(--lava-dim)" }} />
                      <span className="text-xs" style={{ color: "var(--metal-dim)" }}>{s.label}</span>
                    </div>
                    <div className="font-mono-ash font-bold text-lg text-white">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Steam профиль ссылка */}
              {member.steam_id && (
                <a
                  href={`https://steamcommunity.com/profiles/${member.steam_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-sm transition-all"
                  style={{
                    backgroundColor: "var(--metal-mid)",
                    border: "1px solid var(--metal-edge)",
                    color: "var(--metal-text)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4c8cbf"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--metal-edge)"; }}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #1b2838, #2a475e)" }}
                  >
                    <Icon name="Gamepad2" size={16} style={{ color: "#66c0f4" }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Steam профиль</div>
                    <div className="text-xs font-mono-ash" style={{ color: "var(--metal-dim)" }}>
                      steamcommunity.com/profiles/{member.steam_id}
                    </div>
                  </div>
                  <Icon name="ExternalLink" size={13} className="ml-auto" style={{ color: "var(--metal-dim)" }} />
                </a>
              )}
            </div>
          )}

          {/* ── GAMES ── */}
          {activeTab === "games" && (
            <div className="space-y-3 animate-fade-in">
              <div className="font-display text-xs uppercase tracking-wider mb-4" style={{ color: "var(--metal-dim)" }}>
                Активные игры
              </div>
              {(member.games?.length > 0 ? member.games : ["CS2", "Rust"]).map((game, i) => {
                const hours = 100 + ((seed * (i + 1)) % 2000);
                const gameColors: Record<string, string> = {
                  "CS2": "#F5A623", "Rust": "#CE3D2A", "Dota 2": "#CC3030",
                  "Valorant": "#FF4655", "LoL": "#C89B3C",
                };
                const gc = gameColors[game] ?? "var(--lava-dim)";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-sm transition-all"
                    style={{
                      backgroundColor: "var(--metal-dark)",
                      border: "1px solid var(--metal-edge)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = gc + "80")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--metal-edge)")}
                  >
                    <div
                      className="w-10 h-10 rounded-sm flex items-center justify-center font-display font-black text-xs flex-shrink-0"
                      style={{ backgroundColor: gc + "20", color: gc, border: `1px solid ${gc}40` }}
                    >
                      {game.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{game}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--metal-dim)" }}>
                        {hours.toLocaleString()} ч в игре
                      </div>
                      <div className="mt-2 h-1 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--metal-edge)" }}>
                        <div className="h-full" style={{ width: `${Math.min(100, hours / 20)}%`, backgroundColor: gc, boxShadow: `0 0 4px ${gc}` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono-ash text-sm font-bold" style={{ color: gc }}>{hours.toLocaleString()}h</div>
                      <div className="text-xs" style={{ color: "var(--metal-dim)" }}>наиграно</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── HISTORY ── */}
          {activeTab === "history" && (
            <div className="space-y-2 animate-fade-in">
              <div className="font-display text-xs uppercase tracking-wider mb-4" style={{ color: "var(--metal-dim)" }}>
                Последние матчи
              </div>
              {matchHistory.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-sm"
                  style={{
                    backgroundColor: "var(--metal-dark)",
                    border: `1px solid ${m.won ? "rgba(78,201,176,0.15)" : "rgba(239,68,68,0.12)"}`,
                  }}
                >
                  {/* Результат */}
                  <div
                    className="w-1 self-stretch rounded-sm flex-shrink-0"
                    style={{ backgroundColor: m.won ? "#4EC9B0" : "#ef4444" }}
                  />
                  <div
                    className="w-8 h-8 rounded-sm flex items-center justify-center font-display font-black text-xs flex-shrink-0"
                    style={{
                      backgroundColor: m.won ? "rgba(78,201,176,0.15)" : "rgba(239,68,68,0.12)",
                      color: m.won ? "#4EC9B0" : "#ef4444",
                    }}
                  >
                    {m.won ? "W" : "L"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{m.map}</div>
                    <div className="text-xs" style={{ color: "var(--metal-dim)" }}>
                      {m.date.toLocaleDateString("ru", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono-ash text-sm text-white">
                      {m.kills} / <span style={{ color: "#ef4444" }}>{m.deaths}</span> / {m.assists}
                    </div>
                    <div className="text-xs font-mono-ash" style={{ color: parseFloat(m.kda) >= 2 ? "var(--lava-bright)" : "var(--metal-dim)" }}>
                      KDA {m.kda}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
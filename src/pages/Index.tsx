import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "feed" | "clan" | "calendar" | "chat" | "ratings";

// ─── Mock data ────────────────────────────────────────────────────────────────

const CLAN = {
  name: "SHADOW WOLVES",
  tag: "[SW]",
  level: 42,
  members: 24,
  maxMembers: 30,
  rank: "Diamond",
  founded: "2019",
  wins: 1847,
  losses: 412,
  winrate: 81.8,
};

const ACTIVITY = [
  { id: 1, user: "Vortex_X", avatar: "VX", action: "выиграл матч в CS2", game: "CS2", time: "2 мин назад", type: "win", steam: true },
  { id: 2, user: "ShadowByte", avatar: "SB", action: "присоединился к клану", game: null, time: "18 мин назад", type: "join", steam: false },
  { id: 3, user: "NightHunter", avatar: "NH", action: "достиг звания Легенда", game: "Dota 2", time: "1 ч назад", type: "rank", steam: true },
  { id: 4, user: "CryptoKill", avatar: "CK", action: "набрал 42 убийства в матче", game: "CS2", time: "2 ч назад", type: "record", steam: true },
  { id: 5, user: "GhostMind", avatar: "GM", action: "выиграл турнир #12", game: "Valorant", time: "3 ч назад", type: "win", steam: false },
  { id: 6, user: "Vortex_X", avatar: "VX", action: "обновил Steam-профиль", game: "Steam", time: "5 ч назад", type: "steam", steam: true },
  { id: 7, user: "ZeroLatency", avatar: "ZL", action: "создал событие «Ночной рейд»", game: null, time: "6 ч назад", type: "event", steam: false },
  { id: 8, user: "ShadowByte", avatar: "SB", action: "новый рекорд KDA 8.4", game: "CS2", time: "8 ч назад", type: "record", steam: true },
];

const MEMBERS = [
  { id: 1, name: "Vortex_X", role: "Лидер", rank: "Global Elite", games: ["CS2", "Dota 2"], status: "online", kda: 3.2, wins: 412, steam: "vortex_x_steam" },
  { id: 2, name: "NightHunter", role: "Офицер", rank: "Легенда", games: ["Dota 2", "LoL"], status: "in-game", kda: 4.1, wins: 387, steam: "nighthunter99" },
  { id: 3, name: "CryptoKill", role: "Офицер", rank: "Global Elite", games: ["CS2"], status: "online", kda: 5.7, wins: 299, steam: "cryptokill_" },
  { id: 4, name: "GhostMind", role: "Участник", rank: "Diamond", games: ["Valorant", "CS2"], status: "offline", kda: 2.8, wins: 201, steam: null },
  { id: 5, name: "ShadowByte", role: "Участник", rank: "Immortal", games: ["CS2"], status: "in-game", kda: 3.9, wins: 178, steam: "shadowbyte_gg" },
  { id: 6, name: "ZeroLatency", role: "Участник", rank: "Radiant", games: ["Valorant"], status: "online", kda: 6.2, wins: 312, steam: "zerolatency" },
  { id: 7, name: "PhantomEdge", role: "Участник", rank: "Supreme", games: ["CS2", "Valorant"], status: "offline", kda: 2.4, wins: 145, steam: null },
  { id: 8, name: "IronClad77", role: "Новичок", rank: "Platinum", games: ["Dota 2"], status: "online", kda: 1.9, wins: 88, steam: "ironclad_77" },
];

const EVENTS = [
  { id: 1, date: "08 МАЯ", day: "Чт", title: "Ночной рейд CS2", type: "Клановый матч", participants: 8, max: 10, time: "22:00", urgent: true },
  { id: 2, date: "10 МАЯ", day: "Сб", title: "Турнир «Пепел»", type: "Турнир", participants: 24, max: 24, time: "18:00", urgent: false },
  { id: 3, date: "12 МАЯ", day: "Пн", title: "Тренировочный сбор", type: "Тренировка", participants: 5, max: 15, time: "20:00", urgent: false },
  { id: 4, date: "15 МАЯ", day: "Чт", title: "Стрим клана", type: "Стрим", participants: 3, max: 5, time: "19:00", urgent: false },
  { id: 5, date: "18 МАЯ", day: "Вс", title: "Grand Final Dota 2", type: "Турнир", participants: 12, max: 12, time: "16:00", urgent: false },
];

const MESSAGES = [
  { id: 1, user: "Vortex_X", avatar: "VX", text: "Всем готовиться к турниру в субботу!", time: "21:42", role: "Лидер" },
  { id: 2, user: "CryptoKill", avatar: "CK", text: "Я в деле. Кто ещё?", time: "21:43", role: "Офицер" },
  { id: 3, user: "NightHunter", avatar: "NH", text: "Я и ZeroLatency точно будем", time: "21:44", role: "Офицер" },
  { id: 4, user: "ShadowByte", avatar: "SB", text: "Кто-нибудь видел стату противников? Там серьёзные ребята из TOP-10", time: "21:45", role: "Участник" },
  { id: 5, user: "Vortex_X", avatar: "VX", text: "Видел. Нам нужна чёткая стратегия. Завтра в 20:00 разбор тактик в войсе", time: "21:46", role: "Лидер" },
  { id: 6, user: "ZeroLatency", avatar: "ZL", text: "Буду. Уже скачал демки их последних матчей", time: "21:47", role: "Участник" },
  { id: 7, user: "GhostMind", avatar: "GM", text: "можно я тоже зайду послушать?", time: "21:50", role: "Участник" },
  { id: 8, user: "Vortex_X", avatar: "VX", text: "Конечно, всем участвовать обязательно!", time: "21:51", role: "Лидер" },
];

const TOP_PLAYERS = [
  { rank: 1, name: "ZeroLatency", kda: 6.2, wins: 312, winrate: 89, game: "Valorant", delta: "+0.3" },
  { rank: 2, name: "CryptoKill", kda: 5.7, wins: 299, winrate: 86, game: "CS2", delta: "+0.8" },
  { rank: 3, name: "NightHunter", kda: 4.1, wins: 387, winrate: 85, game: "Dota 2", delta: "-0.1" },
  { rank: 4, name: "ShadowByte", kda: 3.9, wins: 178, winrate: 78, game: "CS2", delta: "+0.4" },
  { rank: 5, name: "Vortex_X", kda: 3.2, wins: 412, winrate: 82, game: "CS2", delta: "-0.2" },
  { rank: 6, name: "GhostMind", kda: 2.8, wins: 201, winrate: 74, game: "Valorant", delta: "+0.1" },
  { rank: 7, name: "PhantomEdge", kda: 2.4, wins: 145, winrate: 71, game: "CS2", delta: "-0.5" },
  { rank: 8, name: "IronClad77", kda: 1.9, wins: 88, winrate: 62, game: "Dota 2", delta: "+0.2" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    online: "bg-green-400",
    "in-game": "bg-orange-400",
    offline: "bg-gray-600",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-gray-600"}`} />;
};

const MemberAvatar = ({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div
      className={`${sizes[size]} rounded-md flex items-center justify-center font-display font-semibold flex-shrink-0`}
      style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-orange)" }}
    >
      {initials}
    </div>
  );
};

const ActivityTypeIcon = ({ type }: { type: string }) => {
  const map: Record<string, { icon: string; color: string }> = {
    win: { icon: "Trophy", color: "#facc15" },
    join: { icon: "UserPlus", color: "#4ade80" },
    rank: { icon: "Star", color: "#fb923c" },
    record: { icon: "Zap", color: "#fb923c" },
    steam: { icon: "RefreshCw", color: "#38bdf8" },
    event: { icon: "Calendar", color: "#a78bfa" },
  };
  const m = map[type] ?? { icon: "Circle", color: "#666" };
  return <Icon name={m.icon} size={12} style={{ color: m.color }} />;
};

// ─── Sections ─────────────────────────────────────────────────────────────────

function FeedSection() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Побед", value: CLAN.wins.toLocaleString(), icon: "Trophy" },
          { label: "Winrate", value: `${CLAN.winrate}%`, icon: "TrendingUp" },
          { label: "Участников", value: `${CLAN.members}/${CLAN.maxMembers}`, icon: "Users" },
        ].map((s, i) => (
          <div
            key={i}
            className="p-4 rounded-md animate-fade-in"
            style={{
              backgroundColor: "var(--ash-surface-2)",
              border: "1px solid var(--ash-border)",
              animationDelay: `${i * 0.07}s`,
              opacity: 0,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name={s.icon} size={12} style={{ color: "var(--ash-orange)" }} />
              <span className="text-xs uppercase tracking-wider font-display" style={{ color: "var(--ash-text-dim)" }}>{s.label}</span>
            </div>
            <div className="font-display font-bold text-xl text-white">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="font-display text-xs uppercase tracking-widest" style={{ color: "var(--ash-text-dim)" }}>Лента активности</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--ash-border)" }} />
        <span className="text-xs font-mono-ash" style={{ color: "var(--ash-text-dim)" }}>{ACTIVITY.length} событий</span>
      </div>

      <div className="space-y-1">
        {ACTIVITY.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer animate-fade-in transition-colors"
            style={{ animationDelay: `${0.2 + i * 0.05}s`, opacity: 0 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--ash-surface-3)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
          >
            <MemberAvatar initials={item.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{item.user}</span>
                {item.steam && <Icon name="Gamepad2" size={11} style={{ color: "#38bdf8" }} />}
                <ActivityTypeIcon type={item.type} />
              </div>
              <div className="text-xs truncate" style={{ color: "var(--ash-text-dim)" }}>
                {item.action}
                {item.game && <span className="ml-1" style={{ color: "var(--ash-orange)", opacity: 0.7 }}>· {item.game}</span>}
              </div>
            </div>
            <span className="text-xs font-mono-ash whitespace-nowrap" style={{ color: "var(--ash-text-dim)" }}>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClanSection() {
  const [activeTab, setActiveTab] = useState<"info" | "members">("info");

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 rounded-md w-fit" style={{ backgroundColor: "var(--ash-surface-2)" }}>
        {(["info", "members"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-4 py-1.5 rounded text-sm font-display font-medium transition-all"
            style={
              activeTab === t
                ? { backgroundColor: "var(--ash-orange)", color: "#000" }
                : { color: "var(--ash-text-dim)" }
            }
          >
            {t === "info" ? "Информация" : `Участники (${MEMBERS.length})`}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="space-y-4 animate-fade-in">
          <div
            className="p-5 rounded-md"
            style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", borderLeft: "2px solid var(--ash-orange)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display font-bold text-2xl text-white tracking-wider">{CLAN.tag}</div>
                <div className="text-sm mt-0.5" style={{ color: "var(--ash-text-dim)" }}>{CLAN.name}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-lg" style={{ color: "var(--ash-orange)" }}>{CLAN.rank}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>Уровень {CLAN.level}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Основан", value: CLAN.founded },
                { label: "Участников", value: `${CLAN.members} / ${CLAN.maxMembers}` },
                { label: "Побед", value: CLAN.wins.toLocaleString() },
                { label: "Поражений", value: CLAN.losses.toLocaleString() },
              ].map((r, i) => (
                <div key={i}>
                  <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--ash-text-dim)" }}>{r.label}</div>
                  <div className="font-mono-ash text-sm text-white">{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-md" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
            <div className="text-xs uppercase tracking-wider mb-3 font-display" style={{ color: "var(--ash-text-dim)" }}>Winrate клана</div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--ash-surface-3)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${CLAN.winrate}%`, background: "linear-gradient(90deg, #FF6B1A, #FF9A4D)" }}
                />
              </div>
              <span className="font-display font-bold text-sm" style={{ color: "var(--ash-orange)" }}>{CLAN.winrate}%</span>
            </div>
            <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>Входит в топ 5% кланов</div>
          </div>

          <div className="p-5 rounded-md" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
            <div className="text-xs uppercase tracking-wider mb-3 font-display" style={{ color: "var(--ash-text-dim)" }}>Быстрые действия</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Пригласить игрока", icon: "UserPlus" },
                { label: "Редактировать клан", icon: "Settings" },
                { label: "Войновой журнал", icon: "BookOpen" },
                { label: "Экспорт статистики", icon: "Download" },
              ].map((a, i) => (
                <button
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-all"
                  style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-text)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--ash-orange)";
                    e.currentTarget.style.color = "var(--ash-orange)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--ash-border)";
                    e.currentTarget.style.color = "var(--ash-text)";
                  }}
                >
                  <Icon name={a.icon} size={13} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-1 animate-fade-in">
          {MEMBERS.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all"
              style={{ border: "1px solid transparent" }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = "var(--ash-surface-3)";
                e.currentTarget.style.borderColor = "var(--ash-border)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div className="relative">
                <MemberAvatar initials={m.name.slice(0, 2).toUpperCase()} size="md" />
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={m.status} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{m.name}</span>
                  {m.steam && <Icon name="Gamepad2" size={11} style={{ color: "#38bdf8" }} />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{m.role}</span>
                  <span style={{ color: "var(--ash-text-dim)" }}>·</span>
                  <span className="text-xs" style={{ color: "var(--ash-orange)" }}>{m.rank}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono-ash text-sm text-white">KDA {m.kda}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{m.wins} побед</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-white">Май 2026</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--ash-text-dim)" }}>5 предстоящих событий</div>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-display font-medium transition-colors text-black"
          style={{ backgroundColor: "var(--ash-orange)" }}
        >
          <Icon name="Plus" size={13} />
          Событие
        </button>
      </div>

      <div className="space-y-2">
        {EVENTS.map((ev, i) => (
          <div
            key={ev.id}
            className="flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all animate-fade-in"
            style={{
              backgroundColor: "var(--ash-surface-2)",
              border: `1px solid ${ev.urgent ? "rgba(255,107,26,0.5)" : "var(--ash-border)"}`,
              animationDelay: `${i * 0.07}s`,
              opacity: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = ev.urgent ? "rgba(255,107,26,0.5)" : "var(--ash-border)")}
          >
            <div className="text-center flex-shrink-0 w-12">
              <div className="text-xs uppercase" style={{ color: "var(--ash-text-dim)" }}>{ev.date.split(" ")[1]}</div>
              <div className="font-display font-bold text-xl text-white leading-none">{ev.date.split(" ")[0]}</div>
              <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{ev.day}</div>
            </div>
            <div className="w-px h-10 flex-shrink-0" style={{ backgroundColor: "var(--ash-border)" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {ev.urgent && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-orange" style={{ backgroundColor: "#fb923c" }} />
                )}
                <span className="text-sm font-medium text-white">{ev.title}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{ev.type}</span>
                <span className="text-xs font-mono-ash" style={{ color: "var(--ash-orange)" }}>{ev.time}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-mono-ash text-white">{ev.participants}/{ev.max}</div>
              <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>игроков</div>
              <button
                className="mt-1 text-xs px-2 py-0.5 rounded transition-all"
                style={{ border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--ash-orange)";
                  e.currentTarget.style.color = "var(--ash-orange)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--ash-border)";
                  e.currentTarget.style.color = "var(--ash-text-dim)";
                }}
              >
                Участвовать
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatSection() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(MESSAGES);

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: prev.length + 1, user: "Вы", avatar: "ВЫ", text: input.trim(), time: "сейчас", role: "Участник" },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--ash-border)" }}>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-orange" />
        <span className="text-xs uppercase font-display tracking-wider" style={{ color: "var(--ash-text-dim)" }}>Общий чат</span>
        <span className="text-xs font-mono-ash ml-auto" style={{ color: "var(--ash-text-dim)" }}>
          {MEMBERS.filter(m => m.status !== "offline").length} онлайн
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <div key={msg.id} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
            <MemberAvatar initials={msg.avatar} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{msg.user}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--ash-surface-3)", color: "var(--ash-text-dim)" }}
                >
                  {msg.role}
                </span>
                <span className="text-xs font-mono-ash ml-auto" style={{ color: "var(--ash-text-dim)" }}>{msg.time}</span>
              </div>
              <div className="text-sm leading-relaxed" style={{ color: "var(--ash-text)" }}>{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--ash-border)" }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Написать в чат..."
            className="flex-1 px-3 py-2.5 text-sm text-white rounded-md focus:outline-none transition-colors"
            style={{
              backgroundColor: "var(--ash-surface-3)",
              border: "1px solid var(--ash-border)",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
          />
          <button
            onClick={send}
            className="px-4 py-2.5 rounded-md text-black transition-colors"
            style={{ backgroundColor: "var(--ash-orange)" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Icon name="Send" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingsSection() {
  const [sortBy, setSortBy] = useState<"kda" | "wins" | "winrate">("kda");

  const sorted = [...TOP_PLAYERS].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase font-display tracking-wider mr-2" style={{ color: "var(--ash-text-dim)" }}>Сортировка:</span>
        {(["kda", "wins", "winrate"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className="px-3 py-1 rounded text-xs font-display uppercase tracking-wider transition-all"
            style={
              sortBy === s
                ? { backgroundColor: "var(--ash-orange)", color: "#000" }
                : { backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }
            }
          >
            {s === "kda" ? "KDA" : s === "wins" ? "Победы" : "Winrate"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((p, i) => {
          const rankColor = i === 0 ? "#facc15" : i === 1 ? "#9ca3af" : i === 2 ? "#cd7c3a" : "var(--ash-text-dim)";
          const rankLabel = i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : `${i + 1}`;
          return (
            <div
              key={p.name}
              className="flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all animate-fade-in"
              style={{
                backgroundColor: "var(--ash-surface-2)",
                border: `1px solid ${i === 0 ? "rgba(250,204,21,0.3)" : "var(--ash-border)"}`,
                animationDelay: `${i * 0.05}s`,
                opacity: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = i === 0 ? "rgba(250,204,21,0.3)" : "var(--ash-border)")}
            >
              <div className="font-display font-bold text-base w-6 flex-shrink-0 text-center" style={{ color: rankColor }}>
                {rankLabel}
              </div>
              <MemberAvatar initials={p.name.slice(0, 2).toUpperCase()} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{p.name}</div>
                <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{p.game}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                {[
                  { key: "kda", label: "KDA", val: p.kda },
                  { key: "wins", label: "Победы", val: p.wins },
                  { key: "winrate", label: "WR%", val: `${p.winrate}%` },
                ].map(col => (
                  <div key={col.key}>
                    <div
                      className="font-mono-ash text-sm font-medium"
                      style={{ color: sortBy === col.key ? "var(--ash-orange)" : "white" }}
                    >
                      {col.val}
                    </div>
                    <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>{col.label}</div>
                  </div>
                ))}
              </div>
              <div
                className="text-xs font-mono-ash ml-2 w-10 text-right"
                style={{ color: p.delta.startsWith("+") ? "#4ade80" : "#f87171" }}
              >
                {p.delta}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="p-4 mt-4 rounded-md"
        style={{ backgroundColor: "var(--ash-surface-2)", border: "1px dashed var(--ash-border)" }}
      >
        <div className="flex items-center gap-3">
          <Icon name="Gamepad2" size={16} style={{ color: "#38bdf8" }} />
          <div>
            <div className="text-sm text-white font-medium">Steam-синхронизация</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--ash-text-dim)" }}>
              Подключите Steam для автообновления статистики игроков клана
            </div>
          </div>
          <button
            className="ml-auto px-3 py-1.5 rounded text-xs font-display transition-all flex-shrink-0"
            style={{ border: "1px solid #0369a1", color: "#38bdf8" }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = "#0369a1";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.color = "#38bdf8";
            }}
          >
            Подключить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "feed", label: "Лента", icon: "Activity" },
  { id: "clan", label: "Клан", icon: "Shield" },
  { id: "calendar", label: "События", icon: "Calendar" },
  { id: "chat", label: "Чат", icon: "MessageSquare" },
  { id: "ratings", label: "Рейтинг", icon: "BarChart2" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "var(--ash-surface)", color: "var(--ash-text)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{ backgroundColor: "var(--ash-surface)", borderBottom: "1px solid var(--ash-border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "var(--ash-orange)" }}
            >
              <span className="font-display font-black text-xs text-black tracking-wider">A</span>
            </div>
            <span className="font-display font-bold text-sm tracking-widest text-white">ASH</span>
            <span className="text-xs font-mono-ash ml-1" style={{ color: "var(--ash-text-dim)" }}>{CLAN.tag}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-xs hidden sm:block" style={{ color: "var(--ash-text-dim)" }}>{CLAN.name}</span>
            <div className="w-px h-4" style={{ backgroundColor: "var(--ash-border)" }} />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span style={{ color: "var(--ash-text-dim)" }}>{MEMBERS.filter(m => m.status !== "offline").length} онлайн</span>
            </div>
            <button
              className="w-8 h-8 rounded flex items-center justify-center ml-1 transition-colors"
              style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
            >
              <Icon name="Bell" size={14} style={{ color: "var(--ash-text-dim)" }} />
            </button>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <nav
        className="sticky top-14 z-40 overflow-x-auto"
        style={{ backgroundColor: "var(--ash-surface-2)", borderBottom: "1px solid var(--ash-border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-xs font-display uppercase tracking-wider transition-all whitespace-nowrap"
              style={{
                borderBottom: `2px solid ${activeTab === tab.id ? "var(--ash-orange)" : "transparent"}`,
                color: activeTab === tab.id ? "var(--ash-orange)" : "var(--ash-text-dim)",
                marginBottom: "-1px",
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
        {activeTab === "feed" && <FeedSection />}
        {activeTab === "clan" && <ClanSection />}
        {activeTab === "calendar" && <CalendarSection />}
        {activeTab === "chat" && <ChatSection />}
        {activeTab === "ratings" && <RatingsSection />}
      </main>
    </div>
  );
}
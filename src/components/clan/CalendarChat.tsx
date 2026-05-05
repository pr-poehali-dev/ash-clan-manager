import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { User, ClanEvent, ChatMessage } from "@/lib/api";
import { MemberAvatar } from "./Modals";

// ─── Calendar helpers ─────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-sm p-4 sm:p-6 rounded-t-xl sm:rounded-lg animate-fade-in overflow-y-auto"
        style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", maxHeight: "90dvh" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-white">Новое событие</div>
          <button onClick={onClose}><Icon name="X" size={16} style={{ color: "var(--ash-text-dim)" }} /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Название", key: "title", placeholder: "Ночной рейд CS2" },
            { label: "Игра", key: "game", placeholder: "CS2" },
            { label: "Макс участников", key: "max", placeholder: "10" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs uppercase font-display tracking-wider block mb-1" style={{ color: "var(--ash-text-dim)" }}>{f.label}</label>
              <input value={form[f.key as keyof typeof form] as string}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                type={f.key === "max" ? "number" : "text"}
                className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")} />
            </div>
          ))}
          <div>
            <label className="text-xs uppercase font-display tracking-wider block mb-2" style={{ color: "var(--ash-text-dim)" }}>Тип</label>
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
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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

export function CalendarSection({ user }: { user: User | null }) {
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

export function ChatSection({
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

  useEffect(() => {
    api.getMessages().then(msgs => {
      setBase(msgs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allMessages = (() => {
    const ids = new Set(base.map(m => m.id));
    const fresh = realtimeMessages.filter(m => !ids.has(m.id));
    return [...base, ...fresh];
  })();

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
        <span className="font-display text-xs uppercase tracking-widest text-white">Клановый чат</span>
        <div className="flex-1" />
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--ash-orange)" }} />
        <span className="text-xs font-mono-ash" style={{ color: "var(--ash-text-dim)" }}>live</span>
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
            className="btn-lava px-4 py-2.5 flex-shrink-0 flex items-center justify-center"
            style={{ opacity: user && !sending && input.trim() ? 1 : 0.4 }}
          >
            <Icon name={sending ? "RefreshCw" : "Send"} size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
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

// ─── Emoji Picker ─────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: "😀", items: ["😀","😂","🥹","😊","😎","🤩","😍","🥰","😘","😏","😤","😡","🤬","😭","😢","😱","🤯","🥳","🫡","🤝"] },
  { label: "👍", items: ["👍","👎","👏","🙌","🤜","🤛","✊","👊","🫶","❤️","🔥","💯","⚡","🎯","🏆","💀","🎮","🛡️","⚔️","💣"] },
  { label: "😸", items: ["😺","😸","😹","😻","🙀","😿","🐶","🐺","🦊","🐉","🦁","🐯","🐻","🦝","🐼","🦄","🐸","🦋","🦅","🐍"] },
];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
      style={{ backgroundColor: "var(--metal-dark)", border: "1px solid var(--metal-edge)", width: 280 }}>
      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--metal-edge)" }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button key={i} onClick={() => setTab(i)}
            className="flex-1 py-2 text-lg transition-all"
            style={{ backgroundColor: tab === i ? "var(--metal-raised)" : "transparent" }}>
            {g.label}
          </button>
        ))}
      </div>
      {/* Grid */}
      <div className="p-2 grid grid-cols-10 gap-0.5 max-h-40 overflow-y-auto">
        {EMOJI_GROUPS[tab].items.map(e => (
          <button key={e} onClick={() => onSelect(e)}
            className="w-7 h-7 flex items-center justify-center text-base rounded hover:bg-white/10 transition-colors">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── GIF Picker ───────────────────────────────────────────────────────────────

const GIF_CATEGORIES = [
  { label: "🏆 Победа", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  { label: "🔥 Огонь", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { label: "👊 ГГ", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  { label: "😂 Смех", url: "https://media.giphy.com/media/10LKovKon8DENq/giphy.gif" },
  { label: "💀 RIP", url: "https://media.giphy.com/media/26gscSULUcfKU7dHq/giphy.gif" },
  { label: "⚡ Lets go", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
];

function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 rounded-xl shadow-2xl z-50 animate-fade-in"
      style={{ backgroundColor: "var(--metal-dark)", border: "1px solid var(--metal-edge)", width: 280 }}>
      <div className="p-2">
        <div className="text-xs font-display uppercase tracking-wider mb-2" style={{ color: "var(--metal-dim)" }}>Быстрые GIF</div>
        <div className="grid grid-cols-2 gap-1.5">
          {GIF_CATEGORIES.map(g => (
            <button key={g.url} onClick={() => onSelect(g.url)}
              className="relative rounded-lg overflow-hidden group"
              style={{ aspectRatio: "16/9" }}>
              <img src={g.url} alt={g.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-end p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white">{g.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Voice Recorder ───────────────────────────────────────────────────────────

function VoiceRecorder({ onSend, onCancel }: { onSend: (blob: Blob, duration: number) => void; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [stopped, setStopped] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startTime) / 1000)), 500);
    }).catch(() => onCancel());

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    if (!recorderRef.current) return;
    setStopped(true);
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onSend(blob, seconds);
    };
    recorderRef.current.stop();
    recorderRef.current.stream.getTracks().forEach(t => t.stop());
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl animate-fade-in"
      style={{ backgroundColor: "var(--metal-mid)", border: "1px solid rgba(255,85,0,0.3)" }}>
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <span className="font-mono-ash text-sm text-white flex-1">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </span>
      <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: "var(--metal-edge)", color: "var(--metal-dim)" }}>
        <Icon name="X" size={14} />
      </button>
      <button onClick={stop} disabled={stopped}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: stopped ? "var(--metal-edge)" : "var(--lava-core)", color: "#fff" }}>
        <Icon name={stopped ? "RefreshCw" : "Square"} size={14} />
      </button>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imgOpen, setImgOpen] = useState(false);

  const toggleAudio = () => {
    if (!msg.voice_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(msg.voice_url);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmtDur = (s?: number | null) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "0:00";

  return (
    <div className="flex items-start gap-3 animate-fade-in group">
      {msg.steam_avatar ? (
        <img src={msg.steam_avatar} alt={msg.user_nick} className="w-7 h-7 rounded-md flex-shrink-0 object-cover" />
      ) : (
        <MemberAvatar initials={msg.user_nick.slice(0, 2).toUpperCase()} size="sm" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ color: isMe ? "var(--ash-orange)" : "white" }}>
            {msg.user_nick}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--ash-surface-3)", color: "var(--ash-text-dim)" }}>
            {msg.role}
          </span>
          <span className="text-xs font-mono-ash ml-auto" style={{ color: "var(--ash-text-dim)" }}>
            {new Date(msg.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Текст */}
        {msg.msg_type === "text" && (
          <div className="text-sm leading-relaxed" style={{ color: "var(--ash-text)" }}>{msg.text}</div>
        )}

        {/* Фото */}
        {msg.msg_type === "image" && msg.image_url && (
          <>
            <div className="cursor-pointer rounded-lg overflow-hidden" style={{ maxWidth: 260 }} onClick={() => setImgOpen(true)}>
              <img src={msg.image_url} alt="фото" className="w-full h-auto rounded-lg" style={{ maxHeight: 200, objectFit: "cover" }} />
            </div>
            {imgOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90" onClick={() => setImgOpen(false)}>
                <img src={msg.image_url} alt="фото" className="max-w-full max-h-full rounded-xl" style={{ maxHeight: "90dvh" }} />
              </div>
            )}
          </>
        )}

        {/* GIF */}
        {msg.msg_type === "gif" && msg.gif_url && (
          <div className="rounded-lg overflow-hidden" style={{ maxWidth: 260 }}>
            <img src={msg.gif_url} alt="gif" className="w-full h-auto rounded-lg" style={{ maxHeight: 160, objectFit: "cover" }} />
          </div>
        )}

        {/* Голосовое */}
        {msg.msg_type === "voice" && msg.voice_url && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: "var(--metal-raised)", maxWidth: 240 }}>
            <button onClick={toggleAudio}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{ backgroundColor: playing ? "var(--lava-core)" : "var(--lava-dim)", color: "#fff" }}>
              <Icon name={playing ? "Pause" : "Play"} size={14} />
            </button>
            <div className="flex-1">
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--metal-edge)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, backgroundColor: "var(--lava-bright)" }} />
              </div>
              <div className="text-xs mt-1 font-mono-ash" style={{ color: "var(--metal-dim)" }}>{fmtDur(msg.duration)}</div>
            </div>
            <Icon name="Mic" size={12} style={{ color: "var(--metal-dim)" }} />
          </div>
        )}
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMessages().then(msgs => { setBase(msgs); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const allMessages = (() => {
    const ids = new Set(base.map(m => m.id));
    const fresh = realtimeMessages.filter(m => !ids.has(m.id));
    return [...base, ...fresh];
  })();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages.length]);

  const addMsg = useCallback((msg: ChatMessage) => {
    setBase(prev => [...prev, msg]);
    onSend(msg);
  }, [onSend]);

  // Отправка текста
  const sendText = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const msg = await api.sendMessage({ msg_type: "text", text }).catch(() => null);
    setSending(false);
    if (msg) addMsg(msg);
  };

  // Отправка фото
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const b64 = await fileToBase64(file);
      const folder = file.type === "image/gif" ? "gifs" : "images";
      const url = await api.uploadChatMedia(b64, file.type, folder);
      const msgType = file.type === "image/gif" ? "gif" : "image";
      const msg = await api.sendMessage(
        msgType === "gif" ? { msg_type: "gif", gif_url: url } : { msg_type: "image", image_url: url }
      ).catch(() => null);
      if (msg) addMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  // Голосовое сообщение
  const handleVoice = async (blob: Blob, duration: number) => {
    setRecording(false);
    setUploading(true);
    try {
      const b64 = await blobToBase64(blob);
      const url = await api.uploadChatMedia(b64, "audio/webm", "voice");
      const msg = await api.sendMessage({ msg_type: "voice", voice_url: url, duration }).catch(() => null);
      if (msg) addMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  // Отправка GIF
  const handleGif = async (gifUrl: string) => {
    setShowGif(false);
    setSending(true);
    const msg = await api.sendMessage({ msg_type: "gif", gif_url: gifUrl }).catch(() => null);
    setSending(false);
    if (msg) addMsg(msg);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--ash-border)" }}>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-orange" />
        <span className="font-display text-xs uppercase tracking-widest text-white">Клановый чат</span>
        <div className="flex-1" />
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--ash-orange)" }} />
        <span className="text-xs font-mono-ash" style={{ color: "var(--ash-text-dim)" }}>live</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {loading && <div className="text-center py-8 text-sm" style={{ color: "var(--ash-text-dim)" }}>Загрузка...</div>}
        {!loading && allMessages.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: "var(--ash-text-dim)" }}>Начните общение с кланом!</div>
        )}
        {allMessages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isMe={msg.user_nick === user?.steam_nick} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--ash-border)" }}>
        {uploading && (
          <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: "var(--lava-bright)" }}>
            <Icon name="RefreshCw" size={12} />
            Загрузка файла...
          </div>
        )}

        {recording ? (
          <VoiceRecorder onSend={handleVoice} onCancel={() => setRecording(false)} />
        ) : (
          <div className="flex flex-col gap-2">
            {/* Медиакнопки */}
            <div className="relative flex items-center gap-1">
              {/* Эмодзи */}
              <div className="relative">
                {showEmoji && (
                  <EmojiPicker onSelect={e => { setInput(p => p + e); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />
                )}
                <button onClick={() => { setShowEmoji(p => !p); setShowGif(false); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all text-lg"
                  style={{ backgroundColor: showEmoji ? "var(--metal-raised)" : "transparent", color: "var(--metal-dim)" }}
                  title="Эмодзи">
                  😊
                </button>
              </div>

              {/* GIF */}
              <div className="relative">
                {showGif && <GifPicker onSelect={handleGif} onClose={() => setShowGif(false)} />}
                <button onClick={() => { setShowGif(p => !p); setShowEmoji(false); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all text-xs font-display font-bold"
                  style={{ backgroundColor: showGif ? "var(--metal-raised)" : "transparent", color: "var(--metal-dim)", border: "1px solid var(--metal-edge)" }}
                  title="GIF">
                  GIF
                </button>
              </div>

              {/* Фото из галереи */}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ backgroundColor: "transparent", color: "var(--metal-dim)" }}
                title="Фото из галереи">
                <Icon name="Image" size={16} />
              </button>

              {/* Камера */}
              <button onClick={() => cameraInputRef.current?.click()}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ backgroundColor: "transparent", color: "var(--metal-dim)" }}
                title="Сделать фото">
                <Icon name="Camera" size={16} />
              </button>

              {/* Голосовое */}
              {user && (
                <button onClick={() => { setShowEmoji(false); setShowGif(false); setRecording(true); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{ backgroundColor: "transparent", color: "var(--metal-dim)" }}
                  title="Голосовое сообщение">
                  <Icon name="Mic" size={16} />
                </button>
              )}
            </div>

            {/* Текстовое поле */}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendText()}
                placeholder={user ? "Написать в чат..." : "Войдите чтобы писать в чат"}
                disabled={!user || sending || uploading}
                className="flex-1 px-3 py-2.5 text-sm text-white rounded-md focus:outline-none transition-colors"
                style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
              />
              <button
                onClick={sendText}
                disabled={!user || sending || !input.trim() || uploading}
                className="btn-lava px-4 py-2.5 flex-shrink-0 flex items-center justify-center"
                style={{ opacity: user && !sending && input.trim() ? 1 : 0.4 }}
              >
                <Icon name={sending ? "RefreshCw" : "Send"} size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Скрытые input для файлов */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) { handleImageFile(e.target.files[0]); e.target.value = ""; } }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { if (e.target.files?.[0]) { handleImageFile(e.target.files[0]); e.target.value = ""; } }} />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}
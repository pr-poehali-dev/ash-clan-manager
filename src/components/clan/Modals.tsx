import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { Clan, Invite, SearchUser, User } from "@/lib/api";

// ─── Shared primitives ────────────────────────────────────────────────────────

export const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = { online: "bg-green-400", "in-game": "bg-orange-400", offline: "bg-gray-600" };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-gray-600"}`} />;
};

export const MemberAvatar = ({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className={`${sizes[size]} rounded-md flex items-center justify-center font-display font-semibold flex-shrink-0`}
      style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-orange)" }}>
      {initials}
    </div>
  );
};

export function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

export function InviteModal({ onClose }: { onClose: () => void }) {
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-md p-4 sm:p-6 rounded-t-xl sm:rounded-lg animate-fade-in"
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

        <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
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

export function CreateClanModal({ onClose, onCreated }: { onClose: () => void; onCreated: (clan: Clan) => void }) {
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-sm p-4 sm:p-6 rounded-t-xl sm:rounded-lg animate-fade-in"
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
            <input value={tag} onChange={e => setTag(e.target.value)}
              placeholder="[SW]"
              maxLength={8}
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

export function NoClanScreen({ user, invites, onCreateClan, onAccept, onDecline, refreshInvites }: {
  user: User;
  invites: Invite[];
  onCreateClan: () => void;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  refreshInvites: () => void;
}) {
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

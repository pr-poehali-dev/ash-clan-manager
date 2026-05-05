import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Notification } from "@/lib/api";

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  chat: { icon: "MessageSquare", color: "#38bdf8" },
  event_new: { icon: "Calendar", color: "#a78bfa" },
  event_join: { icon: "UserPlus", color: "#4ade80" },
  invite: { icon: "Shield", color: "#fb923c" },
  join: { icon: "UserPlus", color: "#4ade80" },
  info: { icon: "Info", color: "#9ca3af" },
};

const LINK_LABELS: Record<string, string> = {
  chat: "Перейти в чат",
  calendar: "Перейти к событиям",
  clan: "Открыть клан",
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} д`;
}

interface Props {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (ids?: number[]) => void;
  onNavigate: (link: string) => void;
  onClose: () => void;
}

export default function NotificationPanel({
  notifications,
  unreadCount,
  onMarkRead,
  onNavigate,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Закрыть по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 rounded-lg overflow-hidden animate-fade-in z-[200]"
      style={{
        backgroundColor: "var(--ash-surface-2)",
        border: "1px solid var(--ash-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--ash-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-white">Уведомления</span>
          {unreadCount > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-display font-bold"
              style={{ backgroundColor: "var(--ash-orange)", color: "#000" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => onMarkRead()}
              className="text-xs transition-colors"
              style={{ color: "var(--ash-text-dim)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ash-orange)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ash-text-dim)")}
            >
              Прочитать все
            </button>
          )}
          <button onClick={onClose}>
            <Icon name="X" size={14} style={{ color: "var(--ash-text-dim)" }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[420px]">
        {notifications.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: "var(--ash-text-dim)" }}>
            <Icon name="BellOff" size={28} style={{ color: "var(--ash-border)", margin: "0 auto 8px" }} />
            Уведомлений пока нет
          </div>
        )}

        {notifications.map((n, i) => {
          const ti = TYPE_ICONS[n.type] ?? TYPE_ICONS.info;
          return (
            <div
              key={n.id}
              className="flex gap-3 px-4 py-3 transition-colors cursor-pointer animate-fade-in"
              style={{
                backgroundColor: n.is_read ? "transparent" : "rgba(255,107,26,0.05)",
                borderBottom: i < notifications.length - 1 ? "1px solid var(--ash-border)" : "none",
                animationDelay: `${i * 0.03}s`,
                opacity: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--ash-surface-3)")}
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor = n.is_read
                  ? "transparent"
                  : "rgba(255,107,26,0.05)")
              }
              onClick={() => {
                if (!n.is_read) onMarkRead([n.id]);
                if (n.link) { onNavigate(n.link); onClose(); }
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "var(--ash-surface-3)" }}
              >
                <Icon name={ti.icon} size={14} style={{ color: ti.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-sm leading-snug"
                    style={{
                      color: n.is_read ? "var(--ash-text-dim)" : "var(--ash-text)",
                      fontWeight: n.is_read ? 400 : 500,
                    }}
                  >
                    {n.title}
                  </span>
                  <span
                    className="text-xs font-mono-ash flex-shrink-0"
                    style={{ color: "var(--ash-text-dim)" }}
                  >
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                {n.body && (
                  <div
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--ash-text-dim)" }}
                  >
                    {n.body}
                  </div>
                )}
                {n.link && LINK_LABELS[n.link] && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--ash-orange)" }}
                  >
                    {LINK_LABELS[n.link]} →
                  </div>
                )}
              </div>

              {/* Unread dot */}
              {!n.is_read && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: "var(--ash-orange)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

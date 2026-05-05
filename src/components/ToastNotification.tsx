import { useEffect, useState } from "react";
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

interface ToastItem extends Notification {
  visible: boolean;
}

interface Props {
  notifications: Notification[];
  onNavigate: (link: string) => void;
}

export default function ToastNotifications({ notifications, onNavigate }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [shown, setShown] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fresh = notifications.filter(n => !n.is_read && !shown.has(n.id));
    if (fresh.length === 0) return;

    const newShown = new Set(shown);
    fresh.forEach(n => newShown.add(n.id));
    setShown(newShown);

    // Показываем только последние 3
    const toShow = fresh.slice(0, 3);
    setToasts(prev => [
      ...toShow.map(n => ({ ...n, visible: true })),
      ...prev,
    ].slice(0, 5));

    // Убираем через 4 секунды
    toShow.forEach(n => {
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === n.id ? { ...t, visible: false } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== n.id)), 400);
      }, 4000);
    });
  }, [notifications]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const ti = TYPE_ICONS[toast.type] ?? TYPE_ICONS.info;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto cursor-pointer"
            style={{
              transition: "opacity 0.35s, transform 0.35s",
              opacity: toast.visible ? 1 : 0,
              transform: toast.visible ? "translateX(0)" : "translateX(120%)",
            }}
            onClick={() => {
              if (toast.link) onNavigate(toast.link);
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}
          >
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-lg w-72 max-w-xs"
              style={{
                backgroundColor: "var(--ash-surface-2)",
                border: "1px solid var(--ash-border)",
                borderLeft: `3px solid ${ti.color}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--ash-surface-3)" }}
              >
                <Icon name={ti.icon} size={13} style={{ color: ti.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white leading-snug">{toast.title}</div>
                {toast.body && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--ash-text-dim)" }}>
                    {toast.body}
                  </div>
                )}
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="flex-shrink-0 mt-0.5"
              >
                <Icon name="X" size={12} style={{ color: "var(--ash-text-dim)" }} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

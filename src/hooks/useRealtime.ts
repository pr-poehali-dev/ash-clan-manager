import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "@/lib/api";
import type { Notification, ChatMessage } from "@/lib/api";

const POLL_INTERVAL = 5000; // 5 секунд

interface RealtimeState {
  notifications: Notification[];
  unreadCount: number;
  newMessages: ChatMessage[];
  lastMsgId: number;
  lastNotifId: number;
}

interface RealtimeControls {
  markRead: (ids?: number[]) => Promise<void>;
  clearNewMessages: () => void;
  addOptimisticMessage: (msg: ChatMessage) => void;
}

export function useRealtime(isLoggedIn: boolean): [RealtimeState, RealtimeControls] {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessages, setNewMessages] = useState<ChatMessage[]>([]);
  const [lastMsgId, setLastMsgId] = useState(0);
  const [lastNotifId, setLastNotifId] = useState(0);
  const initialized = useRef(false);
  const polling = useRef(false);

  // Начальная загрузка уведомлений
  useEffect(() => {
    if (!isLoggedIn || initialized.current) return;
    initialized.current = true;

    api.getNotifications().then(res => {
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
      if (res.notifications.length > 0) {
        setLastNotifId(res.notifications[0].id);
      }
    }).catch(() => {});
  }, [isLoggedIn]);

  // Polling каждые 5 секунд
  useEffect(() => {
    if (!isLoggedIn) return;

    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const res = await api.pollUpdates(lastNotifId, lastMsgId);

        if (res.notifications.length > 0) {
          setNotifications(prev => {
            const ids = new Set(prev.map(n => n.id));
            const fresh = res.notifications.filter(n => !ids.has(n.id));
            return [...fresh, ...prev].slice(0, 50);
          });
          setLastNotifId(res.notifications[0].id);
        }

        setUnreadCount(res.unread_count);

        if (res.messages.length > 0) {
          setNewMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const fresh = res.messages.filter(m => !ids.has(m.id));
            return [...prev, ...fresh];
          });
          setLastMsgId(res.messages[res.messages.length - 1].id);
        }
      } catch {
        // тихая ошибка — сеть может пропасть
      } finally {
        polling.current = false;
      }
    };

    const interval = setInterval(tick, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isLoggedIn, lastNotifId, lastMsgId]);

  const markRead = useCallback(async (ids?: number[]) => {
    await api.markNotificationsRead(ids).catch(() => {});
    if (ids) {
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
    setUnreadCount(0);
  }, []);

  const clearNewMessages = useCallback(() => {
    setNewMessages([]);
  }, []);

  const addOptimisticMessage = useCallback((msg: ChatMessage) => {
    setNewMessages(prev => [...prev, msg]);
    setLastMsgId(msg.id);
  }, []);

  return [
    { notifications, unreadCount, newMessages, lastMsgId, lastNotifId },
    { markRead, clearNewMessages, addOptimisticMessage },
  ];
}

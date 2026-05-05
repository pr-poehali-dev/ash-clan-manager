import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { User, Clan, Member, ActivityItem, Invite } from "@/lib/api";
import SteamConnect from "./SteamConnect";
import ClanSettings from "./ClanSettings";
import PlayerProfile from "./PlayerProfile";
import NotificationPanel from "@/components/NotificationPanel";
import ToastNotifications from "@/components/ToastNotification";
import { useRealtime } from "@/hooks/useRealtime";
import { InviteModal, CreateClanModal, NoClanScreen } from "@/components/clan/Modals";
import { FeedSection, ClanSection, RatingsSection } from "@/components/clan/ClanSection";
import { CalendarSection, ChatSection } from "@/components/clan/CalendarChat";

type Tab = "feed" | "clan" | "calendar" | "chat" | "ratings";

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
            <div className="logo-ash w-8 h-8 rounded-sm flex items-center justify-center relative overflow-hidden">
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
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
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

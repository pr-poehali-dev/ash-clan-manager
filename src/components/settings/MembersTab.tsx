import Icon from "@/components/ui/icon";
import type { Member, User } from "@/lib/api";
import { Section, RoleLabel } from "./SettingsUI";

// ─── Members Tab ──────────────────────────────────────────────────────────────

interface MembersTabProps {
  members: Member[];
  user: User;
  isOwner: boolean;
  memberAction: { id: number; action: string } | null;
  memberLoading: boolean;
  onMemberAction: (action: { id: number; action: string }) => void;
  onCancelAction: () => void;
  onConfirmAction: () => void;
  onGoToMembers: () => void;
}

export function MembersTab({
  members,
  user,
  isOwner,
  memberAction,
  memberLoading,
  onMemberAction,
  onCancelAction,
  onConfirmAction,
}: MembersTabProps) {
  return (
    <Section title={`Участники (${members.length})`}>
      {memberAction && (
        <div className="mb-4 p-4 rounded-md animate-fade-in"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div className="text-sm text-white mb-3">
            {memberAction.action === "kick" && "Исключить участника из клана?"}
            {memberAction.action === "promote" && "Назначить офицером?"}
            {memberAction.action === "demote" && "Понизить до участника?"}
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirmAction} disabled={memberLoading}
              className="px-4 py-1.5 rounded text-xs font-display font-medium text-white"
              style={{ backgroundColor: memberAction.action === "kick" ? "#ef4444" : "var(--ash-orange)" }}>
              {memberLoading ? "..." : "Подтвердить"}
            </button>
            <button onClick={onCancelAction}
              className="px-4 py-1.5 rounded text-xs font-display"
              style={{ border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {members.map(m => (
          <div key={m.id}
            className="flex items-center gap-3 px-3 py-3 rounded-md"
            style={{ backgroundColor: "var(--ash-surface-3)" }}>
            {m.steam_avatar ? (
              <img src={m.steam_avatar} alt={m.steam_nick} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-md flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
                style={{ backgroundColor: "var(--ash-surface-2)", color: "var(--ash-orange)" }}>
                {m.steam_nick.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">{m.steam_nick}</span>
                <RoleLabel role={m.role} />
              </div>
              <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>
                KDA {m.kda} · {m.wins} побед
              </div>
            </div>

            {isOwner && m.id !== user.id && m.role !== "owner" && (
              <div className="flex gap-1 flex-shrink-0">
                {m.role !== "officer" ? (
                  <button
                    onClick={() => onMemberAction({ id: m.id, action: "promote" })}
                    title="Назначить офицером"
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "var(--ash-surface-2)" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#facc1520")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--ash-surface-2)")}
                  >
                    <Icon name="Star" size={12} style={{ color: "#facc15" }} />
                  </button>
                ) : (
                  <button
                    onClick={() => onMemberAction({ id: m.id, action: "demote" })}
                    title="Понизить"
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "var(--ash-surface-2)" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#9ca3af20")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--ash-surface-2)")}
                  >
                    <Icon name="StarOff" size={12} style={{ color: "#9ca3af" }} />
                  </button>
                )}
                <button
                  onClick={() => onMemberAction({ id: m.id, action: "kick" })}
                  title="Исключить"
                  className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "var(--ash-surface-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#ef444420")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--ash-surface-2)")}
                >
                  <Icon name="UserMinus" size={12} style={{ color: "#ef4444" }} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Danger Tab ───────────────────────────────────────────────────────────────

interface DangerTabProps {
  onGoToMembers: () => void;
}

export function DangerTab({ onGoToMembers }: DangerTabProps) {
  return (
    <Section title="Опасная зона">
      <div className="space-y-4">
        <div className="p-4 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <div className="font-display text-sm text-white mb-1">Передать лидерство</div>
          <div className="text-xs mb-3" style={{ color: "var(--ash-text-dim)" }}>
            Назначьте другого участника лидером клана. Вы станете офицером.
          </div>
          <button
            onClick={onGoToMembers}
            className="px-4 py-2 rounded text-xs font-display"
            style={{ border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }}
          >
            Управление участниками →
          </button>
        </div>
        <div className="p-4 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <div className="font-display text-sm text-white mb-1">Удалить клан</div>
          <div className="text-xs mb-3" style={{ color: "var(--ash-text-dim)" }}>
            Это действие необратимо. Все данные клана будут удалены.
          </div>
          <button
            className="px-4 py-2 rounded text-xs font-display opacity-50 cursor-not-allowed"
            style={{ border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }}
            title="Обратитесь в поддержку"
          >
            Удалить клан (недоступно)
          </button>
        </div>
      </div>
    </Section>
  );
}

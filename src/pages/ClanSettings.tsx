import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { Clan, Member, User } from "@/lib/api";
import { ProfileTab } from "@/components/settings/ProfileTab";
import type { ClanForm } from "@/components/settings/ProfileTab";
import { AppearanceTab } from "@/components/settings/AppearanceTab";
import { MembersTab, DangerTab } from "@/components/settings/MembersTab";

interface Props {
  clan: Clan;
  members: Member[];
  user: User;
  onBack: () => void;
  onUpdated: (clan: Clan) => void;
  onMembersChanged: () => void;
}

export default function ClanSettings({ clan, members, user, onBack, onUpdated, onMembersChanged }: Props) {
  const isOwner = user.role === "owner";
  const canEdit = user.role === "owner" || user.role === "officer";

  const [form, setForm] = useState<ClanForm>({
    name: clan.name,
    tag: clan.tag,
    description: clan.description ?? "",
    discipline: clan.discipline ?? "",
    region: clan.region ?? "",
    discord_url: clan.discord_url ?? "",
    vk_url: clan.vk_url ?? "",
    website_url: clan.website_url ?? "",
    is_open: clan.is_open ?? true,
    min_rank: clan.min_rank ?? "",
    accent_color: clan.accent_color ?? "#FF6B1A",
  });

  const [emblemPreview, setEmblemPreview] = useState<string | null>(clan.emblem_url ?? null);
  const [emblemBase64, setEmblemBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingEmblem, setUploadingEmblem] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<"profile" | "appearance" | "members" | "danger">("profile");

  const f = useCallback((key: keyof ClanForm) => (v: string | boolean) => {
    setForm(p => ({ ...p, [key]: v }));
  }, []);

  const handleEmblemFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Только изображения"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Максимум 5 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target?.result as string;
      setEmblemPreview(b64);
      setEmblemBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const saveEmblem = async () => {
    if (!emblemBase64) return;
    setUploadingEmblem(true); setError("");
    const url = await api.uploadClanEmblem(emblemBase64).catch(e => { setError(e.message); return null; });
    setUploadingEmblem(false);
    if (url) {
      setEmblemPreview(url);
      setEmblemBase64(null);
      onUpdated({ ...clan, emblem_url: url });
    }
  };

  const saveProfile = async () => {
    setSaving(true); setError(""); setSaveSuccess(false);
    const payload: api.ClanUpdatePayload = {
      name: form.name.trim() || undefined,
      tag: form.tag.trim() || undefined,
      description: form.description,
      accent_color: form.accent_color,
      discipline: form.discipline,
      region: form.region,
      discord_url: form.discord_url,
      vk_url: form.vk_url,
      website_url: form.website_url,
      is_open: form.is_open,
      min_rank: form.min_rank,
    };
    const updated = await api.updateClan(payload).catch(e => { setError(e.message); return null; });
    setSaving(false);
    if (updated) { onUpdated(updated); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2500); }
  };

  const [memberAction, setMemberAction] = useState<{ id: number; action: string } | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  const doMemberAction = async () => {
    if (!memberAction) return;
    setMemberLoading(true);
    const { id, action } = memberAction;
    if (action === "kick") await api.kickMember(id).catch(() => null);
    if (action === "promote") await api.promoteMember(id).catch(() => null);
    if (action === "demote") await api.demoteMember(id).catch(() => null);
    setMemberLoading(false);
    setMemberAction(null);
    onMembersChanged();
  };

  const NAV = [
    { id: "profile", label: "Профиль", icon: "Shield" },
    { id: "appearance", label: "Оформление", icon: "Palette" },
    { id: "members", label: "Участники", icon: "Users" },
    ...(isOwner ? [{ id: "danger", label: "Опасная зона", icon: "AlertTriangle" }] : []),
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "var(--ash-surface)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--ash-border)", backgroundColor: "var(--ash-surface-2)" }}>
        <button onClick={onBack} className="flex items-center gap-2 transition-opacity hover:opacity-70">
          <Icon name="ArrowLeft" size={16} style={{ color: "var(--ash-text-dim)" }} />
          <span className="text-sm" style={{ color: "var(--ash-text-dim)" }}>Назад</span>
        </button>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: "var(--ash-border)" }} />
        <div className="flex items-center gap-2">
          {emblemPreview ? (
            <img src={emblemPreview} alt="clan" className="w-6 h-6 rounded object-cover" />
          ) : (
            <div className="w-6 h-6 rounded flex items-center justify-center font-display font-bold text-xs"
              style={{ backgroundColor: form.accent_color + "22", color: form.accent_color }}>
              {clan.tag.slice(0, 2)}
            </div>
          )}
          <span className="font-display font-bold text-sm text-white">Настройки клана</span>
        </div>
        <div className="flex-1" />
        {canEdit && activeSection !== "members" && activeSection !== "danger" && (
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-lava flex items-center gap-2 px-4 py-1.5 text-xs"
            style={{ opacity: saving ? 0.6 : 1, backgroundColor: saveSuccess ? "#10B981" : undefined }}
          >
            <Icon name={saveSuccess ? "Check" : saving ? "RefreshCw" : "Save"} size={13} />
            {saveSuccess ? "Сохранено!" : saving ? "Сохранение..." : "Сохранить"}
          </button>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="flex md:hidden flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--ash-border)", backgroundColor: "var(--ash-surface-2)" }}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setActiveSection(n.id)}
            className="flex items-center gap-1.5 px-3 py-3 whitespace-nowrap flex-shrink-0 text-xs font-display uppercase tracking-wide transition-all"
            style={{
              color: activeSection === n.id ? "var(--lava-bright)" :
                n.id === "danger" ? "#ef4444" : "var(--metal-dim)",
              borderBottom: activeSection === n.id ? "2px solid var(--lava-bright)" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            <Icon name={n.icon} size={13} />
            {n.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav — desktop only */}
        <div className="hidden md:flex w-48 flex-shrink-0 flex-col py-4 gap-1 px-2 overflow-y-auto"
          style={{ borderRight: "1px solid var(--ash-border)", backgroundColor: "var(--ash-surface-2)" }}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveSection(n.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all text-left"
              style={{
                backgroundColor: activeSection === n.id ? "var(--ash-surface-3)" : "transparent",
                color: activeSection === n.id ? "var(--ash-orange)" :
                  n.id === "danger" ? "#ef4444" : "var(--ash-text-dim)",
                borderLeft: activeSection === n.id ? `2px solid var(--ash-orange)` : "2px solid transparent",
              }}
            >
              <Icon name={n.icon} size={14} />
              <span className="font-display text-xs uppercase tracking-wide">{n.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

            {error && (
              <div className="px-4 py-3 rounded-md text-sm text-red-400 animate-fade-in"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </div>
            )}

            {activeSection === "profile" && (
              <ProfileTab form={form} f={f} />
            )}

            {activeSection === "appearance" && (
              <AppearanceTab
                clan={clan}
                form={form}
                f={f}
                emblemPreview={emblemPreview}
                emblemBase64={emblemBase64}
                uploadingEmblem={uploadingEmblem}
                onEmblemFile={handleEmblemFile}
                onSaveEmblem={saveEmblem}
                onCancelEmblem={() => { setEmblemPreview(clan.emblem_url ?? null); setEmblemBase64(null); }}
              />
            )}

            {activeSection === "members" && (
              <MembersTab
                members={members}
                user={user}
                isOwner={isOwner}
                memberAction={memberAction}
                memberLoading={memberLoading}
                onMemberAction={setMemberAction}
                onCancelAction={() => setMemberAction(null)}
                onConfirmAction={doMemberAction}
                onGoToMembers={() => setActiveSection("members")}
              />
            )}

            {activeSection === "danger" && isOwner && (
              <DangerTab onGoToMembers={() => setActiveSection("members")} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

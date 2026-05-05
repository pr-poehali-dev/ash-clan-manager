import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { Clan, Member, User } from "@/lib/api";

interface Props {
  clan: Clan;
  members: Member[];
  user: User;
  onBack: () => void;
  onUpdated: (clan: Clan) => void;
  onMembersChanged: () => void;
}

const DISCIPLINES = ["Rust", "CS2", "Dota 2", "Valorant", "League of Legends", "Apex Legends",
  "Fortnite", "PUBG", "Overwatch 2", "Rainbow Six Siege", "Warzone", "Мультиигровой"];
const REGIONS = ["Россия", "СНГ", "Европа", "Азия", "Северная Америка", "Весь мир"];
const ACCENT_COLORS = ["#FF6B1A", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#EF4444", "#06B6D4"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--ash-border)" }}>
        <span className="font-display text-xs uppercase tracking-wider" style={{ color: "var(--ash-text-dim)" }}>{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase font-display tracking-wider mb-1.5" style={{ color: "var(--ash-text-dim)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none transition-colors"
      style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
      onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
      onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
    />
  );
}

function RoleLabel({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: "#FF6B1A", officer: "#facc15", member: "#9ca3af", Новичок: "#9ca3af",
  };
  const labels: Record<string, string> = {
    owner: "Лидер", officer: "Офицер", member: "Участник",
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded font-display"
      style={{ color: colors[role] ?? "#9ca3af", backgroundColor: "var(--ash-surface-3)" }}>
      {labels[role] ?? role}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClanSettings({ clan, members, user, onBack, onUpdated, onMembersChanged }: Props) {
  const isOwner = user.role === "owner";
  const canEdit = user.role === "owner" || user.role === "officer";

  // Form state — инициализируем из клана
  const [form, setForm] = useState({
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
  const fileRef = useRef<HTMLInputElement>(null);

  const f = useCallback((key: keyof typeof form) => (v: string | boolean) => {
    setForm(p => ({ ...p, [key]: v }));
  }, []);

  // Выбор изображения эмблемы
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleEmblemFile(file);
  };

  // Сохранить эмблему
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

  // Сохранить профиль
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

  // Управление участниками
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0 flex flex-col py-4 gap-1 px-2 overflow-y-auto"
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
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

            {error && (
              <div className="px-4 py-3 rounded-md text-sm text-red-400 animate-fade-in"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </div>
            )}

            {/* ── PROFILE ── */}
            {activeSection === "profile" && (
              <>
                <Section title="Основная информация">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Название клана">
                      <Input value={form.name} onChange={f("name")} placeholder="SHADOW WOLVES" maxLength={128} />
                    </Field>
                    <Field label="Тег (до 8 символов)">
                      <Input value={form.tag} onChange={f("tag")} placeholder="[SW]" maxLength={8} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Описание клана">
                      <textarea
                        value={form.description}
                        onChange={e => f("description")(e.target.value)}
                        placeholder="Расскажите о вашем клане, требованиях к участникам, целях..."
                        rows={4}
                        maxLength={500}
                        className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none resize-none transition-colors"
                        style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
                      />
                      <div className="text-xs mt-1 text-right" style={{ color: "var(--ash-text-dim)" }}>
                        {form.description.length}/500
                      </div>
                    </Field>
                  </div>
                </Section>

                <Section title="Игровые параметры">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Основная дисциплина">
                      <select
                        value={form.discipline}
                        onChange={e => f("discipline")(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                        style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", colorScheme: "dark" }}
                      >
                        <option value="">Не указано</option>
                        {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>
                    <Field label="Регион">
                      <select
                        value={form.region}
                        onChange={e => f("region")(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                        style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", colorScheme: "dark" }}
                      >
                        <option value="">Не указано</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Мин. ранг для вступления">
                      <Input value={form.min_rank} onChange={f("min_rank")} placeholder="Platinum, Diamond..." maxLength={64} />
                    </Field>
                    <Field label="Набор">
                      <div className="flex gap-3 mt-1">
                        {[true, false].map(v => (
                          <button
                            key={String(v)}
                            onClick={() => f("is_open")(v)}
                            className="flex-1 py-2 rounded-md text-sm font-display transition-all"
                            style={form.is_open === v
                              ? { backgroundColor: "var(--ash-orange)", color: "#000" }
                              : { backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}>
                            {v ? "Открыт" : "Закрыт"}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </Section>

                <Section title="Социальные сети">
                  <div className="space-y-3">
                    {[
                      { key: "discord_url", label: "Discord (ссылка-приглашение)", icon: "Hash", placeholder: "https://discord.gg/..." },
                      { key: "vk_url", label: "ВКонтакте", icon: "Users", placeholder: "https://vk.com/..." },
                      { key: "website_url", label: "Сайт клана", icon: "Globe", placeholder: "https://..." },
                    ].map(s => (
                      <Field key={s.key} label={s.label}>
                        <div className="relative">
                          <Icon name={s.icon} size={13} style={{ color: "var(--ash-text-dim)", position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                          <input
                            value={form[s.key as keyof typeof form] as string}
                            onChange={e => f(s.key as keyof typeof form)(e.target.value)}
                            placeholder={s.placeholder}
                            className="w-full pl-8 pr-3 py-2.5 text-sm text-white rounded-md focus:outline-none"
                            style={{ backgroundColor: "var(--ash-surface-3)", border: "1px solid var(--ash-border)" }}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
                          />
                        </div>
                      </Field>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* ── APPEARANCE ── */}
            {activeSection === "appearance" && (
              <>
                <Section title="Эмблема клана">
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                    style={{ borderColor: "var(--ash-border)" }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
                    onClick={() => fileRef.current?.click()}
                  >
                    {emblemPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <img src={emblemPreview} alt="Эмблема" className="w-24 h-24 rounded-xl object-cover mx-auto" />
                        <span className="text-xs" style={{ color: "var(--ash-text-dim)" }}>Нажмите чтобы изменить</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Icon name="ImagePlus" size={32} style={{ color: "var(--ash-text-dim)" }} />
                        <div className="text-sm" style={{ color: "var(--ash-text-dim)" }}>
                          Перетащите изображение или нажмите
                        </div>
                        <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>PNG, JPG, WEBP до 5 МБ</div>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleEmblemFile(e.target.files[0]); }}
                    />
                  </div>

                  {emblemBase64 && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={saveEmblem}
                        disabled={uploadingEmblem}
                        className="btn-lava flex items-center gap-2 px-4 py-2 text-xs"
                        style={{ opacity: uploadingEmblem ? 0.6 : 1 }}
                      >
                        <Icon name={uploadingEmblem ? "RefreshCw" : "Upload"} size={13} />
                        {uploadingEmblem ? "Загрузка..." : "Загрузить эмблему"}
                      </button>
                      <button
                        onClick={() => { setEmblemPreview(clan.emblem_url ?? null); setEmblemBase64(null); }}
                        className="px-4 py-2 rounded font-display text-xs"
                        style={{ border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </Section>

                <Section title="Акцентный цвет">
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => f("accent_color")(color)}
                        className="w-9 h-9 rounded-lg transition-all relative"
                        style={{
                          backgroundColor: color,
                          outline: form.accent_color === color ? `3px solid white` : "none",
                          outlineOffset: "2px",
                          transform: form.accent_color === color ? "scale(1.15)" : "scale(1)",
                        }}
                      >
                        {form.accent_color === color && (
                          <Icon name="Check" size={14} style={{ color: "#000", position: "absolute", inset: 0, margin: "auto" }} />
                        )}
                      </button>
                    ))}
                    {/* Custom color */}
                    <div className="relative w-9 h-9">
                      <input
                        type="color"
                        value={form.accent_color}
                        onChange={e => f("accent_color")(e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer opacity-0 absolute inset-0"
                      />
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-dashed"
                        style={{ borderColor: "var(--ash-border)", backgroundColor: "var(--ash-surface-3)" }}
                      >
                        <Icon name="Pipette" size={14} style={{ color: "var(--ash-text-dim)" }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg flex items-center gap-3"
                    style={{ backgroundColor: form.accent_color + "15", border: `1px solid ${form.accent_color}40` }}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
                      style={{ backgroundColor: form.accent_color, color: "#000" }}>
                      {clan.tag.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm" style={{ color: form.accent_color }}>{clan.tag}</div>
                      <div className="text-xs" style={{ color: "var(--ash-text-dim)" }}>Предпросмотр цвета</div>
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* ── MEMBERS ── */}
            {activeSection === "members" && (
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
                      <button onClick={doMemberAction} disabled={memberLoading}
                        className="px-4 py-1.5 rounded text-xs font-display font-medium text-white"
                        style={{ backgroundColor: memberAction.action === "kick" ? "#ef4444" : "var(--ash-orange)" }}>
                        {memberLoading ? "..." : "Подтвердить"}
                      </button>
                      <button onClick={() => setMemberAction(null)}
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

                      {/* Actions — только не для самого себя и не для owner'а */}
                      {isOwner && m.id !== user.id && m.role !== "owner" && (
                        <div className="flex gap-1 flex-shrink-0">
                          {m.role !== "officer" ? (
                            <button
                              onClick={() => setMemberAction({ id: m.id, action: "promote" })}
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
                              onClick={() => setMemberAction({ id: m.id, action: "demote" })}
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
                            onClick={() => setMemberAction({ id: m.id, action: "kick" })}
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
            )}

            {/* ── DANGER ── */}
            {activeSection === "danger" && isOwner && (
              <Section title="Опасная зона">
                <div className="space-y-4">
                  <div className="p-4 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <div className="font-display text-sm text-white mb-1">Передать лидерство</div>
                    <div className="text-xs mb-3" style={{ color: "var(--ash-text-dim)" }}>
                      Назначьте другого участника лидером клана. Вы станете офицером.
                    </div>
                    <button
                      onClick={() => setActiveSection("members")}
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
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
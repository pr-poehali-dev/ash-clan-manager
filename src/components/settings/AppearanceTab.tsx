import { useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Clan } from "@/lib/api";
import { Section, ACCENT_COLORS } from "./SettingsUI";
import type { ClanForm } from "./ProfileTab";

interface Props {
  clan: Clan;
  form: ClanForm;
  f: (key: keyof ClanForm) => (v: string | boolean) => void;
  emblemPreview: string | null;
  emblemBase64: string | null;
  uploadingEmblem: boolean;
  onEmblemFile: (file: File) => void;
  onSaveEmblem: () => void;
  onCancelEmblem: () => void;
}

export function AppearanceTab({
  clan,
  form,
  f,
  emblemPreview,
  emblemBase64,
  uploadingEmblem,
  onEmblemFile,
  onSaveEmblem,
  onCancelEmblem,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onEmblemFile(file);
  };

  return (
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
            onChange={e => { if (e.target.files?.[0]) onEmblemFile(e.target.files[0]); }}
          />
        </div>

        {emblemBase64 && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={onSaveEmblem}
              disabled={uploadingEmblem}
              className="btn-lava flex items-center gap-2 px-4 py-2 text-xs"
              style={{ opacity: uploadingEmblem ? 0.6 : 1 }}
            >
              <Icon name={uploadingEmblem ? "RefreshCw" : "Upload"} size={13} />
              {uploadingEmblem ? "Загрузка..." : "Загрузить эмблему"}
            </button>
            <button
              onClick={onCancelEmblem}
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
  );
}

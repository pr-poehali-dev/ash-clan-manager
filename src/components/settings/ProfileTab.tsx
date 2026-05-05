import Icon from "@/components/ui/icon";
import { Section, Field, Input, DISCIPLINES, REGIONS } from "./SettingsUI";

export type ClanForm = {
  name: string;
  tag: string;
  description: string;
  discipline: string;
  region: string;
  discord_url: string;
  vk_url: string;
  website_url: string;
  is_open: boolean;
  min_rank: string;
  accent_color: string;
};

interface Props {
  form: ClanForm;
  f: (key: keyof ClanForm) => (v: string | boolean) => void;
}

export function ProfileTab({ form, f }: Props) {
  return (
    <>
      <Section title="Основная информация">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  value={form[s.key as keyof ClanForm] as string}
                  onChange={e => f(s.key as keyof ClanForm)(e.target.value)}
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
  );
}

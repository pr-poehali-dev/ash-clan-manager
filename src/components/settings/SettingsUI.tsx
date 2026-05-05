// ─── Shared constants ─────────────────────────────────────────────────────────

export const DISCIPLINES = [
  "Rust", "CS2", "Dota 2", "Valorant", "League of Legends", "Apex Legends",
  "Fortnite", "PUBG", "Overwatch 2", "Rainbow Six Siege", "Warzone", "Мультиигровой",
];

export const REGIONS = ["Россия", "СНГ", "Европа", "Азия", "Северная Америка", "Весь мир"];

export const ACCENT_COLORS = [
  "#FF6B1A", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#EF4444", "#06B6D4",
];

// ─── Shared primitives ────────────────────────────────────────────────────────

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--ash-border)" }}>
        <span className="font-display text-xs uppercase tracking-wider" style={{ color: "var(--ash-text-dim)" }}>{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase font-display tracking-wider mb-1.5" style={{ color: "var(--ash-text-dim)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, maxLength }: {
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

export function RoleLabel({ role }: { role: string }) {
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

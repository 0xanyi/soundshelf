type StatusBadgeProps = {
  tone: "active" | "muted";
  label: string;
  className?: string;
};

export function StatusBadge({ tone, label, className = "" }: StatusBadgeProps) {
  const toneClasses =
    tone === "active"
      ? "border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]"
      : "border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.6)] text-[hsl(var(--muted))]";
  const dotClass =
    tone === "active" ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClasses} ${className}`.trim()}
    >
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

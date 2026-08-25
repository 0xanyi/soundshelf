/**
 * A state word. States are named in text, never carried by colour alone —
 * which is what keeps the Playlist hue free to mean identity and nothing else.
 */
type StatusBadgeProps = {
  tone: "active" | "muted";
  label: string;
  className?: string;
};

export function StatusBadge({ tone, label, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`label inline-flex items-center gap-1.5 ${
        tone === "active" ? "text-ink" : "text-ink-3"
      } ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          tone === "active" ? "bg-ink" : "bg-rule-strong"
        }`}
      />
      {label}
    </span>
  );
}

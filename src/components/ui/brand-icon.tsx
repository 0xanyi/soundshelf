import type { SVGProps } from "react";

/**
 * Brand mark — the register itself: a shelf tab and three filed rules.
 * Drawn from the design system's own two materials rather than depicting a
 * record, so it reads at 16px and stays true when the hue changes.
 */
export function BrandIcon({
  className = "size-4",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4" width="2.5" height="16" rx="0.5" fill="currentColor" />
      <path
        d="M9 7.25h12M9 12h8.5M9 16.75h10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

/**
 * Playing indicator — three bars reading level. Sized in `em` so it sits on
 * the baseline of whatever label it accompanies. Always paired with a state
 * word: this is a second signal, never the only one.
 */
export function LevelIcon({
  isPlaying = true,
  className = "",
}: {
  isPlaying?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-end gap-[2px] ${
        isPlaying ? "" : "level-paused"
      } ${className}`.trim()}
      style={{ height: "0.7em" }}
    >
      <span className="level-bar" style={{ animationDelay: "0ms" }} />
      <span className="level-bar" style={{ animationDelay: "220ms" }} />
      <span className="level-bar" style={{ animationDelay: "110ms" }} />
    </span>
  );
}

import type { SVGProps } from "react";

/**
 * Brand mark — a stylised vinyl with a sound wave passing through it.
 * Refined enough to read at 16px, distinctive enough to feel like a logo.
 */
export function BrandIcon({
  className = "size-5",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" strokeWidth={1.25} opacity={0.55} />
      <circle cx="12" cy="12" r="5" strokeWidth={1.25} opacity={0.75} />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path
        d="M3 12h2.5M7 9.5v5M9.5 7v10M12 4v16M14.5 7v10M17 9.5v5M19.5 12H22"
        strokeWidth={1.6}
        opacity={0}
      />
    </svg>
  );
}

/**
 * Animated equalizer — three bars that pulse while playing.
 * Used as the live "now playing" indicator.
 */
export function EqualizerIcon({
  isPlaying = true,
  className = "size-4",
}: {
  isPlaying?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-end gap-[2px] ${className}`}
      style={{ height: "1em" }}
    >
      <span
        className={`eq-bar ${isPlaying ? "" : "eq-paused"}`}
        style={{ animationDelay: "0ms" }}
      />
      <span
        className={`eq-bar ${isPlaying ? "" : "eq-paused"}`}
        style={{ animationDelay: "180ms" }}
      />
      <span
        className={`eq-bar ${isPlaying ? "" : "eq-paused"}`}
        style={{ animationDelay: "360ms" }}
      />
      <span
        className={`eq-bar ${isPlaying ? "" : "eq-paused"}`}
        style={{ animationDelay: "120ms" }}
      />
    </span>
  );
}

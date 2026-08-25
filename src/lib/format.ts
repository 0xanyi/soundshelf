/**
 * Clamp a possibly-invalid duration value to a non-negative finite number.
 * Centralizes defensive handling so all consumers behave consistently when
 * upstream data (e.g. database rows, stale cache) produces NaN or negatives.
 */
export function safeDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    if (process.env.NODE_ENV !== "production" && Number.isFinite(value) && value < 0) {
      console.warn(`safeDuration: clamped negative duration ${value} to 0`);
    }
    return 0;
  }
  return value;
}

function formatDurationUnit(value: number, unit: "hour" | "minute"): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function formatDuration(
  seconds: number,
  options: { fallback?: string } = {},
): string {
  const { fallback = "0:00" } = options;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return fallback;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const paddedSeconds = remainingSeconds.toString().padStart(2, "0");

  // A playlist's running time regularly passes an hour, and "91:24" reads as
  // ninety-one minutes only if you stop to work it out.
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export function formatTotalDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0 minutes";
  }

  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return formatDurationUnit(totalMinutes, "minute");
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0
    ? formatDurationUnit(hours, "hour")
    : `${formatDurationUnit(hours, "hour")} ${formatDurationUnit(
        minutes,
        "minute",
      )}`;
}

export function formatBytes(value: number | string): string {
  const bytes = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  return (
    new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(bytes) + "B"
  );
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(typeof value === "string" ? new Date(value) : value);
}

/**
 * Start offsets for an ordered run of durations: the point at which each
 * entry begins, measured from the start of the sequence. This is what the
 * register's STARTS column reports, on both the listener and curator sides.
 */
export function cumulativeStarts(durations: number[]): number[] {
  const starts: number[] = [];
  let elapsed = 0;

  for (const duration of durations) {
    starts.push(elapsed);
    elapsed += safeDuration(duration);
  }

  return starts;
}

const AUDIO_EXTENSION_PATTERN = /\.(?:aac|flac|m4a|mp3|mp4|ogg|wav|webm)$/i;

/**
 * Listener-facing Tune title. Upload often stores the filename stem; this
 * strips a known audio extension and turns kebab/snake stems into words.
 * Titles that already contain a space are left alone so a curator name is
 * never rewritten.
 */
export function displayTuneTitle(title: string): string {
  const stem = title.trim().replace(AUDIO_EXTENSION_PATTERN, "").trim();

  if (stem.length === 0) {
    return "Untitled tune";
  }

  if (/\s/.test(stem)) {
    return stem;
  }

  const humanized = stem.replace(/[_-]+/g, " ").trim();
  return humanized || "Untitled tune";
}

/**
 * Canonical title for a newly uploaded file. Strips any final extension,
 * then humanizes the stem. Listener display keeps a closed audio-extension
 * list so a curator title like "v1.2" is not rewritten.
 */
export function tuneTitleFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^/.]+$/, "").trim();
  return displayTuneTitle(stem);
}

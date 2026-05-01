export function formatDuration(
  seconds: number,
  options: { fallback?: string } = {},
): string {
  const { fallback = "0:00" } = options;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return fallback;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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

function formatDurationUnit(value: number, unit: "hour" | "minute"): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
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
  }).format(typeof value === "string" ? new Date(value) : value);
}

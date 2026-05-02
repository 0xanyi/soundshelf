"use client";

import { AlertCircle, Music2, Play, RefreshCw, X } from "lucide-react";
import type { CSSProperties } from "react";

import type { PlayerTrack } from "@/components/player/audio-player";
import type {
  LoadState,
  PublicPlaylistDetail,
  PublicPlaylistSummary,
} from "@/components/player/browser/types";
import { BrandIcon, EqualizerIcon } from "@/components/ui/brand-icon";
import { formatDuration, formatTotalDuration } from "@/lib/format";
import { getMood } from "@/lib/mood";

/* ---------------- Header ---------------- */

export function BrandHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="relative grid size-11 place-items-center rounded-2xl border border-[hsl(var(--mood)/0.35)] bg-[hsl(var(--surface)/0.6)] text-[hsl(var(--mood))]"
          style={{
            boxShadow:
              "inset 0 1px 0 hsl(var(--foreground) / 0.08), 0 12px 32px -12px hsl(var(--mood) / 0.45)",
          }}
        >
          <BrandIcon className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--mood))] sm:text-xs">
            Soundshelf
          </p>
          <h1 className="hidden font-sans text-xs font-normal leading-snug text-[hsl(var(--foreground)/0.88)] sm:block sm:text-sm">
            Curated audio, beautifully played.
          </h1>
          <h1 className="font-sans text-xs font-normal leading-snug text-[hsl(var(--foreground)/0.88)] sm:hidden">
            Curated audio.
          </h1>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Playlist card library ---------------- */

export function PlaylistCardLibrary({
  error,
  playlists,
  selectedPlaylistId,
  state,
  onRetry,
  onSelect,
}: {
  error: string | null;
  playlists: PublicPlaylistSummary[];
  selectedPlaylistId: string | null;
  state: LoadState;
  onRetry: () => void;
  onSelect: (id: string) => void;
}) {
  if (state === "loading") {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-36 animate-pulse rounded-2xl border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-2)/0.6)]"
          />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <InlineError
        actionLabel="Try again"
        message={error ?? "Unable to load playlists."}
        onAction={onRetry}
      />
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface)/0.4)] px-5 py-8 text-center">
        <p className="text-sm text-[hsl(var(--muted))]">
          No published playlists yet. The shelf is being stocked.
        </p>
      </div>
    );
  }

  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
      {playlists.map((playlist) => (
        <li key={playlist.id} className="min-w-0">
          <PlaylistCard
            isSelected={playlist.id === selectedPlaylistId}
            playlist={playlist}
            onClick={() => onSelect(playlist.id)}
          />
        </li>
      ))}
    </ol>
  );
}

function PlaylistCard({
  isSelected,
  playlist,
  onClick,
}: {
  isSelected: boolean;
  playlist: PublicPlaylistSummary;
  onClick: () => void;
}) {
  const mood = getMood(playlist.id);
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={isSelected}
      aria-pressed={isSelected}
      style={mood.cssVars as CSSProperties}
      className="group relative min-h-36 w-full overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface)/0.6)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[hsl(var(--mood)/0.35)] hover:bg-[hsl(var(--surface-2)/0.72)] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--mood)/0.25)] data-[selected=true]:border-[hsl(var(--mood)/0.6)] data-[selected=true]:bg-[hsl(var(--surface-2)/0.9)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, hsl(var(--mood) / 0.24), transparent 58%), radial-gradient(90% 90% at 100% 100%, hsl(var(--mood-2) / 0.12), transparent 60%)",
        }}
      />
      <div className="relative flex min-h-28 flex-col justify-between gap-5">
        <div className="flex items-center justify-between">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--mood)) 0%, hsl(var(--mood-2)) 100%)",
              color: "hsl(28 40% 8%)",
              boxShadow: "0 8px 20px -8px hsl(var(--mood) / 0.6)",
            }}
          >
            {isSelected ? (
              <EqualizerIcon className="h-3 text-current" />
            ) : (
              <Play size={12} fill="currentColor" className="translate-x-[1px]" />
            )}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
            {formatTotalDuration(playlist.durationSeconds)}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="display-heading line-clamp-2 text-xl font-semibold leading-tight">
            {playlist.title}
          </h3>
          {playlist.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[hsl(var(--muted))]">
              {playlist.description}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}


/* ---------------- Player queue popover ---------------- */

export function PlaylistQueuePanel({
  currentIndex,
  description,
  error,
  playlist,
  state,
  title,
  totalDurationSeconds,
  onClose,
  onRetry,
  onSelectTrack,
}: {
  currentIndex: number;
  description: string | null;
  error: string | null;
  playlist: PublicPlaylistDetail | null;
  state: LoadState;
  title: string | null;
  totalDurationSeconds: number;
  onClose: () => void;
  onRetry: () => void;
  onSelectTrack: (index: number) => void;
}) {
  return (
    <div className="flex max-h-full flex-col">
      <div className="flex items-start gap-3 border-b border-[hsl(var(--border)/0.55)] px-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="kicker">Playlist</p>
          <h3 className="display-heading mt-1 truncate text-xl font-semibold">
            {title ?? "Pick a playlist"}
          </h3>
          {playlist?.tracks.length ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
              {playlist.tracks.length.toString().padStart(2, "0")} tracks ·{" "}
              {formatTotalDuration(totalDurationSeconds)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close playlist"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--surface-3)/0.5)] text-[hsl(var(--muted))] transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mood)/0.4)]"
          onClick={onClose}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto px-3 py-3">
        {description ? (
          <p className="mb-3 px-2 text-sm leading-6 text-[hsl(var(--muted))]">
            {description}
          </p>
        ) : null}

        {state === "loading" ? (
          <div className="grid gap-1.5" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-14 animate-pulse rounded-2xl bg-[hsl(var(--surface-3)/0.5)]"
              />
            ))}
            <span className="sr-only">Loading tracks...</span>
          </div>
        ) : null}

        {state === "error" ? (
          <InlineError
            actionLabel="Retry"
            message={error ?? "Unable to load this playlist."}
            onAction={onRetry}
          />
        ) : null}

        {state === "idle" && playlist?.tracks.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-12 text-center text-sm text-[hsl(var(--muted))]">
            <Music2 size={20} aria-hidden="true" />
            <p>This playlist has no playable tracks yet.</p>
          </div>
        ) : null}

        {playlist?.tracks.length ? (
          <ol className="grid gap-1" role="list">
            {playlist.tracks.map((track, index) => (
              <TrackRow
                key={track.playlistItemId}
                isActive={index === currentIndex}
                index={index}
                track={track}
                onClick={() => onSelectTrack(index)}
                showDescription
              />
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}


/* ---------------- Track row (shared) ---------------- */

function TrackRow({
  isActive,
  index,
  track,
  onClick,
  showDescription = false,
}: {
  isActive: boolean;
  index: number;
  track: PlayerTrack;
  onClick: () => void;
  showDescription?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={isActive ? "true" : undefined}
        className="group grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 text-left transition hover:bg-[hsl(var(--surface-3)/0.6)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mood)/0.4)] data-[active=true]:border-[hsl(var(--mood)/0.35)] data-[active=true]:bg-[hsl(var(--mood)/0.08)]"
        data-active={isActive}
        onClick={onClick}
      >
        <span
          aria-hidden="true"
          className={`grid size-9 place-items-center rounded-xl font-mono text-[11px] tabular-nums transition ${
            isActive
              ? "border-transparent text-[hsl(28_40%_8%)]"
              : "border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--muted))] group-hover:text-foreground"
          }`}
          style={
            isActive
              ? {
                  background:
                    "linear-gradient(135deg, hsl(var(--mood)) 0%, hsl(var(--mood-2)) 100%)",
                  boxShadow: "0 8px 22px -10px hsl(var(--mood) / 0.6)",
                }
              : undefined
          }
        >
          {isActive ? (
            <EqualizerIcon className="h-3 text-current" />
          ) : (
            (index + 1).toString().padStart(2, "0")
          )}
        </span>
        <span className="min-w-0">
          <span
            className={`block truncate text-[14px] font-medium ${
              isActive ? "text-foreground" : "text-foreground/90"
            }`}
          >
            {track.title}
          </span>
          {showDescription && track.description ? (
            <span className="mt-0.5 block truncate text-xs text-[hsl(var(--muted))]">
              {track.description}
            </span>
          ) : null}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-[hsl(var(--muted))]">
          {formatDuration(track.durationSeconds)}
        </span>
      </button>
    </li>
  );
}

/* ---------------- Inline error ---------------- */

function InlineError({
  actionLabel,
  message,
  onAction,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.08)] px-4 py-4 text-sm text-[hsl(var(--danger))] sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <AlertCircle size={16} aria-hidden="true" />
        {message}
      </span>
      {actionLabel && onAction ? (
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--danger)/0.4)] px-3 py-1.5 font-medium hover:bg-[hsl(var(--danger)/0.18)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--danger))]"
          type="button"
          onClick={onAction}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

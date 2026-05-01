"use client";

import {
  AlertCircle,
  Headphones,
  Music2,
  Play,
  RefreshCw,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { AudioPlayer, type PlayerTrack } from "@/components/player/audio-player";
import { BrandIcon, EqualizerIcon } from "@/components/ui/brand-icon";
import { formatDuration, formatTotalDuration } from "@/lib/format";
import { getMood } from "@/lib/mood";

type PublicPlaylistSummary = {
  id: string;
  title: string;
  description: string | null;
  itemCount: number;
};

type PublicPlaylistDetail = PublicPlaylistSummary & {
  tracks: PlayerTrack[];
};

type LoadState = "idle" | "loading" | "error";

export function PlaylistBrowser() {
  const [playlists, setPlaylists] = useState<PublicPlaylistSummary[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<PublicPlaylistDetail | null>(null);
  const [listState, setListState] = useState<LoadState>("loading");
  const [detailState, setDetailState] = useState<LoadState>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlaylists() {
      setListState("loading");
      setListError(null);

      try {
        const response = await fetch("/api/public/playlists", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load playlists.");
        }

        const data = (await response.json()) as {
          playlists?: PublicPlaylistSummary[];
        };
        const nextPlaylists = data.playlists ?? [];

        setPlaylists(nextPlaylists);
        setSelectedPlaylistId((current) => current ?? nextPlaylists[0]?.id ?? null);
        setListState("idle");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setListState("error");
        setListError(
          error instanceof Error ? error.message : "Unable to load playlists.",
        );
      }
    }

    void loadPlaylists();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedPlaylistId) {
      return;
    }

    const playlistId = selectedPlaylistId;
    const controller = new AbortController();

    async function loadPlaylist() {
      setSelectedPlaylist(null);
      setDetailState("loading");
      setDetailError(null);

      try {
        const response = await fetch(
          `/api/public/playlists/${encodeURIComponent(playlistId)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Unable to load this playlist.");
        }

        const playlist = (await response.json()) as PublicPlaylistDetail;

        if (controller.signal.aborted) {
          return;
        }

        setSelectedPlaylist(playlist);
        setCurrentIndex(0);
        setDetailState("idle");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSelectedPlaylist(null);
        setDetailState("error");
        setDetailError(
          error instanceof Error
            ? error.message
            : "Unable to load this playlist.",
        );
      }
    }

    void loadPlaylist();

    return () => controller.abort();
  }, [detailReloadKey, selectedPlaylistId]);

  const selectedSummary = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId],
  );

  const totalDurationSeconds = useMemo(() => {
    if (!selectedPlaylist) {
      return 0;
    }

    return selectedPlaylist.tracks.reduce(
      (total, track) => total + Math.max(track.durationSeconds, 0),
      0,
    );
  }, [selectedPlaylist]);

  const currentPlaylistTitle =
    selectedPlaylist?.title ?? selectedSummary?.title ?? null;
  const currentPlaylistDescription =
    selectedPlaylist?.description ?? selectedSummary?.description ?? null;

  const mood = getMood(selectedPlaylistId);

  return (
    <main
      className="relative min-h-screen text-foreground"
      style={mood.cssVars as CSSProperties}
    >
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <BrandHeader />

        {/* MOBILE: horizontal scroll of playlists */}
        <section className="mt-6 lg:hidden">
          <SectionHeading
            count={playlists.length}
            kicker="Library"
            title="Tonight's selections"
          />
          <PlaylistRail
            error={listError}
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            state={listState}
            onRetry={() => window.location.reload()}
            onSelect={setSelectedPlaylistId}
          />
        </section>

        {/* MAIN GRID */}
        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
          {/* DESKTOP sidebar */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-8">
              <SectionHeading
                count={playlists.length}
                kicker="Library"
                title="Selections"
              />
              <PlaylistList
                error={listError}
                playlists={playlists}
                selectedPlaylistId={selectedPlaylistId}
                state={listState}
                onRetry={() => window.location.reload()}
                onSelect={setSelectedPlaylistId}
              />
            </div>
          </aside>

          {/* RIGHT COLUMN */}
          <section className="flex min-w-0 flex-col gap-6 lg:gap-8">
            <AudioPlayer
              key={selectedPlaylist?.id ?? "empty-player"}
              currentIndex={currentIndex}
              playlistTitle={currentPlaylistTitle ?? undefined}
              tracks={selectedPlaylist?.tracks ?? []}
              onCurrentIndexChange={setCurrentIndex}
            />

            <TrackList
              currentIndex={currentIndex}
              description={currentPlaylistDescription}
              error={detailError}
              onRetry={() => setDetailReloadKey((key) => key + 1)}
              onSelect={setCurrentIndex}
              playlist={selectedPlaylist}
              state={detailState}
              title={currentPlaylistTitle}
              totalDurationSeconds={totalDurationSeconds}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------------- Header ---------------- */

function BrandHeader() {
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
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[hsl(var(--mood))]">
            Soundshelf
          </p>
          <h1 className="display-heading hidden text-base font-semibold sm:block sm:text-lg">
            Curated audio, beautifully played.
          </h1>
          <h1 className="display-heading text-base font-semibold sm:hidden">
            Curated audio.
          </h1>
        </div>
      </div>

      <a
        className="group inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface)/0.5)] px-3.5 py-1.5 text-xs font-medium text-[hsl(var(--muted))] transition hover:border-[hsl(var(--mood)/0.4)] hover:text-foreground"
        href="/admin"
      >
        <Headphones size={13} aria-hidden="true" className="opacity-80" />
        <span>Admin</span>
      </a>
    </header>
  );
}

/* ---------------- Section heading ---------------- */

function SectionHeading({
  count,
  kicker,
  title,
}: {
  count?: number;
  kicker: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="display-heading mt-1 text-2xl font-semibold sm:text-3xl">
          {title}
        </h2>
      </div>
      {typeof count === "number" ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
          {count.toString().padStart(2, "0")} playlist{count === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------- Playlist rail (mobile) ---------------- */

function PlaylistRail({
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
        className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-32 w-44 shrink-0 animate-pulse rounded-2xl border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-2)/0.6)]"
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
    <div className="-mx-4 px-4">
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 scroll-fade">
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            isSelected={playlist.id === selectedPlaylistId}
            playlist={playlist}
            onClick={() => onSelect(playlist.id)}
          />
        ))}
      </div>
    </div>
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
      className="group relative w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface)/0.6)] p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-[hsl(var(--mood)/0.25)] data-[selected=true]:border-[hsl(var(--mood)/0.5)] data-[selected=true]:bg-[hsl(var(--surface-2)/0.85)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, hsl(var(--mood) / 0.22), transparent 55%)",
        }}
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full"
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
            {playlist.itemCount.toString().padStart(2, "0")} tracks
          </span>
        </div>
        <h3 className="display-heading line-clamp-2 text-base font-semibold leading-tight">
          {playlist.title}
        </h3>
      </div>
    </button>
  );
}

/* ---------------- Playlist list (desktop) ---------------- */

function PlaylistList({
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
      <div className="grid gap-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-16 animate-pulse rounded-2xl border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--surface-2)/0.5)]"
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
      <div className="rounded-2xl border border-dashed border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface)/0.4)] px-5 py-10 text-center">
        <p className="text-sm text-[hsl(var(--muted))]">
          No published playlists yet.
        </p>
      </div>
    );
  }

  return (
    <ol className="grid gap-1.5" role="list">
      {playlists.map((playlist) => {
        const isSelected = playlist.id === selectedPlaylistId;
        const mood = getMood(playlist.id);

        return (
          <li key={playlist.id}>
            <button
              type="button"
              onClick={() => onSelect(playlist.id)}
              data-selected={isSelected}
              aria-pressed={isSelected}
              style={mood.cssVars as CSSProperties}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-transparent px-3 py-3 text-left transition hover:bg-[hsl(var(--surface-2)/0.55)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mood)/0.4)] data-[selected=true]:border-[hsl(var(--mood)/0.35)] data-[selected=true]:bg-[hsl(var(--surface-2)/0.7)]"
            >
              {/* Active accent stripe */}
              <span
                aria-hidden="true"
                className="absolute inset-y-3 left-0 w-[3px] rounded-r-full opacity-0 transition group-data-[selected=true]:opacity-100"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(var(--mood)), hsl(var(--mood-2)))",
                  boxShadow: "0 0 18px hsl(var(--mood) / 0.65)",
                }}
              />

              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{
                  background: isSelected
                    ? "linear-gradient(135deg, hsl(var(--mood)) 0%, hsl(var(--mood-2)) 100%)"
                    : "hsl(var(--surface-2) / 0.85)",
                  color: isSelected
                    ? "hsl(28 40% 8%)"
                    : "hsl(var(--muted))",
                  border: isSelected
                    ? "1px solid hsl(var(--mood) / 0.5)"
                    : "1px solid hsl(var(--border) / 0.6)",
                  boxShadow: isSelected
                    ? "0 8px 22px -10px hsl(var(--mood) / 0.6)"
                    : "none",
                }}
              >
                {isSelected ? (
                  <EqualizerIcon className="h-3 text-current" />
                ) : (
                  <Music2 size={14} />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[13.5px] font-medium ${
                    isSelected ? "text-foreground" : "text-foreground/90"
                  }`}
                >
                  {playlist.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
                  <span>
                    {playlist.itemCount.toString().padStart(2, "0")}{" "}
                    {playlist.itemCount === 1 ? "track" : "tracks"}
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Track list ---------------- */

function TrackList({
  currentIndex,
  description,
  error,
  onRetry,
  onSelect,
  playlist,
  state,
  title,
  totalDurationSeconds,
}: {
  currentIndex: number;
  description: string | null;
  error: string | null;
  onRetry: () => void;
  onSelect: (index: number) => void;
  playlist: PublicPlaylistDetail | null;
  state: LoadState;
  title: string | null;
  totalDurationSeconds: number;
}) {
  return (
    <section className="panel-quiet overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.5)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0">
          <p className="kicker">Up next</p>
          <h3 className="display-heading mt-1 truncate text-2xl font-semibold sm:text-[28px]">
            {title ?? "Pick a playlist"}
          </h3>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted))]">
              {description}
            </p>
          ) : null}
        </div>
        {playlist?.tracks.length ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
            <span>
              {playlist.tracks.length.toString().padStart(2, "0")} tracks
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatTotalDuration(totalDurationSeconds)}</span>
          </div>
        ) : null}
      </header>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
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
            {playlist.tracks.map((track, index) => {
              const isActive = index === currentIndex;
              return (
                <li key={track.playlistItemId}>
                  <button
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    className="group grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:bg-[hsl(var(--surface-3)/0.6)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mood)/0.4)] data-[active=true]:border-[hsl(var(--mood)/0.35)] data-[active=true]:bg-[hsl(var(--mood)/0.08)]"
                    data-active={isActive}
                    onClick={() => onSelect(index)}
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
                              boxShadow:
                                "0 8px 22px -10px hsl(var(--mood) / 0.6)",
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
                      {track.description ? (
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
            })}
          </ol>
        ) : null}
      </div>
    </section>
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

"use client";

import {
  Disc3,
  Headphones,
  ListMusic,
  Music2,
  Play,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AudioPlayer, type PlayerTrack } from "@/components/player/audio-player";
import { BrandIcon } from "@/components/ui/brand-icon";
import { formatDuration, formatTotalDuration } from "@/lib/format";

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

  return (
    <main className="relative min-h-screen px-4 pb-16 pt-6 text-foreground sm:px-6 lg:px-8">
      <BrandHeader />

      <div className="relative mx-auto mt-6 grid w-full max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border)/0.6)] px-5 py-4">
              <div>
                <p className="kicker">Library</p>
                <h2 className="display-heading mt-1 text-xl font-semibold">
                  Playlists
                </h2>
              </div>
              <span className="pill">
                <ListMusic size={12} aria-hidden="true" />
                {playlists.length}
              </span>
            </div>

            <div className="min-h-72 p-3">
              {listState === "loading" ? (
                <StateMessage
                  icon={<Disc3 size={20} aria-hidden="true" className="animate-spin" />}
                  message="Loading playlists..."
                />
              ) : null}

              {listState === "error" ? (
                <StateMessage
                  actionLabel="Try again"
                  icon={<RefreshCw size={20} aria-hidden="true" />}
                  message={listError ?? "Unable to load playlists."}
                  onAction={() => window.location.reload()}
                />
              ) : null}

              {listState === "idle" && playlists.length === 0 ? (
                <StateMessage
                  icon={<ListMusic size={20} aria-hidden="true" />}
                  message="No published playlists are available yet."
                />
              ) : null}

              {playlists.length > 0 ? (
                <div className="grid gap-1.5" role="list">
                  {playlists.map((playlist) => {
                    const isSelected = playlist.id === selectedPlaylistId;

                    return (
                      <button
                        key={playlist.id}
                        className="group rounded-2xl border border-transparent p-3 text-left transition hover:bg-[hsl(var(--surface-2)/0.7)] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.25)] data-[selected=true]:border-[hsl(var(--accent)/0.45)] data-[selected=true]:bg-[hsl(var(--accent)/0.12)]"
                        data-selected={isSelected}
                        type="button"
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-[hsl(var(--border))] transition ${
                              isSelected
                                ? "bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent-2)))] text-slate-950"
                                : "bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--muted))] group-hover:text-foreground"
                            }`}
                          >
                            {isSelected ? (
                              <Play size={14} fill="currentColor" />
                            ) : (
                              <Music2 size={14} />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold leading-snug">
                              {playlist.title}
                            </span>
                            {playlist.description ? (
                              <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[hsl(var(--muted))]">
                                {playlist.description}
                              </span>
                            ) : null}
                            <span className="mt-2 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted))]">
                              <Music2 size={11} aria-hidden="true" />
                              {playlist.itemCount}{" "}
                              {playlist.itemCount === 1 ? "track" : "tracks"}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="grid content-start gap-6">
          <AudioPlayer
            key={selectedPlaylist?.id ?? "empty-player"}
            currentIndex={currentIndex}
            playlistTitle={currentPlaylistTitle ?? undefined}
            tracks={selectedPlaylist?.tracks ?? []}
            onCurrentIndexChange={setCurrentIndex}
          />

          <div className="panel-quiet overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.6)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="kicker">Up Next</p>
                <h3 className="display-heading mt-1 truncate text-2xl font-semibold sm:text-3xl">
                  {currentPlaylistTitle ?? "Select a playlist"}
                </h3>
                {currentPlaylistDescription ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted))]">
                    {currentPlaylistDescription}
                  </p>
                ) : null}
              </div>
              {selectedPlaylist?.tracks.length ? (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[hsl(var(--muted))]">
                  <span className="pill">
                    <Music2 size={12} aria-hidden="true" />
                    {selectedPlaylist.tracks.length} tracks
                  </span>
                  <span className="pill">
                    <Headphones size={12} aria-hidden="true" />
                    {formatTotalDuration(totalDurationSeconds)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="min-h-72 p-4 sm:p-5">
              {detailState === "loading" ? (
                <StateMessage
                  icon={<Disc3 size={20} aria-hidden="true" className="animate-spin" />}
                  message="Loading tracks..."
                />
              ) : null}

              {detailState === "error" ? (
                <StateMessage
                  actionLabel="Retry"
                  icon={<RefreshCw size={20} aria-hidden="true" />}
                  message={detailError ?? "Unable to load this playlist."}
                  onAction={() => setDetailReloadKey((key) => key + 1)}
                />
              ) : null}

              {detailState === "idle" && selectedPlaylist?.tracks.length === 0 ? (
                <StateMessage
                  icon={<Music2 size={20} aria-hidden="true" />}
                  message="This playlist has no playable tracks."
                />
              ) : null}

              {selectedPlaylist?.tracks.length ? (
                <ol className="grid gap-1.5" role="list">
                  {selectedPlaylist.tracks.map((track, index) => {
                    const isActive = index === currentIndex;

                    return (
                      <li key={track.playlistItemId}>
                        <button
                          type="button"
                          aria-current={isActive ? "true" : undefined}
                          className="group grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:bg-[hsl(var(--surface-2)/0.7)] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.2)] data-[active=true]:border-[hsl(var(--accent)/0.45)] data-[active=true]:bg-[hsl(var(--accent)/0.1)]"
                          data-active={isActive}
                          onClick={() => setCurrentIndex(index)}
                        >
                          <span
                            aria-hidden="true"
                            className={`grid size-9 place-items-center rounded-xl border border-[hsl(var(--border))] text-xs font-mono tabular-nums transition ${
                              isActive
                                ? "border-transparent bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent-2)))] text-slate-950"
                                : "bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--muted))] group-hover:text-foreground"
                            }`}
                          >
                            {isActive ? (
                              <Play size={12} fill="currentColor" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block truncate text-sm font-medium ${
                                isActive ? "text-foreground" : "text-foreground"
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
                          <span className="font-mono text-xs tabular-nums text-[hsl(var(--muted))]">
                            {formatDuration(track.durationSeconds)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))] shadow-[0_8px_30px_-12px_hsl(var(--accent)/0.5)]"
        >
          <BrandIcon />
        </span>
        <div>
          <p className="kicker">SoundShelf</p>
          <h1 className="display-heading text-base font-semibold leading-tight sm:text-lg">
            Curated audio, beautifully played.
          </h1>
        </div>
      </div>
      <a
        className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.6)] px-3.5 py-1.5 text-xs font-medium text-[hsl(var(--muted))] transition hover:bg-[hsl(var(--surface-2))] hover:text-foreground sm:inline-flex"
        href="/admin"
      >
        <Headphones size={14} aria-hidden="true" />
        Admin
      </a>
    </header>
  );
}

function StateMessage({
  actionLabel,
  icon,
  message,
  onAction,
}: {
  actionLabel?: string;
  icon?: React.ReactNode;
  message: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center text-sm text-[hsl(var(--muted))]">
      <div className="grid gap-3 justify-items-center">
        {icon ? (
          <span className="grid size-10 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))]">
            {icon}
          </span>
        ) : null}
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={onAction}
          >
            <RefreshCw size={14} aria-hidden="true" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}



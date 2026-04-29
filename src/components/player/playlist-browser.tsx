"use client";

import { Music2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AudioPlayer, type PlayerTrack } from "@/components/player/audio-player";

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

        setSelectedPlaylist(playlist);
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

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Prayer Tunes
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Published Playlists</h1>
          </div>

          <div className="min-h-80 p-3">
            {listState === "loading" ? (
              <StateMessage message="Loading playlists..." />
            ) : null}

            {listState === "error" ? (
              <StateMessage
                actionLabel="Try again"
                message={listError ?? "Unable to load playlists."}
                onAction={() => window.location.reload()}
              />
            ) : null}

            {listState === "idle" && playlists.length === 0 ? (
              <StateMessage message="No published playlists are available." />
            ) : null}

            {playlists.length > 0 ? (
              <div className="grid gap-2" role="list">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className="rounded-md border border-transparent p-3 text-left transition hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] data-[selected=true]:border-[hsl(var(--accent))] data-[selected=true]:bg-[hsl(var(--accent))]/10"
                    data-selected={playlist.id === selectedPlaylistId}
                    type="button"
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                  >
                    <span className="block text-base font-semibold leading-snug">
                      {playlist.title}
                    </span>
                    {playlist.description ? (
                      <span className="mt-1 block line-clamp-2 text-sm leading-5 text-muted">
                        {playlist.description}
                      </span>
                    ) : null}
                    <span className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <Music2 size={14} aria-hidden="true" />
                      {playlist.itemCount} {playlist.itemCount === 1 ? "track" : "tracks"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="grid content-start gap-5">
          <AudioPlayer
            key={selectedPlaylist?.id ?? "empty-player"}
            tracks={selectedPlaylist?.tracks ?? []}
          />

          <div className="rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Playlist
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {selectedPlaylist?.title ?? selectedSummary?.title ?? "Select a playlist"}
              </h2>
              {selectedPlaylist?.description ?? selectedSummary?.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {selectedPlaylist?.description ?? selectedSummary?.description}
                </p>
              ) : null}
            </div>

            <div className="min-h-80 p-5">
              {detailState === "loading" ? (
                <StateMessage message="Loading tracks..." />
              ) : null}

              {detailState === "error" ? (
                <StateMessage
                  actionLabel="Retry"
                  message={detailError ?? "Unable to load this playlist."}
                  onAction={() => setDetailReloadKey((key) => key + 1)}
                />
              ) : null}

              {detailState === "idle" && selectedPlaylist?.tracks.length === 0 ? (
                <StateMessage message="This playlist has no playable tracks." />
              ) : null}

              {selectedPlaylist?.tracks.length ? (
                <ol className="grid gap-2">
                  {selectedPlaylist.tracks.map((track, index) => (
                    <li
                      key={track.playlistItemId}
                      className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-md border border-black/10 px-3 py-3"
                    >
                      <span className="text-center text-sm tabular-nums text-muted">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{track.title}</span>
                        {track.description ? (
                          <span className="mt-1 block truncate text-sm text-muted">
                            {track.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm tabular-nums text-muted">
                        {formatDuration(track.durationSeconds)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StateMessage({
  actionLabel,
  message,
  onAction,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-48 place-items-center rounded-md border border-dashed border-black/15 px-4 py-8 text-center text-sm text-muted">
      <div className="grid gap-3 justify-items-center">
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button
            className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 font-medium text-foreground shadow-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            type="button"
            onClick={onAction}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

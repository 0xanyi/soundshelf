"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AudioPlayer, type PlayerTrack } from "@/components/player/audio-player";
import {
  BrandHeader,
  PlaylistCardLibrary,
  PlaylistQueuePanel,
} from "@/components/player/browser/playlist-browser-ui";
import type {
  LoadState,
  PublicPlaylistDetail,
  PublicPlaylistSummary,
} from "@/components/player/browser/types";
import { getMood } from "@/lib/mood";

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
  const [isTracksOpen, setIsTracksOpen] = useState(false);

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

  /**
   * The audio element can discover real durations for legacy tracks whose
   * metadata was previously missing. Patch local state so totals and rows are
   * correct during the session; canonical persistence happens on upload.
   */
  const handleDurationDiscovered = useCallback(
    (track: PlayerTrack, durationSeconds: number) => {
      const rounded = Math.round(durationSeconds);

      setSelectedPlaylist((current) => {
        if (!current) {
          return current;
        }

        let changed = false;
        const tracks = current.tracks.map((entry) => {
          if (entry.id !== track.id) {
            return entry;
          }

          if (entry.durationSeconds === rounded) {
            return entry;
          }

          changed = true;
          return { ...entry, durationSeconds: rounded };
        });

        return changed ? { ...current, tracks } : current;
      });
    },
    [],
  );

  const handleSelectTrack = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleSelectPlaylist = useCallback((playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setIsTracksOpen(false);
  }, []);

  return (
    <main
      className="relative min-h-screen text-foreground"
      style={mood.cssVars as CSSProperties}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <BrandHeader />

        <div className="mt-6 grid gap-8 lg:mt-10 lg:gap-10">
          <section className="mx-auto flex w-full max-w-[1040px] min-w-0 flex-col">
            <AudioPlayer
              key={selectedPlaylist?.id ?? "empty-player"}
              currentIndex={currentIndex}
              isQueueOpen={isTracksOpen}
              playlistTitle={currentPlaylistTitle ?? undefined}
              queuePanel={
                <PlaylistQueuePanel
                  currentIndex={currentIndex}
                  description={currentPlaylistDescription}
                  error={detailError}
                  playlist={selectedPlaylist}
                  state={detailState}
                  title={currentPlaylistTitle}
                  totalDurationSeconds={totalDurationSeconds}
                  onClose={() => setIsTracksOpen(false)}
                  onRetry={() => setDetailReloadKey((key) => key + 1)}
                  onSelectTrack={handleSelectTrack}
                />
              }
              tracks={selectedPlaylist?.tracks ?? []}
              onCurrentIndexChange={handleSelectTrack}
              onToggleQueue={() => setIsTracksOpen((open) => !open)}
              onDurationDiscovered={handleDurationDiscovered}
            />
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <p className="kicker">Library</p>
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
                {playlists.length.toString().padStart(2, "0")} playlist
                {playlists.length === 1 ? "" : "s"}
              </span>
            </div>
            <PlaylistCardLibrary
              error={listError}
              playlists={playlists}
              selectedPlaylistId={selectedPlaylistId}
              state={listState}
              onRetry={() => window.location.reload()}
              onSelect={handleSelectPlaylist}
            />
          </section>
        </div>

        <footer className="mt-auto border-t border-[hsl(var(--border)/0.45)] pt-6 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
          Copyright 2026 SoundShelf. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

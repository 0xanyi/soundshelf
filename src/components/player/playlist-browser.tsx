"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AudioPlayer, type PlayerTrack } from "@/components/player/audio-player";
import {
  BrandHeader,
  PlaylistList,
  PlaylistRail,
  SectionHeading,
  TracksAccordion,
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
  const [isTracksOpen, setIsTracksOpen] = useState(true);

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
        setIsTracksOpen(true);
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
    setIsTracksOpen(true);
  }, []);

  return (
    <main
      className="relative min-h-screen text-foreground"
      style={mood.cssVars as CSSProperties}
    >
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <BrandHeader />

        {/* MOBILE: horizontal rail of playlist cards */}
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
        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
          {/* DESKTOP sidebar with inline-expandable playlists */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-8">
              <SectionHeading
                count={playlists.length}
                kicker="Library"
                title="Selections"
              />
              <PlaylistList
                currentTrackIndex={currentIndex}
                description={currentPlaylistDescription}
                detailError={detailError}
                detailState={detailState}
                error={listError}
                isTracksOpen={isTracksOpen}
                playlist={selectedPlaylist}
                playlists={playlists}
                selectedPlaylistId={selectedPlaylistId}
                state={listState}
                totalDurationSeconds={totalDurationSeconds}
                onRetry={() => window.location.reload()}
                onRetryDetail={() => setDetailReloadKey((key) => key + 1)}
                onSelect={setSelectedPlaylistId}
                onSelectTrack={handleSelectTrack}
                onToggleTracks={() => setIsTracksOpen((open) => !open)}
              />
            </div>
          </aside>

          {/* RIGHT COLUMN: player + (mobile) tracks accordion */}
          <section className="flex min-w-0 flex-col gap-6 lg:gap-8">
            <AudioPlayer
              key={selectedPlaylist?.id ?? "empty-player"}
              currentIndex={currentIndex}
              playlistTitle={currentPlaylistTitle ?? undefined}
              tracks={selectedPlaylist?.tracks ?? []}
              onCurrentIndexChange={handleSelectTrack}
              onDurationDiscovered={handleDurationDiscovered}
            />

            {/* MOBILE: collapsible tracks below the player */}
            <div className="lg:hidden">
              <TracksAccordion
                currentIndex={currentIndex}
                description={currentPlaylistDescription}
                error={detailError}
                isOpen={isTracksOpen}
                playlist={selectedPlaylist}
                state={detailState}
                title={currentPlaylistTitle}
                totalDurationSeconds={totalDurationSeconds}
                onRetry={() => setDetailReloadKey((key) => key + 1)}
                onSelectTrack={handleSelectTrack}
                onToggle={() => setIsTracksOpen((open) => !open)}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


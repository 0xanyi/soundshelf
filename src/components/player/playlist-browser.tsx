"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AudioPlayer, type PlayerTrack } from "@/components/player/audio-player";
import {
  PlaylistRegister,
  RegisterHeader,
  SharePlaylistButton,
  SharedPlaylist,
} from "@/components/player/browser/playlist-browser-ui";
import type {
  LoadState,
  PublicPlaylistDetail,
  PublicPlaylistSummary,
} from "@/components/player/browser/types";
import { formatTotalDuration, safeDuration } from "@/lib/format";
import { getMood } from "@/lib/mood";

const sharedPlaylistSearchParam = "playlist";

function getPlaylistShareUrl(playlistId: string): string {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set(sharedPlaylistSearchParam, playlistId);
  return url.toString();
}

export function PlaylistBrowser({
  initialPlaylistId = null,
}: {
  initialPlaylistId?: string | null;
}) {
  const [playlists, setPlaylists] = useState<PublicPlaylistSummary[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(() =>
    initialPlaylistId,
  );
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<PublicPlaylistDetail | null>(null);
  const [listState, setListState] = useState<LoadState>(() =>
    initialPlaylistId ? "idle" : "loading",
  );
  const [detailState, setDetailState] = useState<LoadState>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isSharedView = Boolean(initialPlaylistId);

  useEffect(() => {
    if (isSharedView) {
      return;
    }

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
  }, [isSharedView, listReloadKey]);

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

  const shelfDurationSeconds = useMemo(
    () =>
      playlists.reduce(
        (total, playlist) => total + safeDuration(playlist.durationSeconds),
        0,
      ),
    [playlists],
  );

  const currentPlaylistTitle =
    selectedPlaylist?.title ?? selectedSummary?.title ?? null;

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
  }, []);

  const getCurrentPlaylistShareUrl = useCallback(() => {
    if (!selectedPlaylistId) {
      return null;
    }

    return getPlaylistShareUrl(selectedPlaylistId);
  }, [selectedPlaylistId]);

  const transportOpen = (selectedPlaylist?.tracks.length ?? 0) > 0;
  const canShare = Boolean(selectedPlaylist && selectedPlaylist.tracks.length > 0);

  const subtitle = isSharedView
    ? selectedPlaylist
      ? `${selectedPlaylist.itemCount} tune${
          selectedPlaylist.itemCount === 1 ? "" : "s"
        } · ${formatTotalDuration(selectedPlaylist.durationSeconds)}`
      : detailState === "error"
        ? "This playlist is not available"
        : "Opening playlist"
    : listState === "loading"
      ? "Loading the shelf"
      : playlists.length === 0
        ? "No playlists on the shelf"
        : `${playlists.length} playlist${playlists.length === 1 ? "" : "s"} · ${formatTotalDuration(
            shelfDurationSeconds,
          )}`;

  return (
    <main
      className="flex min-h-screen flex-col text-ink"
      style={mood.cssVars as CSSProperties}
    >
      <div
        className={`page flex flex-1 flex-col ${transportOpen ? "pb-32" : ""}`}
      >
        <RegisterHeader subtitle={subtitle} />

        {isSharedView ? (
          <SharedPlaylist
            currentIndex={currentIndex}
            detail={selectedPlaylist}
            error={detailError}
            isPlaying={isPlaying}
            state={detailState}
            onRetry={() => setDetailReloadKey((key) => key + 1)}
            onSelectTrack={handleSelectTrack}
          />
        ) : (
          <PlaylistRegister
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            state={listState}
            error={listError}
            onRetry={() => setListReloadKey((key) => key + 1)}
            onSelect={handleSelectPlaylist}
            detail={selectedPlaylist}
            detailState={detailState}
            detailError={detailError}
            onRetryDetail={() => setDetailReloadKey((key) => key + 1)}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onSelectTrack={handleSelectTrack}
          />
        )}

        {canShare ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-6">
            <p className="text-xs text-ink-3">
              Sharing {currentPlaylistTitle}
            </p>
            <SharePlaylistButton getShareUrl={getCurrentPlaylistShareUrl} />
          </div>
        ) : null}

        {/* Close the register, don't dock on the transport. pb-32 lives on
            the page column so a long shelf still clears the player. */}
        <footer className="rule-t flex flex-wrap items-center justify-between gap-2 py-6 text-xs text-ink-3">
          <span>© {new Date().getFullYear()} SoundShelf</span>
          <span className="figure">
            Played in the order the curator set it
          </span>
        </footer>
      </div>

      <AudioPlayer
        key={selectedPlaylist?.id ?? "empty-player"}
        currentIndex={currentIndex}
        playlistId={selectedPlaylistId}
        playlistTitle={currentPlaylistTitle}
        tracks={selectedPlaylist?.tracks ?? []}
        onCurrentIndexChange={handleSelectTrack}
        onPlayingChange={setIsPlaying}
        onDurationDiscovered={handleDurationDiscovered}
      />
    </main>
  );
}

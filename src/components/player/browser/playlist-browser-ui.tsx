"use client";

import { Check, Link2, RotateCw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

import { BrandIcon, LevelIcon } from "@/components/ui/brand-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type {
  LoadState,
  PublicPlaylistDetail,
  PublicPlaylistSummary,
} from "@/components/player/browser/types";
import { cumulativeStarts, displayTuneTitle, formatDuration } from "@/lib/format";
import { getMood } from "@/lib/mood";
import { getShelfmark } from "@/lib/shelfmark";

/**
 * The register's masthead: what this is, how much is on the shelf, and the
 * theme control. No tagline and no eyebrow — the wordmark and the holdings
 * count are the whole header.
 */
export function RegisterHeader({
  subtitle,
}: {
  subtitle: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4 py-7 lg:py-10">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          <Link
            aria-label="SoundShelf home"
            className="flex items-center gap-2.5 text-ink no-underline"
            href={"/" as Route}
          >
            <BrandIcon className="size-[18px] shrink-0 text-mood" />
            SoundShelf
          </Link>
        </h1>
        <p className="figure mt-1.5 text-sm text-ink-2">{subtitle}</p>
      </div>
      <ThemeToggle className="-mr-2.5 shrink-0" />
    </header>
  );
}

type ShareState = "idle" | "copied" | "error";

export function SharePlaylistButton({
  getShareUrl,
}: {
  getShareUrl: () => string | null;
}) {
  const [state, setState] = useState<ShareState>("idle");

  useEffect(() => {
    if (state === "idle") {
      return;
    }

    const timer = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    const url = getShareUrl();

    if (!url) {
      setState("error");
      return;
    }

    try {
      await copyText(url);
      setState("copied");
    } catch {
      setState("error");
    }
  }

  const label =
    state === "copied"
      ? "Link copied"
      : state === "error"
        ? "Copy failed"
        : "Share playlist";

  return (
    <button type="button" className="control" onClick={() => void copy()}>
      {state === "copied" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Link2 size={14} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command failed.");
    }
  } finally {
    textarea.remove();
  }
}

/**
 * The shelf. Every public Playlist is one row: its shelf tab and shelfmark,
 * its title, and its two figures. Selecting a row opens its track register in
 * place, so the shelf never disappears to show what is on it.
 */
export function PlaylistRegister({
  playlists,
  selectedPlaylistId,
  state,
  error,
  onRetry,
  onSelect,
  detail,
  detailState,
  detailError,
  onRetryDetail,
  currentIndex,
  isPlaying,
  onSelectTrack,
  share,
}: {
  playlists: PublicPlaylistSummary[];
  selectedPlaylistId: string | null;
  state: LoadState;
  error: string | null;
  onRetry: () => void;
  onSelect: (playlistId: string) => void;
  detail: PublicPlaylistDetail | null;
  detailState: LoadState;
  detailError: string | null;
  onRetryDetail: () => void;
  currentIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  share?: ReactNode;
}) {
  if (state === "loading") {
    return <SkeletonRegister />;
  }

  if (state === "error") {
    return (
      <Notice
        message={error ?? "The shelf could not be loaded."}
        onRetry={onRetry}
      />
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="rule-t py-16 text-center">
        <p className="text-lg font-medium text-ink">The shelf is empty</p>
        <p className="mx-auto mt-2 max-w-prose text-pretty text-sm text-ink-2">
          Public playlists with at least one tune appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ColumnHeads />
      <ul className="rule-t">
        {playlists.map((playlist) => {
          const isSelected = playlist.id === selectedPlaylistId;

          return (
            <li
              key={playlist.id}
              className="rule-b"
              style={getMood(playlist.id).cssVars as CSSProperties}
            >
              <PlaylistRow
                playlist={playlist}
                isSelected={isSelected}
                isReceded={Boolean(selectedPlaylistId) && !isSelected}
                onSelect={() => onSelect(playlist.id)}
              />

              {isSelected ? (
                <TrackRegister
                  detail={detail}
                  state={detailState}
                  error={detailError}
                  onRetry={onRetryDetail}
                  currentIndex={currentIndex}
                  isPlaying={isPlaying}
                  onSelectTrack={onSelectTrack}
                  share={share}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ColumnHeads() {
  return (
    <div className="label grid grid-cols-[1fr_auto] items-end gap-4 pb-2 sm:grid-cols-[7.5rem_minmax(0,1fr)_5rem_6.5rem]">
      <span className="hidden sm:block">Shelfmark</span>
      <span>Playlist</span>
      <span className="hidden text-right sm:block">Tunes</span>
      <span className="text-right">Running time</span>
    </div>
  );
}

function PlaylistRow({
  playlist,
  isSelected,
  isReceded,
  onSelect,
}: {
  playlist: PublicPlaylistSummary;
  isSelected: boolean;
  isReceded: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      className={`row grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-1 py-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_5rem_6.5rem] sm:py-4${
        isSelected
          ? " bg-bg-raised"
          : isReceded
            ? " opacity-60 hover:opacity-100"
            : ""
      }`}
      onClick={onSelect}
    >
      <span className="hidden items-center gap-2 sm:flex">
        <span
          className={`shelf-tab${isSelected ? " shelf-tab-open" : ""}`}
          aria-hidden="true"
        />
        <span className="shelfmark">{getShelfmark(playlist.id)}</span>
      </span>

      <span className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
        <span className="flex items-baseline gap-2">
          <span className="sm:hidden">
            <span
              className={`shelf-tab${isSelected ? " shelf-tab-open" : ""}`}
              aria-hidden="true"
            />
          </span>
          <span
            className={`truncate text-lg tracking-tight sm:text-xl ${
              isSelected ? "font-semibold text-mood-ink" : "font-medium text-ink"
            }`}
          >
            {playlist.title}
          </span>
        </span>
        {playlist.description ? (
          <span className="mt-0.5 block max-w-prose truncate text-sm text-ink-2">
            {playlist.description}
          </span>
        ) : null}
      </span>

      <span className="figure hidden text-right text-sm text-ink-2 sm:block">
        {playlist.itemCount}
      </span>

      <span className="figure col-start-2 row-start-1 text-right text-sm text-ink-2 sm:col-start-4">
        {formatDuration(playlist.durationSeconds)}
      </span>
    </button>
  );
}

/**
 * A Playlist's contents, in Position order. The STARTS column is the point of
 * the register: it reports where each Tune begins inside the set, so the
 * sequence reads as a running order rather than an unordered list.
 */
function TrackRegister({
  detail,
  state,
  error,
  onRetry,
  currentIndex,
  isPlaying,
  onSelectTrack,
  share,
}: {
  detail: PublicPlaylistDetail | null;
  state: LoadState;
  error: string | null;
  onRetry: () => void;
  currentIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  share?: ReactNode;
}) {
  if (state === "loading" || (!detail && state !== "error")) {
    return (
      <div className="pb-5 pl-1 sm:pl-[7.5rem]">
        <p className="label py-3 text-ink-3">Loading the register…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="pb-5 pl-1 sm:pl-[7.5rem]">
        <Notice
          message={error ?? "This playlist could not be loaded."}
          onRetry={onRetry}
          compact
        />
      </div>
    );
  }

  if (!detail || detail.tracks.length === 0) {
    return (
      <div className="pb-5 pl-1 sm:pl-[7.5rem]">
        <p className="py-3 text-sm text-ink-2">
          This playlist has no tunes on it yet.
        </p>
      </div>
    );
  }

  const starts = cumulativeStarts(
    detail.tracks.map((track) => track.durationSeconds),
  );
  const rows = detail.tracks.map((track, index) => ({
    track,
    startsAt: starts[index],
  }));

  return (
    <div className="row-in pb-6 pl-1 sm:pl-[7.5rem]">
      <div className="label grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-4 pb-1.5 sm:grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem]">
        <span>Pos</span>
        <span>Tune</span>
        <span className="whitespace-nowrap text-right">Starts</span>
        <span className="hidden whitespace-nowrap text-right sm:block">
          Length
        </span>
      </div>

      <ol className="rule-t">
        {rows.map(({ track, startsAt }, index) => {
          const isCurrent = index === currentIndex;

          return (
            <li key={track.playlistItemId}>
              <button
                type="button"
                aria-current={isCurrent ? "true" : undefined}
                className="row grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-4 py-2 sm:grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem]"
                onClick={() => onSelectTrack(index)}
              >
                <span
                  className={`figure text-xs ${
                    isCurrent ? "text-mood-ink" : "text-ink-3"
                  }`}
                >
                  {(index + 1).toString().padStart(2, "0")}
                </span>

                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`truncate text-sm ${
                      isCurrent ? "font-medium text-ink" : "text-ink-2"
                    }`}
                  >
                    {displayTuneTitle(track.title)}
                  </span>
                  {isCurrent ? (
                    <span className="label flex shrink-0 items-center gap-1.5 text-ink-3">
                      <LevelIcon isPlaying={isPlaying} className="text-mood" />
                      {isPlaying ? "Playing" : "Paused"}
                    </span>
                  ) : null}
                </span>

                <span className="figure text-right text-xs text-ink-3">
                  {formatDuration(startsAt, { fallback: "0:00" })}
                </span>

                <span className="figure hidden text-right text-xs text-ink-2 sm:block">
                  {formatDuration(track.durationSeconds)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {share ? <div className="flex justify-end pt-3">{share}</div> : null}
    </div>
  );
}

/**
 * A shared link shows this Playlist alone — identity and running order —
 * with no shelf of other holdings.
 */
export function SharedPlaylist({
  detail,
  state,
  error,
  onRetry,
  currentIndex,
  isPlaying,
  onSelectTrack,
  share,
}: {
  detail: PublicPlaylistDetail | null;
  state: LoadState;
  error: string | null;
  onRetry: () => void;
  currentIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  share?: ReactNode;
}) {
  if (state === "error") {
    return (
      <Notice
        message={error ?? "This playlist is not available."}
        onRetry={onRetry}
      />
    );
  }

  if (state === "loading" || !detail) {
    return (
      <div className="rule-t py-10">
        <p className="label text-ink-3">Loading the register…</p>
      </div>
    );
  }

  return (
    <div style={getMood(detail.id).cssVars as CSSProperties}>
      <div className="rule-t grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 bg-bg-raised px-1 py-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_5rem_6.5rem] sm:py-4">
        <span className="hidden items-center gap-2 sm:flex">
          <span className="shelf-tab shelf-tab-open" aria-hidden="true" />
          <span className="shelfmark">{getShelfmark(detail.id)}</span>
        </span>

        <span className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
          <span className="flex items-baseline gap-2">
            <span className="sm:hidden">
              <span className="shelf-tab shelf-tab-open" aria-hidden="true" />
            </span>
            <span className="truncate text-lg font-semibold tracking-tight text-mood-ink sm:text-xl">
              {detail.title}
            </span>
          </span>
          {detail.description ? (
            <span className="mt-0.5 block max-w-prose text-sm text-ink-2">
              {detail.description}
            </span>
          ) : null}
        </span>

        <span className="figure hidden text-right text-sm text-ink-2 sm:block">
          {detail.itemCount}
        </span>

        <span className="figure col-start-2 row-start-1 text-right text-sm text-ink-2 sm:col-start-4">
          {formatDuration(detail.durationSeconds)}
        </span>
      </div>

      <TrackRegister
        currentIndex={currentIndex}
        detail={detail}
        error={error}
        isPlaying={isPlaying}
        share={share}
        state={state}
        onRetry={onRetry}
        onSelectTrack={onSelectTrack}
      />
    </div>
  );
}

function SkeletonRegister() {
  return (
    <div>
      <ColumnHeads />
      <ul className="rule-t" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="rule-b flex items-center gap-4 py-5">
            <span className="h-3 w-16 rounded-[1px] bg-bg-raised" />
            <span
              className="h-4 flex-1 rounded-[1px] bg-bg-raised"
              style={{ maxWidth: `${34 - index * 4}%` }}
            />
            <span className="h-3 w-14 rounded-[1px] bg-bg-raised" />
          </li>
        ))}
      </ul>
      <p className="label sr-only">Loading the shelf</p>
    </div>
  );
}

function Notice({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 ${
        compact ? "py-3" : "rule-t rule-b py-6"
      }`}
    >
      <p className="text-sm text-danger">{message}</p>
      <button type="button" className="control control-outline" onClick={onRetry}>
        <RotateCw size={14} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

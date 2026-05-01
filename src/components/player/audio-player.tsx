"use client";

import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getNextTrackIndex,
  type RepeatMode,
} from "@/lib/playlist/playback";
import { formatDuration } from "@/lib/format";
import { EqualizerIcon } from "@/components/ui/brand-icon";

export type PlayerTrack = {
  id: string;
  playlistItemId: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  audioUrl: string;
};

type AudioPlayerProps = {
  tracks: PlayerTrack[];
  currentIndex: number;
  onCurrentIndexChange: (nextIndex: number) => void;
  isQueueOpen?: boolean;
  onToggleQueue?: () => void;
  playlistTitle?: string | null;
  queuePanel?: React.ReactNode;
  /**
   * Called when the audio element resolves a real duration that differs
   * from the metadata we received from the API. Used to self-heal tracks
   * that were uploaded before durations were captured.
   */
  onDurationDiscovered?: (track: PlayerTrack, durationSeconds: number) => void;
};

export function AudioPlayer({
  tracks,
  currentIndex,
  onCurrentIndexChange,
  isQueueOpen = false,
  onToggleQueue,
  playlistTitle,
  queuePanel,
  onDurationDiscovered,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [volume, setVolume] = useState(0.8);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shouldResumePlayback, setShouldResumePlayback] = useState(false);
  const [trackedItemId, setTrackedItemId] = useState<string | null>(null);

  const safeIndex =
    tracks.length > 0
      ? Math.min(Math.max(currentIndex, 0), tracks.length - 1)
      : 0;
  const currentTrack = tracks[safeIndex] ?? null;
  const canGoPrevious = tracks.length > 1 || currentTime > 3;
  const canGoNext = tracks.length > 1;
  const displayDuration = duration || currentTrack?.durationSeconds || 0;
  const progress =
    displayDuration > 0
      ? Math.min(100, (currentTime / displayDuration) * 100)
      : 0;
  const isMuted = volume === 0;
  const hasQueuePanel = Boolean(isQueueOpen && queuePanel);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !shouldResumePlayback || !currentTrack) {
      return;
    }

    setShouldResumePlayback(false);
    void audio.play().catch(() => {
      setIsPlaying(false);
      setLoadError("Playback could not start.");
    });
  }, [currentTrack, shouldResumePlayback]);

  if (trackedItemId !== (currentTrack?.playlistItemId ?? null)) {
    setTrackedItemId(currentTrack?.playlistItemId ?? null);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(null);
  }

  const goToTrack = useCallback(
    (nextIndex: number, resume = isPlaying) => {
      if (nextIndex < 0 || nextIndex >= tracks.length) {
        return;
      }

      onCurrentIndexChange(nextIndex);
      setShouldResumePlayback(resume);
    },
    [isPlaying, onCurrentIndexChange, tracks.length],
  );

  const skipNext = useCallback(
    (resume = isPlaying) => {
      if (tracks.length === 0) {
        return;
      }

      const nextIndex = safeIndex + 1 < tracks.length ? safeIndex + 1 : 0;
      goToTrack(nextIndex, resume);
    },
    [goToTrack, isPlaying, safeIndex, tracks.length],
  );

  const skipPrevious = useCallback(() => {
    const audio = audioRef.current;

    if (audio && currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const previousIndex =
      safeIndex - 1 >= 0 ? safeIndex - 1 : Math.max(tracks.length - 1, 0);
    goToTrack(previousIndex);
  }, [currentTime, goToTrack, safeIndex, tracks.length]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !currentTrack) {
      return;
    }

    setLoadError(null);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio.play().then(
      () => setIsPlaying(true),
      () => {
        setIsPlaying(false);
        setLoadError("Playback could not start.");
      },
    );
  }, [currentTrack, isPlaying]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) => {
      if (mode === "off") return "track";
      if (mode === "track") return "playlist";
      return "off";
    });
  }, []);

  const repeatLabel = useMemo(() => {
    if (repeatMode === "track") return "Repeat track";
    if (repeatMode === "playlist") return "Repeat playlist";
    return "Repeat off";
  }, [repeatMode]);

  const handleEnded = useCallback(() => {
    const nextIndex = getNextTrackIndex({
      currentIndex: safeIndex,
      trackCount: tracks.length,
      repeatMode,
    });

    if (nextIndex === null) {
      setIsPlaying(false);
      setCurrentTime(displayDuration);
      return;
    }

    goToTrack(nextIndex, true);
  }, [displayDuration, goToTrack, repeatMode, safeIndex, tracks.length]);

  const toggleMute = useCallback(() => {
    setVolume((current) => {
      if (current === 0) {
        return previousVolume || 0.6;
      }

      setPreviousVolume(current);
      return 0;
    });
  }, [previousVolume]);

  if (!currentTrack) {
    return <EmptyPlayer />;
  }

  return (
    <section
      aria-label="Audio player"
      className="panel relative isolate overflow-hidden"
    >
      <PlayerBackdrop />

      <audio
        key={currentTrack.playlistItemId}
        ref={audioRef}
        preload="metadata"
        src={currentTrack.audioUrl}
        onCanPlay={() => setLoadError(null)}
        onDurationChange={(event) => {
          const next = event.currentTarget.duration || 0;
          setDuration(next);

          // If the metadata we got from the API was missing or stale,
          // surface the real duration so the parent can repair its cache
          // (and, if appropriate, persist the fix server-side).
          if (
            currentTrack &&
            onDurationDiscovered &&
            Number.isFinite(next) &&
            next > 0 &&
            Math.abs(next - currentTrack.durationSeconds) >= 1
          ) {
            onDurationDiscovered(currentTrack, next);
          }
        }}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false);
          setLoadError("This track could not be loaded.");
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

      <div
        className="relative grid min-w-0 transition-[grid-template-columns] duration-300 xl:data-[queue-open=true]:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]"
        data-queue-open={hasQueuePanel}
      >
        <div className="relative grid min-w-0 gap-7 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-10 md:p-9 lg:p-11">
          <Vinyl isPlaying={isPlaying} />

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em]">
                <EqualizerIcon
                  isPlaying={isPlaying}
                  className="h-3 text-[hsl(var(--mood))]"
                />
                <span className="font-mono text-[hsl(var(--mood))]">
                  {isPlaying ? "Now Playing" : "Paused"}
                </span>
                {playlistTitle ? (
                  <>
                    <span className="text-[hsl(var(--border))]" aria-hidden="true">
                      /
                    </span>
                    <span className="truncate font-mono text-[hsl(var(--muted))] normal-case tracking-[0.18em]">
                      {playlistTitle}
                    </span>
                  </>
                ) : null}
              </div>

              <h2
                className="max-w-xl text-balance font-sans text-xl font-normal leading-tight text-[hsl(var(--foreground)/0.92)] sm:text-2xl md:text-[28px]"
                key={currentTrack.id}
              >
                <span className="rise-in inline-block">{currentTrack.title}</span>
              </h2>

              {currentTrack.description ? (
                <p className="line-clamp-2 max-w-xl text-[13.5px] leading-6 text-[hsl(var(--muted))]">
                  {currentTrack.description}
                </p>
              ) : null}
            </div>

            {/* Scrubber */}
            <div className="grid gap-2">
              <div className="group relative h-1.5 rounded-full bg-[hsl(var(--surface-3))]">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,hsl(var(--mood)),hsl(var(--mood-2)))]"
                  style={{
                    width: `${progress}%`,
                    boxShadow: "0 0 24px hsl(var(--mood) / 0.55)",
                  }}
                />
                {/* Thumb — visible only on hover/focus to keep the line clean */}
                <div
                  aria-hidden="true"
                  className="absolute -top-[5px] size-3.5 -translate-x-1/2 rounded-full bg-[hsl(var(--foreground))] opacity-0 shadow-[0_0_0_4px_hsl(var(--mood)/0.2)] ring-2 ring-[hsl(var(--mood))] transition group-hover:opacity-100"
                  style={{ left: `${progress}%` }}
                />
                <input
                  aria-label="Seek"
                  className="absolute inset-0 h-1.5 w-full cursor-pointer appearance-none bg-transparent"
                  max={Math.max(displayDuration, 1)}
                  min={0}
                  step={1}
                  type="range"
                  value={Math.min(currentTime, Math.max(displayDuration, 1))}
                  onChange={(event) => {
                    const nextTime = Number(event.target.value);
                    const audio = audioRef.current;

                    if (audio) {
                      audio.currentTime = nextTime;
                    }

                    setCurrentTime(nextTime);
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[11px] tabular-nums text-[hsl(var(--muted))]">
                <span>{formatDuration(currentTime)}</span>
                <span>−{formatDuration(Math.max(displayDuration - currentTime, 0))}</span>
              </div>
            </div>

            {loadError ? (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.12)] px-4 py-2.5 text-sm text-[hsl(var(--danger))]"
                role="status"
              >
                <span>{loadError}</span>
                <button
                  className="rounded-lg border border-[hsl(var(--danger)/0.4)] px-3 py-1 font-medium hover:bg-[hsl(var(--danger)/0.18)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--danger))]"
                  type="button"
                  onClick={() => skipNext(true)}
                >
                  Skip
                </button>
              </div>
            ) : null}

            {/* Transport */}
            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:flex-wrap sm:justify-between">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <TransportButton
                  active={isQueueOpen}
                  disabled={!queuePanel}
                  label={isQueueOpen ? "Hide playlist" : "Show playlist"}
                  onClick={() => onToggleQueue?.()}
                >
                  <ListMusic size={17} aria-hidden="true" />
                </TransportButton>
                <TransportButton
                  disabled={!canGoPrevious}
                  label="Previous track"
                  onClick={skipPrevious}
                >
                  <SkipBack size={18} aria-hidden="true" fill="currentColor" />
                </TransportButton>
                <PlayButton isPlaying={isPlaying} onToggle={togglePlayback} />
                <TransportButton
                  disabled={!canGoNext}
                  label="Next track"
                  onClick={() => skipNext()}
                >
                  <SkipForward size={18} aria-hidden="true" fill="currentColor" />
                </TransportButton>
                <TransportButton
                  active={repeatMode !== "off"}
                  label={repeatLabel}
                  onClick={cycleRepeatMode}
                >
                  {repeatMode === "track" ? (
                    <Repeat1 size={16} aria-hidden="true" />
                  ) : (
                    <Repeat size={16} aria-hidden="true" />
                  )}
                </TransportButton>
                <span className="hidden text-[10px] font-mono uppercase tracking-[0.24em] text-[hsl(var(--muted))] sm:inline">
                  {tracks.length > 0
                    ? `${(safeIndex + 1).toString().padStart(2, "0")} / ${tracks.length
                        .toString()
                        .padStart(2, "0")}`
                    : ""}
                </span>
              </div>

              <VolumeControl
                isMuted={isMuted}
                volume={volume}
                onToggleMute={toggleMute}
                onVolumeChange={setVolume}
              />
            </div>
          </div>
        </div>

        {hasQueuePanel ? (
          <aside className="relative z-10 hidden min-h-full overflow-hidden border-l border-[hsl(var(--border)/0.55)] bg-[hsl(var(--surface)/0.58)] backdrop-blur-xl xl:block">
            {queuePanel}
          </aside>
        ) : null}
      </div>
      {hasQueuePanel ? (
        <div className="relative z-10 max-h-[min(24rem,calc(100vh-8rem))] overflow-hidden border-t border-[hsl(var(--border)/0.55)] bg-[hsl(var(--surface)/0.72)] backdrop-blur-xl xl:hidden">
          {queuePanel}
        </div>
      ) : null}
    </section>
  );
}

/* ---------------- Pieces ---------------- */

function PlayerBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, hsl(var(--mood) / 0.18), transparent 55%), radial-gradient(110% 80% at 100% 100%, hsl(var(--mood-2) / 0.18), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,transparent,hsl(var(--mood)/0.5),transparent)]"
      />
    </>
  );
}

function EmptyPlayer() {
  return (
    <section className="panel relative isolate overflow-hidden p-8 sm:p-12">
      <PlayerBackdrop />
      <div className="relative grid place-items-center gap-5 py-10 text-center">
        <div className="grid size-20 place-items-center rounded-full border border-[hsl(var(--mood)/0.35)] bg-[hsl(var(--surface-2)/0.6)]">
          <span
            className="inline-flex h-7 items-end gap-[3px]"
            aria-hidden="true"
          >
            <span className="eq-bar" style={{ animationDelay: "0ms" }} />
            <span className="eq-bar" style={{ animationDelay: "180ms" }} />
            <span className="eq-bar" style={{ animationDelay: "360ms" }} />
            <span className="eq-bar" style={{ animationDelay: "120ms" }} />
            <span className="eq-bar" style={{ animationDelay: "240ms" }} />
          </span>
        </div>
        <p className="kicker">Soundshelf · Tonight</p>
        <h2 className="display-heading max-w-xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
          Pick a record. Dim the lights.
        </h2>
        <p className="max-w-md text-sm leading-6 text-[hsl(var(--muted))]">
          Choose a curated playlist and the room glows into its mood —
          the player picks up its colours from whatever you press play on.
        </p>
      </div>
    </section>
  );
}

function Vinyl({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[260px] md:mx-0">
      <div className="relative aspect-square">
        {/* Outer halo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--mood) / 0.5), transparent 70%)",
          }}
        />
        {/* The disc itself */}
        <div
          aria-hidden="true"
          className="vinyl relative grid size-full place-items-center rounded-full"
          style={{
            animationPlayState: isPlaying ? "running" : "paused",
            background: `
              repeating-radial-gradient(
                circle at 50% 50%,
                hsl(0 0% 0%) 0,
                hsl(28 18% 12%) 1px,
                hsl(0 0% 0%) 2px,
                hsl(28 18% 8%) 3px
              ),
              radial-gradient(circle at 32% 28%, hsl(var(--mood) / 0.25), transparent 35%),
              radial-gradient(circle at 68% 72%, hsl(var(--mood-2) / 0.25), transparent 38%),
              hsl(0 0% 4%)
            `,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 70px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Highlight */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.18), transparent 30%)",
              mixBlendMode: "screen",
            }}
          />
          {/* Label */}
          <div
            className="relative grid size-[42%] place-items-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--mood)) 0%, hsl(var(--mood-2)) 100%)",
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,0.4), 0 8px 24px hsl(var(--mood) / 0.35)",
            }}
          >
            <div
              className="grid size-[36%] place-items-center rounded-full"
              style={{
                background: "hsl(var(--background))",
                boxShadow:
                  "inset 0 0 0 2px hsl(var(--foreground) / 0.25), 0 0 0 4px hsl(var(--mood) / 0.4)",
              }}
            >
              <span className="size-1.5 rounded-full bg-[hsl(var(--foreground)/0.45)]" />
            </div>
          </div>
        </div>
        {/* Tonearm hint — subtle diagonal light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/5"
        />
      </div>
    </div>
  );
}

function PlayButton({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-label={isPlaying ? "Pause" : "Play"}
      className="grid size-14 place-items-center rounded-full bg-[linear-gradient(135deg,hsl(var(--mood)),hsl(var(--mood-2)))] text-[hsl(28_40%_8%)] shadow-[0_0_0_8px_hsl(var(--mood)/0.10),0_18px_44px_hsl(var(--mood)/0.45)] transition active:scale-95 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[hsl(var(--mood)/0.35)] sm:size-16"
      type="button"
      title={isPlaying ? "Pause" : "Play"}
      onClick={onToggle}
    >
      {isPlaying ? (
        <Pause size={22} aria-hidden="true" fill="currentColor" />
      ) : (
        <Play
          size={22}
          aria-hidden="true"
          fill="currentColor"
          className="translate-x-[1px]"
        />
      )}
    </button>
  );
}

function TransportButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active || undefined}
      className="grid size-10 place-items-center rounded-full text-[hsl(var(--muted))] transition hover:bg-[hsl(var(--surface-2)/0.7)] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mood)/0.45)] disabled:cursor-not-allowed disabled:opacity-30 data-[active=true]:bg-[hsl(var(--mood)/0.16)] data-[active=true]:text-[hsl(var(--mood))]"
      data-active={active}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function VolumeControl({
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
}: {
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (next: number) => void;
}) {
  return (
    <div className="flex w-full max-w-[220px] items-center gap-2 text-sm text-[hsl(var(--muted))] sm:w-auto sm:min-w-[160px]">
      <button
        aria-label={isMuted ? "Unmute" : "Mute"}
        className="grid size-9 place-items-center rounded-full text-[hsl(var(--muted))] transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mood)/0.45)]"
        type="button"
        onClick={onToggleMute}
      >
        {isMuted ? (
          <VolumeX size={16} aria-hidden="true" />
        ) : (
          <Volume2 size={16} aria-hidden="true" />
        )}
      </button>
      <label className="relative flex h-1.5 w-full items-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[hsl(var(--surface-3))]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--foreground)/0.65)]"
          style={{ width: `${volume * 100}%` }}
        />
        <span className="sr-only">Volume</span>
        <input
          aria-label="Volume"
          className="absolute inset-0 h-1.5 w-full cursor-pointer appearance-none bg-transparent"
          max={1}
          min={0}
          step={0.01}
          type="range"
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

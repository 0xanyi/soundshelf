"use client";

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  AudioLines,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getNextTrackIndex,
  type RepeatMode,
} from "@/lib/playlist/playback";
import { formatDuration } from "@/lib/format";

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
  playlistTitle?: string | null;
};

export function AudioPlayer({
  tracks,
  currentIndex,
  onCurrentIndexChange,
  playlistTitle,
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

  // Reset progress when the track changes externally (render-phase derived state).
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
      if (mode === "off") {
        return "track";
      }

      if (mode === "track") {
        return "playlist";
      }

      return "off";
    });
  }, []);

  const repeatLabel = useMemo(() => {
    if (repeatMode === "track") {
      return "Repeat track";
    }

    if (repeatMode === "playlist") {
      return "Repeat playlist";
    }

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
    return (
      <section className="panel relative overflow-hidden p-8 sm:p-10">
        <AmbientGlow />
        <div className="relative grid place-items-center gap-3 py-12 text-center">
          <div className="grid size-16 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))]">
            <AudioLines size={26} aria-hidden="true" />
          </div>
          <p className="kicker">SoundShelf</p>
          <h2 className="display-heading text-2xl font-semibold sm:text-3xl">
            Select a playlist to start listening.
          </h2>
          <p className="max-w-md text-sm text-[hsl(var(--muted))]">
            Pick a curated collection from the sidebar and the player will glow
            into life with the first track.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Audio player"
      className="panel relative overflow-hidden p-6 sm:p-8"
    >
      <AmbientGlow />

      <audio
        key={currentTrack.playlistItemId}
        ref={audioRef}
        preload="metadata"
        src={currentTrack.audioUrl}
        onCanPlay={() => setLoadError(null)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false);
          setLoadError("This track could not be loaded.");
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

      <div className="relative grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] md:items-center md:gap-10">
        <PlayerEmblem isPlaying={isPlaying} />

        <div className="grid gap-6">
          <div className="grid gap-2">
            <p className="kicker flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${
                  isPlaying
                    ? "bg-[hsl(var(--accent))] shadow-[0_0_12px_hsl(var(--accent))]"
                    : "bg-[hsl(var(--muted))]"
                }`}
              />
              {isPlaying ? "Now Playing" : "On Deck"}
              {playlistTitle ? (
                <span className="text-[hsl(var(--muted))] normal-case tracking-normal">
                  {" "}
                  · {playlistTitle}
                </span>
              ) : null}
            </p>
            <h2 className="display-heading text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
              {currentTrack.title}
            </h2>
            {currentTrack.description ? (
              <p className="line-clamp-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted))]">
                {currentTrack.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="relative h-2 rounded-full bg-[hsl(var(--surface-2))]">
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,hsl(var(--accent)),hsl(var(--accent-2)))] shadow-[0_0_24px_hsl(var(--accent)/0.4)]"
                style={{ width: `${progress}%` }}
              />
              <input
                aria-label="Seek"
                className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent"
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

          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <TransportButton
                disabled={!canGoPrevious}
                label="Previous track"
                onClick={skipPrevious}
              >
                <SkipBack size={20} aria-hidden="true" />
              </TransportButton>
              <PlayButton
                isPlaying={isPlaying}
                onToggle={togglePlayback}
              />
              <TransportButton
                disabled={!canGoNext}
                label="Next track"
                onClick={() => skipNext()}
              >
                <SkipForward size={20} aria-hidden="true" />
              </TransportButton>
              <TransportButton
                active={repeatMode !== "off"}
                label={repeatLabel}
                onClick={cycleRepeatMode}
              >
                {repeatMode === "track" ? (
                  <Repeat1 size={18} aria-hidden="true" />
                ) : (
                  <Repeat size={18} aria-hidden="true" />
                )}
              </TransportButton>
            </div>

            <div className="flex min-w-44 items-center gap-2 text-sm text-[hsl(var(--muted))]">
              <button
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="grid size-9 place-items-center rounded-full border border-[hsl(var(--border)/0.6)] text-foreground transition hover:bg-[hsl(var(--surface-2))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                type="button"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX size={16} aria-hidden="true" />
                ) : (
                  <Volume2 size={16} aria-hidden="true" />
                )}
              </button>
              <label className="relative flex h-2 w-full items-center">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[hsl(var(--surface-2))]"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--foreground)/0.7)]"
                  style={{ width: `${volume * 100}%` }}
                />
                <span className="sr-only">Volume</span>
                <input
                  aria-label="Volume"
                  className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent"
                  max={1}
                  min={0}
                  step={0.01}
                  type="range"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AmbientGlow() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 size-72 rounded-full bg-[hsl(var(--accent-2)/0.25)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 size-80 rounded-full bg-[hsl(var(--accent)/0.18)] blur-3xl"
      />
    </>
  );
}

function PlayerEmblem({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="relative mx-auto md:mx-0">
      <div
        aria-hidden="true"
        className="relative grid aspect-square w-44 place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.22),transparent_22%),conic-gradient(from_140deg,hsl(var(--accent-2)/0.5),hsl(var(--surface-2))_45%,hsl(var(--accent)/0.45)_75%,hsl(var(--accent-2)/0.5))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_24px_60px_rgba(0,0,0,0.4)] animate-[spin_24s_linear_infinite] sm:w-48"
        style={{ animationPlayState: isPlaying ? "running" : "paused" }}
      >
        <div className="grid size-20 place-items-center rounded-full bg-[hsl(var(--surface)/0.85)] backdrop-blur-md">
          <div className="size-5 rounded-full bg-[hsl(var(--background))] shadow-inner" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/5"
      />
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
      className="grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent-2)))] text-slate-950 shadow-[0_0_0_8px_hsl(var(--accent)/0.12),0_18px_44px_hsl(var(--accent)/0.45)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.35)]"
      type="button"
      title={isPlaying ? "Pause" : "Play"}
      onClick={onToggle}
    >
      {isPlaying ? (
        <Pause size={24} aria-hidden="true" fill="currentColor" />
      ) : (
        <Play
          size={24}
          aria-hidden="true"
          fill="currentColor"
          className="translate-x-0.5"
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
      className="grid size-11 place-items-center rounded-full border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--surface-2)/0.5)] text-foreground transition hover:bg-[hsl(var(--surface-2))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.2)] disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:border-[hsl(var(--accent)/0.5)] data-[active=true]:bg-[hsl(var(--accent)/0.18)] data-[active=true]:text-[hsl(var(--accent))]"
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



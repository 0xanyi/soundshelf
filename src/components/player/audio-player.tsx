"use client";

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getNextTrackIndex,
  type RepeatMode,
} from "@/lib/playlist/playback";

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
};

export function AudioPlayer({ tracks }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shouldResumePlayback, setShouldResumePlayback] = useState(false);

  const currentTrack = tracks[currentIndex] ?? null;
  const canGoPrevious = tracks.length > 1 || currentTime > 3;
  const canGoNext = tracks.length > 1;
  const displayDuration = duration || currentTrack?.durationSeconds || 0;

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

  const goToTrack = useCallback(
    (nextIndex: number, resume = isPlaying) => {
      if (nextIndex < 0 || nextIndex >= tracks.length) {
        return;
      }

      setCurrentIndex(nextIndex);
      setCurrentTime(0);
      setDuration(0);
      setLoadError(null);
      setShouldResumePlayback(resume);
    },
    [isPlaying, tracks.length],
  );

  const skipNext = useCallback(
    (resume = isPlaying) => {
      if (tracks.length === 0) {
        return;
      }

      const nextIndex = currentIndex + 1 < tracks.length ? currentIndex + 1 : 0;
      goToTrack(nextIndex, resume);
    },
    [currentIndex, goToTrack, isPlaying, tracks.length],
  );

  const skipPrevious = useCallback(() => {
    const audio = audioRef.current;

    if (audio && currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const previousIndex =
      currentIndex - 1 >= 0 ? currentIndex - 1 : Math.max(tracks.length - 1, 0);
    goToTrack(previousIndex);
  }, [currentIndex, currentTime, goToTrack, tracks.length]);

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
      currentIndex,
      trackCount: tracks.length,
      repeatMode,
    });

    if (nextIndex === null) {
      setIsPlaying(false);
      setCurrentTime(displayDuration);
      return;
    }

    goToTrack(nextIndex, true);
  }, [currentIndex, displayDuration, goToTrack, repeatMode, tracks.length]);

  if (!currentTrack) {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm text-muted">Select a playlist to start listening.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Audio player"
      className="rounded-lg border border-black/10 bg-white p-5 shadow-sm"
    >
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

      <div className="grid gap-4">
        <div className="min-h-16">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Now Playing
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-tight">
            {currentTrack.title}
          </h2>
          {currentTrack.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
              {currentTrack.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <input
            aria-label="Seek"
            className="h-2 w-full accent-[hsl(var(--accent))]"
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
          <div className="flex justify-between text-xs tabular-nums text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>

        {loadError ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
            role="status"
          >
            <span>{loadError}</span>
            <button
              className="rounded-md border border-red-200 px-3 py-1 font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              type="button"
              onClick={() => skipNext(true)}
            >
              Skip
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconButton
              disabled={!canGoPrevious}
              label="Previous track"
              onClick={skipPrevious}
            >
              <SkipBack size={20} aria-hidden="true" />
            </IconButton>
            <IconButton label={isPlaying ? "Pause" : "Play"} onClick={togglePlayback}>
              {isPlaying ? (
                <Pause size={22} aria-hidden="true" />
              ) : (
                <Play size={22} aria-hidden="true" />
              )}
            </IconButton>
            <IconButton
              disabled={!canGoNext}
              label="Next track"
              onClick={() => skipNext()}
            >
              <SkipForward size={20} aria-hidden="true" />
            </IconButton>
            <IconButton
              active={repeatMode !== "off"}
              label={repeatLabel}
              onClick={cycleRepeatMode}
            >
              {repeatMode === "track" ? (
                <Repeat1 size={20} aria-hidden="true" />
              ) : (
                <Repeat size={20} aria-hidden="true" />
              )}
            </IconButton>
          </div>

          <label className="flex min-w-44 items-center gap-2 text-sm text-muted">
            <Volume2 size={18} aria-hidden="true" />
            <span className="sr-only">Volume</span>
            <input
              aria-label="Volume"
              className="w-full accent-[hsl(var(--accent))]"
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
    </section>
  );
}

function IconButton({
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
      className="grid size-11 place-items-center rounded-md border border-black/10 bg-white text-foreground shadow-sm transition hover:border-black/20 hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:border-[hsl(var(--accent))] data-[active=true]:bg-[hsl(var(--accent))] data-[active=true]:text-white"
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

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

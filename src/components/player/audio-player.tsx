"use client";

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getNextTrackIndex, type RepeatMode } from "@/lib/playlist/playback";
import { displayTuneTitle, formatDuration } from "@/lib/format";
import { getShelfmark } from "@/lib/shelfmark";
import { LevelIcon } from "@/components/ui/brand-icon";

export type PlayerTrack = {
  id: string;
  playlistItemId: string;
  title: string;
  durationSeconds: number;
  audioUrl: string;
};

type AudioPlayerProps = {
  tracks: PlayerTrack[];
  currentIndex: number;
  onCurrentIndexChange: (nextIndex: number) => void;
  playlistId?: string | null;
  playlistTitle?: string | null;
  /** Lifted so the register can mark the playing row without owning the audio. */
  onPlayingChange?: (isPlaying: boolean) => void;
  /**
   * Called when the audio element resolves a real duration that differs
   * from the metadata we received from the API. Used to self-heal tracks
   * that were uploaded before durations were captured.
   */
  onDurationDiscovered?: (track: PlayerTrack, durationSeconds: number) => void;
};

/**
 * The transport register: a fixed line at the foot of the viewport carrying
 * the shelfmark, the Position, what is playing, the exact clock, and the
 * controls. Its top edge is the scrub rule — the hairline that separates the
 * transport from the register above it is the same line that reports
 * progress, so the surface never grows a second bar to hold it.
 */
export function AudioPlayer({
  tracks,
  currentIndex,
  onCurrentIndexChange,
  playlistId,
  playlistTitle,
  onPlayingChange,
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
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

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
    return null;
  }

  const position = `${(safeIndex + 1).toString().padStart(2, "0")}/${tracks.length
    .toString()
    .padStart(2, "0")}`;

  return (
    <section
      aria-label="Audio player"
      className="fixed inset-x-0 bottom-0 z-30 bg-bg"
    >
      <audio
        key={currentTrack.playlistItemId}
        ref={audioRef}
        preload="metadata"
        src={currentTrack.audioUrl}
        onLoadStart={() => {
          setCurrentTime(0);
          setDuration(0);
          setLoadError(null);
        }}
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

      <Scrubber
        progress={progress}
        currentTime={currentTime}
        displayDuration={displayDuration}
        onSeek={(nextTime) => {
          const audio = audioRef.current;

          if (audio) {
            audio.currentTime = nextTime;
          }

          setCurrentTime(nextTime);
        }}
      />

      {loadError ? (
        <p
          className="rule-b flex items-center justify-between gap-4 px-4 py-2 text-sm text-danger sm:px-6 lg:px-8"
          role="status"
        >
          <span>{loadError}</span>
          <button
            className="control control-danger h-7"
            type="button"
            onClick={() => skipNext(true)}
          >
            Skip this track
          </button>
        </p>
      ) : null}

      <div className="page grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-2.5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* What is playing */}
        <div className="flex min-w-0 items-baseline gap-2.5 lg:gap-3">
          <span className="shelf-tab shrink-0 self-center" aria-hidden="true" />
          <span className="shelfmark hidden shrink-0 sm:inline">
            {getShelfmark(playlistId)}
          </span>
          <span
            key={safeIndex}
            className="figure tick shrink-0 text-xs text-ink-3"
          >
            {position}
          </span>
          <h2 className="min-w-0 truncate text-sm font-medium text-ink">
            {displayTuneTitle(currentTrack.title)}
          </h2>
          {playlistTitle ? (
            <span className="hidden min-w-0 shrink truncate text-xs text-ink-3 xl:inline">
              {playlistTitle}
            </span>
          ) : null}
        </div>

        {/* Transport */}
        <div className="col-start-2 row-start-1 flex items-center gap-0.5 lg:col-start-2 lg:justify-self-center">
          <button
            type="button"
            className="control control-icon"
            aria-label="Previous track"
            disabled={!canGoPrevious}
            onClick={skipPrevious}
          >
            <SkipBack size={15} aria-hidden="true" fill="currentColor" />
          </button>

          <button
            type="button"
            className="control control-icon control-solid mx-1"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause size={15} aria-hidden="true" fill="currentColor" />
            ) : (
              <Play size={15} aria-hidden="true" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            className="control control-icon"
            aria-label="Next track"
            disabled={!canGoNext}
            onClick={() => skipNext()}
          >
            <SkipForward size={15} aria-hidden="true" fill="currentColor" />
          </button>

          <button
            type="button"
            className={`control control-icon ${
              repeatMode !== "off" ? "text-mood-ink" : ""
            }`}
            aria-label={repeatLabel}
            aria-pressed={repeatMode !== "off"}
            onClick={cycleRepeatMode}
          >
            {repeatMode === "track" ? (
              <Repeat1 size={15} aria-hidden="true" />
            ) : (
              <Repeat size={15} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Clock and level */}
        <div className="col-span-2 flex items-center justify-between gap-4 lg:col-span-1 lg:col-start-3 lg:justify-end">
          <span className="figure text-xs text-ink-2">
            {formatDuration(currentTime)}
            <span className="px-1 text-ink-3" aria-hidden="true">
              /
            </span>
            <span className="text-ink-3">
              −{formatDuration(Math.max(displayDuration - currentTime, 0))}
            </span>
          </span>

          <span className="label flex items-center gap-1.5 text-ink-3">
            <LevelIcon isPlaying={isPlaying} className="text-mood" />
            {isPlaying ? "Playing" : "Paused"}
          </span>

          <VolumeControl
            isMuted={isMuted}
            volume={volume}
            onToggleMute={toggleMute}
            onVolumeChange={setVolume}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * The progress rule. It is the transport's top border, drawn 2px so it can
 * carry a fill, with a taller transparent hit area above it so seeking does
 * not demand pixel accuracy.
 */
function Scrubber({
  progress,
  currentTime,
  displayDuration,
  onSeek,
}: {
  progress: number;
  currentTime: number;
  displayDuration: number;
  onSeek: (nextTime: number) => void;
}) {
  return (
    <div className="group relative h-0.5 w-full bg-rule">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-mood"
        style={{ width: `${progress}%` }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mood opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ left: `${progress}%` }}
      />
      <input
        aria-label="Seek"
        className="absolute -top-2 left-0 h-6 w-full cursor-pointer appearance-none bg-transparent opacity-0"
        max={Math.max(displayDuration, 1)}
        min={0}
        step={1}
        type="range"
        value={Math.min(currentTime, Math.max(displayDuration, 1))}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
    </div>
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
  const Icon = isMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        type="button"
        className="control control-icon"
        aria-label={isMuted ? "Unmute" : "Mute"}
        onClick={onToggleMute}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
      <input
        aria-label="Volume"
        className="range w-16"
        max={1}
        min={0}
        step={0.01}
        type="range"
        value={volume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
      />
    </div>
  );
}

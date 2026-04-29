export type RepeatMode = "off" | "track" | "playlist";

export type GetNextTrackIndexInput = {
  currentIndex: number;
  trackCount: number;
  repeatMode: RepeatMode;
};

export function getNextTrackIndex({
  currentIndex,
  trackCount,
  repeatMode,
}: GetNextTrackIndexInput): number | null {
  if (trackCount <= 0) {
    return null;
  }

  if (repeatMode === "track") {
    return currentIndex;
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex < trackCount) {
    return nextIndex;
  }

  if (repeatMode === "playlist") {
    return 0;
  }

  return null;
}

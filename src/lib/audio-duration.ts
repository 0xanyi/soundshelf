type ReadAudioDurationOptions = {
  timeoutMs?: number;
};

const DEFAULT_AUDIO_DURATION_TIMEOUT_MS = 7_500;

/**
 * Decode just enough of the audio file to read its duration. Browsers do this
 * cheaply via the `<audio>` element's metadata event, no decoding required.
 * Returns 0 if metadata cannot be read — the server treats that as unknown.
 */
export function readAudioDuration(
  file: File,
  options: ReadAudioDurationOptions = {},
): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(0);
      return;
    }

    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    const timeoutMs = options.timeoutMs ?? DEFAULT_AUDIO_DURATION_TIMEOUT_MS;

    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      finish(0);
    }, timeoutMs);

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("error", onError);
    };

    const finish = (durationSeconds: number) => {
      cleanup();
      resolve(durationSeconds);
    };

    const onLoaded = () => {
      const value = audio.duration;
      finish(Number.isFinite(value) && value > 0 ? value : 0);
    };

    const onError = () => {
      finish(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("error", onError);
    audio.src = objectUrl;
  });
}

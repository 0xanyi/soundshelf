/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { readAudioDuration } from "../../src/lib/audio-duration";

describe("readAudioDuration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves 0 and releases the object URL when metadata never loads", async () => {
    vi.useFakeTimers();

    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:audio-test");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    const durationPromise = readAudioDuration(file, { timeoutMs: 25 });

    await vi.advanceTimersByTimeAsync(25);

    await expect(durationPromise).resolves.toBe(0);
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:audio-test");
  });
});

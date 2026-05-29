import { describe, expect, it } from "vitest";

import { buildTuneObjectKey } from "../../src/lib/r2";

describe("buildTuneObjectKey", () => {
  it("creates unique safe tune audio object keys", () => {
    const first = buildTuneObjectKey("Sunday Chant 01.mp3");
    const second = buildTuneObjectKey("Sunday Chant 01.mp3");

    expect(first).toMatch(
      /^audio\/tunes\/\d{4}\/\d{2}\/[a-z0-9-]+-[a-f0-9-]{36}\.mp3$/,
    );
    expect(first).not.toBe(second);
    expect(first).not.toContain(" ");
  });

  it("falls back to audio when the file name has no safe base name", () => {
    expect(buildTuneObjectKey("###.wav")).toMatch(
      /^audio\/tunes\/\d{4}\/\d{2}\/audio-[a-f0-9-]{36}\.wav$/,
    );
  });

  it("uses a provided object id for retry-safe upload attempts", () => {
    const objectId = "123e4567-e89b-12d3-a456-426614174000";

    expect(buildTuneObjectKey("Sunday Chant.mp3", objectId)).toMatch(
      new RegExp(
        `^audio/tunes/\\d{4}/\\d{2}/sunday-chant-${objectId}\\.mp3$`,
      ),
    );
  });
});

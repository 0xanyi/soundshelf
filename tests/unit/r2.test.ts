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
});

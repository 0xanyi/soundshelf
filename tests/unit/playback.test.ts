import { describe, expect, it } from "vitest";

import { getNextTrackIndex } from "../../src/lib/playlist/playback";

describe("getNextTrackIndex", () => {
  it("advances to the next track", () => {
    expect(
      getNextTrackIndex({
        currentIndex: 0,
        trackCount: 3,
        repeatMode: "off",
      }),
    ).toBe(1);
  });

  it("stops at the end when repeat is off", () => {
    expect(
      getNextTrackIndex({
        currentIndex: 2,
        trackCount: 3,
        repeatMode: "off",
      }),
    ).toBeNull();
  });

  it("loops to the start at the end when repeat playlist is enabled", () => {
    expect(
      getNextTrackIndex({
        currentIndex: 2,
        trackCount: 3,
        repeatMode: "playlist",
      }),
    ).toBe(0);
  });

  it("repeats the current track when repeat track is enabled", () => {
    expect(
      getNextTrackIndex({
        currentIndex: 2,
        trackCount: 3,
        repeatMode: "track",
      }),
    ).toBe(2);
  });

  it("returns null for repeat track when the current index is negative", () => {
    expect(
      getNextTrackIndex({
        currentIndex: -1,
        trackCount: 3,
        repeatMode: "track",
      }),
    ).toBeNull();
  });

  it("returns null for repeat track when the current index is outside the playlist", () => {
    expect(
      getNextTrackIndex({
        currentIndex: 3,
        trackCount: 3,
        repeatMode: "track",
      }),
    ).toBeNull();
  });

  it("returns null for an empty playlist", () => {
    expect(
      getNextTrackIndex({
        currentIndex: 0,
        trackCount: 0,
        repeatMode: "playlist",
      }),
    ).toBeNull();
  });
});

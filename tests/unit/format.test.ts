import { describe, expect, it } from "vitest";

import {
  displayTuneTitle,
  formatDate,
  formatTotalDuration,
  tuneTitleFromFileName,
} from "../../src/lib/format";

describe("formatDate", () => {
  it("formats dates in UTC so server and browser text match", () => {
    expect(formatDate("2026-05-08T00:30:00.000Z")).toBe("May 8, 2026, 12:30 AM");
  });
});

describe("formatTotalDuration", () => {
  it("uses full singular and plural duration units", () => {
    expect(formatTotalDuration(0)).toBe("0 minutes");
    expect(formatTotalDuration(60)).toBe("1 minute");
    expect(formatTotalDuration(120)).toBe("2 minutes");
    expect(formatTotalDuration(19 * 60)).toBe("19 minutes");
    expect(formatTotalDuration(60 * 60)).toBe("1 hour");
    expect(formatTotalDuration(2 * 60 * 60)).toBe("2 hours");
    expect(formatTotalDuration(61 * 60)).toBe("1 hour 1 minute");
    expect(formatTotalDuration(79 * 60)).toBe("1 hour 19 minutes");
  });
});

describe("displayTuneTitle", () => {
  it("turns filename stems into words and strips audio extensions", () => {
    expect(displayTuneTitle("1hr-052601.mp3")).toBe("1hr 052601");
    expect(displayTuneTitle("1hr-052601")).toBe("1hr 052601");
    expect(displayTuneTitle("lo-fi_nights.wav")).toBe("lo fi nights");
    expect(displayTuneTitle("song.mp3")).toBe("song");
  });

  it("leaves curator titles that already contain a space", () => {
    expect(displayTuneTitle("Praying in the Spirit")).toBe(
      "Praying in the Spirit",
    );
    expect(displayTuneTitle("Lo-Fi Beats")).toBe("Lo-Fi Beats");
  });

  it("falls back when the stem is empty", () => {
    expect(displayTuneTitle("   ")).toBe("Untitled tune");
    expect(displayTuneTitle(".mp3")).toBe("Untitled tune");
  });
});

describe("tuneTitleFromFileName", () => {
  it("strips any final extension before humanizing", () => {
    expect(tuneTitleFromFileName("sermon.mp4")).toBe("sermon");
    expect(tuneTitleFromFileName("1hr-052601.mp3")).toBe("1hr 052601");
    expect(tuneTitleFromFileName("My Song.wav")).toBe("My Song");
    expect(tuneTitleFromFileName(".mp3")).toBe("Untitled tune");
  });
});

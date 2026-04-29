import { describe, expect, it } from "vitest";

import {
  parseTuneUpdatePayload,
  serializeAdminTune,
} from "../../src/lib/tunes/admin";

describe("parseTuneUpdatePayload", () => {
  it("trims title and accepts draft status", () => {
    expect(
      parseTuneUpdatePayload({
        title: "  Morning Prayer  ",
        description: "  Opening chant  ",
        status: "draft",
      }),
    ).toEqual({
      valid: true,
      data: {
        title: "Morning Prayer",
        description: "Opening chant",
        status: "draft",
      },
    });
  });

  it("normalizes blank descriptions to null", () => {
    expect(
      parseTuneUpdatePayload({
        title: "Tune",
        description: "   ",
        status: "active",
      }),
    ).toEqual({
      valid: true,
      data: {
        title: "Tune",
        description: null,
        status: "active",
      },
    });
  });

  it("rejects blank titles and unsupported statuses", () => {
    expect(
      parseTuneUpdatePayload({
        title: " ",
        description: null,
        status: "archived",
      }),
    ).toEqual({
      valid: false,
      message: "Title is required.",
    });

    expect(
      parseTuneUpdatePayload({
        title: "Tune",
        description: null,
        status: "archived",
      }),
    ).toEqual({
      valid: false,
      message: "Status must be draft or active.",
    });
  });
});

describe("serializeAdminTune", () => {
  it("serializes BigInt file size and includes playlist usage count", () => {
    expect(
      serializeAdminTune({
        id: "tune_1",
        title: "Tune",
        description: null,
        durationSeconds: 42,
        mimeType: "audio/mpeg",
        fileSizeBytes: BigInt(1234),
        r2ObjectKey: "tunes/tune.mp3",
        status: "active",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:01:00.000Z"),
        _count: { playlistItems: 2 },
      }),
    ).toEqual({
      id: "tune_1",
      title: "Tune",
      description: null,
      durationSeconds: 42,
      mimeType: "audio/mpeg",
      fileSizeBytes: "1234",
      r2ObjectKey: "tunes/tune.mp3",
      status: "active",
      createdAt: "2026-04-29T10:00:00.000Z",
      updatedAt: "2026-04-29T10:01:00.000Z",
      playlistItemCount: 2,
      canDelete: false,
    });
  });
});

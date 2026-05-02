import { describe, expect, it } from "vitest";

import {
  getTuneDeleteStorageCleanupWarning,
  getTuneDeletePrismaErrorResponse,
  parseBulkAddTunesPayload,
  parseTunePlaylistsSyncPayload,
  parseTuneUpdatePayload,
  serializeAdminTune,
} from "../../src/lib/tunes/admin";

describe("parseTuneUpdatePayload", () => {
  it("trims title", () => {
    expect(
      parseTuneUpdatePayload({
        title: "  Morning Prayer  ",
      }),
    ).toEqual({
      valid: true,
      data: {
        title: "Morning Prayer",
      },
    });
  });

  it("rejects blank titles", () => {
    expect(
      parseTuneUpdatePayload({
        title: " ",
      }),
    ).toEqual({
      valid: false,
      message: "Title is required.",
    });
  });

  it("rejects non-object payloads", () => {
    expect(parseTuneUpdatePayload(null)).toEqual({
      valid: false,
      message: "JSON body is required.",
    });
  });
});

describe("parseTunePlaylistsSyncPayload", () => {
  it("accepts and de-duplicates playlist ids", () => {
    expect(
      parseTunePlaylistsSyncPayload({
        playlistIds: ["a", "b", "a"],
      }),
    ).toEqual({
      valid: true,
      data: { playlistIds: ["a", "b"] },
    });
  });

  it("accepts an empty array (clear membership)", () => {
    expect(parseTunePlaylistsSyncPayload({ playlistIds: [] })).toEqual({
      valid: true,
      data: { playlistIds: [] },
    });
  });

  it("rejects missing or non-array playlistIds", () => {
    expect(parseTunePlaylistsSyncPayload({})).toEqual({
      valid: false,
      message: "playlistIds must be an array.",
    });

    expect(
      parseTunePlaylistsSyncPayload({ playlistIds: ["a", ""] }),
    ).toEqual({
      valid: false,
      message: "playlistIds must be non-empty strings.",
    });
  });
});

describe("parseBulkAddTunesPayload", () => {
  it("parses a valid payload and de-duplicates inputs", () => {
    expect(
      parseBulkAddTunesPayload({
        tuneIds: ["t1", "t2", "t1"],
        playlistIds: ["p1", "p1"],
      }),
    ).toEqual({
      valid: true,
      data: {
        tuneIds: ["t1", "t2"],
        playlistIds: ["p1"],
      },
    });
  });

  it("ignores any client-provided mode field (only additive operation supported)", () => {
    expect(
      parseBulkAddTunesPayload({
        tuneIds: ["t1"],
        playlistIds: ["p1"],
        mode: "set",
      }),
    ).toEqual({
      valid: true,
      data: { tuneIds: ["t1"], playlistIds: ["p1"] },
    });
  });

  it("rejects non-array tuneIds", () => {
    expect(
      parseBulkAddTunesPayload({
        tuneIds: "t1",
        playlistIds: ["p1"],
      }),
    ).toEqual({
      valid: false,
      message: "tuneIds must be an array.",
    });
  });
});

describe("serializeAdminTune", () => {
  it("serializes BigInt file size, playlist memberships, and usage count without leaking r2ObjectKey", () => {
    const result = serializeAdminTune({
      id: "tune_1",
      title: "Tune",
      durationSeconds: 42,
      mimeType: "audio/mpeg",
      fileSizeBytes: BigInt(1234),
      createdAt: new Date("2026-04-29T10:00:00.000Z"),
      updatedAt: new Date("2026-04-29T10:01:00.000Z"),
      _count: { playlistItems: 2 },
      playlistItems: [
        { playlist: { id: "p1", title: "Morning" } },
        { playlist: { id: "p2", title: "Evening" } },
      ],
    });

    expect(result).toEqual({
      id: "tune_1",
      title: "Tune",
      durationSeconds: 42,
      mimeType: "audio/mpeg",
      fileSizeBytes: "1234",
      createdAt: "2026-04-29T10:00:00.000Z",
      updatedAt: "2026-04-29T10:01:00.000Z",
      playlistItemCount: 2,
      canDelete: false,
      playlists: [
        { id: "p1", title: "Morning" },
        { id: "p2", title: "Evening" },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("r2ObjectKey");
  });

  it("treats absent playlistItems as empty memberships", () => {
    const result = serializeAdminTune({
      id: "tune_1",
      title: "Tune",
      durationSeconds: 0,
      mimeType: "audio/mpeg",
      fileSizeBytes: BigInt(0),
      createdAt: new Date("2026-04-29T10:00:00.000Z"),
      updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      _count: { playlistItems: 0 },
    });

    expect(result.playlists).toEqual([]);
    expect(result.canDelete).toBe(true);
  });
});

describe("getTuneDeletePrismaErrorResponse", () => {
  it("maps foreign key constraint failures to a playlist usage conflict", () => {
    expect(
      getTuneDeletePrismaErrorResponse({
        code: "P2003",
        clientVersion: "7.8.0",
        meta: { modelName: "Tune", field_name: "PlaylistItem_tuneId_fkey" },
      }),
    ).toEqual({
      status: 409,
      message: "Tune is used in a playlist and cannot be deleted.",
    });
  });

  it("maps missing delete records to not found", () => {
    expect(
      getTuneDeletePrismaErrorResponse({
        code: "P2025",
        clientVersion: "7.8.0",
      }),
    ).toEqual({
      status: 404,
      message: "Tune not found.",
    });
  });

  it("ignores unrelated Prisma errors", () => {
    expect(
      getTuneDeletePrismaErrorResponse({
        code: "P2002",
        clientVersion: "7.8.0",
      }),
    ).toBeNull();
  });
});

describe("getTuneDeleteStorageCleanupWarning", () => {
  it("returns a safe response body for post-delete storage cleanup failures", () => {
    expect(getTuneDeleteStorageCleanupWarning()).toEqual({
      warning:
        "Tune deleted, but the audio file could not be removed from storage. Please retry cleanup or check R2 configuration.",
    });
  });
});

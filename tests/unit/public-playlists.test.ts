import { describe, expect, it } from "vitest";

import {
  serializePublicPlaylistDetail,
  serializePublicPlaylistSummary,
} from "../../src/lib/playlists/public";

describe("serializePublicPlaylistSummary", () => {
  it("counts active tunes only", () => {
    expect(
      serializePublicPlaylistSummary({
        id: "playlist_1",
        title: "Morning",
        description: "Start of day",
        updatedAt: new Date("2026-04-01T08:00:00.000Z"),
        items: [
          { tune: { durationSeconds: 120, status: "active" } },
          { tune: { durationSeconds: 80, status: "draft" } },
          { tune: { durationSeconds: 90, status: "active" } },
        ],
      }),
    ).toEqual({
      id: "playlist_1",
      title: "Morning",
      description: "Start of day",
      itemCount: 2,
      durationSeconds: 210,
    });
  });
});

describe("serializePublicPlaylistDetail", () => {
  it("returns ordered active tracks with signed urls and no raw object keys", async () => {
    const playlist = await serializePublicPlaylistDetail(
      {
        id: "playlist_1",
        title: "Evening",
        description: null,
        updatedAt: new Date("2026-04-02T19:00:00.000Z"),
        items: [
          {
            id: "item_2",
            position: 1,
            createdAt: new Date("2026-04-02T19:02:00.000Z"),
            tune: {
              id: "tune_2",
              title: "Second",
              description: null,
              durationSeconds: 90,
              status: "active",
              r2ObjectKey: "audio/second.mp3",
            },
          },
          {
            id: "item_1",
            position: 0,
            createdAt: new Date("2026-04-02T19:01:00.000Z"),
            tune: {
              id: "tune_1",
              title: "First",
              description: "Opening",
              durationSeconds: 120,
              status: "active",
              r2ObjectKey: "audio/first.mp3",
            },
          },
          {
            id: "item_3",
            position: 2,
            createdAt: new Date("2026-04-02T19:03:00.000Z"),
            tune: {
              id: "tune_3",
              title: "Draft",
              description: null,
              durationSeconds: 80,
              status: "draft",
              r2ObjectKey: "audio/draft.mp3",
            },
          },
        ],
      },
      async (key) => `https://cdn.example.test/${key}`,
    );

    expect(playlist?.tracks).toEqual([
      {
        id: "tune_1",
        playlistItemId: "item_1",
        title: "First",
        description: "Opening",
        durationSeconds: 120,
        audioUrl: "https://cdn.example.test/audio/first.mp3",
      },
      {
        id: "tune_2",
        playlistItemId: "item_2",
        title: "Second",
        description: null,
        durationSeconds: 90,
        audioUrl: "https://cdn.example.test/audio/second.mp3",
      },
    ]);
    expect(JSON.stringify(playlist)).not.toContain("r2ObjectKey");
  });

  it("omits tracks whose signed urls cannot be created and returns null when none remain", async () => {
    const playlist = {
      id: "playlist_1",
      title: "Evening",
      description: null,
      updatedAt: new Date("2026-04-02T19:00:00.000Z"),
      items: [
        {
          id: "item_1",
          position: 0,
          createdAt: new Date("2026-04-02T19:01:00.000Z"),
          tune: {
            id: "tune_1",
            title: "First",
            description: null,
            durationSeconds: 120,
            status: "active" as const,
            r2ObjectKey: "audio/first.mp3",
          },
        },
      ],
    };

    await expect(
      serializePublicPlaylistDetail(playlist, async () => {
        throw new Error("R2 unavailable");
      }),
    ).resolves.toBeNull();
  });
});

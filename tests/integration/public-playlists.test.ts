import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/lib/db";
import { getSignedAudioUrl } from "../../src/lib/r2";

vi.mock("../../src/lib/db", () => ({
  db: {
    playlist: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/r2", () => ({
  getSignedAudioUrl: vi.fn(),
}));

type PlaylistSummarySeed = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{ tune: { durationSeconds: number } }>;
};

type PlaylistDetailSeed = PlaylistSummarySeed & {
  items: Array<{
    id: string;
    position: number;
    createdAt: Date;
    tune: {
      id: string;
      title: string;
      durationSeconds: number;
      r2ObjectKey: string;
    };
  }>;
};

describe("public playlist integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("returns every playlist that has at least one tune", async () => {
    const playlists: PlaylistSummarySeed[] = [
      {
        id: "playlist-with-items",
        title: "Morning",
        description: "Playable",
        createdAt: new Date("2026-04-01T08:00:00.000Z"),
        updatedAt: new Date("2026-04-03T08:00:00.000Z"),
        items: [
          { tune: { durationSeconds: 123 } },
          { tune: { durationSeconds: 99 } },
        ],
      },
    ];

    vi.mocked(db.playlist.findMany).mockResolvedValue(playlists as never);

    const { GET } = await import("../../src/app/api/public/playlists/route");
    const response = await GET();

    expect(db.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "public",
          items: {
            some: {},
          },
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      playlists: [
        {
          id: "playlist-with-items",
          title: "Morning",
          description: "Playable",
          itemCount: 2,
          durationSeconds: 222,
        },
      ],
    });
  });

  it("returns the playlist detail with signed audio urls", async () => {
    const playlist: PlaylistDetailSeed = {
      id: "playlist-1",
      title: "Morning",
      description: "Playable",
      createdAt: new Date("2026-04-01T08:00:00.000Z"),
      updatedAt: new Date("2026-04-03T08:00:00.000Z"),
      items: [
        {
          id: "item-1",
          position: 0,
          createdAt: new Date("2026-04-03T08:01:00.000Z"),
          tune: {
            id: "tune-1",
            title: "First",
            durationSeconds: 123,
            r2ObjectKey: "audio/first.mp3",
          },
        },
      ],
    };

    vi.mocked(db.playlist.findFirst).mockResolvedValue(playlist as never);
    vi.mocked(getSignedAudioUrl).mockResolvedValue(
      "https://cdn.example.test/audio/first.mp3",
    );

    const { GET } = await import(
      "../../src/app/api/public/playlists/[playlistId]/route"
    );
    const response = await GET(new Request("http://localhost/api"), {
      params: Promise.resolve({ playlistId: "playlist-1" }),
    });

    expect(db.playlist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "playlist-1", visibility: "public" },
      }),
    );
    await expect(response.json()).resolves.toEqual({
      id: "playlist-1",
      title: "Morning",
      description: "Playable",
      itemCount: 1,
      durationSeconds: 123,
      tracks: [
        {
          id: "tune-1",
          playlistItemId: "item-1",
          title: "First",
          durationSeconds: 123,
          audioUrl: "https://cdn.example.test/audio/first.mp3",
        },
      ],
    });
    expect(getSignedAudioUrl).toHaveBeenCalledExactlyOnceWith("audio/first.mp3");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/lib/db";
import { getSignedAudioUrl } from "../../src/lib/r2";

vi.mock("../../src/lib/db", () => ({
  db: {
    playlist: {
      findFirst: vi.fn(),
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
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
  items: Array<{ tune: { durationSeconds: number; status: "draft" | "active" } }>;
};

type PlaylistDetailSeed = PlaylistSummarySeed & {
  items: Array<{
    id: string;
    position: number;
    createdAt: Date;
    tune: {
      id: string;
      title: string;
      description: string | null;
      durationSeconds: number;
      status: "draft" | "active";
      r2ObjectKey: string;
    };
  }>;
};

describe("public playlist integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("returns published playlists with active tunes and excludes draft playlists", async () => {
    const playlists: PlaylistSummarySeed[] = [
      {
        id: "playlist-published",
        title: "Published morning",
        description: "Playable",
        status: "published",
        createdAt: new Date("2026-04-01T08:00:00.000Z"),
        updatedAt: new Date("2026-04-03T08:00:00.000Z"),
        items: [
          { tune: { durationSeconds: 123, status: "active" } },
          { tune: { durationSeconds: 99, status: "draft" } },
        ],
      },
      {
        id: "playlist-draft",
        title: "Draft evening",
        description: "Not public",
        status: "draft",
        createdAt: new Date("2026-04-02T08:00:00.000Z"),
        updatedAt: new Date("2026-04-04T08:00:00.000Z"),
        items: [{ tune: { durationSeconds: 88, status: "active" } }],
      },
      {
        id: "playlist-inactive-only",
        title: "Inactive only",
        description: null,
        status: "published",
        createdAt: new Date("2026-04-03T08:00:00.000Z"),
        updatedAt: new Date("2026-04-05T08:00:00.000Z"),
        items: [{ tune: { durationSeconds: 77, status: "draft" } }],
      },
    ];

    vi.mocked(db.playlist.findMany).mockResolvedValue(
      playlists.filter(
        (playlist) =>
          playlist.status === "published" &&
          playlist.items.some((item) => item.tune.status === "active"),
      ) as never,
    );

    const { GET } = await import("../../src/app/api/public/playlists/route");
    const response = await GET();

    expect(db.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          items: {
            some: {
              tune: { status: "active" },
            },
          },
        },
      }),
    );
    await expect(response.json()).resolves.toEqual({
      playlists: [
        {
          id: "playlist-published",
          title: "Published morning",
          description: "Playable",
          itemCount: 1,
          durationSeconds: 123,
        },
      ],
    });
  });

  it("returns only active tunes from a published playlist detail", async () => {
    const playlist: PlaylistDetailSeed = {
      id: "playlist-published",
      title: "Published morning",
      description: "Playable",
      status: "published",
      createdAt: new Date("2026-04-01T08:00:00.000Z"),
      updatedAt: new Date("2026-04-03T08:00:00.000Z"),
      items: [
        {
          id: "item-active",
          position: 0,
          createdAt: new Date("2026-04-03T08:01:00.000Z"),
          tune: {
            id: "tune-active",
            title: "Active tune",
            description: "Public track",
            durationSeconds: 123,
            status: "active",
            r2ObjectKey: "audio/active.mp3",
          },
        },
        {
          id: "item-draft",
          position: 1,
          createdAt: new Date("2026-04-03T08:02:00.000Z"),
          tune: {
            id: "tune-draft",
            title: "Draft tune",
            description: "Hidden track",
            durationSeconds: 99,
            status: "draft",
            r2ObjectKey: "audio/draft.mp3",
          },
        },
      ],
    };

    vi.mocked(db.playlist.findFirst).mockResolvedValue(
      {
        ...playlist,
        items: playlist.items.filter((item) => item.tune.status === "active"),
      } as never,
    );
    vi.mocked(getSignedAudioUrl).mockResolvedValue(
      "https://cdn.example.test/audio/active.mp3",
    );

    const { GET } = await import(
      "../../src/app/api/public/playlists/[playlistId]/route"
    );
    const response = await GET(new Request("http://localhost/api"), {
      params: Promise.resolve({ playlistId: "playlist-published" }),
    });

    expect(db.playlist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "playlist-published",
          status: "published",
        },
        select: expect.objectContaining({
          items: expect.objectContaining({
            where: {
              tune: { status: "active" },
            },
          }),
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      id: "playlist-published",
      title: "Published morning",
      description: "Playable",
      itemCount: 1,
      durationSeconds: 123,
      tracks: [
        {
          id: "tune-active",
          playlistItemId: "item-active",
          title: "Active tune",
          description: "Public track",
          durationSeconds: 123,
          audioUrl: "https://cdn.example.test/audio/active.mp3",
        },
      ],
    });
    expect(getSignedAudioUrl).toHaveBeenCalledExactlyOnceWith("audio/active.mp3");
  });
});

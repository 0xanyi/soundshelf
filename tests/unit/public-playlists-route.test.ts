import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/lib/db";
import type { PublicPlaylistSummaryRecord } from "../../src/lib/playlists/public";

vi.mock("../../src/lib/db", () => ({
  db: {
    playlist: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/public/playlists", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns every public playlist that has at least one item", async () => {
    const playlists: PublicPlaylistSummaryRecord[] = [
      {
        id: "playlist-with-items",
        title: "With items",
        description: null,
        updatedAt: new Date("2026-04-02T19:00:00.000Z"),
        items: [
          { tune: { durationSeconds: 90 } },
          { tune: { durationSeconds: 30 } },
        ],
      },
    ];

    vi.mocked(db.playlist.findMany).mockResolvedValue(playlists as never);

    const { GET } = await import("../../src/app/api/public/playlists/route");
    const response = await GET();

    expect(db.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visibility: "public" }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      playlists: [
        {
          id: "playlist-with-items",
          title: "With items",
          description: null,
          itemCount: 2,
          durationSeconds: 120,
        },
      ],
    });
  });

  it("filters out playlists that have no items", async () => {
    vi.mocked(db.playlist.findMany).mockResolvedValue([] as never);

    const { GET } = await import("../../src/app/api/public/playlists/route");
    const response = await GET();

    await expect(response.json()).resolves.toEqual({ playlists: [] });
  });
});

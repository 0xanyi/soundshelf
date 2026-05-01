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

  it("omits published playlists with no active tunes", async () => {
    const playlists: PublicPlaylistSummaryRecord[] = [
      {
        id: "playlist-active",
        title: "Active",
        description: null,
        updatedAt: new Date("2026-04-02T19:00:00.000Z"),
        items: [{ tune: { durationSeconds: 90, status: "active" } }],
      },
      {
        id: "playlist-empty",
        title: "Empty",
        description: null,
        updatedAt: new Date("2026-04-01T19:00:00.000Z"),
        items: [],
      },
      {
        id: "playlist-draft-only",
        title: "Draft only",
        description: null,
        updatedAt: new Date("2026-04-01T18:00:00.000Z"),
        items: [{ tune: { durationSeconds: 45, status: "draft" } }],
      },
    ];

    vi.mocked(db.playlist.findMany).mockResolvedValue(playlists as never);

    const { GET } = await import("../../src/app/api/public/playlists/route");
    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      playlists: [
        {
          id: "playlist-active",
          title: "Active",
          description: null,
          itemCount: 1,
          durationSeconds: 90,
        },
      ],
    });
  });
});

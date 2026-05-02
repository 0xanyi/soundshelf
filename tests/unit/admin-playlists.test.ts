import { describe, expect, it } from "vitest";

import {
  buildMovedPlaylistItemPositions,
  getPlaylistItemCreatePrismaErrorResponse,
  isPlaylistItemPositionConflict,
  parsePlaylistMutationPayload,
  parsePlaylistReorderPayload,
} from "../../src/lib/playlists/admin";

describe("parsePlaylistMutationPayload", () => {
  it("trims title and description on create", () => {
    expect(
      parsePlaylistMutationPayload(
        {
          title: "  Morning prayers  ",
          description: "  Weekday set  ",
        },
        { requireTitle: true },
      ),
    ).toEqual({
      valid: true,
      data: {
        title: "Morning prayers",
        description: "Weekday set",
      },
    });
  });

  it("rejects blank titles", () => {
    expect(
      parsePlaylistMutationPayload(
        { title: " " },
        { requireTitle: true },
      ),
    ).toEqual({
      valid: false,
      message: "Title is required.",
    });
  });

  it("allows partial update payloads and normalizes blank descriptions", () => {
    expect(
      parsePlaylistMutationPayload(
        { description: "   " },
        { requireTitle: false },
      ),
    ).toEqual({
      valid: true,
      data: {
        description: null,
      },
    });
  });

  it("accepts an explicit visibility update", () => {
    expect(
      parsePlaylistMutationPayload(
        { visibility: "public" },
        { requireTitle: false },
      ),
    ).toEqual({
      valid: true,
      data: { visibility: "public" },
    });
  });

  it("rejects unknown visibility values", () => {
    expect(
      parsePlaylistMutationPayload(
        { visibility: "draft" },
        { requireTitle: false },
      ),
    ).toEqual({
      valid: false,
      message: 'Visibility must be "hidden" or "public".',
    });
  });
});

describe("getPlaylistItemCreatePrismaErrorResponse", () => {
  it("maps duplicate tune membership conflicts to a safe 409", () => {
    expect(
      getPlaylistItemCreatePrismaErrorResponse({
        code: "P2002",
        clientVersion: "7.8.0",
        meta: { target: ["playlistId", "tuneId"] },
      }),
    ).toEqual({
      status: 409,
      message: "Tune is already in this playlist.",
    });
  });

  it("maps duplicate tune membership conflicts from constraint names", () => {
    expect(
      getPlaylistItemCreatePrismaErrorResponse({
        code: "P2002",
        clientVersion: "7.8.0",
        meta: { target: "PlaylistItem_playlistId_tuneId_key" },
      }),
    ).toEqual({
      status: 409,
      message: "Tune is already in this playlist.",
    });
  });

  it("maps position conflicts to a safe retry message", () => {
    const error = {
      code: "P2002",
      clientVersion: "7.8.0",
      meta: { target: ["playlistId", "position"] },
    };

    expect(getPlaylistItemCreatePrismaErrorResponse(error)).toEqual({
      status: 409,
      message: "Playlist item position changed. Please try again.",
    });
    expect(isPlaylistItemPositionConflict(error)).toBe(true);
  });

  it("ignores unrelated Prisma errors", () => {
    expect(
      getPlaylistItemCreatePrismaErrorResponse({
        code: "P2025",
        clientVersion: "7.8.0",
      }),
    ).toBeNull();
  });
});

describe("parsePlaylistReorderPayload", () => {
  it("accepts an item id and integer target index", () => {
    expect(parsePlaylistReorderPayload({ itemId: "item_1", targetIndex: 2 })).toEqual({
      valid: true,
      data: {
        itemId: "item_1",
        targetIndex: 2,
      },
    });
  });

  it("rejects missing item ids and non-integer target indexes", () => {
    expect(parsePlaylistReorderPayload({ itemId: "", targetIndex: 1 })).toEqual({
      valid: false,
      message: "Item id is required.",
    });

    expect(parsePlaylistReorderPayload({ itemId: "item_1", targetIndex: 1.5 })).toEqual({
      valid: false,
      message: "Target index must be an integer.",
    });
  });
});

describe("buildMovedPlaylistItemPositions", () => {
  it("normalizes existing positions and moves an item to the requested index", () => {
    expect(
      buildMovedPlaylistItemPositions(
        [
          { id: "a", position: 20 },
          { id: "b", position: 10 },
          { id: "c", position: 10 },
        ],
        "a",
        1,
      ),
    ).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("returns normalized positions when the item is missing", () => {
    expect(
      buildMovedPlaylistItemPositions(
        [
          { id: "a", position: 3 },
          { id: "b", position: 1 },
        ],
        "missing",
        0,
      ),
    ).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
  });
});

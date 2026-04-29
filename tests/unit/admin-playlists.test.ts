import { describe, expect, it } from "vitest";

import {
  buildMovedPlaylistItemPositions,
  parsePlaylistMutationPayload,
  parsePlaylistReorderPayload,
} from "../../src/lib/playlists/admin";

describe("parsePlaylistMutationPayload", () => {
  it("trims title and defaults new playlists to draft", () => {
    expect(
      parsePlaylistMutationPayload(
        {
          title: "  Morning prayers  ",
          description: "  Weekday set  ",
        },
        { requireTitle: true, defaultStatus: "draft" },
      ),
    ).toEqual({
      valid: true,
      data: {
        title: "Morning prayers",
        description: "Weekday set",
        status: "draft",
      },
    });
  });

  it("rejects blank titles and unsupported statuses", () => {
    expect(
      parsePlaylistMutationPayload(
        { title: " ", status: "published" },
        { requireTitle: true, defaultStatus: "draft" },
      ),
    ).toEqual({
      valid: false,
      message: "Title is required.",
    });

    expect(
      parsePlaylistMutationPayload(
        { title: "Evening prayers", status: "archived" },
        { requireTitle: true, defaultStatus: "draft" },
      ),
    ).toEqual({
      valid: false,
      message: "Status must be draft or published.",
    });
  });

  it("allows partial update payloads and normalizes blank descriptions", () => {
    expect(
      parsePlaylistMutationPayload(
        { description: "   ", status: "published" },
        { requireTitle: false },
      ),
    ).toEqual({
      valid: true,
      data: {
        description: null,
        status: "published",
      },
    });
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

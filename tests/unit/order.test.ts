import { describe, expect, it } from "vitest";

import { moveItem, normalizePositions } from "../../src/lib/playlist/order";

describe("normalizePositions", () => {
  it("sorts items by position and rewrites positions from zero", () => {
    expect(
      normalizePositions([
        { id: "b", position: 10 },
        { id: "a", position: 5 },
      ]),
    ).toEqual([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
  });
});

describe("moveItem", () => {
  it("moves the selected item and normalizes positions", () => {
    const items = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ];

    expect(moveItem(items, "a", 2)).toEqual([
      { id: "b", position: 0 },
      { id: "c", position: 1 },
      { id: "a", position: 2 },
    ]);
  });
});

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  append,
  bulkAdd,
  move,
  remove,
  sync,
} from "../../src/lib/playlists/membership";
import {
  createMembershipTestClient,
  resetMembershipTables,
} from "../helpers/membership-db";

import type { PrismaClient } from "@prisma/client";

describe("playlist membership", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = await createMembershipTestClient();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await resetMembershipTables(db);
  });

  describe("append", () => {
    it("places the first Tune at Position 0", async () => {
      const playlist = await createPlaylist();
      const tune = await createTune();

      await expect(append(db, playlist.id, tune.id)).resolves.toEqual({
        status: "ok",
        item: { id: expect.any(String), position: 0 },
      });
    });

    it("appends after the last Position", async () => {
      const playlist = await createPlaylist();
      const first = await createTune("first");
      const second = await createTune("second");

      await append(db, playlist.id, first.id);
      await expect(append(db, playlist.id, second.id)).resolves.toEqual({
        status: "ok",
        item: { id: expect.any(String), position: 1 },
      });
    });

    it("rejects a Tune that is already a member", async () => {
      const playlist = await createPlaylist();
      const tune = await createTune();
      await append(db, playlist.id, tune.id);

      await expect(append(db, playlist.id, tune.id)).resolves.toEqual({
        status: "already-member",
      });
    });

    it("returns playlist-not-found when the Playlist is missing", async () => {
      const tune = await createTune();

      await expect(append(db, "clmissingplaylist00000001", tune.id)).resolves.toEqual({
        status: "playlist-not-found",
      });
    });

    it("returns tune-not-found when the Tune is missing", async () => {
      const playlist = await createPlaylist();

      await expect(append(db, playlist.id, "clmissingtune000000000001")).resolves.toEqual({
        status: "tune-not-found",
      });
    });
  });

  describe("move", () => {
    it("rewrites Positions so the Playlist stays contiguous", async () => {
      const playlist = await createPlaylist();
      const [first, second, third] = await createMembership(playlist.id, 3);

      await expect(move(db, playlist.id, first.id, 2)).resolves.toEqual({
        status: "ok",
        items: [
          { id: second.id, position: 0 },
          { id: third.id, position: 1 },
          { id: first.id, position: 2 },
        ],
      });
    });

    it("returns item-not-found when the PlaylistItem is missing", async () => {
      const playlist = await createPlaylist();

      await expect(
        move(db, playlist.id, "clmissingitem000000000001", 0),
      ).resolves.toEqual({
        status: "item-not-found",
      });
    });

    it("returns item-not-found when the PlaylistItem belongs to another Playlist", async () => {
      const source = await createPlaylist("source");
      const target = await createPlaylist("target");
      const [item] = await createMembership(source.id, 1);

      await expect(move(db, target.id, item.id, 0)).resolves.toEqual({
        status: "item-not-found",
      });
    });

    it("returns playlist-not-found when the Playlist is missing", async () => {
      await expect(
        move(db, "clmissingplaylist00000001", "clmissingitem000000000001", 0),
      ).resolves.toEqual({
        status: "playlist-not-found",
      });
    });
  });

  describe("remove", () => {
    it("deletes the PlaylistItem and renormalizes Positions", async () => {
      const playlist = await createPlaylist();
      const [first, second, third] = await createMembership(playlist.id, 3);

      await expect(remove(db, playlist.id, second.id)).resolves.toEqual({
        status: "ok",
        items: [
          { id: first.id, position: 0 },
          { id: third.id, position: 1 },
        ],
      });
    });

    it("returns item-not-found when the PlaylistItem is missing", async () => {
      const playlist = await createPlaylist();

      await expect(
        remove(db, playlist.id, "clmissingitem000000000001"),
      ).resolves.toEqual({
        status: "item-not-found",
      });
    });
  });

  describe("bulkAdd", () => {
    it("adds missing Tunes and skips members", async () => {
      const playlist = await createPlaylist();
      const [existing] = await createMembership(playlist.id, 1);
      const extra = await createTune("extra");

      await expect(
        bulkAdd(db, playlist.id, [existing.tuneId, extra.id, extra.id]),
      ).resolves.toEqual({
        status: "ok",
        added: 1,
        skipped: 1,
      });

      await expect(
        db.playlistItem.findMany({
          where: { playlistId: playlist.id },
          orderBy: { position: "asc" },
          select: { tuneId: true, position: true },
        }),
      ).resolves.toEqual([
        { tuneId: existing.tuneId, position: 0 },
        { tuneId: extra.id, position: 1 },
      ]);
    });

    it("returns added 0 and skipped 0 for an empty Tune list", async () => {
      const playlist = await createPlaylist();

      await expect(bulkAdd(db, playlist.id, [])).resolves.toEqual({
        status: "ok",
        added: 0,
        skipped: 0,
      });
    });

    it("returns playlist-not-found when the Playlist is missing", async () => {
      const tune = await createTune();

      await expect(bulkAdd(db, "clmissingplaylist00000001", [tune.id])).resolves.toEqual({
        status: "playlist-not-found",
      });
    });

    it("returns tune-not-found when any Tune is missing", async () => {
      const playlist = await createPlaylist();
      const tune = await createTune();

      await expect(
        bulkAdd(db, playlist.id, [tune.id, "clmissingtune000000000001"]),
      ).resolves.toEqual({
        status: "tune-not-found",
      });
    });

    it("does not throw when two bulkAdds race on the same Tune", async () => {
      const playlist = await createPlaylist();
      const tune = await createTune();

      const [first, second] = await Promise.all([
        bulkAdd(db, playlist.id, [tune.id]),
        bulkAdd(db, playlist.id, [tune.id]),
      ]);

      expect([first.status, second.status]).toEqual(["ok", "ok"]);

      if (first.status === "ok" && second.status === "ok") {
        expect(first.added + second.added).toBe(1);
        expect(first.skipped + second.skipped).toBe(1);
      }

      await expect(
        db.playlistItem.count({ where: { playlistId: playlist.id, tuneId: tune.id } }),
      ).resolves.toBe(1);
    });
  });

  describe("sync", () => {
    it("adds the Tune to missing Playlists and removes extras", async () => {
      const keep = await createPlaylist("keep");
      const drop = await createPlaylist("drop");
      const add = await createPlaylist("add");
      const tune = await createTune();
      const occupant = await createTune("occupant");

      await append(db, keep.id, tune.id);
      await append(db, drop.id, occupant.id);
      await append(db, drop.id, tune.id);

      await expect(sync(db, tune.id, [keep.id, add.id])).resolves.toEqual({
        status: "ok",
        added: 1,
        removed: 1,
      });

      await expect(
        db.playlistItem.findMany({
          where: { tuneId: tune.id },
          orderBy: { playlist: { title: "asc" } },
          select: { playlistId: true, position: true },
        }),
      ).resolves.toEqual([
        { playlistId: add.id, position: 0 },
        { playlistId: keep.id, position: 0 },
      ]);

      await expect(
        db.playlistItem.findMany({
          where: { playlistId: drop.id },
          orderBy: { position: "asc" },
          select: { tuneId: true, position: true },
        }),
      ).resolves.toEqual([{ tuneId: occupant.id, position: 0 }]);
    });

    it("clears every membership when the Playlist set is empty", async () => {
      const playlist = await createPlaylist();
      const [item] = await createMembership(playlist.id, 1);

      await expect(sync(db, item.tuneId, [])).resolves.toEqual({
        status: "ok",
        added: 0,
        removed: 1,
      });

      await expect(db.playlistItem.count({ where: { tuneId: item.tuneId } })).resolves.toBe(
        0,
      );
    });

    it("returns tune-not-found when the Tune is missing", async () => {
      const playlist = await createPlaylist();

      await expect(sync(db, "clmissingtune000000000001", [playlist.id])).resolves.toEqual({
        status: "tune-not-found",
      });
    });

    it("returns playlist-not-found when any Playlist is missing", async () => {
      const playlist = await createPlaylist();
      const tune = await createTune();

      await expect(
        sync(db, tune.id, [playlist.id, "clmissingplaylist00000001"]),
      ).resolves.toEqual({
        status: "playlist-not-found",
      });
    });

    it("does not throw when two syncs race on the same Playlist", async () => {
      const playlist = await createPlaylist();
      const tune = await createTune();

      const [first, second] = await Promise.all([
        sync(db, tune.id, [playlist.id]),
        sync(db, tune.id, [playlist.id]),
      ]);

      expect([first.status, second.status]).toEqual(["ok", "ok"]);

      if (first.status === "ok" && second.status === "ok") {
        expect(first.added + second.added).toBe(1);
        expect(first.removed + second.removed).toBe(0);
      }

      await expect(
        db.playlistItem.count({ where: { playlistId: playlist.id, tuneId: tune.id } }),
      ).resolves.toBe(1);
    });
  });

  async function createPlaylist(title = "Playlist") {
    return db.playlist.create({
      data: { title },
      select: { id: true },
    });
  }

  async function createTune(title = "Tune") {
    return db.tune.create({
      data: {
        title,
        durationSeconds: 60,
        mimeType: "audio/mpeg",
        fileSizeBytes: BigInt(1024),
        r2ObjectKey: `audio/tunes/test/${title}-${randomUUID()}.mp3`,
      },
      select: { id: true },
    });
  }

  async function createMembership(playlistId: string, count: number) {
    const items = [];

    for (let index = 0; index < count; index += 1) {
      const tune = await createTune(`tune-${index}`);
      const result = await append(db, playlistId, tune.id);

      if (result.status !== "ok") {
        throw new Error(`Failed to seed Playlist membership: ${result.status}`);
      }

      items.push({ ...result.item, tuneId: tune.id });
    }

    return items;
  }
});

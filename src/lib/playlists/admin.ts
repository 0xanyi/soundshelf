import type { PlaylistStatus, TuneStatus } from "@prisma/client";

import { moveItem, normalizePositions, type PositionedItem } from "../playlist/order";

export type AdminPlaylistRecord = {
  id: string;
  title: string;
  description: string | null;
  status: PlaylistStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    items: number;
  };
};

export type SerializedAdminPlaylist = {
  id: string;
  title: string;
  description: string | null;
  status: PlaylistStatus;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type AdminPlaylistItemRecord = {
  id: string;
  position: number;
  tune: {
    id: string;
    title: string;
    description: string | null;
    durationSeconds: number;
    status: TuneStatus;
  };
};

export type SerializedAdminPlaylistItem = {
  id: string;
  position: number;
  tune: {
    id: string;
    title: string;
    description: string | null;
    durationSeconds: number;
    status: TuneStatus;
  };
};

type PlaylistMutationData = {
  title?: string;
  description?: string | null;
  status?: PlaylistStatus;
};

type PlaylistMutationOptions = {
  requireTitle: boolean;
  defaultStatus?: PlaylistStatus;
};

type PlaylistMutationResult =
  | { valid: true; data: PlaylistMutationData }
  | { valid: false; message: string };

type PlaylistReorderResult =
  | { valid: true; data: { itemId: string; targetIndex: number } }
  | { valid: false; message: string };

const playlistStatuses = new Set<string>(["draft", "published"]);

export function parsePlaylistMutationPayload(
  payload: unknown,
  options: PlaylistMutationOptions,
): PlaylistMutationResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "JSON body is required." };
  }

  const input = payload as Record<string, unknown>;
  const data: PlaylistMutationData = {};

  if ("title" in input || options.requireTitle) {
    const title = typeof input.title === "string" ? input.title.trim() : "";

    if (!title) {
      return { valid: false, message: "Title is required." };
    }

    data.title = title;
  }

  if ("description" in input || options.requireTitle) {
    const description =
      typeof input.description === "string" ? input.description.trim() : "";
    data.description = description || null;
  }

  if ("status" in input) {
    if (typeof input.status !== "string" || !playlistStatuses.has(input.status)) {
      return { valid: false, message: "Status must be draft or published." };
    }

    data.status = input.status as PlaylistStatus;
  } else if (options.defaultStatus) {
    data.status = options.defaultStatus;
  }

  return { valid: true, data };
}

export function parsePlaylistReorderPayload(payload: unknown): PlaylistReorderResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "JSON body is required." };
  }

  const input = payload as Record<string, unknown>;
  const itemId = typeof input.itemId === "string" ? input.itemId.trim() : "";

  if (!itemId) {
    return { valid: false, message: "Item id is required." };
  }

  if (!Number.isInteger(input.targetIndex)) {
    return { valid: false, message: "Target index must be an integer." };
  }

  return {
    valid: true,
    data: {
      itemId,
      targetIndex: input.targetIndex as number,
    },
  };
}

export function buildMovedPlaylistItemPositions<TItem extends PositionedItem>(
  items: readonly TItem[],
  itemId: string,
  targetIndex: number,
): TItem[] {
  return moveItem(items, itemId, targetIndex);
}

export function buildNormalizedPlaylistItemPositions<TItem extends PositionedItem>(
  items: readonly TItem[],
): TItem[] {
  return normalizePositions(items);
}

export function serializeAdminPlaylist(
  playlist: AdminPlaylistRecord,
): SerializedAdminPlaylist {
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    status: playlist.status,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
    itemCount: playlist._count.items,
  };
}

export function serializeAdminPlaylistItem(
  item: AdminPlaylistItemRecord,
): SerializedAdminPlaylistItem {
  return {
    id: item.id,
    position: item.position,
    tune: item.tune,
  };
}

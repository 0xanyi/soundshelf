import type { PlaylistVisibility } from "@prisma/client";

import { moveItem, normalizePositions, type PositionedItem } from "../playlist/order";

export type AdminPlaylistRecord = {
  id: string;
  title: string;
  description: string | null;
  visibility: PlaylistVisibility;
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
  visibility: PlaylistVisibility;
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
    durationSeconds: number;
  };
};

export type SerializedAdminPlaylistItem = {
  id: string;
  position: number;
  tune: {
    id: string;
    title: string;
    durationSeconds: number;
  };
};

export type PlaylistPrismaErrorResponse = {
  status: 409;
  message: string;
};

type PlaylistMutationData = {
  title?: string;
  description?: string | null;
  visibility?: PlaylistVisibility;
};

type PlaylistMutationOptions = {
  requireTitle: boolean;
};

type PlaylistMutationResult =
  | { valid: true; data: PlaylistMutationData }
  | { valid: false; message: string };

type PlaylistReorderResult =
  | { valid: true; data: { itemId: string; targetIndex: number } }
  | { valid: false; message: string };

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

  if ("visibility" in input) {
    if (input.visibility !== "hidden" && input.visibility !== "public") {
      return {
        valid: false,
        message: 'Visibility must be "hidden" or "public".',
      };
    }

    data.visibility = input.visibility;
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

export function getPlaylistItemCreatePrismaErrorResponse(
  error: unknown,
): PlaylistPrismaErrorResponse | null {
  if (!isPrismaKnownRequestErrorShape(error) || error.code !== "P2002") {
    return null;
  }

  const target = getPrismaErrorTarget(error);

  if (
    prismaTargetIncludes(target, "playlistId") &&
    prismaTargetIncludes(target, "tuneId")
  ) {
    return {
      status: 409,
      message: "Tune is already in this playlist.",
    };
  }

  if (
    prismaTargetIncludes(target, "playlistId") &&
    prismaTargetIncludes(target, "position")
  ) {
    return {
      status: 409,
      message: "Playlist item position changed. Please try again.",
    };
  }

  return null;
}

export function serializeAdminPlaylist(
  playlist: AdminPlaylistRecord,
): SerializedAdminPlaylist {
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    visibility: playlist.visibility,
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

export function isPlaylistItemPositionConflict(error: unknown): boolean {
  if (!isPrismaKnownRequestErrorShape(error) || error.code !== "P2002") {
    return false;
  }

  const target = getPrismaErrorTarget(error);

  return (
    prismaTargetIncludes(target, "playlistId") &&
    prismaTargetIncludes(target, "position")
  );
}

function prismaTargetIncludes(target: string[], fieldName: string): boolean {
  return target.some(
    (value) => value === fieldName || value.includes(fieldName),
  );
}

function getPrismaErrorTarget(error: { meta?: unknown }): string[] {
  if (!error.meta || typeof error.meta !== "object") {
    return [];
  }

  const target = (error.meta as Record<string, unknown>).target;

  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === "string");
  }

  if (typeof target === "string") {
    return [target];
  }

  return [];
}

function isPrismaKnownRequestErrorShape(
  error: unknown,
): error is { code: string; clientVersion: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "clientVersion" in error &&
    typeof error.clientVersion === "string"
  );
}

import { Prisma, type PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import {
  buildMovedPlaylistItemPositions,
  buildNormalizedPlaylistItemPositions,
  getPlaylistItemCreatePrismaErrorResponse,
  isPlaylistItemPositionConflict,
  parsePlaylistReorderPayload,
  serializeAdminPlaylistItem,
} from "@/lib/playlists/admin";

export const runtime = "nodejs";

type PlaylistItemsRouteContext = {
  params: Promise<{
    playlistId: string;
  }>;
};

const maxAddItemAttempts = 3;
const maxPositionUpdateAttempts = 3;

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

export async function POST(
  request: Request,
  context: PlaylistItemsRouteContext,
): Promise<Response> {
  const csrf = await enforceSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("JSON body is required.", 400);
  }

  const tuneId =
    payload && typeof payload === "object"
      ? parseStringField(payload, "tuneId")
      : "";

  if (!tuneId) {
    return jsonError("Tune id is required.", 400);
  }

  if (!isValidCuid(tuneId)) {
    return jsonError("Invalid tune id.", 400);
  }

  const { playlistId } = await context.params;

  if (!isValidCuid(playlistId)) {
    return jsonError("Invalid playlist id.", 400);
  }
  const [playlist, tune] = await Promise.all([
    db.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true },
    }),
    db.tune.findUnique({
      where: { id: tuneId },
      select: { id: true },
    }),
  ]);

  if (!playlist) {
    return jsonError("Playlist not found.", 404);
  }

  if (!tune) {
    return jsonError("Tune not found.", 404);
  }

  for (let attempt = 1; attempt <= maxAddItemAttempts; attempt += 1) {
    try {
      const item = await db.$transaction(async (tx: TransactionClient) => {
        const lastItem = await tx.playlistItem.findFirst({
          where: { playlistId },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        return tx.playlistItem.create({
          data: {
            playlistId,
            tuneId,
            position: lastItem ? lastItem.position + 1 : 0,
          },
          include: {
            tune: {
              select: {
                id: true,
                title: true,
                durationSeconds: true,
              },
            },
          },
        });
      });

      await recordAudit({
        actorId: session.userId,
        action: "playlist.item.create",
        resource: "playlist",
        resourceId: playlistId,
        metadata: { itemId: item.id, tuneId },
      });

      return Response.json(serializeAdminPlaylistItem(item), { status: 201 });
    } catch (error) {
      const createErrorResponse = getPlaylistItemCreatePrismaErrorResponse(error);

      if (
        isPlaylistItemPositionConflict(error) &&
        attempt < maxAddItemAttempts
      ) {
        continue;
      }

      if (createErrorResponse) {
        return jsonError(createErrorResponse.message, createErrorResponse.status);
      }

      throw error;
    }
  }

  return jsonError("Playlist item position changed. Please try again.", 409);
}

export async function PATCH(
  request: Request,
  context: PlaylistItemsRouteContext,
): Promise<Response> {
  const csrf = await enforceSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("JSON body is required.", 400);
  }

  const validation = parsePlaylistReorderPayload(payload);

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const { playlistId } = await context.params;

  if (!isValidCuid(playlistId)) {
    return jsonError("Invalid playlist id.", 400);
  }

  const reorderResult = await movePlaylistItemWithRetry(
    playlistId,
    validation.data.itemId,
    validation.data.targetIndex,
  );

  if (reorderResult.status === "playlist-not-found") {
    return jsonError("Playlist not found.", 404);
  }

  if (reorderResult.status === "item-not-found") {
    return jsonError("Playlist item not found.", 404);
  }

  if (reorderResult.status === "conflict") {
    return jsonError("Playlist order changed. Please try again.", 409);
  }

  const nextItems = reorderResult.items;

  await recordAudit({
    actorId: session.userId,
    action: "playlist.item.reorder",
    resource: "playlist",
    resourceId: playlistId,
    metadata: {
      itemId: validation.data.itemId,
      targetIndex: validation.data.targetIndex,
    },
  });

  return Response.json({ items: nextItems });
}

export async function DELETE(
  request: Request,
  context: PlaylistItemsRouteContext,
): Promise<Response> {
  const csrf = await enforceSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("JSON body is required.", 400);
  }

  const itemId =
    payload && typeof payload === "object"
      ? parseStringField(payload, "itemId")
      : "";

  if (!itemId) {
    return jsonError("Item id is required.", 400);
  }

  if (!isValidCuid(itemId)) {
    return jsonError("Invalid item id.", 400);
  }

  const { playlistId } = await context.params;

  if (!isValidCuid(playlistId)) {
    return jsonError("Invalid playlist id.", 400);
  }

  const deleteResult = await deletePlaylistItemWithRetry(playlistId, itemId);

  if (deleteResult.status === "playlist-not-found") {
    return jsonError("Playlist not found.", 404);
  }

  if (deleteResult.status === "item-not-found") {
    return jsonError("Playlist item not found.", 404);
  }

  if (deleteResult.status === "conflict") {
    return jsonError("Playlist order changed. Please try again.", 409);
  }

  const nextItems = deleteResult.items;

  await recordAudit({
    actorId: session.userId,
    action: "playlist.item.delete",
    resource: "playlist",
    resourceId: playlistId,
    metadata: { itemId },
  });

  return Response.json({ items: nextItems });
}

type PlaylistPositionResult =
  | { status: "ok"; items: Array<{ id: string; position: number }> }
  | { status: "playlist-not-found" }
  | { status: "item-not-found" }
  | { status: "conflict" };

type PlaylistPositionItem = { id: string; position: number };

async function movePlaylistItemWithRetry(
  playlistId: string,
  itemId: string,
  targetIndex: number,
): Promise<PlaylistPositionResult> {
  for (let attempt = 1; attempt <= maxPositionUpdateAttempts; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx: TransactionClient) => {
          const playlist = await tx.playlist.findUnique({
            where: { id: playlistId },
            select: {
              id: true,
              items: {
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                select: { id: true, position: true },
              },
            },
          });

          if (!playlist) {
            return { status: "playlist-not-found" } as const;
          }

          const currentItems = playlist.items as PlaylistPositionItem[];

          if (!currentItems.some((item) => item.id === itemId)) {
            return { status: "item-not-found" } as const;
          }

          const items = buildMovedPlaylistItemPositions(
            currentItems,
            itemId,
            targetIndex,
          );

          await updatePlaylistItemPositions(tx, items);

          return { status: "ok", items } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryablePlaylistPositionError(error) && attempt < maxPositionUpdateAttempts) {
        continue;
      }

      if (isRetryablePlaylistPositionError(error)) {
        return { status: "conflict" };
      }

      throw error;
    }
  }

  return { status: "conflict" };
}

async function deletePlaylistItemWithRetry(
  playlistId: string,
  itemId: string,
): Promise<PlaylistPositionResult> {
  for (let attempt = 1; attempt <= maxPositionUpdateAttempts; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx: TransactionClient) => {
          const playlist = await tx.playlist.findUnique({
            where: { id: playlistId },
            select: {
              id: true,
              items: {
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                select: { id: true, position: true },
              },
            },
          });

          if (!playlist) {
            return { status: "playlist-not-found" } as const;
          }

          const currentItems = playlist.items as PlaylistPositionItem[];

          if (!currentItems.some((item) => item.id === itemId)) {
            return { status: "item-not-found" } as const;
          }

          await tx.playlistItem.delete({
            where: { id: itemId },
          });

          const items = buildNormalizedPlaylistItemPositions(
            currentItems.filter((item) => item.id !== itemId),
          );

          await updatePlaylistItemPositions(tx, items);

          return { status: "ok", items } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryablePlaylistPositionError(error) && attempt < maxPositionUpdateAttempts) {
        continue;
      }

      if (isRetryablePlaylistPositionError(error)) {
        return { status: "conflict" };
      }

      throw error;
    }
  }

  return { status: "conflict" };
}

type PlaylistItemPositionClient = Pick<TransactionClient, "playlistItem">;

async function updatePlaylistItemPositions(
  client: PlaylistItemPositionClient,
  items: Array<{ id: string; position: number }>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await Promise.all([
    ...items.map((item, index) =>
      client.playlistItem.update({
        where: { id: item.id },
        data: { position: -(index + 1) },
      }),
    ),
  ]);

  await Promise.all([
    ...items.map((item) =>
      client.playlistItem.update({
        where: { id: item.id },
        data: { position: item.position },
      }),
    ),
  ]);
}

function isRetryablePlaylistPositionError(error: unknown): boolean {
  return isPlaylistItemPositionConflict(error) || isPrismaTransactionConflict(error);
}

function isPrismaTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2034"
  );
}

function parseStringField(payload: object, fieldName: string): string {
  const value = (payload as Record<string, unknown>)[fieldName];

  return typeof value === "string" ? value.trim() : "";
}

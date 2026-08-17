import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import {
  parsePlaylistReorderPayload,
  serializeAdminPlaylistItem,
} from "@/lib/playlists/admin";
import { append, move, remove } from "@/lib/playlists/membership";

export const runtime = "nodejs";

type PlaylistItemsRouteContext = {
  params: Promise<{
    playlistId: string;
  }>;
};

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

  const result = await append(db, playlistId, tuneId);

  if (result.status === "playlist-not-found") {
    return jsonError("Playlist not found.", 404);
  }

  if (result.status === "tune-not-found") {
    return jsonError("Tune not found.", 404);
  }

  if (result.status === "already-member") {
    return jsonError("Tune is already in this playlist.", 409);
  }

  if (result.status === "conflict") {
    return jsonError("Playlist item position changed. Please try again.", 409);
  }

  const item = await db.playlistItem.findUnique({
    where: { id: result.item.id },
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

  if (!item) {
    return jsonError("Playlist item not found.", 404);
  }

  await recordAudit({
    actorId: session.userId,
    action: "playlist.item.create",
    resource: "playlist",
    resourceId: playlistId,
    metadata: { itemId: result.item.id, tuneId },
  });

  return Response.json(serializeAdminPlaylistItem(item), { status: 201 });
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

  const result = await move(
    db,
    playlistId,
    validation.data.itemId,
    validation.data.targetIndex,
  );

  if (result.status === "playlist-not-found") {
    return jsonError("Playlist not found.", 404);
  }

  if (result.status === "item-not-found") {
    return jsonError("Playlist item not found.", 404);
  }

  if (result.status === "conflict") {
    return jsonError("Playlist order changed. Please try again.", 409);
  }

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

  return Response.json({ items: result.items });
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

  const result = await remove(db, playlistId, itemId);

  if (result.status === "playlist-not-found") {
    return jsonError("Playlist not found.", 404);
  }

  if (result.status === "item-not-found") {
    return jsonError("Playlist item not found.", 404);
  }

  if (result.status === "conflict") {
    return jsonError("Playlist order changed. Please try again.", 409);
  }

  await recordAudit({
    actorId: session.userId,
    action: "playlist.item.delete",
    resource: "playlist",
    resourceId: playlistId,
    metadata: { itemId },
  });

  return Response.json({ items: result.items });
}

function parseStringField(payload: object, fieldName: string): string {
  const value = (payload as Record<string, unknown>)[fieldName];

  return typeof value === "string" ? value.trim() : "";
}

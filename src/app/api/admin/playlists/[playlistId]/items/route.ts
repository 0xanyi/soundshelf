import { db } from "@/lib/db";
import { jsonError, requireAdminSession } from "@/lib/http/errors";
import {
  buildMovedPlaylistItemPositions,
  buildNormalizedPlaylistItemPositions,
  parsePlaylistReorderPayload,
  serializeAdminPlaylistItem,
} from "@/lib/playlists/admin";

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

  const { playlistId } = await context.params;
  const [playlist, tune, duplicateItem, lastItem] = await Promise.all([
    db.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true },
    }),
    db.tune.findFirst({
      where: { id: tuneId, status: "active" },
      select: { id: true },
    }),
    db.playlistItem.findFirst({
      where: { playlistId, tuneId },
      select: { id: true },
    }),
    db.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { position: "desc" },
      select: { position: true },
    }),
  ]);

  if (!playlist) {
    return jsonError("Playlist not found.", 404);
  }

  if (!tune) {
    return jsonError("Active tune not found.", 404);
  }

  if (duplicateItem) {
    return jsonError("Tune is already in this playlist.", 409);
  }

  const item = await db.playlistItem.create({
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
          description: true,
          durationSeconds: true,
          status: true,
        },
      },
    },
  });

  return Response.json(serializeAdminPlaylistItem(item), { status: 201 });
}

export async function PATCH(
  request: Request,
  context: PlaylistItemsRouteContext,
): Promise<Response> {
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
  const playlist = await db.playlist.findUnique({
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
    return jsonError("Playlist not found.", 404);
  }

  if (!playlist.items.some((item) => item.id === validation.data.itemId)) {
    return jsonError("Playlist item not found.", 404);
  }

  const nextItems = buildMovedPlaylistItemPositions(
    playlist.items,
    validation.data.itemId,
    validation.data.targetIndex,
  );

  await updatePlaylistItemPositions(nextItems);

  return Response.json({ items: nextItems });
}

export async function DELETE(
  request: Request,
  context: PlaylistItemsRouteContext,
): Promise<Response> {
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

  const { playlistId } = await context.params;
  const playlist = await db.playlist.findUnique({
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
    return jsonError("Playlist not found.", 404);
  }

  if (!playlist.items.some((item) => item.id === itemId)) {
    return jsonError("Playlist item not found.", 404);
  }

  await db.playlistItem.delete({
    where: { id: itemId },
  });

  const nextItems = buildNormalizedPlaylistItemPositions(
    playlist.items.filter((item) => item.id !== itemId),
  );

  await updatePlaylistItemPositions(nextItems);

  return Response.json({ items: nextItems });
}

async function updatePlaylistItemPositions(
  items: Array<{ id: string; position: number }>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await db.$transaction([
    ...items.map((item, index) =>
      db.playlistItem.update({
        where: { id: item.id },
        data: { position: -(index + 1) },
      }),
    ),
    ...items.map((item) =>
      db.playlistItem.update({
        where: { id: item.id },
        data: { position: item.position },
      }),
    ),
  ]);
}

function parseStringField(payload: object, fieldName: string): string {
  const value = (payload as Record<string, unknown>)[fieldName];

  return typeof value === "string" ? value.trim() : "";
}

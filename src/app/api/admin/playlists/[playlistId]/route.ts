import { db } from "@/lib/db";
import { jsonError, requireAdminSession } from "@/lib/http/errors";
import {
  parsePlaylistMutationPayload,
  serializeAdminPlaylist,
} from "@/lib/playlists/admin";

export const runtime = "nodejs";

type PlaylistRouteContext = {
  params: Promise<{
    playlistId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: PlaylistRouteContext,
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

  const validation = parsePlaylistMutationPayload(payload, {
    requireTitle: false,
  });

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const { playlistId } = await context.params;
  const existingPlaylist = await db.playlist.findUnique({
    where: { id: playlistId },
    select: { id: true },
  });

  if (!existingPlaylist) {
    return jsonError("Playlist not found.", 404);
  }

  const playlist = await db.playlist.update({
    where: { id: playlistId },
    data: validation.data,
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return Response.json(serializeAdminPlaylist(playlist));
}

export async function DELETE(
  _request: Request,
  context: PlaylistRouteContext,
): Promise<Response> {
  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const { playlistId } = await context.params;
  const existingPlaylist = await db.playlist.findUnique({
    where: { id: playlistId },
    select: { id: true },
  });

  if (!existingPlaylist) {
    return jsonError("Playlist not found.", 404);
  }

  await db.playlist.delete({
    where: { id: playlistId },
  });

  return new Response(null, { status: 204 });
}

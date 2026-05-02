import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
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

  const validation = parsePlaylistMutationPayload(payload, {
    requireTitle: false,
  });

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const { playlistId } = await context.params;

  if (!isValidCuid(playlistId)) {
    return jsonError("Invalid playlist id.", 400);
  }

  const existingPlaylist = await db.playlist.findUnique({
    where: { id: playlistId },
    select: { id: true, visibility: true },
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

  // Visibility flips are the highest-impact change here, so they get a
  // dedicated audit action that is easy to filter.
  if (
    typeof validation.data.visibility !== "undefined" &&
    validation.data.visibility !== existingPlaylist.visibility
  ) {
    await recordAudit({
      actorId: session.userId,
      action: "playlist.visibility.update",
      resource: "playlist",
      resourceId: playlistId,
      metadata: {
        from: existingPlaylist.visibility,
        to: validation.data.visibility,
      },
    });
  }

  await recordAudit({
    actorId: session.userId,
    action: "playlist.update",
    resource: "playlist",
    resourceId: playlistId,
    metadata: {
      title: validation.data.title,
      hasDescriptionChange: "description" in validation.data,
    },
  });

  return Response.json(serializeAdminPlaylist(playlist));
}

export async function DELETE(
  request: Request,
  context: PlaylistRouteContext,
): Promise<Response> {
  const csrf = await enforceSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const { playlistId } = await context.params;

  if (!isValidCuid(playlistId)) {
    return jsonError("Invalid playlist id.", 400);
  }

  const existingPlaylist = await db.playlist.findUnique({
    where: { id: playlistId },
    select: { id: true, title: true },
  });

  if (!existingPlaylist) {
    return jsonError("Playlist not found.", 404);
  }

  await db.playlist.delete({
    where: { id: playlistId },
  });

  await recordAudit({
    actorId: session.userId,
    action: "playlist.delete",
    resource: "playlist",
    resourceId: playlistId,
    metadata: { title: existingPlaylist.title },
  });

  return new Response(null, { status: 204 });
}

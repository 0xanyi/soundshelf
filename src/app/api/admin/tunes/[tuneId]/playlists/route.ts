import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import { parseTunePlaylistsSyncPayload } from "@/lib/tunes/admin";
import { sync } from "@/lib/playlists/membership";

export const runtime = "nodejs";

type TunePlaylistsRouteContext = {
  params: Promise<{
    tuneId: string;
  }>;
};

export async function PUT(
  request: Request,
  context: TunePlaylistsRouteContext,
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

  const validation = parseTunePlaylistsSyncPayload(payload);

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const { tuneId } = await context.params;

  if (!isValidCuid(tuneId)) {
    return jsonError("Invalid tune id.", 400);
  }

  const targetIds = validation.data.playlistIds;

  if (targetIds.some((id) => !isValidCuid(id))) {
    return jsonError("Invalid playlist id.", 400);
  }

  const result = await sync(db, tuneId, targetIds);

  if (result.status === "tune-not-found") {
    return jsonError("Tune not found.", 404);
  }

  if (result.status === "playlist-not-found") {
    return jsonError("One or more playlists were not found.", 404);
  }

  if (result.status === "conflict") {
    return jsonError("Playlist order changed. Please try again.", 409);
  }

  await recordAudit({
    actorId: session.userId,
    action: "tune.playlists.sync",
    resource: "tune",
    resourceId: tuneId,
    metadata: { playlistIds: targetIds, added: result.added, removed: result.removed },
  });

  const updated = await db.playlistItem.findMany({
    where: { tuneId },
    select: {
      playlist: {
        select: { id: true, title: true },
      },
    },
    orderBy: { playlist: { title: "asc" } },
  });

  return Response.json({
    playlists: updated.map((item) => ({
      id: item.playlist.id,
      title: item.playlist.title,
    })),
  });
}

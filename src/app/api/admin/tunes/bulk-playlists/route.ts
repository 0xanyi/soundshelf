import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import { parseBulkAddTunesPayload } from "@/lib/tunes/admin";
import { bulkAdd } from "@/lib/playlists/membership";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
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

  const validation = parseBulkAddTunesPayload(payload);

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const { tuneIds, playlistIds } = validation.data;

  if (tuneIds.length === 0) {
    return jsonError("Select at least one tune.", 400);
  }

  if (playlistIds.length === 0) {
    return jsonError("Select at least one playlist.", 400);
  }

  if (tuneIds.some((id) => !isValidCuid(id))) {
    return jsonError("Invalid tune id.", 400);
  }

  if (playlistIds.some((id) => !isValidCuid(id))) {
    return jsonError("Invalid playlist id.", 400);
  }

  const [tunes, playlists] = await Promise.all([
    db.tune.findMany({
      where: { id: { in: tuneIds } },
      select: { id: true },
    }),
    db.playlist.findMany({
      where: { id: { in: playlistIds } },
      select: { id: true },
    }),
  ]);

  if (tunes.length !== tuneIds.length) {
    return jsonError("One or more tunes were not found.", 404);
  }

  if (playlists.length !== playlistIds.length) {
    return jsonError("One or more playlists were not found.", 404);
  }

  let added = 0;
  let skipped = 0;

  for (const playlistId of playlistIds) {
    const result = await bulkAdd(db, playlistId, tuneIds);

    if (result.status === "playlist-not-found") {
      return jsonError("One or more playlists were not found.", 404);
    }

    if (result.status === "tune-not-found") {
      return jsonError("One or more tunes were not found.", 404);
    }

    if (result.status === "conflict") {
      return jsonError("Playlist order changed. Please try again.", 409);
    }

    added += result.added;
    skipped += result.skipped;
  }

  await recordAudit({
    actorId: session.userId,
    action: "tune.playlists.bulk_add",
    resource: "tune",
    metadata: { tuneIds, playlistIds, added, skipped },
  });

  return Response.json({ ok: true, added, skipped });
}

import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import { parseBulkAddTunesPayload } from "@/lib/tunes/admin";

export const runtime = "nodejs";

// Concurrent admin edits can race on the (playlistId, position) unique
// constraint when two requests pick the same "next" position. Retrying with a
// fresh transaction is cheap and bounded.
const MAX_BULK_ADD_ATTEMPTS = 3;

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
    const result = await addTunesToPlaylist(playlistId, tuneIds);
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

async function addTunesToPlaylist(
  playlistId: string,
  tuneIds: string[],
): Promise<{ added: number; skipped: number }> {
  for (let attempt = 1; attempt <= MAX_BULK_ADD_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const last = await tx.playlistItem.findFirst({
          where: { playlistId },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        const existing = await tx.playlistItem.findMany({
          where: { playlistId, tuneId: { in: tuneIds } },
          select: { tuneId: true },
        });
        const existingTuneIds = new Set(existing.map((item) => item.tuneId));

        const toAdd = tuneIds.filter((id) => !existingTuneIds.has(id));

        if (toAdd.length === 0) {
          return { added: 0, skipped: tuneIds.length };
        }

        const startPosition = last ? last.position + 1 : 0;

        // createMany is a single round trip and a single transactional check
        // against the (playlistId, position) unique index, so concurrent
        // additions surface as a P2002 we can retry.
        await tx.playlistItem.createMany({
          data: toAdd.map((tuneId, index) => ({
            playlistId,
            tuneId,
            position: startPosition + index,
          })),
        });

        return { added: toAdd.length, skipped: existingTuneIds.size };
      });
    } catch (error) {
      if (isPositionConflict(error) && attempt < MAX_BULK_ADD_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  // Defensive: the loop either returns or throws.
  throw new Error("Failed to add tunes to playlist after retries.");
}

function isPositionConflict(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    (error as { code?: unknown }).code !== "P2002"
  ) {
    return false;
  }

  const meta = (error as { meta?: unknown }).meta;

  if (!meta || typeof meta !== "object") {
    return false;
  }

  const target = (meta as { target?: unknown }).target;
  const tokens =
    Array.isArray(target) && target.every((value) => typeof value === "string")
      ? (target as string[])
      : typeof target === "string"
        ? [target]
        : [];

  return tokens.some(
    (value) => value.includes("position") || value.includes("playlistId"),
  );
}

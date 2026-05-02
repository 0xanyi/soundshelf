import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  isValidCuid,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import { parseTunePlaylistsSyncPayload } from "@/lib/tunes/admin";

export const runtime = "nodejs";

const MAX_SYNC_ATTEMPTS = 3;

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

  const tune = await db.tune.findUnique({
    where: { id: tuneId },
    select: { id: true },
  });

  if (!tune) {
    return jsonError("Tune not found.", 404);
  }

  const targetIds = validation.data.playlistIds;

  if (targetIds.some((id) => !isValidCuid(id))) {
    return jsonError("Invalid playlist id.", 400);
  }

  if (targetIds.length > 0) {
    const valid = await db.playlist.findMany({
      where: { id: { in: targetIds } },
      select: { id: true },
    });

    if (valid.length !== targetIds.length) {
      return jsonError("One or more playlists were not found.", 404);
    }
  }

  const summary = await syncTunePlaylists(tuneId, targetIds);

  await recordAudit({
    actorId: session.userId,
    action: "tune.playlists.sync",
    resource: "tune",
    resourceId: tuneId,
    metadata: { playlistIds: targetIds, ...summary },
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

async function syncTunePlaylists(
  tuneId: string,
  desired: string[],
): Promise<{ added: number; removed: number }> {
  for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const current = await tx.playlistItem.findMany({
          where: { tuneId },
          select: { playlistId: true },
        });
        const currentIds = new Set(current.map((item) => item.playlistId));
        const desiredIds = new Set(desired);

        const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));
        const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));

        if (toRemove.length > 0) {
          await tx.playlistItem.deleteMany({
            where: { tuneId, playlistId: { in: toRemove } },
          });
        }

        for (const playlistId of toAdd) {
          const last = await tx.playlistItem.findFirst({
            where: { playlistId },
            orderBy: { position: "desc" },
            select: { position: true },
          });

          await tx.playlistItem.create({
            data: {
              playlistId,
              tuneId,
              position: last ? last.position + 1 : 0,
            },
          });
        }

        return { added: toAdd.length, removed: toRemove.length };
      });
    } catch (error) {
      if (isPositionConflict(error) && attempt < MAX_SYNC_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to sync tune playlists after retries.");
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

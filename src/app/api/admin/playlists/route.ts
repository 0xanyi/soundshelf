import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import {
  parsePlaylistMutationPayload,
  serializeAdminPlaylist,
} from "@/lib/playlists/admin";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const playlists = await db.playlist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return Response.json({
    playlists: playlists.map(serializeAdminPlaylist),
  });
}

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

  const validation = parsePlaylistMutationPayload(payload, {
    requireTitle: true,
  });

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const playlist = await db.playlist.create({
    data: {
      title: validation.data.title ?? "",
      description: validation.data.description ?? null,
      // Visibility intentionally defaults to hidden so newly created
      // playlists are never public until an admin opts in.
      ...(validation.data.visibility ? { visibility: validation.data.visibility } : {}),
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  await recordAudit({
    actorId: session.userId,
    action: "playlist.create",
    resource: "playlist",
    resourceId: playlist.id,
    metadata: {
      title: playlist.title,
      visibility: playlist.visibility,
    },
  });

  return Response.json(serializeAdminPlaylist(playlist), { status: 201 });
}

import { db } from "@/lib/db";
import { jsonError, requireAdminSession } from "@/lib/http/errors";
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
    defaultStatus: "draft",
  });

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const playlist = await db.playlist.create({
    data: {
      title: validation.data.title ?? "",
      description: validation.data.description ?? null,
      status: validation.data.status ?? "draft",
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return Response.json(serializeAdminPlaylist(playlist), { status: 201 });
}

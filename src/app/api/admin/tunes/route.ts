import { db } from "@/lib/db";
import { jsonError, requireAdminSession } from "@/lib/http/errors";
import { serializeAdminTune } from "@/lib/tunes/admin";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const tunes = await db.tune.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      durationSeconds: true,
      mimeType: true,
      fileSizeBytes: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { playlistItems: true },
      },
      playlistItems: {
        select: {
          playlist: {
            select: { id: true, title: true },
          },
        },
        orderBy: { playlist: { title: "asc" } },
      },
    },
  });

  return Response.json({
    tunes: tunes.map(serializeAdminTune),
  });
}

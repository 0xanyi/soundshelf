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
    include: {
      _count: {
        select: { playlistItems: true },
      },
    },
  });

  return Response.json({
    tunes: tunes.map(serializeAdminTune),
  });
}

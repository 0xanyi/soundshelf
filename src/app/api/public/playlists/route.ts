import { db } from "@/lib/db";
import { serializePublicPlaylistSummary } from "@/lib/playlists/public";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const playlists = await db.playlist.findMany({
    where: { status: "published" },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      items: {
        select: {
          tune: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  return Response.json({
    playlists: playlists.map(serializePublicPlaylistSummary),
  });
}

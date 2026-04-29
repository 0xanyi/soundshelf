import { db } from "@/lib/db";
import { serializePublicPlaylistSummary } from "@/lib/playlists/public";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const playlists = await db.playlist.findMany({
    where: {
      status: "published",
      items: {
        some: {
          tune: { status: "active" },
        },
      },
    },
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
  const serializedPlaylists = playlists
    .map(serializePublicPlaylistSummary)
    .filter((playlist) => playlist.itemCount > 0);

  return Response.json({
    playlists: serializedPlaylists,
  });
}

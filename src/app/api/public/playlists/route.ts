import { db } from "@/lib/db";
import { serializePublicPlaylistSummary } from "@/lib/playlists/public";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const playlists = await db.playlist.findMany({
    where: {
      // Only playlists explicitly marked public are exposed. Filtering on the
      // visibility flag (rather than "has any items") keeps draft work-in-
      // progress lists private even after the first track lands in them.
      visibility: "public",
      items: {
        some: {},
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
              durationSeconds: true,
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

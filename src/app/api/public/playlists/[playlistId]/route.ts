import { db } from "@/lib/db";
import { jsonError } from "@/lib/http/errors";
import { getSignedAudioUrl } from "@/lib/r2";
import { serializePublicPlaylistDetail } from "@/lib/playlists/public";

export const runtime = "nodejs";

type PublicPlaylistRouteContext = {
  params: Promise<{
    playlistId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: PublicPlaylistRouteContext,
): Promise<Response> {
  const { playlistId } = await context.params;
  const playlist = await db.playlist.findFirst({
    where: {
      id: playlistId,
      status: "published",
    },
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      items: {
        where: {
          tune: { status: "active" },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          position: true,
          createdAt: true,
          tune: {
            select: {
              id: true,
              title: true,
              description: true,
              durationSeconds: true,
              status: true,
              r2ObjectKey: true,
            },
          },
        },
      },
    },
  });

  if (!playlist) {
    return jsonError("Playlist not found.", 404);
  }

  const serializedPlaylist = await serializePublicPlaylistDetail(
    playlist,
    getSignedAudioUrl,
  );

  if (!serializedPlaylist) {
    return jsonError("Playlist not found.", 404);
  }

  return Response.json(serializedPlaylist);
}

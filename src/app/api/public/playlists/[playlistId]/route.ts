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
    // Combining the id with the visibility filter prevents enumeration of
    // hidden playlists by id; an unknown id and a hidden id both 404.
    where: { id: playlistId, visibility: "public" },
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          position: true,
          createdAt: true,
          tune: {
            select: {
              id: true,
              title: true,
              durationSeconds: true,
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

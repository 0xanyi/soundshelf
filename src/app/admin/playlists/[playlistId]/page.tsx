import { notFound } from "next/navigation";

import { PlaylistEditor } from "@/components/admin/playlist-editor";
import { db } from "@/lib/db";
import {
  serializeAdminPlaylist,
  serializeAdminPlaylistItem,
} from "@/lib/playlists/admin";

export const dynamic = "force-dynamic";

type AdminPlaylistEditorPageProps = {
  params: Promise<{
    playlistId: string;
  }>;
};

export default async function AdminPlaylistEditorPage({
  params,
}: AdminPlaylistEditorPageProps) {
  const { playlistId } = await params;
  const [playlist, tunes] = await Promise.all([
    db.playlist.findUnique({
      where: { id: playlistId },
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: {
            tune: {
              select: {
                id: true,
                title: true,
                durationSeconds: true,
              },
            },
          },
        },
      },
    }),
    db.tune.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        durationSeconds: true,
      },
    }),
  ]);

  if (!playlist) {
    notFound();
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="kicker">Playlist</p>
        <h2 className="display-heading text-3xl font-semibold sm:text-4xl">
          {playlist.title}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--muted))]">
          Edit playlist details, add songs, and adjust playback order.
        </p>
      </header>

      <PlaylistEditor
        items={playlist.items.map(serializeAdminPlaylistItem)}
        playlist={serializeAdminPlaylist(playlist)}
        tunes={tunes}
      />
    </section>
  );
}

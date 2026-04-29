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
  const [playlist, activeTunes] = await Promise.all([
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
                description: true,
                durationSeconds: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    db.tune.findMany({
      where: { status: "active" },
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
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">
          Playlist
        </p>
        <h2 className="text-3xl font-semibold">{playlist.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Edit playlist details, add active tunes, and adjust playback order.
        </p>
      </div>

      <PlaylistEditor
        activeTunes={activeTunes}
        items={playlist.items.map(serializeAdminPlaylistItem)}
        playlist={serializeAdminPlaylist(playlist)}
      />
    </section>
  );
}

import { PlaylistListManager } from "@/components/admin/playlist-list-manager";
import { db } from "@/lib/db";
import { serializeAdminPlaylist } from "@/lib/playlists/admin";

export const dynamic = "force-dynamic";

export default async function AdminPlaylistsPage() {
  const playlists = await db.playlist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });
  const serializedPlaylists = playlists.map(serializeAdminPlaylist);

  return (
    <section className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">
          Playlists
        </p>
        <h2 className="text-3xl font-semibold">Playlist management</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Create ordered sets of active tunes and publish them when they are
          ready for listeners.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Library</h3>
            <p className="mt-1 text-sm text-muted">
              {serializedPlaylists.length} playlist
              {serializedPlaylists.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <PlaylistListManager playlists={serializedPlaylists} />
      </div>
    </section>
  );
}

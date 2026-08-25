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
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Playlists</h1>
        <p className="figure text-sm text-ink-3">
          {serializedPlaylists.length} filed
        </p>
      </header>
      <p className="mt-2 max-w-prose text-sm text-ink-2">
        Group tunes into playlists and set the order they play in. A playlist
        reaches listeners once it is public and holds at least one tune.
      </p>

      <div className="mt-8">
        <PlaylistListManager playlists={serializedPlaylists} />
      </div>
    </section>
  );
}

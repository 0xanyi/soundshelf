import { TuneManagementTable } from "@/components/admin/tune-management-table";
import { TuneUploadForm } from "@/components/admin/tune-upload-form";
import { db } from "@/lib/db";
import { serializeAdminTune } from "@/lib/tunes/admin";

export const dynamic = "force-dynamic";

export default async function AdminTunesPage() {
  const [tunes, playlists] = await Promise.all([
    db.tune.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { playlistItems: true },
        },
        playlistItems: {
          select: {
            playlist: {
              select: { id: true, title: true },
            },
          },
          orderBy: { playlist: { title: "asc" } },
        },
      },
    }),
    db.playlist.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  const serializedTunes = tunes.map(serializeAdminTune);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="kicker">Songs</p>
        <h2 className="display-heading text-3xl font-semibold sm:text-4xl">
          Song library
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--muted))]">
          Upload audio, rename songs, and add them to playlists. Uploads go live
          immediately.
        </p>
      </header>

      <TuneUploadForm />

      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="display-heading text-xl font-semibold">Library</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              {serializedTunes.length} song
              {serializedTunes.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <TuneManagementTable playlists={playlists} tunes={serializedTunes} />
      </div>
    </section>
  );
}

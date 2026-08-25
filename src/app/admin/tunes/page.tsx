import { TuneManagementTable } from "@/components/admin/tune-management-table";
import { TuneUploadForm } from "@/components/admin/tune-upload-form";
import { db } from "@/lib/db";
import { serializeAdminTune } from "@/lib/tunes/admin";
import { getMaxAudioUploadBytes } from "@/lib/validation/audio";

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
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tunes</h1>
        <p className="figure text-sm text-ink-3">
          {serializedTunes.length} accessioned
        </p>
      </header>
      <p className="mt-2 max-w-prose text-sm text-ink-2">
        Upload audio, rename tunes, and file them onto playlists. An upload is
        live as soon as it lands.
      </p>

      <div className="mt-8">
        <TuneUploadForm maxUploadBytes={getMaxAudioUploadBytes()} />
      </div>

      <div className="mt-10">
        <TuneManagementTable playlists={playlists} tunes={serializedTunes} />
      </div>
    </section>
  );
}

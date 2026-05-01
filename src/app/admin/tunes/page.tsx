import { TuneManagementTable } from "@/components/admin/tune-management-table";
import { TuneUploadForm } from "@/components/admin/tune-upload-form";
import { db } from "@/lib/db";
import { serializeAdminTune } from "@/lib/tunes/admin";

export const dynamic = "force-dynamic";

export default async function AdminTunesPage() {
  const tunes = await db.tune.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { playlistItems: true },
      },
    },
  });
  const serializedTunes = tunes.map(serializeAdminTune);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="kicker">Tunes</p>
        <h2 className="display-heading text-3xl font-semibold sm:text-4xl">
          Tune management
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--muted))]">
          Upload audio, keep drafts tidy, and publish active tunes for playlist
          use.
        </p>
      </header>

      <TuneUploadForm />

      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="display-heading text-xl font-semibold">Library</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              {serializedTunes.length} tune
              {serializedTunes.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <TuneManagementTable tunes={serializedTunes} />
      </div>
    </section>
  );
}

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
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">
          Tunes
        </p>
        <h2 className="text-3xl font-semibold">Tune management</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Upload audio, keep drafts tidy, and publish active tunes for playlist
          use.
        </p>
      </div>

      <TuneUploadForm />

      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Library</h3>
            <p className="mt-1 text-sm text-muted">
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

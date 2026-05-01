export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <section className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">
          Dashboard
        </p>
        <h2 className="text-3xl font-semibold">Admin dashboard</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Manage the audio library and prepare published playlists from
          this area.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-foreground/10 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Tunes</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Upload audio, manage tune details, and mark tracks active when they
            are ready for playlists.
          </p>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Playlists</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Assemble curated audio playlists, order tracks, and publish them to
            the public player.
          </p>
        </div>
      </div>
    </section>
  );
}

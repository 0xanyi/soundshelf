export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-wide text-accent">
          Public Player
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Prayer Tunes</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Published playlists and audio playback will appear here.
        </p>
      </section>
    </main>
  );
}

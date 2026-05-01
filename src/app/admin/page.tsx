import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, ListMusic, Music2 } from "lucide-react";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [tuneCount, activeTuneCount, playlistCount, publishedPlaylistCount] =
    await Promise.all([
      db.tune.count(),
      db.tune.count({ where: { status: "active" } }),
      db.playlist.count(),
      db.playlist.count({ where: { status: "published" } }),
    ]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="kicker">Dashboard</p>
        <h2 className="display-heading text-3xl font-semibold sm:text-4xl">
          Welcome back to the studio.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--muted))]">
          Curate your audio library, sequence playlists, and publish them to the
          public player. The atmosphere here mirrors the listener experience —
          calm, deliberate, and uncluttered.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          accent="primary"
          description="Tunes ready for playlists"
          href={"/admin/tunes" as Route}
          icon={<Music2 size={18} aria-hidden="true" />}
          label="Audio Library"
          metric={`${activeTuneCount}/${tuneCount}`}
          subMetric={`${tuneCount - activeTuneCount} draft${
            tuneCount - activeTuneCount === 1 ? "" : "s"
          }`}
          title="Tunes"
        />
        <StatCard
          accent="secondary"
          description="Playlists currently live"
          href={"/admin/playlists" as Route}
          icon={<ListMusic size={18} aria-hidden="true" />}
          label="Curation"
          metric={`${publishedPlaylistCount}/${playlistCount}`}
          subMetric={`${playlistCount - publishedPlaylistCount} draft${
            playlistCount - publishedPlaylistCount === 1 ? "" : "s"
          }`}
          title="Playlists"
        />
      </div>

      <div className="panel-quiet space-y-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="kicker">Quick reference</p>
            <h3 className="display-heading mt-1 text-xl font-semibold">
              How it flows
            </h3>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          <FlowStep
            index="01"
            title="Upload tunes"
            description="Drop audio files into the library. They start as drafts, ready to be polished."
          />
          <FlowStep
            index="02"
            title="Activate"
            description="Add titles and descriptions, then mark each tune active when it's ready."
          />
          <FlowStep
            index="03"
            title="Publish"
            description="Build a playlist, sequence the order, and publish it to the public player."
          />
        </ol>
      </div>
    </section>
  );
}

function StatCard({
  accent,
  description,
  href,
  icon,
  label,
  metric,
  subMetric,
  title,
}: {
  accent: "primary" | "secondary";
  description: string;
  href: Route;
  icon: React.ReactNode;
  label: string;
  metric: string;
  subMetric: string;
  title: string;
}) {
  return (
    <Link
      className="panel group relative flex flex-col gap-5 p-6 transition hover:-translate-y-0.5 hover:border-[hsl(var(--accent)/0.5)] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.25)]"
      href={href}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="pill">
          <span aria-hidden="true">{icon}</span>
          {label}
        </span>
        <span
          aria-hidden="true"
          className={`grid size-9 place-items-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted))] transition group-hover:border-[hsl(var(--accent)/0.6)] group-hover:bg-[hsl(var(--accent)/0.12)] group-hover:text-[hsl(var(--accent))]`}
        >
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div>
        <p className="display-heading text-3xl font-semibold tabular-nums sm:text-4xl">
          <span
            className={
              accent === "primary"
                ? "bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent-2)))] bg-clip-text text-transparent"
                : "text-foreground"
            }
          >
            {metric}
          </span>
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--muted))]">{subMetric}</p>
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted))]">
          {description}
        </p>
      </div>
    </Link>
  );
}

function FlowStep({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <li className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--surface-2)/0.5)] p-4">
      <p className="font-mono text-[11px] tracking-[0.24em] text-[hsl(var(--accent))]">
        {index}
      </p>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted))]">
        {description}
      </p>
    </li>
  );
}

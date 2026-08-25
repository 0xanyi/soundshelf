import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { PlaylistEditor } from "@/components/admin/playlist-editor";
import { db } from "@/lib/db";
import {
  serializeAdminPlaylist,
  serializeAdminPlaylistItem,
} from "@/lib/playlists/admin";
import { getMood } from "@/lib/mood";
import { getShelfmark } from "@/lib/shelfmark";

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
  const [playlist, tunes] = await Promise.all([
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
                durationSeconds: true,
              },
            },
          },
        },
      },
    }),
    db.tune.findMany({
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
    <section style={getMood(playlist.id).cssVars as CSSProperties}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {playlist.title}
        </h1>
        <span className="flex items-center gap-2">
          <span className="shelf-tab" aria-hidden="true" />
          <span className="shelfmark">{getShelfmark(playlist.id)}</span>
        </span>
      </header>

      <div className="mt-8">
        <PlaylistEditor
          items={playlist.items.map(serializeAdminPlaylistItem)}
          playlist={serializeAdminPlaylist(playlist)}
          tunes={tunes}
        />
      </div>
    </section>
  );
}

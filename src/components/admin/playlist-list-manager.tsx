"use client";

import { Eye, EyeOff, ExternalLink, ListMusic, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedAdminPlaylist } from "@/lib/playlists/admin";
import { formatDate } from "@/lib/format";
import { readError } from "@/lib/http/client";

type PlaylistListManagerProps = {
  playlists: SerializedAdminPlaylist[];
};

export function PlaylistListManager({ playlists }: PlaylistListManagerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createPlaylist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/playlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setTitle("");
      setDescription("");
      setMessage("Playlist created.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Playlist could not be created.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function deletePlaylist(playlistId: string) {
    setPendingId(playlistId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlistId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage("Playlist deleted.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Playlist could not be deleted.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function toggleVisibility(
    playlistId: string,
    nextVisibility: "hidden" | "public",
  ) {
    setPendingId(playlistId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlistId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visibility: nextVisibility }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage(
        nextVisibility === "public"
          ? "Playlist is now public."
          : "Playlist is now hidden.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Visibility could not be updated.",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="panel-quiet p-5 sm:p-6"
        onSubmit={(event) => void createPlaylist(event)}
      >
        <p className="kicker">New playlist</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <label
              className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]"
              htmlFor="playlist-title"
            >
              Title
            </label>
            <input
              className="field"
              disabled={isCreating}
              id="playlist-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Morning calm"
              required
              value={title}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]"
              htmlFor="playlist-description"
            >
              Description
            </label>
            <input
              className="field"
              disabled={isCreating}
              id="playlist-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              value={description}
            />
          </div>
          <button className="btn-primary" disabled={isCreating} type="submit">
            <Plus aria-hidden="true" size={16} />
            Create
          </button>
        </div>
      </form>

      {message ? (
        <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.7)] px-3 py-2 text-sm text-[hsl(var(--muted))]">
          {message}
        </p>
      ) : null}

      {playlists.length === 0 ? (
        <div className="panel-quiet grid place-items-center gap-3 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))]">
            <ListMusic size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="display-heading text-lg font-semibold">
              No playlists yet
            </h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              Create a playlist to start grouping songs.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel-quiet overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[hsl(var(--border)/0.5)] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
                <tr className="bg-[hsl(var(--surface-2)/0.4)]">
                  <th className="px-5 py-3 font-semibold">Playlist</th>
                  <th className="px-5 py-3 font-semibold">Visibility</th>
                  <th className="px-5 py-3 font-semibold">Songs</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border)/0.4)]">
                {playlists.map((playlist) => {
                  const isPending = pendingId === playlist.id;

                  return (
                    <tr className="align-top" key={playlist.id}>
                      <td className="min-w-72 px-5 py-4">
                        <div className="font-medium">{playlist.title}</div>
                        {playlist.description ? (
                          <div className="mt-1 max-w-md text-sm text-[hsl(var(--muted))]">
                            {playlist.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        {playlist.visibility === "public" ? (
                          <button
                            aria-label={`Hide ${playlist.title} from listeners`}
                            className="btn-ghost inline-flex items-center gap-2 px-3 py-1 text-xs"
                            disabled={isPending}
                            onClick={() =>
                              void toggleVisibility(playlist.id, "hidden")
                            }
                            title="Hide playlist"
                            type="button"
                          >
                            <Eye aria-hidden="true" size={14} />
                            Public
                          </button>
                        ) : (
                          <button
                            aria-label={`Publish ${playlist.title}`}
                            className="btn-ghost inline-flex items-center gap-2 px-3 py-1 text-xs"
                            disabled={isPending}
                            onClick={() =>
                              void toggleVisibility(playlist.id, "public")
                            }
                            title="Publish playlist"
                            type="button"
                          >
                            <EyeOff aria-hidden="true" size={14} />
                            Hidden
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="pill">{playlist.itemCount}</span>
                      </td>
                      <td className="min-w-36 px-5 py-4 text-xs text-[hsl(var(--muted))]">
                        {formatDate(playlist.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link
                            aria-label={`Edit ${playlist.title}`}
                            className="btn-ghost-icon"
                            href={`/admin/playlists/${playlist.id}` as Route}
                            title="Edit playlist"
                          >
                            <ExternalLink aria-hidden="true" size={16} />
                          </Link>
                          <button
                            aria-label={`Delete ${playlist.title}`}
                            className="btn-danger-icon"
                            disabled={isPending}
                            onClick={() => void deletePlaylist(playlist.id)}
                            title="Delete playlist"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



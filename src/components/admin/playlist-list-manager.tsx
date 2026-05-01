"use client";

import { ExternalLink, ListMusic, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedAdminPlaylist } from "@/lib/playlists/admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";

type PlaylistListManagerProps = {
  playlists: SerializedAdminPlaylist[];
};

export function PlaylistListManager({ playlists }: PlaylistListManagerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
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
        body: JSON.stringify({ title, description, status }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setTitle("");
      setDescription("");
      setStatus("draft");
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

  async function updateStatus(playlistId: string, nextStatus: "draft" | "published") {
    setPendingId(playlistId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlistId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage("Playlist status saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status could not be saved.");
    } finally {
      setPendingId(null);
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

  return (
    <div className="space-y-6">
      <form
        className="panel-quiet p-5 sm:p-6"
        onSubmit={(event) => void createPlaylist(event)}
      >
        <p className="kicker">New playlist</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
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
          <div className="space-y-2">
            <label
              className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]"
              htmlFor="playlist-status"
            >
              Status
            </label>
            <select
              className="field"
              disabled={isCreating}
              id="playlist-status"
              onChange={(event) =>
                setStatus(event.target.value as "draft" | "published")
              }
              value={status}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
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
              Create a playlist to start grouping active tunes.
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
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
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
                        <label className="sr-only" htmlFor={`status-${playlist.id}`}>
                          Status
                        </label>
                        <select
                          className="field"
                          disabled={isPending}
                          id={`status-${playlist.id}`}
                          onChange={(event) =>
                            void updateStatus(
                              playlist.id,
                              event.target.value as "draft" | "published",
                            )
                          }
                          value={playlist.status}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                        <StatusBadge
                          className="mt-2"
                          tone={playlist.status === "published" ? "active" : "muted"}
                          label={
                            playlist.status === "published" ? "Published" : "Draft"
                          }
                        />
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

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

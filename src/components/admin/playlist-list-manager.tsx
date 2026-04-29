"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedAdminPlaylist } from "@/lib/playlists/admin";

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
    <div className="space-y-8">
      <form
        className="rounded-lg border border-foreground/10 bg-white p-5 shadow-sm"
        onSubmit={(event) => void createPlaylist(event)}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div>
            <label className="text-sm font-medium" htmlFor="playlist-title">
              Title
            </label>
            <input
              className="mt-1 w-full rounded-md border border-foreground/15 px-3 py-2"
              disabled={isCreating}
              id="playlist-title"
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="playlist-description">
              Description
            </label>
            <input
              className="mt-1 w-full rounded-md border border-foreground/15 px-3 py-2"
              disabled={isCreating}
              id="playlist-description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="playlist-status">
              Status
            </label>
            <select
              className="mt-1 w-full rounded-md border border-foreground/15 bg-white px-3 py-2"
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
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-white transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isCreating}
            type="submit"
          >
            <Plus aria-hidden="true" size={16} />
            Create
          </button>
        </div>
      </form>

      {message ? (
        <p className="rounded-md border border-foreground/10 bg-white px-3 py-2 text-sm text-muted">
          {message}
        </p>
      ) : null}

      {playlists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-foreground/20 bg-white p-8 text-center">
          <h3 className="text-base font-semibold">No playlists</h3>
          <p className="mt-2 text-sm text-muted">
            Create a playlist to start grouping active tunes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-foreground/10 text-left text-sm">
            <thead className="bg-foreground/[0.03] text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Playlist</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {playlists.map((playlist) => {
                const isPending = pendingId === playlist.id;

                return (
                  <tr className="align-top" key={playlist.id}>
                    <td className="min-w-72 px-4 py-4">
                      <div className="font-medium">{playlist.title}</div>
                      {playlist.description ? (
                        <div className="mt-1 max-w-md text-muted">
                          {playlist.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <label className="sr-only" htmlFor={`status-${playlist.id}`}>
                        Status
                      </label>
                      <select
                        className="rounded-md border border-foreground/15 bg-white px-3 py-2"
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
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-medium">
                        {playlist.itemCount}
                      </span>
                    </td>
                    <td className="min-w-36 px-4 py-4 text-muted">
                      {formatDate(playlist.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Link
                          aria-label={`Edit ${playlist.title}`}
                          className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-foreground transition hover:bg-foreground/5"
                          href={`/admin/playlists/${playlist.id}` as Route}
                          title="Edit playlist"
                        >
                          <ExternalLink aria-hidden="true" size={16} />
                        </Link>
                        <button
                          aria-label={`Delete ${playlist.title}`}
                          className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      )}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

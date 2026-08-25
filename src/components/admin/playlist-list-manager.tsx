"use client";

import { ArrowUpRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedAdminPlaylist } from "@/lib/playlists/admin";
import { formatDate } from "@/lib/format";
import { getShelfmark } from "@/lib/shelfmark";
import { getMood } from "@/lib/mood";
import { readError } from "@/lib/http/client";
import type { CSSProperties } from "react";

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
    <div>
      <form onSubmit={(event) => void createPlaylist(event)}>
        <p className="label">New playlist</p>
        <div className="mt-1 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className="sr-only" htmlFor="playlist-title">
              Title
            </label>
            <input
              className="field"
              disabled={isCreating}
              id="playlist-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              required
              value={title}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="playlist-description">
              Description
            </label>
            <input
              className="field"
              disabled={isCreating}
              id="playlist-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
              value={description}
            />
          </div>
          <button
            className="control control-solid mb-1"
            disabled={isCreating}
            type="submit"
          >
            <Plus aria-hidden="true" size={14} />
            Create
          </button>
        </div>
      </form>

      {message ? (
        <p className="pt-4 text-sm text-ink-2" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-10">
        {playlists.length === 0 ? (
          <div className="rule-t rule-b py-14 text-center">
            <p className="text-lg font-medium text-ink">No playlists yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
              Create one above, then add tunes to it. A playlist stays hidden
              from listeners until it is public and holds at least one tune.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead>
                <tr className="rule-b">
                  <th className="label w-28 pb-2 pr-4 align-bottom font-medium">
                    Shelfmark
                  </th>
                  <th className="label pb-2 pr-4 align-bottom font-medium">
                    Playlist
                  </th>
                  <th className="label pb-2 pr-4 align-bottom font-medium">
                    Visibility
                  </th>
                  <th className="label pb-2 pr-4 align-bottom text-right font-medium">
                    Tunes
                  </th>
                  <th className="label pb-2 pr-4 align-bottom font-medium">
                    Created
                  </th>
                  <th className="label pb-2 align-bottom text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {playlists.map((playlist) => {
                  const isPending = pendingId === playlist.id;
                  const isPublic = playlist.visibility === "public";
                  // A public playlist with nothing on it is still invisible
                  // to listeners; say so rather than implying it is live.
                  const isLive = isPublic && playlist.itemCount > 0;

                  return (
                    <tr
                      className="rule-b align-middle"
                      key={playlist.id}
                      style={getMood(playlist.id).cssVars as CSSProperties}
                    >
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2">
                          <span className="shelf-tab" aria-hidden="true" />
                          <span className="shelfmark">
                            {getShelfmark(playlist.id)}
                          </span>
                        </span>
                      </td>

                      <td className="min-w-64 py-3 pr-4">
                        <Link
                          className="text-base font-medium text-ink hover:text-mood-ink"
                          href={`/admin/playlists/${playlist.id}` as Route}
                        >
                          {playlist.title}
                        </Link>
                        {playlist.description ? (
                          <span className="mt-0.5 block max-w-prose text-sm text-ink-2">
                            {playlist.description}
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3 pr-4">
                        <button
                          aria-label={
                            isPublic
                              ? `Make ${playlist.title} hidden`
                              : `Make ${playlist.title} public`
                          }
                          className="control -ml-2.5"
                          disabled={isPending}
                          onClick={() =>
                            void toggleVisibility(
                              playlist.id,
                              isPublic ? "hidden" : "public",
                            )
                          }
                          title={
                            isPublic
                              ? "Make playlist hidden"
                              : "Make playlist public"
                          }
                          type="button"
                        >
                          {isPublic ? (
                            <Eye aria-hidden="true" size={14} />
                          ) : (
                            <EyeOff aria-hidden="true" size={14} />
                          )}
                          {isPublic ? "Public" : "Hidden"}
                        </button>
                        {isPublic && !isLive ? (
                          <span className="block pl-0.5 text-xs text-ink-3">
                            Empty, so still unlisted
                          </span>
                        ) : null}
                      </td>

                      <td className="figure py-3 pr-4 text-right text-sm text-ink-2">
                        {playlist.itemCount}
                      </td>

                      <td className="figure min-w-36 py-3 pr-4 text-xs text-ink-3">
                        {formatDate(playlist.createdAt)}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            aria-label={`Edit ${playlist.title}`}
                            className="control control-icon"
                            href={`/admin/playlists/${playlist.id}` as Route}
                            title="Edit playlist"
                          >
                            <ArrowUpRight aria-hidden="true" size={15} />
                          </Link>
                          <button
                            aria-label={`Delete ${playlist.title}`}
                            className="control control-icon control-danger"
                            disabled={isPending}
                            onClick={() => void deletePlaylist(playlist.id)}
                            title="Delete playlist"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={15} />
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
    </div>
  );
}

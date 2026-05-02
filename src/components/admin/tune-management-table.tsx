"use client";

import { Music2, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { SerializedAdminTune } from "@/lib/tunes/admin";
import type { SerializedAdminPlaylist } from "@/lib/playlists/admin";
import { AddToPlaylistPopover } from "@/components/admin/add-to-playlist-popover";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import { readError } from "@/lib/http/client";

type TuneManagementTableProps = {
  tunes: SerializedAdminTune[];
  playlists: Pick<SerializedAdminPlaylist, "id" | "title">[];
};

export function TuneManagementTable({
  tunes,
  playlists,
}: TuneManagementTableProps) {
  const router = useRouter();
  const [pendingTuneId, setPendingTuneId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, setIsBulkPending] = useState(false);

  const selectableIds = useMemo(() => tunes.map((tune) => tune.id), [tunes]);
  const allSelected =
    selectableIds.length > 0 && selectedIds.size === selectableIds.length;
  const someSelected = selectedIds.size > 0;

  if (tunes.length === 0) {
    return (
      <div className="panel-quiet grid place-items-center gap-3 p-10 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))]">
          <Music2 size={20} aria-hidden="true" />
        </span>
        <div>
          <h3 className="display-heading text-lg font-semibold">
            No songs uploaded yet
          </h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted))]">
            Uploaded files appear here and go live immediately.
          </p>
        </div>
      </div>
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function saveTitle(tuneId: string, title: string) {
    setPendingTuneId(tuneId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/tunes/${encodeURIComponent(tuneId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage("Song saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Song could not be saved.");
    } finally {
      setPendingTuneId(null);
    }
  }

  async function deleteTune(tune: SerializedAdminTune) {
    if (!tune.canDelete) {
      setMessage("Song is in a playlist. Remove it first to delete.");
      return;
    }

    setPendingTuneId(tune.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/tunes/${encodeURIComponent(tune.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      if (response.status === 204) {
        setMessage("Song deleted.");
      } else {
        const warning = await readWarning(response);
        setMessage(warning ?? "Song deleted, but storage cleanup needs attention.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Song could not be deleted.");
    } finally {
      setPendingTuneId(null);
    }
  }

  async function syncPlaylists(
    tuneId: string,
    playlistIds: string[],
  ): Promise<boolean> {
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/tunes/${encodeURIComponent(tuneId)}/playlists`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ playlistIds }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage("Playlists updated.");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Playlists could not be updated.",
      );
      return false;
    }
  }

  async function bulkAddToPlaylists(playlistIds: string[]): Promise<boolean> {
    if (playlistIds.length === 0) {
      setMessage("Select at least one playlist.");
      return false;
    }

    setIsBulkPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/tunes/bulk-playlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tuneIds: [...selectedIds],
          playlistIds,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage(
        `Added ${selectedIds.size} song${selectedIds.size === 1 ? "" : "s"} to ${playlistIds.length} playlist${playlistIds.length === 1 ? "" : "s"}.`,
      );
      setSelectedIds(new Set());
      router.refresh();
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bulk add failed.",
      );
      return false;
    } finally {
      setIsBulkPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.7)] px-3 py-2 text-sm text-[hsl(var(--muted))]">
          {message}
        </p>
      ) : null}

      {someSelected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[hsl(var(--mood)/0.4)] bg-[hsl(var(--mood)/0.08)] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              aria-label="Clear selection"
              className="btn-ghost-icon"
              onClick={() => setSelectedIds(new Set())}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
            <p className="text-sm font-medium">
              {selectedIds.size} song{selectedIds.size === 1 ? "" : "s"} selected
            </p>
          </div>
          <AddToPlaylistPopover
            disabled={isBulkPending}
            initialSelectedIds={[]}
            onApply={bulkAddToPlaylists}
            playlists={playlists}
            triggerIcon="list"
            triggerLabel="Add to playlists…"
            triggerVariant="primary"
          />
        </div>
      ) : null}

      <div className="panel-quiet overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[hsl(var(--border)/0.5)] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
              <tr className="bg-[hsl(var(--surface-2)/0.4)]">
                <th className="w-10 px-5 py-3">
                  <label className="sr-only" htmlFor="select-all">
                    Select all
                  </label>
                  <input
                    checked={allSelected}
                    id="select-all"
                    onChange={toggleSelectAll}
                    type="checkbox"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Song</th>
                <th className="px-5 py-3 font-semibold">Playlists</th>
                <th className="px-5 py-3 font-semibold">File</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border)/0.4)]">
              {tunes.map((tune) => {
                const isPending = pendingTuneId === tune.id;
                const isSelected = selectedIds.has(tune.id);

                return (
                  <TuneTableRow
                    isPending={isPending}
                    isSelected={isSelected}
                    key={tune.id}
                    onApplyPlaylists={(ids) => syncPlaylists(tune.id, ids)}
                    onDelete={deleteTune}
                    onSave={saveTitle}
                    onToggleSelect={() => toggleSelect(tune.id)}
                    playlists={playlists}
                    tune={tune}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TuneTableRow({
  isPending,
  isSelected,
  onApplyPlaylists,
  onDelete,
  onSave,
  onToggleSelect,
  playlists,
  tune,
}: {
  isPending: boolean;
  isSelected: boolean;
  onApplyPlaylists: (ids: string[]) => Promise<boolean>;
  onDelete: (tune: SerializedAdminTune) => Promise<void>;
  onSave: (tuneId: string, title: string) => Promise<void>;
  onToggleSelect: () => void;
  playlists: Pick<SerializedAdminPlaylist, "id" | "title">[];
  tune: SerializedAdminTune;
}) {
  // Track the canonical title across re-renders so we can reset the local
  // draft only when the server's value actually changes (e.g. after a save
  // triggers a router refresh). Avoids the row-remount pattern that loses
  // input focus mid-edit, and the setState-in-effect cascading-render trap.
  const [title, setTitle] = useState(tune.title);
  const [lastSyncedTitle, setLastSyncedTitle] = useState(tune.title);
  if (lastSyncedTitle !== tune.title) {
    setLastSyncedTitle(tune.title);
    setTitle(tune.title);
  }
  const isDirty = title.trim() !== tune.title.trim();
  const memberPlaylistIds = useMemo(
    () => tune.playlists.map((playlist) => playlist.id),
    [tune.playlists],
  );

  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <label className="sr-only" htmlFor={`select-${tune.id}`}>
          Select song
        </label>
        <input
          checked={isSelected}
          id={`select-${tune.id}`}
          onChange={onToggleSelect}
          type="checkbox"
        />
      </td>
      <td className="min-w-72 px-5 py-4">
        <label className="sr-only" htmlFor={`title-${tune.id}`}>
          Title
        </label>
        <input
          className="field font-medium"
          disabled={isPending}
          id={`title-${tune.id}`}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </td>
      <td className="min-w-48 px-5 py-4">
        {tune.playlists.length === 0 ? (
          <span className="text-xs text-[hsl(var(--muted))]">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tune.playlists.map((playlist) => (
              <Link
                className="pill hover:border-[hsl(var(--mood)/0.5)] hover:text-foreground"
                href={`/admin/playlists/${playlist.id}` as Route}
                key={playlist.id}
                title={`Open ${playlist.title}`}
              >
                {playlist.title}
              </Link>
            ))}
          </div>
        )}
      </td>
      <td className="min-w-44 px-5 py-4 text-[hsl(var(--muted))]">
        <div className="font-mono text-xs">{tune.mimeType}</div>
        <div className="text-xs">{formatBytes(tune.fileSizeBytes)}</div>
        <div className="font-mono text-xs">
          {formatDuration(tune.durationSeconds, { fallback: "—:—" })}
        </div>
      </td>
      <td className="min-w-36 px-5 py-4 text-xs text-[hsl(var(--muted))]">
        {formatDate(tune.createdAt)}
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-2">
          <AddToPlaylistPopover
            disabled={isPending}
            initialSelectedIds={memberPlaylistIds}
            onApply={onApplyPlaylists}
            playlists={playlists}
            triggerLabel="Add to playlist"
          />
          <button
            aria-label={`Save ${tune.title}`}
            className="btn-ghost-icon"
            disabled={isPending || !isDirty || title.trim() === ""}
            onClick={() => void onSave(tune.id, title.trim())}
            title="Rename"
            type="button"
          >
            <Save aria-hidden="true" size={16} />
          </button>
          <button
            aria-label={`Delete ${tune.title}`}
            className="btn-danger-icon"
            disabled={isPending || !tune.canDelete}
            onClick={() => void onDelete(tune)}
            title={
              tune.canDelete
                ? "Delete song"
                : "Song is in a playlist. Remove it first to delete."
            }
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

async function readWarning(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { warning?: string };

    return body.warning ?? null;
  } catch {
    return null;
  }
}

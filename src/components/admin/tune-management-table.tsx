"use client";

import { Save, Trash2, X } from "lucide-react";
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
      <div className="rule-t rule-b py-14 text-center">
        <p className="text-lg font-medium text-ink">Nothing accessioned yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
          Upload an audio file above. It lands in this register straight away,
          and you can file it onto a playlist from here.
        </p>
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

      setMessage("Tune saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tune could not be saved.");
    } finally {
      setPendingTuneId(null);
    }
  }

  async function deleteTune(tune: SerializedAdminTune) {
    if (!tune.canDelete) {
      setMessage("This tune is on a playlist. Take it off first to delete it.");
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
        setMessage("Tune deleted.");
      } else {
        const warning = await readWarning(response);
        setMessage(warning ?? "Tune deleted, but storage cleanup needs attention.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tune could not be deleted.");
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
        `Added ${selectedIds.size} tune${selectedIds.size === 1 ? "" : "s"} to ${playlistIds.length} playlist${playlistIds.length === 1 ? "" : "s"}.`,
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
    <div>
      {message ? (
        <p className="pb-3 text-sm text-ink-2" role="status">
          {message}
        </p>
      ) : null}

      {/* Selection is a state of the register, announced on its own line
          rather than in a floating bar that covers the rows it acts on. */}
      {someSelected ? (
        <div className="rule-t flex flex-wrap items-center justify-between gap-3 py-2.5">
          <p className="flex items-center gap-2 text-sm text-ink">
            <button
              aria-label="Clear selection"
              className="control control-icon -ml-2 size-7"
              onClick={() => setSelectedIds(new Set())}
              type="button"
            >
              <X aria-hidden="true" size={13} />
            </button>
            <span className="figure">{selectedIds.size}</span>
            tune{selectedIds.size === 1 ? "" : "s"} selected
          </p>
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

      <div className="md:overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="hidden md:table-header-group">
            <tr className="rule-b">
              <th className="w-8 pb-2 pr-3 align-bottom">
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
              <th className="label pb-2 pr-4 align-bottom font-medium">Tune</th>
              <th className="label pb-2 pr-4 align-bottom font-medium">
                On playlists
              </th>
              <th className="label pb-2 pr-4 align-bottom font-medium">File</th>
              <th className="label pb-2 pr-4 align-bottom font-medium">Added</th>
              <th className="label pb-2 align-bottom text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
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
    <tr className="rule-b align-middle max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)_auto] max-md:items-start max-md:gap-x-2 max-md:gap-y-1 max-md:py-3 md:table-row">
      <td className="py-2.5 pr-3 max-md:row-span-2 max-md:py-1">
        <label className="sr-only" htmlFor={`select-${tune.id}`}>
          Select tune
        </label>
        <input
          checked={isSelected}
          id={`select-${tune.id}`}
          onChange={onToggleSelect}
          type="checkbox"
        />
      </td>

      <td className="min-w-0 py-2.5 pr-4 md:min-w-64">
        <label className="sr-only" htmlFor={`title-${tune.id}`}>
          Title
        </label>
        <input
          className="field !border-transparent hover:!border-rule focus:!border-mood"
          disabled={isPending}
          id={`title-${tune.id}`}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </td>

      <td className="min-w-0 py-2.5 pr-4 text-sm max-md:col-start-2 max-md:py-0">
        {tune.playlists.length === 0 ? (
          <span className="text-ink-3">—</span>
        ) : (
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {tune.playlists.map((playlist) => (
              <Link
                className="text-ink-2 underline decoration-rule-strong hover:text-mood-ink hover:decoration-current"
                href={`/admin/playlists/${playlist.id}` as Route}
                key={playlist.id}
                title={`Open ${playlist.title}`}
              >
                {playlist.title}
              </Link>
            ))}
          </span>
        )}
      </td>

      <td className="figure hidden py-2.5 pr-4 text-xs text-ink-3 md:table-cell md:min-w-40">
        <span className="block">
          {formatDuration(tune.durationSeconds, { fallback: "—:—" })} ·{" "}
          {formatBytes(tune.fileSizeBytes)}
        </span>
        <span className="block truncate">{tune.mimeType}</span>
      </td>

      <td className="figure hidden py-2.5 pr-4 text-xs text-ink-3 md:table-cell md:min-w-36">
        {formatDate(tune.createdAt)}
      </td>

      <td className="py-2.5 max-md:col-start-3 max-md:row-span-2 max-md:row-start-1 max-md:py-1">
        <div className="flex items-center justify-end gap-0.5">
          <AddToPlaylistPopover
            disabled={isPending}
            initialSelectedIds={memberPlaylistIds}
            onApply={onApplyPlaylists}
            playlists={playlists}
            triggerLabel="Add to playlist"
          />
          <button
            aria-label={`Save ${tune.title}`}
            className="control control-icon"
            disabled={isPending || !isDirty || title.trim() === ""}
            onClick={() => void onSave(tune.id, title.trim())}
            title="Rename"
            type="button"
          >
            <Save aria-hidden="true" size={15} />
          </button>
          <button
            aria-label={`Delete ${tune.title}`}
            className="control control-icon control-danger"
            disabled={isPending || !tune.canDelete}
            onClick={() => void onDelete(tune)}
            title={
              tune.canDelete
                ? "Delete tune"
                : "This tune is on a playlist. Take it off first to delete it."
            }
            type="button"
          >
            <Trash2 aria-hidden="true" size={15} />
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

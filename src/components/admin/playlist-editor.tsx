"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type {
  SerializedAdminPlaylist,
  SerializedAdminPlaylistItem,
} from "@/lib/playlists/admin";
import {
  cumulativeStarts,
  formatDuration,
  formatTotalDuration,
  safeDuration,
} from "@/lib/format";
import { readError } from "@/lib/http/client";

type TuneOption = {
  id: string;
  title: string;
  durationSeconds: number;
};

type PlaylistEditorProps = {
  tunes: TuneOption[];
  items: SerializedAdminPlaylistItem[];
  playlist: SerializedAdminPlaylist;
};

type PlaylistDraft = {
  title: string;
  description: string;
};

type PlaylistItemsMutationResponse = {
  items: Array<{ id: string; position: number }>;
};

type PlaylistItemsState = {
  sourceItems: SerializedAdminPlaylistItem[];
  currentItems: SerializedAdminPlaylistItem[];
};

export function PlaylistEditor({
  tunes,
  items,
  playlist,
}: PlaylistEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlaylistDraft>(() => ({
    title: playlist.title,
    description: playlist.description ?? "",
  }));
  const [itemsState, setItemsState] = useState<PlaylistItemsState>(() => ({
    sourceItems: items,
    currentItems: items,
  }));
  const [selectedTuneId, setSelectedTuneId] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  let currentItems = itemsState.currentItems;

  if (itemsState.sourceItems !== items) {
    currentItems = items;
    setItemsState({ sourceItems: items, currentItems: items });
  }

  const availableTunes = useMemo(() => {
    const usedTuneIds = new Set(currentItems.map((item) => item.tune.id));

    return tunes.filter((tune) => !usedTuneIds.has(tune.id));
  }, [tunes, currentItems]);

  const runningTimeSeconds = currentItems.reduce(
    (total, item) => total + safeDuration(item.tune.durationSeconds),
    0,
  );

  async function savePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("playlist");
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlist.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setMessage("Playlist saved.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Playlist could not be saved.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function addTune(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTuneId) {
      setMessage("Select a tune to add.");
      return;
    }

    setPendingAction("add");
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlist.id)}/items`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tuneId: selectedTuneId }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const item = (await response.json()) as SerializedAdminPlaylistItem;
      updateCurrentItems((current) => [...current, item]);
      setSelectedTuneId("");
      setMessage("Tune added.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tune could not be added.");
    } finally {
      setPendingAction(null);
    }
  }

  async function moveItem(itemId: string, targetIndex: number) {
    setPendingAction(itemId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlist.id)}/items`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId, targetIndex }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const body = (await response.json()) as PlaylistItemsMutationResponse;
      updateCurrentItems((current) =>
        applyServerItemPositions(
          reorderItems(current, itemId, targetIndex),
          body.items,
        ),
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Item could not be moved.");
    } finally {
      setPendingAction(null);
    }
  }

  async function removeItem(itemId: string) {
    setPendingAction(itemId);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/playlists/${encodeURIComponent(playlist.id)}/items`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const body = (await response.json()) as PlaylistItemsMutationResponse;
      updateCurrentItems((current) =>
        applyServerItemPositions(
          current.filter((item) => item.id !== itemId),
          body.items,
        ),
      );
      setMessage("Item removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Item could not be removed.");
    } finally {
      setPendingAction(null);
    }
  }

  function updateCurrentItems(
    updater: (
      currentItems: SerializedAdminPlaylistItem[],
    ) => SerializedAdminPlaylistItem[],
  ) {
    setItemsState((state) => ({
      ...state,
      currentItems: updater(state.currentItems),
    }));
  }

  const starts = cumulativeStarts(
    currentItems.map((item) => item.tune.durationSeconds),
  );
  const rows = currentItems.map((item, index) => ({
    item,
    startsAt: starts[index],
  }));

  return (
    <div>
      <Link
        className="control -ml-2.5"
        href={"/admin/playlists" as Route}
      >
        <ArrowLeft aria-hidden="true" size={14} />
        All playlists
      </Link>

      <form className="mt-6" onSubmit={(event) => void savePlaylist(event)}>
        <p className="label">Details</p>
        <div className="mt-1 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className="sr-only" htmlFor="playlist-title">
              Title
            </label>
            <input
              className="field text-lg font-medium"
              disabled={pendingAction === "playlist"}
              id="playlist-title"
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              required
              value={draft.title}
            />
          </div>
          <button
            className="control control-solid mb-1 sm:col-start-2 sm:row-start-1"
            disabled={pendingAction === "playlist"}
            type="submit"
          >
            <Save aria-hidden="true" size={14} />
            Save
          </button>
          <div className="sm:col-span-2">
            <label className="sr-only" htmlFor="playlist-description">
              Description
            </label>
            <textarea
              className="field block min-h-[2.75rem] w-full resize-none leading-snug"
              disabled={pendingAction === "playlist"}
              id="playlist-description"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Description (optional)"
              rows={2}
              value={draft.description}
            />
          </div>
        </div>
      </form>

      {message ? (
        <p className="pt-4 text-sm text-ink-2" role="status">
          {message}
        </p>
      ) : null}

      <form className="mt-8" onSubmit={(event) => void addTune(event)}>
        <p className="label">Add a tune</p>
        <div className="mt-1 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className="sr-only" htmlFor="add-tune">
              Tune
            </label>
            <select
              className="field"
              disabled={pendingAction === "add" || availableTunes.length === 0}
              id="add-tune"
              onChange={(event) => setSelectedTuneId(event.target.value)}
              value={selectedTuneId}
            >
              <option value="">
                {availableTunes.length === 0
                  ? "Every tune is already on this playlist"
                  : "Select a tune"}
              </option>
              {availableTunes.map((tune) => (
                <option key={tune.id} value={tune.id}>
                  {tune.title} (
                  {formatDuration(tune.durationSeconds, { fallback: "—:—" })})
                </option>
              ))}
            </select>
          </div>
          <button
            className="control control-solid mb-1"
            disabled={pendingAction === "add" || availableTunes.length === 0}
            type="submit"
          >
            <Plus aria-hidden="true" size={14} />
            Add
          </button>
        </div>
      </form>

      <div className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Running order</h2>
          <p className="figure text-sm text-ink-3">
            {currentItems.length} tune{currentItems.length === 1 ? "" : "s"}
            {runningTimeSeconds > 0
              ? ` · ${formatTotalDuration(runningTimeSeconds)}`
              : ""}
          </p>
        </div>

        {currentItems.length === 0 ? (
          <div className="rule-t rule-b mt-4 py-14 text-center">
            <p className="text-lg font-medium text-ink">Nothing on this playlist</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
              Add a tune above. The order you build here is the order listeners
              hear, so it is worth arranging deliberately.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="rule-b">
                  <th className="label w-12 pb-2 pr-4 align-bottom font-medium">
                    Pos
                  </th>
                  <th className="label pb-2 pr-4 align-bottom font-medium">Tune</th>
                  <th className="label w-24 pb-2 pr-4 align-bottom text-right font-medium">
                    Starts
                  </th>
                  <th className="label w-24 pb-2 pr-4 align-bottom text-right font-medium">
                    Length
                  </th>
                  <th className="label pb-2 align-bottom text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, startsAt }, index) => {
                  const isPending = pendingAction === item.id;

                  return (
                    <tr className="rule-b align-middle" key={item.id}>
                      <td className="figure py-3 pr-4 text-xs text-ink-3">
                        {(index + 1).toString().padStart(2, "0")}
                      </td>
                      <td className="min-w-64 py-3 pr-4 text-base text-ink">
                        {item.tune.title}
                      </td>
                      <td className="figure py-3 pr-4 text-right text-xs text-ink-3">
                        {formatDuration(startsAt, { fallback: "0:00" })}
                      </td>
                      <td className="figure py-3 pr-4 text-right text-xs text-ink-2">
                        {formatDuration(item.tune.durationSeconds, {
                          fallback: "—:—",
                        })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            aria-label={`Move ${item.tune.title} up`}
                            className="control control-icon"
                            disabled={isPending || index === 0}
                            onClick={() => void moveItem(item.id, index - 1)}
                            title="Move up"
                            type="button"
                          >
                            <ArrowUp aria-hidden="true" size={15} />
                          </button>
                          <button
                            aria-label={`Move ${item.tune.title} down`}
                            className="control control-icon"
                            disabled={
                              isPending || index === currentItems.length - 1
                            }
                            onClick={() => void moveItem(item.id, index + 1)}
                            title="Move down"
                            type="button"
                          >
                            <ArrowDown aria-hidden="true" size={15} />
                          </button>
                          <button
                            aria-label={`Remove ${item.tune.title}`}
                            className="control control-icon control-danger"
                            disabled={isPending}
                            onClick={() => void removeItem(item.id)}
                            title="Take off this playlist"
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

function reorderItems(
  items: SerializedAdminPlaylistItem[],
  itemId: string,
  targetIndex: number,
): SerializedAdminPlaylistItem[] {
  const currentIndex = items.findIndex((item) => item.id === itemId);

  if (currentIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  const boundedTargetIndex = Math.min(Math.max(targetIndex, 0), nextItems.length);

  nextItems.splice(boundedTargetIndex, 0, movedItem);

  return nextItems.map((item, position) => ({ ...item, position }));
}

function applyServerItemPositions(
  items: SerializedAdminPlaylistItem[],
  positions: Array<{ id: string; position: number }>,
): SerializedAdminPlaylistItem[] {
  const positionById = new Map(
    positions.map((item) => [item.id, item.position] as const),
  );

  return items
    .filter((item) => positionById.has(item.id))
    .map((item) => ({
      ...item,
      position: positionById.get(item.id) ?? item.position,
    }))
    .sort((left, right) => left.position - right.position);
}

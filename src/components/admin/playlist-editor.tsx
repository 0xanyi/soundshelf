"use client";

import { ArrowDown, ArrowLeft, ArrowUp, ListMusic, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type {
  SerializedAdminPlaylist,
  SerializedAdminPlaylistItem,
} from "@/lib/playlists/admin";
import { formatDuration } from "@/lib/format";
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
      setMessage("Select a song to add.");
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
      setMessage("Song added.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Song could not be added.");
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

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted))] transition hover:text-foreground"
        href={"/admin/playlists" as Route}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Playlists
      </Link>

      <form
        className="panel-quiet p-5 sm:p-6"
        onSubmit={(event) => void savePlaylist(event)}
      >
        <p className="kicker">Details</p>
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
              disabled={pendingAction === "playlist"}
              id="playlist-title"
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              required
              value={draft.title}
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
              disabled={pendingAction === "playlist"}
              id="playlist-description"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={draft.description}
            />
          </div>
          <button
            className="btn-primary"
            disabled={pendingAction === "playlist"}
            type="submit"
          >
            <Save aria-hidden="true" size={16} />
            Save
          </button>
        </div>
      </form>

      {message ? (
        <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.7)] px-3 py-2 text-sm text-[hsl(var(--muted))]">
          {message}
        </p>
      ) : null}

      <form
        className="panel-quiet p-5 sm:p-6"
        onSubmit={(event) => void addTune(event)}
      >
        <p className="kicker">Add a song</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label
              className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]"
              htmlFor="add-tune"
            >
              Song
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
                  ? "No songs available"
                  : "Select a song"}
              </option>
              {availableTunes.map((tune) => (
                <option key={tune.id} value={tune.id}>
                  {tune.title} ({formatDuration(tune.durationSeconds, { fallback: "—:—" })})
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            disabled={pendingAction === "add" || availableTunes.length === 0}
            type="submit"
          >
            <Plus aria-hidden="true" size={16} />
            Add
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="display-heading text-xl font-semibold">Items</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              {currentItems.length} song{currentItems.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {currentItems.length === 0 ? (
          <div className="panel-quiet grid place-items-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))]">
              <ListMusic size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 className="display-heading text-lg font-semibold">
                No songs in this playlist
              </h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted))]">
                Add songs from the selector above.
              </p>
            </div>
          </div>
        ) : (
          <div className="panel-quiet overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[hsl(var(--border)/0.5)] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
                  <tr className="bg-[hsl(var(--surface-2)/0.4)]">
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-5 py-3 font-semibold">Song</th>
                    <th className="px-5 py-3 font-semibold">Duration</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.4)]">
                  {currentItems.map((item, index) => {
                    const isPending = pendingAction === item.id;

                    return (
                      <tr className="align-top" key={item.id}>
                        <td className="px-5 py-4 font-mono text-xs text-[hsl(var(--muted))]">
                          {(index + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="min-w-72 px-5 py-4">
                          <div className="font-medium">{item.tune.title}</div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-[hsl(var(--muted))]">
                          {formatDuration(item.tune.durationSeconds, { fallback: "—:—" })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              aria-label={`Move ${item.tune.title} up`}
                              className="btn-ghost-icon"
                              disabled={isPending || index === 0}
                              onClick={() => void moveItem(item.id, index - 1)}
                              title="Move up"
                              type="button"
                            >
                              <ArrowUp aria-hidden="true" size={16} />
                            </button>
                            <button
                              aria-label={`Move ${item.tune.title} down`}
                              className="btn-ghost-icon"
                              disabled={
                                isPending || index === currentItems.length - 1
                              }
                              onClick={() => void moveItem(item.id, index + 1)}
                              title="Move down"
                              type="button"
                            >
                              <ArrowDown aria-hidden="true" size={16} />
                            </button>
                            <button
                              aria-label={`Remove ${item.tune.title}`}
                              className="btn-danger-icon"
                              disabled={isPending}
                              onClick={() => void removeItem(item.id)}
                              title="Remove song"
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



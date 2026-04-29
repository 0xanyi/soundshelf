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

type ActiveTuneOption = {
  id: string;
  title: string;
  durationSeconds: number;
};

type PlaylistEditorProps = {
  activeTunes: ActiveTuneOption[];
  items: SerializedAdminPlaylistItem[];
  playlist: SerializedAdminPlaylist;
};

type PlaylistDraft = {
  title: string;
  description: string;
  status: "draft" | "published";
};

type PlaylistItemsMutationResponse = {
  items: Array<{ id: string; position: number }>;
};

type PlaylistItemsState = {
  sourceItems: SerializedAdminPlaylistItem[];
  currentItems: SerializedAdminPlaylistItem[];
};

export function PlaylistEditor({
  activeTunes,
  items,
  playlist,
}: PlaylistEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlaylistDraft>(() => ({
    title: playlist.title,
    description: playlist.description ?? "",
    status: playlist.status,
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

    return activeTunes.filter((tune) => !usedTuneIds.has(tune.id));
  }, [activeTunes, currentItems]);

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

  return (
    <div className="space-y-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground"
        href={"/admin/playlists" as Route}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Playlists
      </Link>

      <form
        className="rounded-lg border border-foreground/10 bg-white p-5 shadow-sm"
        onSubmit={(event) => void savePlaylist(event)}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div>
            <label className="text-sm font-medium" htmlFor="playlist-title">
              Title
            </label>
            <input
              className="mt-1 w-full rounded-md border border-foreground/15 px-3 py-2"
              disabled={pendingAction === "playlist"}
              id="playlist-title"
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              required
              value={draft.title}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="playlist-description">
              Description
            </label>
            <input
              className="mt-1 w-full rounded-md border border-foreground/15 px-3 py-2"
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
          <div>
            <label className="text-sm font-medium" htmlFor="playlist-status">
              Status
            </label>
            <select
              className="mt-1 w-full rounded-md border border-foreground/15 bg-white px-3 py-2"
              disabled={pendingAction === "playlist"}
              id="playlist-status"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as PlaylistDraft["status"],
                }))
              }
              value={draft.status}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-white transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pendingAction === "playlist"}
            type="submit"
          >
            <Save aria-hidden="true" size={16} />
            Save
          </button>
        </div>
      </form>

      {message ? (
        <p className="rounded-md border border-foreground/10 bg-white px-3 py-2 text-sm text-muted">
          {message}
        </p>
      ) : null}

      <form
        className="rounded-lg border border-foreground/10 bg-white p-5 shadow-sm"
        onSubmit={(event) => void addTune(event)}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="text-sm font-medium" htmlFor="add-tune">
              Add active tune
            </label>
            <select
              className="mt-1 w-full rounded-md border border-foreground/15 bg-white px-3 py-2"
              disabled={pendingAction === "add" || availableTunes.length === 0}
              id="add-tune"
              onChange={(event) => setSelectedTuneId(event.target.value)}
              value={selectedTuneId}
            >
              <option value="">
                {availableTunes.length === 0
                  ? "No active tunes available"
                  : "Select a tune"}
              </option>
              {availableTunes.map((tune) => (
                <option key={tune.id} value={tune.id}>
                  {tune.title} ({formatDuration(tune.durationSeconds)})
                </option>
              ))}
            </select>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-white transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pendingAction === "add" || availableTunes.length === 0}
            type="submit"
          >
            <Plus aria-hidden="true" size={16} />
            Add
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Items</h3>
          <p className="mt-1 text-sm text-muted">
            {currentItems.length} tune{currentItems.length === 1 ? "" : "s"}
          </p>
        </div>

        {currentItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-foreground/20 bg-white p-8 text-center">
            <h3 className="text-base font-semibold">No tunes in this playlist</h3>
            <p className="mt-2 text-sm text-muted">
              Add active tunes from the selector above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-foreground/10 text-left text-sm">
              <thead className="bg-foreground/[0.03] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Tune</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {currentItems.map((item, index) => {
                  const isPending = pendingAction === item.id;

                  return (
                    <tr className="align-top" key={item.id}>
                      <td className="px-4 py-4 text-muted">{index + 1}</td>
                      <td className="min-w-72 px-4 py-4">
                        <div className="font-medium">{item.tune.title}</div>
                        {item.tune.description ? (
                          <div className="mt-1 max-w-md text-muted">
                            {item.tune.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {formatDuration(item.tune.durationSeconds)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            aria-label={`Move ${item.tune.title} up`}
                            className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-foreground transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isPending || index === 0}
                            onClick={() => void moveItem(item.id, index - 1)}
                            title="Move up"
                            type="button"
                          >
                            <ArrowUp aria-hidden="true" size={16} />
                          </button>
                          <button
                            aria-label={`Move ${item.tune.title} down`}
                            className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-foreground transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isPending || index === currentItems.length - 1}
                            onClick={() => void moveItem(item.id, index + 1)}
                            title="Move down"
                            type="button"
                          >
                            <ArrowDown aria-hidden="true" size={16} />
                          </button>
                          <button
                            aria-label={`Remove ${item.tune.title}`}
                            className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isPending}
                            onClick={() => void removeItem(item.id)}
                            title="Remove tune"
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

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return "Duration unavailable";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

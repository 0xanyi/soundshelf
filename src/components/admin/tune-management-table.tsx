"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedAdminTune } from "@/lib/tunes/admin";

type TuneManagementTableProps = {
  tunes: SerializedAdminTune[];
};

type TuneDraft = {
  title: string;
  description: string;
  status: "draft" | "active";
};

export function TuneManagementTable({ tunes }: TuneManagementTableProps) {
  const router = useRouter();
  const [pendingTuneId, setPendingTuneId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (tunes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-foreground/20 bg-white p-8 text-center">
        <h3 className="text-base font-semibold">No tunes uploaded</h3>
        <p className="mt-2 text-sm text-muted">
          Uploaded files will appear here as draft tunes.
        </p>
      </div>
    );
  }

  async function saveTune(tuneId: string, draft: TuneDraft) {
    setPendingTuneId(tuneId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/tunes/${encodeURIComponent(tuneId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
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
      setMessage("Tune is used in a playlist and cannot be deleted.");
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

      setMessage("Tune deleted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tune could not be deleted.");
    } finally {
      setPendingTuneId(null);
    }
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p className="rounded-md border border-foreground/10 bg-white px-3 py-2 text-sm text-muted">
          {message}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-foreground/10 text-left text-sm">
          <thead className="bg-foreground/[0.03] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Tune</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">File</th>
              <th className="px-4 py-3 font-semibold">Usage</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {tunes.map((tune) => {
              const isPending = pendingTuneId === tune.id;

              return (
                <TuneTableRow
                  isPending={isPending}
                  key={`${tune.id}:${tune.updatedAt}`}
                  onDelete={deleteTune}
                  onSave={saveTune}
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
  onDelete,
  onSave,
  tune,
}: {
  isPending: boolean;
  onDelete: (tune: SerializedAdminTune) => Promise<void>;
  onSave: (tuneId: string, draft: TuneDraft) => Promise<void>;
  tune: SerializedAdminTune;
}) {
  const [draft, setDraft] = useState<TuneDraft>(() => createDraft(tune));

  return (
    <tr className="align-top">
      <td className="min-w-72 px-4 py-4">
        <label className="sr-only" htmlFor={`title-${tune.id}`}>
          Title
        </label>
        <input
          className="w-full rounded-md border border-foreground/15 px-3 py-2 font-medium"
          disabled={isPending}
          id={`title-${tune.id}`}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          value={draft.title}
        />
        <label className="sr-only" htmlFor={`description-${tune.id}`}>
          Description
        </label>
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-md border border-foreground/15 px-3 py-2 text-muted"
          disabled={isPending}
          id={`description-${tune.id}`}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="Description"
          value={draft.description}
        />
      </td>
      <td className="px-4 py-4">
        <label className="sr-only" htmlFor={`status-${tune.id}`}>
          Status
        </label>
        <select
          className="rounded-md border border-foreground/15 bg-white px-3 py-2"
          disabled={isPending}
          id={`status-${tune.id}`}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              status: event.target.value as TuneDraft["status"],
            }))
          }
          value={draft.status}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </td>
      <td className="min-w-44 px-4 py-4 text-muted">
        <div>{tune.mimeType}</div>
        <div>{formatBytes(tune.fileSizeBytes)}</div>
        <div>{formatDuration(tune.durationSeconds)}</div>
      </td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-medium">
          {tune.playlistItemCount}
        </span>
      </td>
      <td className="min-w-36 px-4 py-4 text-muted">
        {formatDate(tune.createdAt)}
      </td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <button
            aria-label={`Save ${tune.title}`}
            className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-foreground transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={() => void onSave(tune.id, draft)}
            title="Save tune"
            type="button"
          >
            <Save aria-hidden="true" size={16} />
          </button>
          <button
            aria-label={`Delete ${tune.title}`}
            className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/15 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending || !tune.canDelete}
            onClick={() => void onDelete(tune)}
            title={tune.canDelete ? "Delete tune" : "Tune is used in a playlist"}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function createDraft(tune: SerializedAdminTune): TuneDraft {
  return {
    title: tune.title,
    description: tune.description ?? "",
    status: tune.status,
  };
}

function formatBytes(value: string): string {
  const bytes = Number(value);

  if (!Number.isFinite(bytes)) {
    return `${value} bytes`;
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(bytes);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

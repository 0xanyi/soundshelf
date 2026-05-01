"use client";

import { Music2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerializedAdminTune } from "@/lib/tunes/admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";

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
      <div className="panel-quiet grid place-items-center gap-3 p-10 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.7)] text-[hsl(var(--accent))]">
          <Music2 size={20} aria-hidden="true" />
        </span>
        <div>
          <h3 className="display-heading text-lg font-semibold">
            No tunes uploaded yet
          </h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted))]">
            Uploaded files will appear here as draft tunes.
          </p>
        </div>
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

  return (
    <div className="space-y-3">
      {message ? (
        <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.7)] px-3 py-2 text-sm text-[hsl(var(--muted))]">
          {message}
        </p>
      ) : null}
      <div className="panel-quiet overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[hsl(var(--border)/0.5)] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted))]">
              <tr className="bg-[hsl(var(--surface-2)/0.4)]">
                <th className="px-5 py-3 font-semibold">Tune</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">File</th>
                <th className="px-5 py-3 font-semibold">Usage</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border)/0.4)]">
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
      <td className="min-w-72 px-5 py-4">
        <label className="sr-only" htmlFor={`title-${tune.id}`}>
          Title
        </label>
        <input
          className="field font-medium"
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
          className="field mt-2 min-h-20 resize-y"
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
      <td className="px-5 py-4">
        <label className="sr-only" htmlFor={`status-${tune.id}`}>
          Status
        </label>
        <select
          className="field"
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
        <StatusBadge
          className="mt-2"
          tone={draft.status === "active" ? "active" : "muted"}
          label={draft.status === "active" ? "Active" : "Draft"}
        />
      </td>
      <td className="min-w-44 px-5 py-4 text-[hsl(var(--muted))]">
        <div className="font-mono text-xs">{tune.mimeType}</div>
        <div className="text-xs">{formatBytes(tune.fileSizeBytes)}</div>
        <div className="font-mono text-xs">
          {formatDuration(tune.durationSeconds, { fallback: "—:—" })}
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="pill">
          {tune.playlistItemCount} use{tune.playlistItemCount === 1 ? "" : "s"}
        </span>
      </td>
      <td className="min-w-36 px-5 py-4 text-xs text-[hsl(var(--muted))]">
        {formatDate(tune.createdAt)}
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-2">
          <button
            aria-label={`Save ${tune.title}`}
            className="btn-ghost-icon"
            disabled={isPending}
            onClick={() => void onSave(tune.id, draft)}
            title="Save tune"
            type="button"
          >
            <Save aria-hidden="true" size={16} />
          </button>
          <button
            aria-label={`Delete ${tune.title}`}
            className="btn-danger-icon"
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

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

async function readWarning(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { warning?: string };

    return body.warning ?? null;
  } catch {
    return null;
  }
}

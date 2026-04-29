import type { TuneStatus } from "@prisma/client";

export type AdminTuneRecord = {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  mimeType: string;
  fileSizeBytes: bigint;
  r2ObjectKey: string;
  status: TuneStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    playlistItems: number;
  };
};

export type SerializedAdminTune = {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  mimeType: string;
  fileSizeBytes: string;
  r2ObjectKey: string;
  status: TuneStatus;
  createdAt: string;
  updatedAt: string;
  playlistItemCount: number;
  canDelete: boolean;
};

type TuneUpdateData = {
  title: string;
  description: string | null;
  status: TuneStatus;
};

type TuneUpdateResult =
  | { valid: true; data: TuneUpdateData }
  | { valid: false; message: string };

const tuneStatuses = new Set<string>(["draft", "active"]);

export function parseTuneUpdatePayload(payload: unknown): TuneUpdateResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "JSON body is required." };
  }

  const input = payload as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!title) {
    return { valid: false, message: "Title is required." };
  }

  if (typeof input.status !== "string" || !tuneStatuses.has(input.status)) {
    return { valid: false, message: "Status must be draft or active." };
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";

  return {
    valid: true,
    data: {
      title,
      description: description || null,
      status: input.status as TuneStatus,
    },
  };
}

export function serializeAdminTune(tune: AdminTuneRecord): SerializedAdminTune {
  const playlistItemCount = tune._count.playlistItems;

  return {
    id: tune.id,
    title: tune.title,
    description: tune.description,
    durationSeconds: tune.durationSeconds,
    mimeType: tune.mimeType,
    fileSizeBytes: tune.fileSizeBytes.toString(),
    r2ObjectKey: tune.r2ObjectKey,
    status: tune.status,
    createdAt: tune.createdAt.toISOString(),
    updatedAt: tune.updatedAt.toISOString(),
    playlistItemCount,
    canDelete: playlistItemCount === 0,
  };
}

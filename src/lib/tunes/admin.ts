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

export type TuneDeleteErrorResponse = {
  status: 404 | 409;
  message: string;
};

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

export function getTuneDeletePrismaErrorResponse(
  error: unknown,
): TuneDeleteErrorResponse | null {
  if (!isPrismaKnownRequestErrorShape(error)) {
    return null;
  }

  if (error.code === "P2003") {
    return {
      status: 409,
      message: "Tune is used in a playlist and cannot be deleted.",
    };
  }

  if (error.code === "P2025") {
    return {
      status: 404,
      message: "Tune not found.",
    };
  }

  return null;
}

function isPrismaKnownRequestErrorShape(
  error: unknown,
): error is { code: string; clientVersion: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "clientVersion" in error &&
    typeof error.clientVersion === "string"
  );
}

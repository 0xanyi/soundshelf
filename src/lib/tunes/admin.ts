export type AdminTuneRecord = {
  id: string;
  title: string;
  durationSeconds: number;
  mimeType: string;
  fileSizeBytes: bigint;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    playlistItems: number;
  };
  playlistItems?: Array<{
    playlist: {
      id: string;
      title: string;
    };
  }>;
};

export type AdminTunePlaylistMembership = {
  id: string;
  title: string;
};

export type SerializedAdminTune = {
  id: string;
  title: string;
  durationSeconds: number;
  mimeType: string;
  fileSizeBytes: string;
  createdAt: string;
  updatedAt: string;
  playlistItemCount: number;
  canDelete: boolean;
  playlists: AdminTunePlaylistMembership[];
};

type TuneUpdateData = {
  title: string;
};

type TuneUpdateResult =
  | { valid: true; data: TuneUpdateData }
  | { valid: false; message: string };

export type TuneDeleteErrorResponse = {
  status: 404 | 409;
  message: string;
};

export type TuneDeleteStorageCleanupWarning = {
  warning: string;
};

export function parseTuneUpdatePayload(payload: unknown): TuneUpdateResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "JSON body is required." };
  }

  const input = payload as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!title) {
    return { valid: false, message: "Title is required." };
  }

  return {
    valid: true,
    data: { title },
  };
}

export function serializeAdminTune(tune: AdminTuneRecord): SerializedAdminTune {
  const playlistItemCount = tune._count.playlistItems;
  const playlists =
    tune.playlistItems?.map((item) => ({
      id: item.playlist.id,
      title: item.playlist.title,
    })) ?? [];

  return {
    id: tune.id,
    title: tune.title,
    durationSeconds: tune.durationSeconds,
    mimeType: tune.mimeType,
    fileSizeBytes: tune.fileSizeBytes.toString(),
    createdAt: tune.createdAt.toISOString(),
    updatedAt: tune.updatedAt.toISOString(),
    playlistItemCount,
    canDelete: playlistItemCount === 0,
    playlists,
  };
}

type TunePlaylistsSyncResult =
  | { valid: true; data: { playlistIds: string[] } }
  | { valid: false; message: string };

export function parseTunePlaylistsSyncPayload(
  payload: unknown,
): TunePlaylistsSyncResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "JSON body is required." };
  }

  const input = payload as Record<string, unknown>;
  const ids = input.playlistIds;

  if (!Array.isArray(ids)) {
    return { valid: false, message: "playlistIds must be an array." };
  }

  const playlistIds: string[] = [];

  for (const value of ids) {
    if (typeof value !== "string" || value.trim() === "") {
      return { valid: false, message: "playlistIds must be non-empty strings." };
    }

    playlistIds.push(value.trim());
  }

  return {
    valid: true,
    data: { playlistIds: Array.from(new Set(playlistIds)) },
  };
}

type BulkAddTunesPayloadResult =
  | {
      valid: true;
      data: { tuneIds: string[]; playlistIds: string[] };
    }
  | { valid: false; message: string };

/**
 * Parses the body for the bulk add-to-playlist endpoint.
 *
 * The route is intentionally additive only: there is no "set" mode that would
 * wipe existing playlist memberships. Removing memberships is done one tune at
 * a time through the per-tune sync endpoint, where the impact is visible.
 */
export function parseBulkAddTunesPayload(
  payload: unknown,
): BulkAddTunesPayloadResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "JSON body is required." };
  }

  const input = payload as Record<string, unknown>;
  const tuneIds = parseStringArray(input.tuneIds, "tuneIds");
  if (!tuneIds.valid) return tuneIds;

  const playlistIds = parseStringArray(input.playlistIds, "playlistIds");
  if (!playlistIds.valid) return playlistIds;

  return {
    valid: true,
    data: {
      tuneIds: Array.from(new Set(tuneIds.values)),
      playlistIds: Array.from(new Set(playlistIds.values)),
    },
  };
}

type StringArrayResult =
  | { valid: true; values: string[] }
  | { valid: false; message: string };

export function parseStringArray(value: unknown, name: string): StringArrayResult {
  if (!Array.isArray(value)) {
    return { valid: false, message: `${name} must be an array.` };
  }

  const values: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim() === "") {
      return { valid: false, message: `${name} must be non-empty strings.` };
    }

    values.push(entry.trim());
  }

  return { valid: true, values };
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

export function getTuneDeleteStorageCleanupWarning(): TuneDeleteStorageCleanupWarning {
  return {
    warning:
      "Tune deleted, but the audio file could not be removed from storage. Please retry cleanup or check R2 configuration.",
  };
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

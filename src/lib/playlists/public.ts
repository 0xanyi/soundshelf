import type { TuneStatus } from "@prisma/client";

export type PublicPlaylistSummaryRecord = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  items: Array<{
    tune: {
      status: TuneStatus;
    };
  }>;
};

export type PublicPlaylistDetailRecord = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  items: Array<{
    id: string;
    position: number;
    createdAt: Date;
    tune: {
      id: string;
      title: string;
      description: string | null;
      durationSeconds: number;
      status: TuneStatus;
      r2ObjectKey: string;
    };
  }>;
};

export type SerializedPublicPlaylistSummary = {
  id: string;
  title: string;
  description: string | null;
  itemCount: number;
};

export type SerializedPublicTrack = {
  id: string;
  playlistItemId: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  audioUrl: string;
};

export type SerializedPublicPlaylistDetail = {
  id: string;
  title: string;
  description: string | null;
  tracks: SerializedPublicTrack[];
};

type SignAudioUrl = (key: string) => Promise<string>;

export function serializePublicPlaylistSummary(
  playlist: PublicPlaylistSummaryRecord,
): SerializedPublicPlaylistSummary {
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    itemCount: playlist.items.filter((item) => item.tune.status === "active").length,
  };
}

export async function serializePublicPlaylistDetail(
  playlist: PublicPlaylistDetailRecord,
  signAudioUrl: SignAudioUrl,
): Promise<SerializedPublicPlaylistDetail | null> {
  const tracks: SerializedPublicTrack[] = [];

  for (const item of [...playlist.items].sort(comparePlaylistItems)) {
    if (item.tune.status !== "active") {
      continue;
    }

    try {
      tracks.push({
        id: item.tune.id,
        playlistItemId: item.id,
        title: item.tune.title,
        description: item.tune.description,
        durationSeconds: item.tune.durationSeconds,
        audioUrl: await signAudioUrl(item.tune.r2ObjectKey),
      });
    } catch {
      // Keep public responses safe when a signed URL cannot be created.
    }
  }

  if (tracks.length === 0) {
    return null;
  }

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    tracks,
  };
}

function comparePlaylistItems(
  first: PublicPlaylistDetailRecord["items"][number],
  second: PublicPlaylistDetailRecord["items"][number],
): number {
  if (first.position !== second.position) {
    return first.position - second.position;
  }

  return first.createdAt.getTime() - second.createdAt.getTime();
}

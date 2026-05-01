import type { TuneStatus } from "@prisma/client";

export type PublicPlaylistSummaryRecord = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  items: Array<{
    tune: {
      durationSeconds: number;
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
  durationSeconds: number;
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
  itemCount: number;
  durationSeconds: number;
  tracks: SerializedPublicTrack[];
};

type SignAudioUrl = (key: string) => Promise<string>;

export function serializePublicPlaylistSummary(
  playlist: PublicPlaylistSummaryRecord,
): SerializedPublicPlaylistSummary {
  const activeItems = playlist.items.filter((item) => item.tune.status === "active");

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    itemCount: activeItems.length,
    durationSeconds: activeItems.reduce(
      (total, item) => total + Math.max(item.tune.durationSeconds, 0),
      0,
    ),
  };
}

export async function serializePublicPlaylistDetail(
  playlist: PublicPlaylistDetailRecord,
  signAudioUrl: SignAudioUrl,
): Promise<SerializedPublicPlaylistDetail | null> {
  const orderedActiveItems = [...playlist.items]
    .sort(comparePlaylistItems)
    .filter((item) => item.tune.status === "active");

  const signedResults = await Promise.allSettled(
    orderedActiveItems.map((item) => signAudioUrl(item.tune.r2ObjectKey)),
  );

  const tracks: SerializedPublicTrack[] = [];

  orderedActiveItems.forEach((item, index) => {
    const result = signedResults[index];

    if (!result || result.status !== "fulfilled") {
      // Keep public responses safe when a signed URL cannot be created.
      return;
    }

    tracks.push({
      id: item.tune.id,
      playlistItemId: item.id,
      title: item.tune.title,
      description: item.tune.description,
      durationSeconds: item.tune.durationSeconds,
      audioUrl: result.value,
    });
  });

  if (tracks.length === 0) {
    return null;
  }

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    itemCount: tracks.length,
    durationSeconds: tracks.reduce(
      (total, track) => total + Math.max(track.durationSeconds, 0),
      0,
    ),
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

import { safeDuration } from "@/lib/format";

export type PublicPlaylistSummaryRecord = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  items: Array<{
    tune: {
      durationSeconds: number;
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
      durationSeconds: number;
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
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    itemCount: playlist.items.length,
    durationSeconds: playlist.items.reduce(
      (total, item) => total + safeDuration(item.tune.durationSeconds),
      0,
    ),
  };
}

export async function serializePublicPlaylistDetail(
  playlist: PublicPlaylistDetailRecord,
  signAudioUrl: SignAudioUrl,
): Promise<SerializedPublicPlaylistDetail | null> {
  const orderedItems = [...playlist.items].sort(comparePlaylistItems);

  const signedResults = await Promise.allSettled(
    orderedItems.map((item) => signAudioUrl(item.tune.r2ObjectKey)),
  );

  const tracks: SerializedPublicTrack[] = [];

  orderedItems.forEach((item, index) => {
    const result = signedResults[index];

    if (!result || result.status !== "fulfilled") {
      // Keep public responses safe when a signed URL cannot be created.
      return;
    }

    tracks.push({
      id: item.tune.id,
      playlistItemId: item.id,
      title: item.tune.title,
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
      (total, track) => total + safeDuration(track.durationSeconds),
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

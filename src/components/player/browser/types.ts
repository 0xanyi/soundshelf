import type { PlayerTrack } from "@/components/player/audio-player";

export type PublicPlaylistSummary = {
  id: string;
  title: string;
  description: string | null;
  itemCount: number;
};

export type PublicPlaylistDetail = PublicPlaylistSummary & {
  tracks: PlayerTrack[];
};

export type LoadState = "idle" | "loading" | "error";

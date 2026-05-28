import { PlaylistBrowser } from "@/components/player/playlist-browser";

type HomeProps = {
  searchParams?: Promise<{
    playlist?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const playlist = params?.playlist;
  const initialPlaylistId = Array.isArray(playlist) ? playlist[0] : playlist;

  return <PlaylistBrowser initialPlaylistId={initialPlaylistId ?? null} />;
}

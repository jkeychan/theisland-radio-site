import type { Playlist } from "@/types/content";
import { playlists } from "@/data/playlists";

const sorted: Playlist[] = [...playlists].sort((a, b) => (a.id < b.id ? 1 : -1));

export function usePlaylists(): { data: Playlist[] } {
  return { data: sorted };
}

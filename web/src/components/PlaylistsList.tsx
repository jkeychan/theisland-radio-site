"use client";

import { usePlaylists } from "@/hooks/usePlaylists";
import { PlaylistCard } from "@/components/PlaylistCard";
import type { Playlist } from "@/types/content";

type PlaylistsListProps = {
  showAll?: boolean;
  excludeCurrent?: boolean;
  limit?: number;
};

export function PlaylistsList({ showAll = false, excludeCurrent = false, limit }: PlaylistsListProps) {
  const { data } = usePlaylists();

  const unique = Array.from(new Map(data.map(p => [p.id, p])).values());
  let playlistsToRender: Playlist[] = [...unique].sort((a, b) => (a.id < b.id ? 1 : -1));

  if (excludeCurrent && playlistsToRender.length > 0) {
    playlistsToRender = playlistsToRender.slice(1);
  }

  if (limit && limit > 0) {
    playlistsToRender = playlistsToRender.slice(0, limit);
  }

  if (!showAll && !limit) {
    playlistsToRender = playlistsToRender.slice(0, 1);
  }

  if (playlistsToRender.length === 0) return null;

  return (
    <div>
      {playlistsToRender.map((p) => (
        <PlaylistCard key={p.id} playlist={p} />
      ))}
    </div>
  );
}

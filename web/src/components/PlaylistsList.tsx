"use client";

import { usePlaylists } from "@/hooks/usePlaylists";
import type { Playlist } from "@/types/content";

type PlaylistsListProps = {
  showAll?: boolean;
};

export function PlaylistsList({ showAll = false }: PlaylistsListProps) {
  const { data } = usePlaylists();

  const playlistsToRender: Playlist[] = showAll
    ? [...data].sort((a, b) => (a.id < b.id ? 1 : -1))
    : [...data].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, 1);

  if (playlistsToRender.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4">
      {playlistsToRender.map((p) => (
        <article key={p.id} className="card card-dark p-4">
          <h2 className="text-xl font-medium">{p.title}</h2>
          {p.description ? (
            <p className="text-sm text-theme-gold">{p.description}</p>
          ) : null}
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-white">
            {p.tracks.map((t, i) => (
              <li key={i}>
                <span className="font-medium text-white">{t.artist}</span> — <span className="text-white">{t.title}</span>
                {t.album ? <span className="text-theme-gold"> ({t.album})</span> : null}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}




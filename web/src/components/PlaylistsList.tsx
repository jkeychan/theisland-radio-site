"use client";

import { usePlaylists } from "@/hooks/usePlaylists";
import type { Playlist } from "@/types/content";

type PlaylistsListProps = {
  showAll?: boolean;
  excludeCurrent?: boolean;
  limit?: number;
};

export function PlaylistsList({ showAll = false, excludeCurrent = false, limit }: PlaylistsListProps) {
  const { data } = usePlaylists();

  let playlistsToRender: Playlist[] = [...data].sort((a, b) => (a.id < b.id ? 1 : -1));
  
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
    <div className="grid grid-cols-1 gap-8 sm:gap-10">
      {playlistsToRender.map((p) => (
        <article key={p.id} className="card">
          <div className="mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-white font-[family-name:var(--font-reggae-one)]">{p.title}</h2>
            {p.description ? (
              <p className="text-2xl sm:text-3xl lg:text-4xl text-white/80 font-[family-name:var(--font-island-moments)]">{p.description}</p>
            ) : null}
          </div>
          <ol className="list-inside list-decimal space-y-3 sm:space-y-4 text-base sm:text-lg text-white/90">
            {p.tracks.map((t, i) => (
              <li key={i} className="leading-relaxed">
                <span className="font-bold text-white">{t.artist}</span>
                {t.artist && t.title ? (
                  <span className="text-white/70"> — </span>
                ) : null}
                <span className="text-white/90">{t.title}</span>
                {t.album ? (
                  <span className="text-theme-gold font-medium"> ({t.album})</span>
                ) : null}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}




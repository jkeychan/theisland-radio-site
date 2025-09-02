"use client";

import { usePlaylists } from "@/hooks/usePlaylists";

export function PlaylistsList() {
  const { data } = usePlaylists();
  // Ensure we show ONLY the most recent playlist in a single card
  const latest = [...data].sort((a, b) => (a.id < b.id ? 1 : -1))[0];
  if (!latest) return null;
  return (
    <div className="grid grid-cols-1 gap-4">
      <article className="card card-accent p-4">
        <h2 className="text-xl font-medium">{latest.id} — {latest.title}</h2>
        {latest.description ? (
          <p className="text-sm text-theme-gold">{latest.description}</p>
        ) : null}
        <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
          {latest.tracks.map((t, i) => (
            <li key={i}>
              <span className="font-medium">{t.artist}</span> — {t.title}
              {t.album ? <span className="text-theme-gold"> ({t.album})</span> : null}
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}




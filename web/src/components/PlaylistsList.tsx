"use client";

import { usePlaylists } from "@/hooks/usePlaylists";

export function PlaylistsList() {
  const { data } = usePlaylists();
  return (
    <div className="grid grid-cols-1 gap-4">
      {data.map((p) => (
        <article key={p.id} className="card card-accent p-4">
          <h2 className="text-xl font-medium">{p.id} — {p.title}</h2>
          {p.description ? (
            <p className="text-sm text-theme-gold">{p.description}</p>
          ) : null}
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
            {p.tracks.map((t, i) => (
              <li key={i}>
                <span className="font-medium">{t.artist}</span> — {t.title}
                {t.album ? <span className="text-theme-gold"> ({t.album})</span> : null}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}




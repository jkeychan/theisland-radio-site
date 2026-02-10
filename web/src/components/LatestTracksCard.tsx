"use client";

import { useTracks } from "@/hooks/useTracks";

type LatestTracksCardProps = {
  title?: string;
};

export const LatestTracksCard = ({ title = "This Week’s Tracks" }: LatestTracksCardProps) => {
  const { data, loading } = useTracks();
  if (!process.env.NEXT_PUBLIC_TRACKS_CSV_URL) return null;

  return (
    <section aria-labelledby="latest-playlist-title">
      <article className="card card-accent card-dark p-4">
        <h2 id="latest-playlist-title" className="text-xl font-medium text-white font-[family-name:var(--font-reggae-one)]">{title}</h2>
        {loading ? (
          <p className="mt-3 text-theme-gold">Loading…</p>
        ) : (
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-white/90">
            {data.map((t, i) => (
              <li key={`${t.artist}-${t.title}-${i}`}>
                <span className="font-medium text-white">{t.artist}</span>{t.artist && t.title ? " — " : ""}{t.title}
                {t.album ? <span className="text-theme-gold"> ({t.album})</span> : null}
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  );
};



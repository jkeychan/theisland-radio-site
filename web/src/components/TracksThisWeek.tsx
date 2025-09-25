"use client";

import { useTracks } from "@/hooks/useTracks";

export const TracksThisWeek = () => {
  const { data, loading } = useTracks();
  if (!process.env.NEXT_PUBLIC_TRACKS_CSV_URL) return null;
  return (
    <section aria-labelledby="tracks-title" className="mt-8">
      <h2 id="tracks-title" className="text-2xl font-semibold section-heading section-heading-light">This Week&apos;s Tracks</h2>
      {loading ? (
        <p className="mt-3 text-theme-gold">Loading…</p>
      ) : (
        <article className="card card-dark p-4 mt-4">
          <ol className="list-inside list-decimal space-y-1 text-sm text-white">
            {data.map((t, i) => (
              <li key={`${t.artist}-${t.title}-${i}`}>
                <span className="font-medium text-white">{t.artist}</span>{t.artist && t.title ? " — " : ""}{t.title}
                {t.album ? <span className="text-theme-gold"> ({t.album})</span> : null}
              </li>
            ))}
          </ol>
        </article>
      )}
    </section>
  );
};



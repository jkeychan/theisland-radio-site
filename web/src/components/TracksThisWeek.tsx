"use client";

import { useTracks } from "@/hooks/useTracks";
import { TracksPlaceholder } from "@/components/TracksPlaceholder";

export const TracksThisWeek = () => {
  const { data, loading } = useTracks();
  if (!process.env.NEXT_PUBLIC_TRACKS_CSV_URL) return null;
  const tracks = data ?? [];
  return (
    <section aria-labelledby="tracks-title" className="space-y-8">
      <div className="text-center space-y-3">
        <h2 id="tracks-title" className="text-4xl sm:text-5xl lg:text-6xl font-bold section-heading section-heading-light">
          This Week&apos;s Tracks
        </h2>
        <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white/95 font-[family-name:var(--font-island-moments)]">
          The latest sounds from DJ Dub Tractor
        </p>
      </div>
      {loading ? (
        <div className="card p-12 text-center">
          <p className="text-theme-gold text-xl">Loading tracks…</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="card p-12 text-center">
          <TracksPlaceholder />
        </div>
      ) : (
        <article className="card-playlist relative overflow-hidden">
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent via-island-gold/10 to-transparent rounded-bl-full opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-transparent via-island-green/10 to-transparent rounded-tr-full opacity-50"></div>
          
          <ol className="list-inside list-decimal space-y-4 text-base sm:text-lg text-white relative z-10">
            {tracks.map((t, i) => (
              <li 
                key={`${t.artist}-${t.title}-${i}`}
                className="leading-relaxed hover:text-white/80 transition-colors"
              >
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
      )}
    </section>
  );
};



import { PlaylistsList } from "@/components/PlaylistsList";

export const metadata = {
  title: "Playlists • The Island",
};

export default function PlaylistsPage() {
  return (
    <div className="space-y-12 py-12 sm:py-16 relative z-10">
      <header className="space-y-4 text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold section-heading section-heading-light">
          Playlists
        </h1>
        <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white/90 font-[family-name:var(--font-island-moments)]">
          Archive of past shows organized by date.
        </p>
      </header>

      <PlaylistsList showAll={false} />

      <div className="pt-6 text-center">
        <a 
          className="inline-flex items-center gap-2 text-lg sm:text-xl font-medium underline underline-offset-4 text-white hover:text-theme-gold transition-colors font-[family-name:var(--font-reggae-one)]" 
          href="/playlists/archive/"
        >
          View previous playlists
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}



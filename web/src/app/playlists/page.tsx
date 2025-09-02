import { PlaylistsList } from "@/components/PlaylistsList";

export const metadata = {
  title: "Playlists • The Island",
};

export default function PlaylistsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Playlists</h1>
        <p className="text-theme-gold">Archive of past shows organized by date.</p>
      </header>

      <PlaylistsList />

      <div>
        <a className="inline-block underline underline-offset-4 text-[--rasta-gold]" href="/playlists/archive/">View previous playlists →</a>
      </div>
    </div>
  );
}



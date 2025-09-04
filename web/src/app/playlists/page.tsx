import { LatestTracksCard } from "@/components/LatestTracksCard";

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

      {/* Use the same Google Sheet source as the homepage */}
      <LatestTracksCard />

      <div>
        <a className="inline-block underline underline-offset-4 text-white" href="/playlists/archive/">View previous playlists →</a>
      </div>
    </div>
  );
}



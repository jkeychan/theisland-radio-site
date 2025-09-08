import { PlaylistsList } from "@/components/PlaylistsList";
import { LatestTracksCard } from "@/components/LatestTracksCard";

export const metadata = {
  title: "Playlists Archive • The Island",
};

export default function PlaylistsArchivePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Previous Playlists</h1>
        <p className="text-theme-gold">All past shows, newest first.</p>
      </header>

      {/* First card shows the current week's tracks from Google Sheets */}
      <LatestTracksCard title="Current Playlist" />

      {/* Then show historical playlists from static data */}
      <PlaylistsList showAll />
    </div>
  );
}



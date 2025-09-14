import { PlaylistsList } from "@/components/PlaylistsList";

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

      {/* Show historical playlists from static data, excluding the current one */}
      <PlaylistsList showAll excludeCurrent />
    </div>
  );
}



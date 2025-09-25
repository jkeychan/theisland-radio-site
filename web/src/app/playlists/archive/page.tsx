import { PlaylistsList } from "@/components/PlaylistsList";

export const metadata = {
  title: "Playlists Archive • The Island",
};

export default function PlaylistsArchivePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Previous Playlists</h1>
        <p className="text-theme-gold">Recent shows, newest first. Showing last 4 weeks.</p>
      </header>

      {/* Show last 4 playlists from static data, excluding the current one */}
      <PlaylistsList showAll={false} excludeCurrent limit={4} />
      
      <div className="mt-6">
        <a className="inline-block underline underline-offset-4 text-white" href="/playlists/archive/all">View all playlists →</a>
      </div>
    </div>
  );
}



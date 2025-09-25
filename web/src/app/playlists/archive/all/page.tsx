import { PlaylistsList } from "@/components/PlaylistsList";

export const metadata = {
  title: "All Playlists • The Island",
};

export default function AllPlaylistsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">All Playlists</h1>
        <p className="text-theme-gold">Complete archive of all past shows, newest first.</p>
      </header>

      {/* Show all historical playlists from static data, excluding the current one */}
      <PlaylistsList showAll excludeCurrent />
      
      <div className="mt-6">
        <a className="inline-block underline underline-offset-4 text-white" href="/playlists/archive/">← Back to recent playlists</a>
      </div>
    </div>
  );
}

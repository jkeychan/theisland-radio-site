import { PlaylistCard } from "@/components/PlaylistCard";
import { usePlaylists } from "@/hooks/usePlaylists";

export const metadata = {
  title: "Playlists & Recordings • The Island",
  description:
    "Browse every episode of The Island — track-by-track playlists and archive.org recordings of each broadcast.",
};

export default function PlaylistsPage() {
  return (
    <div>
      {/* Page header band */}
      <div style={{
        background: 'var(--gold-dark)',
        padding: '40px 44px 32px',
        position: 'relative',
      }}>
        {/* Three-stripe bottom border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
          background: 'linear-gradient(90deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%)'
        }} />
        <h1 style={{ fontWeight: 900, fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--gold)' }}>
          Playlists
        </h1>
      </div>

      {/* Page body */}
      <div style={{ background: 'var(--gold)', padding: 44 }}>
        {usePlaylists().data.map((p) => (
          <PlaylistCard key={p.id} playlist={p} />
        ))}
      </div>
    </div>
  );
}

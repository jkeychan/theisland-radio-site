import { PlaylistsList } from "@/components/PlaylistsList";

export const metadata = {
  title: "Playlists • The Island",
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
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-mid)', marginBottom: 8 }}>
          The Island · WART 95.5 FM
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--gold)' }}>
          Playlists
        </h1>
      </div>

      {/* Page body */}
      <div style={{ background: 'var(--gold)', padding: 44 }}>
        <PlaylistsList showAll={true} />
      </div>
    </div>
  );
}

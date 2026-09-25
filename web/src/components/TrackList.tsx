import type { Track } from "@/types/content";

export function TrackList({ tracks }: { tracks: Track[] }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {tracks.map((t, i) => (
        <li
          key={`${t.artist}-${t.title}-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr',
            gap: 8,
            padding: '10px 0',
            borderBottom: '1px dashed rgba(61,46,0,0.15)',
            alignItems: 'start',
          }}
        >
          <span style={{ fontSize: 11, color: 'rgba(61,46,0,0.5)', paddingTop: 3 }}>
            {i + 1}
          </span>
          <span>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--gold-dark)', display: 'block' }}>
              {t.artist}
            </span>
            {t.title && (
              <span style={{ fontSize: 14, color: 'var(--gold-dark)', display: 'block' }}>
                {t.title}
              </span>
            )}
            {t.album && (
              <span style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--gold-mid)', display: 'block' }}>
                {t.album}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

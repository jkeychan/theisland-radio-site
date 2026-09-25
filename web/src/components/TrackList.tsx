import type { Track } from "@/types/content";

export function TrackList({
  tracks,
  indexWidth = 28,
  rowPadding = '8px 0',
  borderOpacity = 0.12,
}: {
  tracks: Track[];
  indexWidth?: number;
  rowPadding?: string;
  borderOpacity?: number;
}) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {tracks.map((t, i) => (
        <li
          key={`${t.artist}-${t.title}-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `${indexWidth}px 1fr`,
            gap: 8,
            padding: rowPadding,
            borderBottom: `1px dashed rgba(61,46,0,${borderOpacity})`,
            alignItems: 'start',
          }}
        >
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(61,46,0,0.5)', paddingTop: 3 }}>
            {i + 1}
          </span>
          <span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--gold-dark)', display: 'block' }}>
              {t.artist}
            </span>
            {t.title && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-dark)', display: 'block' }}>
                {t.title}
              </span>
            )}
            {t.album && (
              <span style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 13, color: 'var(--gold-mid)', display: 'block' }}>
                {t.album}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

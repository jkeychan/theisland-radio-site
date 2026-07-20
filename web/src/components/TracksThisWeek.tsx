"use client";

import { useState } from "react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { TracksPlaceholder } from "@/components/TracksPlaceholder";
import { PlaylistCard, formatDate } from "@/components/PlaylistCard";

const tripleStripeBorder = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  height: 6,
  background: 'linear-gradient(90deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%)',
};

const columnStyle = {
  position: 'relative' as const,
  padding: '44px 50px 50px',
};

const headingStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 900,
  fontSize: 'clamp(36px, 5vw, 60px)',
  lineHeight: 1,
  color: 'var(--gold-dark)',
  letterSpacing: '-0.02em',
  marginTop: 14,
};

const subheadStyle = {
  fontFamily: 'var(--font-ui)',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: 'var(--gold-mid)',
  marginBottom: 26,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const MiniStripe = ({ reversed = false }: { reversed?: boolean }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, width: 8 }}>
    <span style={{ height: 3, background: reversed ? 'var(--green)' : 'var(--red)', display: 'block' }} />
    <span style={{ height: 3, background: 'var(--gold-deep)', display: 'block' }} />
    <span style={{ height: 3, background: reversed ? 'var(--red)' : 'var(--green)', display: 'block' }} />
  </span>
);

export const TracksThisWeek = () => {
  const { data: playlists } = usePlaylists();
  const [thisWeekOpen, setThisWeekOpen] = useState(false);

  // Deduplicate by id, sort descending
  const sortedPlaylists = Array.from(new Map(playlists.map(p => [p.id, p])).values())
    .sort((a, b) => (a.id < b.id ? 1 : -1));

  const currentPlaylist = sortedPlaylists[0];
  const pastPlaylists = sortedPlaylists.slice(1, 5);
  const tracks = currentPlaylist?.tracks ?? [];

  const currentDateLabel = currentPlaylist ? formatDate(currentPlaylist.id) : "";

  return (
    <section
      aria-labelledby="tracks-title"
      className="tracks-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'var(--gold)',
        position: 'relative',
      }}
    >
      {/* Column divider */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 10,
          transform: 'translateX(-50%)',
          background: 'repeating-linear-gradient(180deg, var(--red) 0 10px, var(--gold-deep) 10px 20px, var(--green) 20px 30px, transparent 30px 36px)',
          opacity: 0.5,
          zIndex: 1,
        }}
      />

      {/* LEFT COLUMN — This Week */}
      <div style={columnStyle}>
        <div style={tripleStripeBorder} aria-hidden="true" />
        <h2 id="tracks-title" style={headingStyle}>This Week</h2>
        <p style={subheadStyle}>
          <MiniStripe />
          {currentDateLabel}
        </p>

        <button
          onClick={() => setThisWeekOpen(o => !o)}
          aria-expanded={thisWeekOpen}
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            marginBottom: thisWeekOpen ? 20 : 0,
            background: 'var(--gold-cream)',
            border: '1px solid rgba(200,168,0,0.3)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--red)',
              fontWeight: 600,
            }}
          >
            {thisWeekOpen ? 'Hide tracklist' : "View this week's tracklist"}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--gold-mid)', letterSpacing: '0.08em' }}>
              {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11,
                color: 'var(--red)',
                transform: thisWeekOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                display: 'inline-block',
              }}
            >
              ▾
            </span>
          </span>
        </button>

        {thisWeekOpen && (
          <>
            {currentPlaylist?.archiveUrl && (
              <a
                href={currentPlaylist.archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--red)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--red)',
                  paddingBottom: 1,
                  marginBottom: 20,
                }}
              >
                ▶ Link to broadcast recording
              </a>
            )}

            {tracks.length === 0 ? (
              <TracksPlaceholder />
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {tracks.map((t, i) => (
                  <li
                    key={`${t.artist}-${t.title}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr',
                      gap: 8,
                      padding: '11px 0',
                      borderBottom: '1px dashed rgba(61,46,0,0.18)',
                      alignItems: 'start',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(61,46,0,0.3)', paddingTop: 2 }}>
                      {i + 1}
                    </span>
                    <span>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 14, color: 'var(--gold-dark)', display: 'block' }}>
                        {t.artist}
                      </span>
                      {t.title && (
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--gold-mid)', letterSpacing: '0.04em', display: 'block' }}>
                          {t.title}
                        </span>
                      )}
                      {t.album && (
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--gold-mid)', display: 'block' }}>
                          {t.album}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>

      {/* RIGHT COLUMN — Past Shows */}
      <div style={columnStyle}>
        <div style={tripleStripeBorder} aria-hidden="true" />
        <h2 style={headingStyle}>Past Shows</h2>
        <p style={subheadStyle}>
          <MiniStripe reversed />
          Browse the archive
        </p>

        {pastPlaylists.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--gold-mid)' }}>
            No past shows yet.
          </p>
        ) : (
          <>
            {pastPlaylists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
            <a
              href="/playlists/"
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-ui)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--red)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--red)',
                paddingBottom: 1,
                marginTop: 8,
              }}
            >
              View full archive →
            </a>
          </>
        )}
      </div>
    </section>
  );
};

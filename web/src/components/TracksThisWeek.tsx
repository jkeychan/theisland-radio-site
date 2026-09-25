"use client";

import { useState } from "react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { TracksPlaceholder } from "@/components/TracksPlaceholder";
import { PlaylistCard, formatDate } from "@/components/PlaylistCard";
import { TrackList } from "@/components/TrackList";

const columnStyle = {
  position: 'relative' as const,
  padding: '44px 50px 50px',
};

const headingStyle = {
  fontWeight: 900,
  fontSize: 'clamp(36px, 5vw, 60px)',
  lineHeight: 1,
  color: 'var(--gold-dark)',
  letterSpacing: '-0.02em',
  margin: 0,
};

const subheadStyle = {
  fontSize: 16,
  color: 'var(--gold-dark)',
  margin: '6px 0 26px',
};

const textLinkStyle = {
  display: 'inline-block',
  fontSize: 15,
  color: 'var(--red)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--red)',
  paddingBottom: 1,
};

const PREVIEW_COUNT = 5;

export const TracksThisWeek = () => {
  const { data: playlists } = usePlaylists();
  const [showAll, setShowAll] = useState(false);

  const currentPlaylist = playlists[0];
  const pastPlaylists = playlists.slice(1, 9);
  const tracks = currentPlaylist?.tracks ?? [];
  const visibleTracks = showAll ? tracks : tracks.slice(0, PREVIEW_COUNT);

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
      {/* LEFT COLUMN — This Week */}
      <div className="tracks-col" style={columnStyle}>
        <h2 id="tracks-title" style={headingStyle}>This Week</h2>
        <p style={subheadStyle}>{currentDateLabel}</p>

        {currentPlaylist?.archiveUrl && (
          <a
            href={currentPlaylist.archiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...textLinkStyle, marginBottom: 16 }}
          >
            Listen to the recording
          </a>
        )}

        {tracks.length === 0 ? (
          <TracksPlaceholder />
        ) : (
          <>
            <TrackList tracks={visibleTracks} />
            {tracks.length > PREVIEW_COUNT && (
              <button
                onClick={() => setShowAll(a => !a)}
                aria-expanded={showAll}
                style={{
                  ...textLinkStyle,
                  marginTop: 16,
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--red)',
                  cursor: 'pointer',
                  padding: '0 0 1px',
                }}
              >
                {showAll ? 'Show fewer tracks' : `Show all ${tracks.length} tracks`}
              </button>
            )}
          </>
        )}
      </div>

      {/* RIGHT COLUMN — Past Shows */}
      <div className="tracks-col" style={columnStyle}>
        <h2 style={{ ...headingStyle, marginBottom: 26 }}>Past Shows</h2>

        {pastPlaylists.length === 0 ? (
          <p style={{ fontSize: 15, color: 'var(--gold-dark)' }}>
            No past shows yet.
          </p>
        ) : (
          <>
            {pastPlaylists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
            <a href="/playlists/" style={{ ...textLinkStyle, marginTop: 8 }}>
              View full archive
            </a>
          </>
        )}
      </div>
    </section>
  );
};

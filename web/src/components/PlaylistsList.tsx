"use client";

import { useState } from "react";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { Playlist } from "@/types/content";

type PlaylistsListProps = {
  showAll?: boolean;
  excludeCurrent?: boolean;
  limit?: number;
};

const formatDate = (id: string) => {
  const d = new Date(id + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

function PlaylistCard({ p }: { p: Playlist }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginBottom: 9,
        background: 'var(--gold-cream)',
        position: 'relative',
        borderTop: '1px solid rgba(200,168,0,0.3)',
        borderBottom: '1px solid rgba(200,168,0,0.3)',
      }}
    >
      {/* Left stripe */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: 'linear-gradient(180deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%)',
        }}
      />
      {/* Right stripe */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: 'linear-gradient(180deg, var(--green) 0% 33%, var(--gold-deep) 33% 66%, var(--red) 66% 100%)',
        }}
      />

      {/* Header row — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 22px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: 15,
            color: 'var(--gold-dark)',
          }}
        >
          {formatDate(p.id)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 9,
              color: 'var(--gold-mid)',
              letterSpacing: '0.08em',
            }}
          >
            {p.tracks.length} track{p.tracks.length !== 1 ? 's' : ''}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              color: 'var(--gold-mid)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}
          >
            ▾
          </span>
        </span>
      </button>

      {/* Track list */}
      {open && (
        <>
        {p.archiveUrl && (
          <div style={{ padding: '0 22px 10px' }}>
            <a
              href={p.archiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--red)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--red)',
                paddingBottom: 1,
              }}
            >
              ▶ Link to broadcast recording
            </a>
          </div>
        )}
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 22px 14px',
          }}
        >
          {p.tracks.map((t, i) => (
            <li
              key={`${t.artist}-${t.title}-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px dashed rgba(61,46,0,0.12)',
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
        </>
      )}
    </div>
  );
}

export function PlaylistsList({ showAll = false, excludeCurrent = false, limit }: PlaylistsListProps) {
  const { data } = usePlaylists();

  const unique = Array.from(new Map(data.map(p => [p.id, p])).values());
  let playlistsToRender: Playlist[] = [...unique].sort((a, b) => (a.id < b.id ? 1 : -1));

  if (excludeCurrent && playlistsToRender.length > 0) {
    playlistsToRender = playlistsToRender.slice(1);
  }

  if (limit && limit > 0) {
    playlistsToRender = playlistsToRender.slice(0, limit);
  }

  if (!showAll && !limit) {
    playlistsToRender = playlistsToRender.slice(0, 1);
  }

  if (playlistsToRender.length === 0) return null;

  return (
    <div>
      {playlistsToRender.map((p) => (
        <PlaylistCard key={p.id} p={p} />
      ))}
    </div>
  );
}

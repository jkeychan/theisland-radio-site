"use client";

import { useState } from "react";
import type { Playlist } from "@/types/content";
import { TrackList } from "@/components/TrackList";

export const formatDate = (id: string) => {
  const d = new Date(id + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export function PlaylistCard({ playlist: p, defaultOpen = false }: { playlist: Playlist; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginBottom: 9,
        background: 'var(--gold-cream)',
        position: 'relative',
        borderTop: '1px solid rgba(200,168,0,0.3)',
        borderBottom: '1px solid rgba(200,168,0,0.3)',
        borderLeft: '4px solid var(--green)',
      }}
    >
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
            fontWeight: 400,
            fontSize: 16,
            color: 'var(--gold-dark)',
          }}
        >
          {formatDate(p.id)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--gold-mid)',
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
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--red)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--red)',
                paddingBottom: 1,
              }}
            >
              Listen to the recording
            </a>
          </div>
        )}
        <div style={{ padding: '0 22px 14px' }}>
          <TrackList tracks={p.tracks} />
        </div>
        </>
      )}
    </div>
  );
}

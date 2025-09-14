"use client";

import { useRecordings } from "@/hooks/useRecordings";

export function RecordingsList() {
  const { data } = useRecordings();
  if (!data || data.length === 0) {
    return (
      <div className="card card-accent card-dark p-6">
        <h2 className="text-xl font-medium text-white">The Island Radio Archive</h2>
        <p className="mt-2 text-theme-gold">
          Listen to past episodes of The Island radio show on Archive.org.
        </p>
        <div className="mt-4">
          <a 
            href="https://archive.org/details/@dubtractor/lists/1/the-island-wart-fm-radio-archive" 
            target="_blank" 
            rel="noreferrer noopener"
            className="btn btn-primary"
            aria-label="Visit The Island Radio Archive on Archive.org (opens in new tab)"
          >
            Visit Archive.org Collection
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {data.map((r) => (
        <article key={r.id} className="card card-accent p-4">
          <h2 className="text-xl font-medium">{r.title}</h2>
          <p className="text-sm text-theme-gold">Aired {r.date}</p>
          <audio className="mt-3 w-full" controls src={r.audioUrl} preload="none">
            Your browser does not support the audio element.
          </audio>
          <div className="mt-3">
            <a className="btn btn-secondary" href={r.downloadUrl ?? r.audioUrl} download>
              Download
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}



"use client";

import { useRecordings } from "@/hooks/useRecordings";

export function RecordingsList() {
  const { data } = useRecordings();
  if (!data || data.length === 0) {
    return (
      <div className="card card-accent card-dark p-6">
        <h2 className="text-xl font-medium text-white">Recordings coming soon</h2>
        <p className="mt-2 text-theme-gold">We’ll post recent shows here once the archive is live.</p>
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



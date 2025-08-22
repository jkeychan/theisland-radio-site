import { recordings } from "@/data/recordings";

export const metadata = {
  title: "Recordings • The Island",
};

export default function RecordingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Show Recordings</h1>
        <p className="text-theme-gold">Listen back to recent episodes.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {recordings.map((r) => (
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
    </div>
  );
}



import { recordings } from "@/data/recordings";

export const metadata = {
  title: "Recordings • The Island",
};

export default function RecordingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Show Recordings</h1>
        <p className="text-gray-700">Listen back to recent episodes.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {recordings.map((r) => (
          <article key={r.id} className="rounded-lg border bg-white/80 p-4 shadow-sm">
            <h2 className="text-xl font-medium">{r.title}</h2>
            <p className="text-sm text-gray-600">Aired {r.date}</p>
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



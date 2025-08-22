import { playlists } from "@/data/playlists";

export const metadata = {
  title: "Playlists • The Island",
};

export default function PlaylistsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold section-heading section-heading-light">Playlists</h1>
        <p className="text-theme-gold">Archive of past shows organized by date.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {playlists.map((p) => (
          <article key={p.id} className="card card-accent p-4">
            <h2 className="text-xl font-medium">{p.id} — {p.title}</h2>
            {p.description ? (
              <p className="text-sm text-theme-gold">{p.description}</p>
            ) : null}
            <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
              {p.tracks.map((t, i) => (
                <li key={i}>
                  <span className="font-medium">{t.artist}</span> — {t.title}
                  {t.album ? <span className="text-theme-gold"> ({t.album})</span> : null}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}



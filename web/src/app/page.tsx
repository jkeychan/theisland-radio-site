export default function Home() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="hero-title" className="text-center hero rounded-xl py-8">
        <h1 id="hero-title" className="text-4xl sm:text-6xl font-[family-name:var(--font-righteous)] heading-rasta">
          The Island
        </h1>
        <p className="mt-2 text-lg sm:text-xl">
          <a className="underline-offset-4 hover:underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">WART 95.5 FM</a> • Madison County, NC
        </p>
        <p className="mt-1 text-base sm:text-lg">DJ &quot;Dub Tractor&quot; — Fridays 6:30–8pm ET</p>
        <div className="mt-6 flex justify-center gap-3">
          <a className="btn btn-live" href="https://station.voscast.com/5530050e0a38b/" target="_blank" rel="noreferrer noopener">
            Listen Live
          </a>
          <a className="btn btn-secondary" href="/recordings/">
            Recent Recordings
          </a>
        </div>
      </section>

      <section aria-labelledby="playlist-preview-title">
        <div className="flex items-end justify-between">
          <h2 id="playlist-preview-title" className="text-2xl font-semibold text-[--rasta-red]">Recent Playlists</h2>
          <a className="text-[--rasta-green] underline underline-offset-4" href="/playlists/">View all</a>
        </div>
        <div id="playlist-preview" className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hydrated with static data later */}
          <article className="card card-accent p-4">
            <h3 className="font-medium">2025-01-10</h3>
            <p className="text-sm text-gray-600">Reggae Roots & Rocksteady</p>
          </article>
          <article className="card card-accent p-4">
            <h3 className="font-medium">2024-12-20</h3>
            <p className="text-sm text-gray-600">Holiday Ska Special</p>
          </article>
          <article className="card card-accent p-4">
            <h3 className="font-medium">2024-12-13</h3>
            <p className="text-sm text-gray-600">Dub Explorations</p>
          </article>
        </div>
      </section>
    </div>
  );
}

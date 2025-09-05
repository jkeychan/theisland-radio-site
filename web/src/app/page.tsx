import { TracksThisWeek } from "@/components/TracksThisWeek";

export default function Home() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="hero-title" className="text-center hero rounded-xl py-12 text-white">
        <h1 id="hero-title" className="text-4xl sm:text-6xl font-[family-name:var(--font-righteous)] heading-rasta">
          The Island
        </h1>
        <p className="mt-2 text-lg sm:text-xl">
          <a className="underline-offset-4 hover:underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">WART 95.5 FM</a> • <a className="underline-offset-4 hover:underline" href="https://madisoncountyarts.com/" target="_blank" rel="noreferrer noopener">Madison County, NC</a>
        </p>
        <p className="mt-1 text-base sm:text-lg font-bold">DJ Dub Tractor — Fridays 6:30–8pm ET</p>
        <p className="mt-2 text-sm sm:text-base italic">Cultivating positivity, unity, and community</p>
        <div className="mt-6 flex justify-center gap-3">
          <a className="btn btn-live" href="https://station.voscast.com/5530050e0a38b/" target="_blank" rel="noreferrer noopener">
            Listen Live
          </a>
          <a className="btn btn-secondary" href="/recordings/">
            Show Archive
          </a>
        </div>
      </section>

      <TracksThisWeek />
    </div>
  );
}

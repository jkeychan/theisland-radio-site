import Link from "next/link";

export function TracksPlaceholder() {
  return (
    <div className="tracks-placeholder space-y-6 text-center py-12">
      <h3 className="text-2xl font-bold text-theme-gold">
        Tune in Friday 6:30pm ET for this week&apos;s fresh tracks!
      </h3>

      <p className="text-white/70 text-lg">
        In the meantime, check out recent selections:
      </p>

      <Link
        href="/recordings/"
        className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
      >
        Browse Past Shows →
      </Link>

      <div className="genre-preview mt-8">
        <h4 className="text-lg font-semibold mb-4 text-white/90">
          What to expect:
        </h4>
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="px-4 py-2 bg-island-green/20 text-green-300 rounded-full">
            Reggae
          </span>
          <span className="px-4 py-2 bg-island-ocean/20 text-cyan-300 rounded-full">
            Dub
          </span>
          <span className="px-4 py-2 bg-island-gold/20 text-yellow-300 rounded-full">
            Ska
          </span>
          <span className="px-4 py-2 bg-island-red/20 text-red-300 rounded-full">
            Dancehall
          </span>
        </div>
      </div>
    </div>
  );
}

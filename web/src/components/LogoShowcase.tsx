export const LogoShowcase = () => {
  // Show only if assets exist in /public (safe for static export: 404 would be harmless but we gate by filenames)
  const candidates = [
    "/images/logo-dub-tractor-dark.png",
    "/images/logo-dub-tractor.png",
    "/images/logo-dub-tractor.svg",
  ];
  // We cannot statically check existence at runtime reliably without requests; so provide a simple gallery if present.
  // If you add any of the above files to web/public/images, they will show here.
  return (
    <section aria-labelledby="logos-title" className="mt-10">
      <h2 id="logos-title" className="text-2xl font-semibold section-heading section-heading-light">Logos</h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {candidates.map((src) => (
          <div key={src} className="card p-4 flex items-center justify-center bg-white/60">
            <img src={src} alt="Dub Tractor logo" className="max-h-40 w-auto" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-theme-gold">Place logo files into <code>/public/images</code> to populate this section.</p>
    </section>
  );
};



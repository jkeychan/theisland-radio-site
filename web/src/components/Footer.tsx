export function Footer() {
  return (
    <footer className="border-t-2 border-white/10 bg-gradient-to-b from-black/60 to-black/80 backdrop-blur-lg mt-auto relative z-10 font-[family-name:var(--font-exo-2)]" style={{ fontWeight: 200 }}>
      <div className="stripe-red w-full opacity-60" aria-hidden />
      <div className="stripe-gold w-full opacity-60" aria-hidden />
      <div className="container py-10 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between text-white/90">
          <p className="text-sm sm:text-base tracking-wide text-balance leading-relaxed" style={{ fontWeight: 200 }}>
            © {new Date().getFullYear()} The Island •{" "}
            <a 
              className="underline underline-offset-2 hover:text-[--island-gold] transition-colors duration-200" 
              style={{ fontWeight: 300 }}
              href="https://wartfm.org" 
              target="_blank" 
              rel="noreferrer noopener"
            >
              WART 95.5 FM
            </a>
            {" "}· Madison County, NC
          </p>
          <p className="text-sm sm:text-base tracking-wide text-balance leading-relaxed" style={{ fontWeight: 200 }}>
            <span style={{ fontWeight: 300 }}>Fridays 6:30–8pm ET</span> · DJ Dub Tractor ·{" "}
            <a 
              className="underline underline-offset-2 hover:text-[--island-gold] transition-colors duration-200" 
              style={{ fontWeight: 300 }}
              href="/contact/"
            >
              Contact
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}



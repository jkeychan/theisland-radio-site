export function Footer() {
  return (
    <footer className="border-t bg-white/80 boxed">
      <div className="stripe-red w-full" aria-hidden />
      <div className="stripe-gold w-full" aria-hidden />
      <div className="container py-8 text-sm text-theme-gold">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} The Island • <a className="underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">WART 95.5 FM</a> · Madison County, NC
          </p>
          <p>
            Fridays 6:30–8pm ET · DJ Dub Tractor · <a className="underline" href="/contact/">Contact</a>
          </p>
        </div>
      </div>
    </footer>
  );
}



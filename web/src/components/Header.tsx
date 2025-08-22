"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/playlists/", label: "Playlists" },
  { href: "/recordings/", label: "Recordings" },
  { href: "/events/", label: "Events" },
  { href: "/contact/", label: "Contact" },
];

export function Header() {
  const pathname = usePathname() || "/";

  return (
    <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 boxed">
      <div className="stripe-red w-full" aria-hidden />
      <div className="stripe-gold w-full" aria-hidden />
      <div className="container flex h-16 items-center justify-between">
        <div className="inline-flex items-baseline gap-3">
          <Link href="/" className="inline-flex items-baseline gap-2" aria-label="The Island home">
            <span className="text-2xl font-[family-name:var(--font-righteous)]">
              <span style={{ color: "var(--rasta-red)" }}>T</span>
              <span style={{ color: "var(--rasta-gold)" }}>h</span>
              <span style={{ color: "var(--rasta-green)" }}>e</span>
              <span> </span>
              <span style={{ color: "var(--rasta-red)" }}>I</span>
              <span style={{ color: "var(--rasta-gold)" }}>s</span>
              <span style={{ color: "var(--rasta-green)" }}>l</span>
              <span style={{ color: "var(--rasta-red)" }}>a</span>
              <span style={{ color: "var(--rasta-gold)" }}>n</span>
              <span style={{ color: "var(--rasta-green)" }}>d</span>
            </span>
          </Link>
          <a className="hidden sm:inline text-sm text-theme-gold underline-offset-4 hover:underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">
            WART 95.5 FM
          </a>
        </div>
        <nav className="flex items-center gap-2" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-[--island-sand] ${
                  isActive ? "text-[--rasta-red]" : "text-theme-gold"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href="https://station.voscast.com/5530050e0a38b/"
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-live hidden sm:inline-flex"
          >
            Listen Live
          </a>
        </nav>
      </div>
    </header>
  );
}



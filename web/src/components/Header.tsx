"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/contact/", label: "Contact" },
  { href: "/playlists/", label: "Playlists" },
  { href: "/recordings/", label: "Recordings" },
  { href: "/events/", label: "Events" },
];

export function Header() {
  const pathname = usePathname() || "/";

  return (
    <header className="bg-black/40 backdrop-blur-md sticky top-0 z-50 shadow-lg border-b-elegant overflow-hidden">
      <div className="container flex items-center justify-between h-auto py-4 sm:h-24 sm:py-0 gap-4">
        <div className="inline-flex items-center gap-4 shrink-0 min-w-0">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0" 
            aria-label="The Island home"
          >
            <img 
              src="/images/dub-tractor-theisland-logo.png" 
              alt="The Island logo" 
              className="h-10 sm:h-12 w-auto brightness-110 contrast-110 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" 
            />
          </Link>
          <a 
            className="hidden sm:inline text-sm font-medium text-theme-gold underline-offset-4 hover:underline transition-colors font-[family-name:var(--font-reggae-one)] whitespace-nowrap" 
            href="https://wartfm.org" 
            target="_blank" 
            rel="noreferrer noopener"
          >
            WART 95.5 FM
          </a>
        </div>
        <nav 
          className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide whitespace-nowrap min-w-0 flex-1 justify-end" 
          aria-label="Primary navigation"
        >
          <a
            href="https://station.voscast.com/5530050e0a38b/"
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-live inline-flex items-center justify-center shrink-0 text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg font-[family-name:var(--font-reggae-one)]"
            aria-label="Listen to The Island live"
          >
            Listen Live
          </a>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 font-[family-name:var(--font-reggae-one)] ${
                isActive 
                  ? "text-white bg-black/20 backdrop-blur-sm" 
                  : "text-theme-gold hover:bg-[--island-gold-subtle] hover:text-[--island-gold]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}



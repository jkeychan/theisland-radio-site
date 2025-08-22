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
    <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="brand-gradient h-1 w-full" aria-hidden />
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="inline-flex items-baseline gap-2" aria-label="The Island home">
          <span className="text-2xl font-[family-name:var(--font-righteous)] text-[--rasta-green]">
            The Island
          </span>
          <a className="hidden sm:inline text-sm text-gray-600 underline-offset-4 hover:underline" href="https://wartfm.org" target="_blank" rel="noreferrer noopener">
            WART 95.5 FM
          </a>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-[--island-sand] ${
                  isActive ? "text-[--rasta-red]" : "text-gray-700"
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



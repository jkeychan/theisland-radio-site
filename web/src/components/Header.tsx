"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/playlists/", label: "Playlists / Recordings" },
  { href: "/contact/", label: "Contact" },
];

export function Header() {
  const pathname = usePathname() || "/";

  return (
    <header
      style={{
        background: "var(--gold-dark)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Main nav row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 58,
          padding: "0 44px",
        }}
      >
        {/* LEFT: logo + text */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Link href="/" aria-label="The Island home">
            <img
              src="/images/dub-tractor-theisland-logo.png"
              alt="The Island logo"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "2px solid var(--gold-deep)",
                display: "block",
              }}
            />
          </Link>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold)",
              }}
            >
              The Island
            </span>
            <a
              href="https://wartfm.org"
              target="_blank"
              rel="noreferrer noopener"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "var(--gold-mid)",
                textDecoration: "none",
              }}
            >
              WART 95.5 FM
            </a>
          </div>
        </div>

        {/* CENTER/RIGHT: nav links */}
        <nav
          aria-label="Primary navigation"
          style={{ display: "flex", alignItems: "center", gap: 30 }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: isActive ? "var(--gold)" : "var(--gold-mid)",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            );
          })}

          {/* FAR RIGHT: Listen Live */}
          <a
            href="https://station.voscast.com/5530050e0a38b/"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Listen to The Island live"
            style={{
              marginLeft: 30,
              background: "var(--red)",
              color: "var(--gold-cream)",
              fontFamily: "var(--font-ui)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              textDecoration: "none",
            }}
          >
            <span className="live-dot" />
            Listen Live
          </a>
        </nav>
      </div>

      {/* Bottom three-stripe accent */}
      <div
        aria-hidden
        style={{
          height: 7,
          background:
            "linear-gradient(90deg, var(--red) 0% 33.33%, var(--gold) 33.33% 66.66%, var(--green) 66.66% 100%)",
        }}
      />
    </header>
  );
}

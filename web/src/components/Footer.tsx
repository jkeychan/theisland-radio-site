export function Footer() {
  return (
    <footer
      style={{
        background: "var(--gold-dark)",
        position: "relative",
        padding: "22px 44px",
      }}
    >
      {/* Top three-stripe bar */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 7,
          background:
            "linear-gradient(90deg, var(--red) 0% 33.33%, var(--gold) 33.33% 66.66%, var(--green) 66.66% 100%)",
        }}
      />

      {/* Content row */}
      <div
        className="footer-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingTop: 7,
        }}
      >
        {/* LEFT: copyright */}
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--gold-mid)",
            margin: 0,
          }}
        >
          © 2026 The Island · WART 95.5 FM · Madison County, NC · DJ Dub Tractor
        </p>

        {/* RIGHT: links */}
        <div
          className="footer-links"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 20,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--gold-mid)",
          }}
        >
          <a
            href="https://wartfm.org"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: "var(--gold-mid)", textDecoration: "none" }}
          >
            wartfm.org
          </a>
          <a
            href="https://archive.org/details/@dubtractor/lists/1/the-island-wart-fm-radio-archive"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: "var(--gold-mid)", textDecoration: "none" }}
          >
            archive.org
          </a>
          <a
            href="/subscribe/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              color: "var(--gold)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="4.5" cy="15.5" r="2" fill="currentColor" />
              <path d="M3 8.5C8.799 8.5 13.5 13.2 13.5 19" stroke="currentColor" strokeWidth="2.2" fill="none" />
              <path d="M3 2.5C12.1127 2.5 19.5 9.887 19.5 19" stroke="currentColor" strokeWidth="2.2" fill="none" />
            </svg>
            subscribe
          </a>
          <a
            href="/contact/"
            style={{ color: "var(--gold-mid)", textDecoration: "none" }}
          >
            contact
          </a>
        </div>
      </div>
    </footer>
  );
}

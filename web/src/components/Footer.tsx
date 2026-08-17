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
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 7,
        }}
      >
        {/* LEFT: copyright */}
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: "var(--gold-mid)",
            margin: 0,
          }}
        >
          © 2026 The Island · WART 95.5 FM · Madison County, NC · DJ Dub Tractor
        </p>

        {/* RIGHT: links */}
        <div
          style={{
            display: "flex",
            gap: 24,
            fontFamily: "var(--font-ui)",
            fontSize: 9,
            letterSpacing: "0.08em",
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
            href="/podcast.xml"
            style={{ color: "var(--gold-mid)", textDecoration: "none" }}
          >
            rss
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

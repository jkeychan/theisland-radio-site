"use client";

import { TracksThisWeek } from "@/components/TracksThisWeek";
import { ListenLiveButton } from "@/components/ListenLiveButton";

function MetaStripe() {
  return (
    <span className="meta-stripe">
      <span className="s-r" /><span className="s-g" /><span className="s-gr" />
    </span>
  );
}

export default function Home() {
  return (
    <div>
      {/* ── Hero ── */}
      <section
        aria-labelledby="hero-title"
        style={{
          background: "var(--gold)",
          display: "flex",
          minHeight: "520px",
        }}
      >
        {/* Left panel */}
        <div
          style={{
            flex: 1,
            padding: "68px 52px 60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold-mid)",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div className="stripe-badge">
              <span className="s-r" />
              <span className="s-g" />
              <span className="s-gr" />
            </div>
            Dub · Reggae · Dancehall
          </div>

          {/* Title */}
          <h1
            id="hero-title"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "clamp(100px, 13vw, 168px)",
              lineHeight: 0.88,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            <span style={{ display: "block", color: "var(--gold-dark)" }}>THE</span>
            <span style={{ display: "block", color: "var(--green)" }}>ISLAND</span>
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontStyle: "italic",
              fontWeight: 200,
              fontSize: "20px",
              color: "var(--green)",
              margin: "22px 0 14px",
              lineHeight: 1.4,
            }}
          >
            Cultivating positivity, unity, and community
          </p>

          {/* Meta */}
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gold-mid)",
              marginBottom: "32px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            DJ Dub Tractor
            <MetaStripe />
            Fridays 6:30–8pm ET
            <MetaStripe />
            Madison County, NC
          </p>

          {/* CTA row */}
          <div style={{ display: "flex", gap: "12px" }}>
            <ListenLiveButton />
            <a href="/playlists/" className="btn-secondary">
              Show Archive
            </a>
          </div>
        </div>

        {/* Right panel — static banner image */}
        <div
          style={{
            flex: "0 0 40%",
            minWidth: 0,
            borderLeft: "3px solid var(--gold-dark)",
            position: "relative",
            overflow: "hidden",
            backgroundImage: 'url("/images/main-banner.jpeg")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Left edge triple-stripe */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "9px",
              background:
                "linear-gradient(180deg, var(--red) 0% 33%, var(--gold) 33% 66%, var(--green) 66% 100%)",
              zIndex: 2,
            }}
          />

          {/* Diagonal pinstripe overlay */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent 0px 20px, rgba(26,92,40,0.08) 20px 21px)",
              zIndex: 1,
            }}
          />
        </div>
      </section>

      {/* ── Wave break ── */}
      <div className="stripe-bar-reversed" />

      <div className="wave-break">
        {/* Corner stripe SVG */}
        <svg
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 140,
            height: 140,
            overflow: "hidden",
            pointerEvents: "none",
          }}
          viewBox="0 0 140 140"
        >
          <g transform="rotate(-38, 70, 70)">
            <rect x="-20" y="30" width="200" height="12" fill="#B22020" opacity="0.6" />
            <rect x="-20" y="46" width="200" height="12" fill="#C8A800" opacity="0.6" />
            <rect x="-20" y="62" width="200" height="12" fill="#1A5C28" opacity="0.6" />
          </g>
        </svg>

        {/* Wave SVG */}
        <svg
          style={{ position: "absolute", bottom: 0, width: "100%" }}
          viewBox="0 0 1200 56"
          preserveAspectRatio="none"
          height="56"
        >
          <path
            d="M0,0 L1200,0 L1200,18 Q900,32 600,18 Q300,4 0,18 Z"
            fill="#B22020"
            opacity="0.55"
          />
          <path
            d="M0,18 Q300,4 600,18 Q900,32 1200,18 L1200,36 Q900,50 600,36 Q300,22 0,36 Z"
            fill="#C8A800"
            opacity="0.5"
          />
          <path
            d="M0,36 Q300,22 600,36 Q900,50 1200,36 L1200,56 L0,56 Z"
            fill="#1A5C28"
            opacity="0.55"
          />
        </svg>
      </div>

      {/* ── Tracks This Week ── */}
      <TracksThisWeek />
    </div>
  );
}

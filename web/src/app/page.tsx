import type { Metadata } from "next";
import { TracksThisWeek } from "@/components/TracksThisWeek";
import { ListenLiveButton } from "@/components/ListenLiveButton";

export const metadata: Metadata = {
  title: "The Island • Reggae, Dub & Dancehall Radio on WART 95.5 FM",
  description:
    "Weekly reggae, dub, and dancehall radio show with DJ Dub Tractor. Live Fridays 6:30–8pm ET on WART 95.5 FM, Madison County NC. Stream online worldwide.",
};

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
        className="hero-section"
        style={{
          background: "var(--gold)",
          display: "flex",
          minHeight: "520px",
        }}
      >
        {/* Left panel */}
        <div
          className="hero-left"
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
          className="hero-map"
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
      <div className="wave-break">
        <svg
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          viewBox="0 0 1200 64"
          preserveAspectRatio="none"
        >
          {[
            { y: 18, color: "var(--red)" },
            { y: 32, color: "var(--gold-deep)" },
            { y: 46, color: "var(--green)" },
          ].map(({ y, color }) => (
            <path
              key={y}
              d={`M-10,${y} Q150,${y - 12} 300,${y} T600,${y} T900,${y} T1210,${y}`}
              stroke={color}
              strokeWidth={12}
              fill="none"
            />
          ))}
        </svg>
      </div>

      {/* ── Tracks This Week ── */}
      <TracksThisWeek />
    </div>
  );
}

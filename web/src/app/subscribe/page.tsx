"use client";

import { useState } from "react";

const FEED_URL = "https://theisland.radio.fm/podcast.xml";

const steps = [
  {
    label: "Copy the link",
    body: "Tap the copy button above, or select the link and copy it.",
  },
  {
    label: "Open your podcast app",
    body: 'Apple Podcasts, Overcast, Pocket Casts, and most others all have a way to add a show — look for "Add Show by URL" or "Follow a Show."',
  },
  {
    label: "Paste it in",
    body: "New episodes of The Island will show up in your app automatically from here on.",
  },
];

function CopyFeedLink() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FEED_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still selectable/visible below.
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        background: "var(--gold-dark)",
        padding: "18px 20px",
      }}
    >
      <code
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--gold-cream)",
          flex: "1 1 260px",
          wordBreak: "break-all",
        }}
      >
        {FEED_URL}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="btn-live"
        style={{ flexShrink: 0 }}
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <div>
      {/* Page header band */}
      <div style={{
        background: 'var(--gold-dark)',
        padding: '40px 44px 32px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
          background: 'linear-gradient(90deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%)'
        }} />
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-mid)', marginBottom: 8 }}>
          The Island · WART 95.5 FM
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: 'var(--gold)' }}>
          Subscribe
        </h1>
      </div>

      {/* Page body */}
      <div style={{ background: 'var(--gold)', padding: 44, maxWidth: 720 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--gold-dark)', marginTop: 0 }}>
          New episodes land here the moment they&apos;re archived — full mixes, tracklists,
          and all the dub, reggae, and dancehall from WART 95.5 FM. Add the link below to
          your podcast app and every future show shows up automatically.
        </p>

        <CopyFeedLink />

        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22,
          color: 'var(--gold-dark)', marginTop: 40, marginBottom: 20,
        }}>
          How to add it
        </h2>

        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steps.map((step, i) => (
            <li
              key={step.label}
              style={{
                display: 'flex',
                gap: 16,
                background: 'var(--gold-cream)',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderImage: 'linear-gradient(180deg, var(--red) 0% 33%, var(--gold-deep) 33% 66%, var(--green) 66% 100%) 1',
                padding: '16px 20px',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22,
                color: 'var(--gold-deep)', lineHeight: 1.3, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--gold-dark)', margin: '0 0 4px' }}>
                  {step.label}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold-mid)', margin: 0 }}>
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, letterSpacing: '0.04em', color: 'var(--gold-mid)', marginTop: 40 }}>
          Prefer to browse by hand? Every episode is also archived on{" "}
          <a
            href="https://archive.org/details/@dubtractor/lists/1/the-island-wart-fm-radio-archive"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--gold-dark)' }}
          >
            archive.org
          </a>
          , or view the{" "}
          <a href="/podcast.xml" style={{ color: 'var(--gold-dark)' }}>
            raw feed
          </a>.
        </p>
      </div>
    </div>
  );
}

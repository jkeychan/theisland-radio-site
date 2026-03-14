// Safe: dangerouslySetInnerHTML used with JSON.stringify on a static hardcoded object — no user input
export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RadioBroadcastService",
    "name": "The Island",
    "broadcastDisplayName": "The Island",
    "description": "Weekly reggae, dub, and dancehall radio show with DJ Dub Tractor on WART 95.5 FM, Fridays 6:30–8pm ET from Madison County, NC.",
    "url": "https://theisland.radio.fm",
    "mainEntityOfPage": "https://theisland.radio.fm",
    "genre": ["Reggae", "Dub", "Dancehall"],
    "inLanguage": "en",
    "broadcastTimezone": "America/New_York",
    "broadcaster": {
      "@type": "RadioStation",
      "name": "WART 95.5 FM",
      "url": "https://wartfm.org",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Hot Springs",
        "addressRegion": "NC",
        "addressCountry": "US"
      }
    },
    "author": {
      "@type": "Person",
      "name": "DJ Dub Tractor"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

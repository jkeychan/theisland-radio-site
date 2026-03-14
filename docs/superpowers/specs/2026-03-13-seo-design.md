# SEO Design: The Island Radio Site

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Option A — structured data + metadata fix + social tags

## Goals

Help three audiences find the show:
1. People searching by name ("The Island WART FM", "Dub Tractor")
2. People searching for reggae/dub radio shows broadly
3. Local Madison County, NC listeners

## Changes

### 1. Global metadata (`src/app/layout.tsx`)

Extend the existing `metadata` export:

- `openGraph.siteName`: `"The Island"` (camelCase — Next.js Metadata type)
- `openGraph.locale`: `"en_US"`
- `openGraph.images`: `"/images/main-banner.jpeg"` — resolves against the existing `metadataBase: new URL("https://theisland.radio.fm")` already set in layout.tsx; do not remove metadataBase
- `twitter.card`: `"summary_large_image"`
- `twitter.title`: same as OG title
- `twitter.description`: same as OG description
- `twitter.images`: `["/images/main-banner.jpeg"]` — must be set explicitly; Next.js does NOT copy OG images to Twitter cards automatically
- `keywords`: `["reggae", "dub", "dancehall", "radio show", "WART FM", "WART 95.5 FM", "Madison County", "North Carolina", "DJ Dub Tractor", "The Island", "community radio", "reggae radio"]`

### 2. JSON-LD structured data (new `JsonLd` component)

A `RadioBroadcastService` schema — the correct Schema.org type for a recurring radio show. (`RadioSeries` does not exist in Schema.org and is ignored by Google.)

```json
{
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
}
```

Notes on the schedule: Schema.org's `Schedule` type and `BroadcastService.schedule` are not standard Google-indexed properties for radio shows. Omit the schedule block — it adds complexity without indexed benefit. The show time is in the description text, which is sufficient.

**Implementation:** A `JsonLd` component renders a `<script type="application/ld+json">` tag. Place it in the `<head>` using Next.js metadata API's `other` field or directly in the layout `<head>` section (not in `<body>` — crawlers reliably parse `<head>` structured data). Plain `<script>` tag, not Next.js `<Script>` component (no async/defer needed for JSON-LD, crawlers need synchronous access).

### 3. Per-page metadata

**Home (`src/app/page.tsx`)** — add metadata export:
- Title: `"The Island • Reggae, Dub & Dancehall Radio on WART 95.5 FM"`
- Description: `"Weekly reggae, dub, and dancehall radio show with DJ Dub Tractor. Live Fridays 6:30–8pm ET on WART 95.5 FM, Madison County NC. Stream online worldwide."`

**Playlists (`src/app/playlists/page.tsx`)** — update:
- Title: `"Playlists & Recordings • The Island"`
- Description: `"Browse every episode of The Island — track-by-track playlists and archive.org recordings of each broadcast."`

**Contact (`src/app/contact/page.tsx`)** — add missing metadata export:
- Title: `"Contact • The Island"`
- Description: `"Get in touch with DJ Dub Tractor and The Island radio show on WART 95.5 FM."`

### 4. Sitemap (`src/app/sitemap.ts`)

Differentiated priorities per URL. The current `map()` applies one config to all — replace with an explicit array:

```ts
return [
  { url: `${base}/`,          changeFrequency: "weekly",  priority: 1.0 },
  { url: `${base}/playlists/`, changeFrequency: "weekly",  priority: 0.9 },
  { url: `${base}/contact/`,  changeFrequency: "monthly", priority: 0.5 },
];
```

Also remove the `export const revalidate = 86400` line — the site uses `output: "export"` (static), so revalidate has no effect and is misleading.

## Files Changed

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Extend metadata with OG image, siteName, locale, Twitter card; add `JsonLd` in `<head>` |
| `src/components/JsonLd.tsx` | New — renders `<script type="application/ld+json">` for RadioBroadcastService schema |
| `src/app/page.tsx` | Add metadata export |
| `src/app/playlists/page.tsx` | Update title + add description |
| `src/app/contact/page.tsx` | Add metadata export |
| `src/app/sitemap.ts` | Differentiated priorities; remove no-op revalidate |

## Out of Scope

- Apple touch icons / manifest.json (no image asset work needed)
- Canonical URL tags (static site, no duplication risk)
- Per-playlist JSON-LD (individual episode schema)
- Show schedule in structured data (not indexed by Google for this type)

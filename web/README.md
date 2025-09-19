The Island — WART 95.5 FM website built with Next.js and Tailwind CSS. Static-exported for GitHub Pages.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes: `/`, `/playlists/`, `/recordings/`, `/events/`, `/contact/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Build and Export

```bash
npm run build
npx next export
```

Deployment via GitHub Actions publishes `out/` to `gh-pages`.

## Data via Google Sheets (CSV)

Set the following env vars (in repo secrets or `.env.local` for local):

```bash
NEXT_PUBLIC_PLAYLISTS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
NEXT_PUBLIC_RECORDINGS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
```

### URL Format Examples:

**Recommended format** (cleaner CSV export):
```bash
NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/15PgCEAXbdRBukiUXpRh3BDP9jwER4mzJfKslA51ort4/export?format=csv&gid=0
```

**Alternative format** (also works):
```bash
NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/1vOa_wABqG7n3IXNoAb7uGfSzstaj_Q8A8YOmB4K7Cp0/gviz/tq?tqx=out:csv&gid=1654309709
```

### Notes:
- Replace `<SHEET_ID>` with your Google Sheet id
- For individual tabs, use the `gid` from the URL (e.g., `gid=0` for the first sheet)
- The `/export?format=csv&gid=` format works better with Google Sheets table formatting
- Headers expected:
  - Playlists: `id,title,description,tracks` (tracks can be newline- or semicolon-separated lines like `Artist - Title (Album)`)
  - Recordings: `id,title,date,audioUrl,downloadUrl,description`
  - Tracks: `Title`, `Artist`, `Album`, `Time` (or similar variations like `Name` instead of `Title`)

The site will prefer the remote CSV feeds when the env vars are set, and fall back to local `src/data/*.ts` arrays otherwise.

## Deploy on GitHub Pages

The site is configured for static export and deployment to GitHub Pages.
# Trigger rebuild for CSV URL test run

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
NEXT_PUBLIC_PLAYLISTS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=Playlists
NEXT_PUBLIC_RECORDINGS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=Recordings
NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&gid=<TAB_GID>
```

Notes:
- Replace `<SHEET_ID>` with your Google Sheet id. For your example sheet, the id is `1vOa_wABqG7n3IXNoAb7uGfSzstaj_Q8A8YOmB4K7Cp0`.
- For individual tabs, use the `gid` from the URL. Example URL for your shared tab:
  - `https://docs.google.com/spreadsheets/d/1vOa_wABqG7n3IXNoAb7uGfSzstaj_Q8A8YOmB4K7Cp0/gviz/tq?tqx=out:csv&gid=1654309709`
- Headers expected:
  - Playlists: `id,title,description,tracks` (tracks can be newline- or semicolon-separated lines like `Artist - Title (Album)`)
  - Recordings: `id,title,date,audioUrl,downloadUrl,description`
  - Tracks: common headers like `Name|Title`, `Artist`, `Album`

The site will prefer the remote CSV feeds when the env vars are set, and fall back to local `src/data/*.ts` arrays otherwise.

## Deploy on GitHub Pages

The site is configured for static export and deployment to GitHub Pages.

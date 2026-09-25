The Island — WART 95.5 FM website built with Next.js. Static-exported for GitHub Pages.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes: `/`, `/playlists/`, `/recordings/`, `/events/`, `/contact/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Development

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (requires dev server running)
npm run test:e2e
```

### Build and Export

```bash
npm run build
npx next export
```

Deployment via GitHub Actions automatically publishes `out/` to GitHub Pages when pushing to main branch.


## Weekly Show Workflow

Each show is archived with `island-show.js` (run as `island-show` from a show folder named "The Island <Month> <Day> <Year>"):

```bash
# 1. After the show: pull the tracklist from Spotify, update playlists.ts, the database and podcast.xml
island-show --spotify-url https://open.spotify.com/playlist/XXXX

# 2. Once the WART recording is available: process the MP3 and upload it to archive.org
island-show --mp3-only
```

Run `island-show --help` for all options. Then review and commit `src/data/playlists.ts` and `public/podcast.xml`.

## Deploy on GitHub Pages

The site is configured for static export and deployment to GitHub Pages.

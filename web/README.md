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

## Deploy on GitHub Pages

The site is configured for static export and deployment to GitHub Pages.

# Full Code Review: The Island SPA (GitHub Pages)

Static Next.js 15 SPA for **The Island • WART 95.5 FM**, exported for GitHub Pages. Review is grouped by major areas.

**Implementations applied (post-review):**
- Contact: reCAPTCHA and Formspree use `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `NEXT_PUBLIC_FORMSPREE_ENDPOINT` (fallbacks keep current behavior).
- Hero: `videoFailed` state; 20s fade timer only runs when `!videoFailed`.
- Data hooks: `error` in return type; fetch errors logged and stored.
- A11y: Skip link (`.skip-link`), `main#main-content`, `aria-label` on recordings `<audio>`, `aria-live`/`role` on contact form messages.
- `.muted` CSS fixed to `--island-gold`; archive link to `/playlists/archive/all/`.
- `.gitignore`: `*.backup.*`; Jest: `testPathIgnorePatterns` for `/e2e/`; CI: E2E job (chromium); root deploy: test job before build.

---

## 1. Project & build configuration

**Location:** `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`

**Summary**
- Next 15.5 with React 19, TypeScript, Tailwind 4.
- `output: "export"` and `trailingSlash: true` for static GitHub Pages.
- Images `unoptimized: true` (required for static export).
- Scripts: `dev` (Turbopack), `build`, `start`, Jest, Playwright, lint.

**Findings**
- **Good:** Strict TypeScript, `@/*` path alias, Tailwind 4 with `@theme inline` in `globals.css`.
- **Note:** `next export` in README is redundant; `next build` already produces `out/` with `output: "export"`.
- **Optional:** Pin exact dependency versions in `package.json` for reproducible builds (e.g. `"next": "15.5.0"` is already pinned; devDependencies use `^`).

---

## 2. App shell & layout

**Location:** `src/app/layout.tsx`, `src/app/globals.css`

**Summary**
- Root layout: Google Fonts (Geist, Reggae One, Island Moments, Exo 2), global CSS, GA (when `NEXT_PUBLIC_GA_ID` set), Header, main container, Footer.
- Semantic structure and metadata (title, description, Open Graph, `metadataBase`) are in good shape.

**Findings**
- **Good:** Single `<main>`, `lang="en"`, favicon link, conditional GA with `afterInteractive`.
- **Bug:** In `globals.css`, `.muted` uses `var(--rasta-gold)` but only `--island-gold` (and related) are defined in `:root`. `.muted` will have no color. Fix: use `var(--island-gold)` (or define `--rasta-gold`).
- **Good:** `prefers-color-scheme: dark` and `prefers-reduced-motion` / `prefers-reduced-data` in hero.
- **Suggestion:** Add a skip link (e.g. “Skip to main content”) for accessibility.

---

## 3. Routing & pages

**Location:** `src/app/page.tsx`, `src/app/contact/page.tsx`, `src/app/events/page.tsx`, `src/app/playlists/page.tsx`, `src/app/playlists/archive/page.tsx`, `src/app/playlists/archive/all/page.tsx`, `src/app/recordings/page.tsx`, `src/app/sitemap.ts`

**Summary**
- Routes: `/`, `/contact/`, `/events/`, `/playlists/`, `/playlists/archive/`, `/playlists/archive/all/`, `/recordings/`.
- All pages use shared layout; most are server components except Home and Contact (client for video and form).

**Findings**
- **Good:** Per-route `metadata` (title) where used; sitemap includes main URLs with `changeFrequency` and `priority`.
- **Trailing slash:** With `trailingSlash: true`, internal links should use trailing slashes. In `playlists/archive/page.tsx` the link is `href="/playlists/archive/all"`. Prefer `href="/playlists/archive/all/"` (or use Next.js `Link` and ensure consistency) so the URL matches the exported path.
- **Sitemap:** `dynamic = "force-static"` and `revalidate` are irrelevant for full static export; they don’t cause problems but can be removed for clarity.
- **Events:** `events` array is empty; page correctly shows fallback links (Marshall, Madison County CCLC). Good UX.

---

## 4. Home page & hero

**Location:** `src/app/page.tsx`

**Summary**
- Client component: hero with background image + video, fallback to GIF on error/mobile when autoplay fails; “This Week’s Tracks” via `TracksThisWeek`.
- Two `useEffect`s: one for video load/error and one that toggles visibility every 20s.

**Findings**
- **Good:** `aria-labelledby="hero-title"`, `aria-hidden` on decorative media, Listen Live / Show Archive buttons with `aria-label`, external links `rel="noreferrer noopener"`.
- **Logic:** The 20s interval toggles `isVideoVisible` between video and background image. The first effect also sets `isVideoVisible` on canplay/error. The two can conflict (e.g. error sets `false`, then timer sets `true` again). Consider a single source of truth (e.g. “display mode” state) or only using the timer when video is actually playing.
- **Good:** `playsInline` and muted for iOS; fallback to GIF on mobile when autoplay fails.
- **Console:** `console.error` is used; ESLint allows `error`. Fine for dev; consider a small logging abstraction if you want to avoid console in production.

---

## 5. Components

**Location:** `src/components/Header.tsx`, `Footer.tsx`, `TracksThisWeek.tsx`, `PlaylistsList.tsx`, `RecordingsList.tsx`, `LatestTracksCard.tsx`, `LogoShowcase.tsx`

**Summary**
- **Header:** Sticky nav, logo, WART link, Listen Live, nav links; active state via `usePathname()`.
- **Footer:** Copyright, WART link, schedule, Contact link.
- **TracksThisWeek / LatestTracksCard:** Use `useTracks()`; show loading/empty/list.
- **PlaylistsList:** Uses `usePlaylists()`, supports `showAll`, `excludeCurrent`, `limit`.
- **RecordingsList:** Uses `useRecordings()`; empty state links to Archive.org.
- **LogoShowcase:** Renders a fixed list of logo paths (no runtime check).

**Findings**
- **Good:** Header `aria-label="Primary navigation"`, `aria-current="page"` on active link; Footer and list sections are semantic.
- **PlaylistsList:** Sort is `(a, b) => (a.id < b.id ? 1 : -1)`. For strict descending order by `id`, prefer `b.id.localeCompare(a.id)` or compare dates if `id` is ISO date.
- **RecordingsList:** `<audio>` has no `aria-label`. Adding one (e.g. “Play recording: {title}”) would help a11y.
- **LogoShowcase:** Always shows three placeholder images; if files are missing they 404. Comment in code explains this. Consider conditional render when you have a way to know assets exist (e.g. build-time list or single known logo).
- **Footer:** Uses inline `style={{ fontWeight: 200 }}`; could use a Tailwind class (e.g. `font-extralight` or a custom utility) for consistency.

---

## 6. Data layer

**Location:** `src/data/playlists.ts`, `recordings.ts`, `events.ts`; `src/hooks/useTracks.ts`, `usePlaylists.ts`, `useRecordings.ts`; `src/lib/csv.ts`, `feeds.ts`; `src/types/content.ts`

**Summary**
- **Types:** `Track`, `Playlist`, `Recording`, `EventItem` in `content.ts` (clear and consistent).
- **Data:** `playlists` has many entries; `recordings` and `events` are empty; used as fallback when env URLs are unset.
- **Hooks:** Each hook uses local data as initial state, then in `useEffect` fetches from `NEXT_PUBLIC_*_CSV_URL` if set; cancellation on unmount; loading state.
- **Parsing:** `csv.ts` handles quoted fields and commas; `feeds.ts` uses it for playlists and recordings.

**Findings**
- **Good:** Cancellation in hooks avoids setState after unmount; `loading` is set and cleared in `finally` with `!cancelled` check.
- **usePlaylists / useRecordings:** On fetch error they `.catch(() => {})` and still call `setLoading(false)`. Data stays as local fallback. Consider logging the error (at least in dev) or surfacing a soft error state.
- **useTracks:** Logs `console.error` on fetch error; does not set an error state in UI. Consistent with other hooks; consider a shared pattern (e.g. optional `error` in return).
- **feeds.ts:** `fetchPlaylistsFromCsv` / `fetchRecordingsFromCsv` do not validate required fields; missing `id` or `audioUrl` could produce bad data. Optional: validate or normalize and log.
- **Backup files:** `playlists.ts.backup.*` in `src/data/` are likely not desired in the repo; add to `.gitignore` or move to a non-src location.

---

## 7. Contact & form

**Location:** `src/app/contact/page.tsx`, `src/types/recaptcha.d.ts`

**Summary**
- reCAPTCHA v3 with Formspree; cleanup of reCAPTCHA DOM on unmount; success/error messages; button disabled until reCAPTCHA ready and while submitting.

**Findings**
- **Security / config:** `RECAPTCHA_SITE_KEY` and Formspree endpoint (`https://formspree.io/f/movnkqbe`) are hardcoded. For flexibility and to avoid leaking endpoint in public repos, move to env (e.g. `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, Formspree as server-side or env if you add an API route later). reCAPTCHA site key is public by design; Formspree form ID is also public but often preferred in env.
- **Good:** `window.grecaptcha` typed in `recaptcha.d.ts`; cleanup on unmount avoids duplicate badges when navigating.
- **a11y:** Form labels are associated; consider `aria-live` for status messages so screen readers announce success/error.
- **Success/error styles:** Uses green/red background and border; contrast is okay but could be checked against WCAG for the exact shades.

---

## 8. Styling & design

**Location:** `src/app/globals.css`

**Summary**
- CSS variables for colors, spacing, typography, radius, shadows; Tailwind `@theme inline`; hero, cards, section headings, buttons, stripes, geometric patterns; reduced-motion and reduced-data media queries.

**Findings**
- **Bug:** `.muted` uses undefined `--rasta-gold` (see App shell).
- **Good:** Themed buttons (`.btn-primary`, `.btn-secondary`, `.btn-live`), focus-visible outline, card and section-heading styles.
- **Duplication:** `.card` and `.card-playlist` share the same block; could be a single class with a modifier or a shared mixin/utility.
- **Consistency:** Some components use `font-[family-name:var(--font-reggae-one)]` etc. Consider small utility classes (e.g. `.font-display`, `.font-decorative`) to avoid repetition and typos.

---

## 9. Testing

**Location:** `src/__tests__/*.test.tsx`, `src/__tests__/csv.test.ts`, `e2e/home.spec.ts`, `e2e/navigation.spec.ts`, `jest.config.js`, `jest.setup.js`, `playwright.config.ts`

**Summary**
- Unit: Header, Footer, PlaylistsList, TracksThisWeek, `parseCsv`; hooks mocked where needed; Jest + RTL; coverage thresholds 50%.
- E2E: Home (hero, Listen Live, Show Archive, mobile), Navigation (links, active state, a11y); Playwright with Chromium/Firefox/WebKit and mobile; `webServer` starts dev server.

**Findings**
- **Good:** Meaningful assertions (roles, labels, URLs); navigation test checks active class; csv tests cover quotes and edge cases.
- **Jest:** Global mock of `usePathname` in `jest.setup.js` returns `'/'`; Header test also mocks `next/navigation`. Redundant but harmless.
- **TracksThisWeek test:** Mutates `process.env.NEXT_PUBLIC_TRACKS_CSV_URL` in one test and deletes it in another; can affect other tests if run in parallel. Prefer `beforeEach`/`afterEach` or a single env setup so order doesn’t matter.
- **E2E:** Navigation test expects “Playlists” link to have class containing `'bg-black'`; if design changes this may break. Prefer testing visible active state (e.g. “current page” text or `aria-current`) rather than a specific class.
- **CI:** E2E are not in the CI workflow (only lint, tsc, unit tests, build). Adding a job that runs `npm run test:e2e` (with the existing `webServer`) would catch regressions.

---

## 10. GitHub Actions & deployment

**Location:** `theisland/.github/workflows/deploy.yml`, `theisland/web/.github/workflows/ci.yml`, `deploy.yml`, `validate-playlist.yml`

**Summary**
- **Root repo (`theisland`):** One workflow – build from `web`, upload `web/out`, deploy to GitHub Pages; passes CSV URLs via vars/secrets; no test step.
- **Inside `web/`:** CI (lint, tsc, unit tests with coverage, build, check for `out/`); Deploy (test then build, upload `web/out`, deploy); Validate-playlist (on playlist file changes, checks structure and duplicate IDs).

**Findings**
- **Which workflow runs:** Depends on repo root. If root is `theisland`, only `theisland/.github` runs (single deploy, no tests). If root is `theisland/web`, only `web/.github` runs (CI + deploy + validate-playlist). Ensure the repo that’s actually connected to GitHub Pages uses the workflow you want (with or without tests).
- **Root deploy:** No lint/typecheck/test; build can succeed with regressions. Consider adding a test job (or reusing the same workflow as in `web/.github`).
- **Deploy workflow (web):** Uses `path: web/out`; correct when run from repo root `theisland` (build runs in `working-directory: web`).
- **Validate-playlist:** Runs `npx tsc --noEmit src/data/playlists.ts` from `web`; that only type-checks that file in isolation. Full `npx tsc --noEmit` is already in CI; this is an extra sanity check. Good.
- **CNAME:** `public/CNAME` contains `theisland.radio.fm`; static export will copy it to `out/`. Correct for custom domain on Pages.

---

## 11. Repo hygiene & docs

**Location:** `.gitignore`, `.husky/`, `commitlint.config.js`, `README.md`, `MIGRATION_PLAN.md` (root)

**Summary**
- Husky + Commitlint enforce conventional commits; README explains dev, tests, build, playlist/CSV, archival, and deployment.

**Findings**
- **Good:** Commitlint rules (type-enum, subject rules, body leading blank); README is detailed.
- **Backups:** Ignore `*.backup.*` in `src/data/` or stop committing them (see Data layer).
- **README:** Says “Key routes: … `/playlists/archive/all`”; with `trailingSlash: true`, the canonical URL is `/playlists/archive/all/`. Minor doc fix.

---

## 12. Security & environment

**Summary**
- **Public env:** `NEXT_PUBLIC_*` are baked into client bundle; only use for non-secret config (e.g. CSV URLs, GA ID, reCAPTCHA site key).
- **Secrets:** No app secrets in repo; Formspree and reCAPTCHA keys are public by design. GitHub vars/secrets used for CSV URLs in deploy are appropriate.
- **Contact:** Moving Formspree form ID and reCAPTCHA site key to env is recommended for clarity and multi-environment support.

---

## Priority summary

| Priority | Item |
|----------|------|
| **Fix** | `globals.css`: change `.muted` from `--rasta-gold` to `--island-gold` (or define `--rasta-gold`). |
| **Fix** | Internal link to all playlists: use `href="/playlists/archive/all/"` (or Next `Link`) for `trailingSlash: true`. |
| **Improve** | Contact: move reCAPTCHA site key (and optionally Formspree ID) to env vars. |
| **Improve** | Hero: clarify or refactor the two `useEffect`s that both set `isVideoVisible` to avoid conflicting behavior. |
| **Improve** | Data hooks: log or surface fetch errors instead of silent `.catch(() => {})`. |
| **Improve** | Add skip link in layout; add `aria-label` on `<audio>` in RecordingsList; consider `aria-live` for contact form messages. |
| **Optional** | Ignore or move `src/data/playlists.ts.backup.*`; add E2E to CI; unify deploy workflow (single place that runs tests + build). |

---

*Code review complete. App is in good shape for a static export SPA on GitHub Pages; the items above are targeted fixes and incremental improvements.*

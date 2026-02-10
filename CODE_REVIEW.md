# Code Review: The Island Radio Show Website

**Review date:** February 10, 2026  
**Scope:** `theisland` repo (Next.js static site for theisland.radio.fm)  
**Review approach:** Six focused “subagent” perspectives (architecture, security, frontend/UX, data & types, performance & deployment, code quality).

---

## 1. Architecture & project structure (Subagent: Structure)

### Strengths
- **Clear separation:** `app/` (routes), `components/`, `data/`, `hooks/`, `lib/`, `types/` are well separated.
- **Static export:** `next.config.ts` correctly uses `output: "export"` and `trailingSlash: true` for GitHub Pages.
- **Consistent routing:** Playlists flow (index → archive → archive/all) is logical.

### Issues & recommendations

| Item | Severity | Details |
|------|----------|---------|
| **Backup files in `src/data/`** | Medium | `playlists.ts.backup.2025-10-11` and `playlists.ts.backup.2025-10-18` live under `src/`. They’re covered by `.gitignore` (`.backup`) but shouldn’t live in source. Prefer a script that writes backups outside `src/` (e.g. `web/backups/` or project root `tmp/`) and ensure those paths are gitignored. |
| **Plan vs. implementation** | Low | Development plan mentions `components/ui/`, `components/layout/`, `components/features/` and barrel `index.ts` files. Current structure is flatter (no `ui/`, `layout/`, `features/`). Either align the plan with the current structure or gradually introduce the planned folders as the codebase grows. |
| **Sitemap `dynamic` / `revalidate`** | Low | With `output: 'export'`, all pages are static at build time. `dynamic = "force-static"` and `revalidate` have no effect for static export. They don’t hurt but can be removed to avoid confusion. |

---

## 2. Security & GitHub safety (Subagent: Security)

### Strengths
- Root and `web/` `.gitignore` cover `.env*`, `node_modules/`, build outputs, and common secrets (e.g. `*.key`, `*.pem`).
- GA ID is correctly gated: `NEXT_PUBLIC_GA_ID` is only used when set; no hardcoded GA ID.
- reCAPTCHA v3 is used on the contact form to reduce abuse.

### Issues & recommendations

| Item | Severity | Details |
|------|----------|---------|
| **Hardcoded reCAPTCHA site key** | Medium | `web/src/app/contact/page.tsx` line 6: `RECAPTCHA_SITE_KEY = "6LdDWMErAAAAAHXrUTKEYmc_WpT_VQPdG0mCnBTy"`. Site keys are public by design, but per workspace rules secrets/config should use env vars. Move to e.g. `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and document in `.env.example`. |
| **Hardcoded Formspree endpoint** | Medium | Contact page uses `https://formspree.io/f/movnkqbe`. Prefer `NEXT_PUBLIC_FORMSPREE_FORM_ID` (or full URL in env) so the form target can change per environment without code changes. |
| **Silent catch in hooks** | Low | `usePlaylists` and `useRecordings` use `.catch(() => {})`, so CSV fetch failures are invisible. Consider at least a dev-only `console.warn` or a small error reporting path so misconfiguration (e.g. wrong CSV URL) is debuggable. |

**Pre-commit checklist (from workspace rules):** Ensure no `.env` or real secrets are staged; backup files under `src/` should not be committed (and ideally moved out of `src/`).

---

## 3. Frontend, UI & accessibility (Subagent: Frontend)

### Strengths
- **Semantic structure:** Home hero uses `aria-labelledby` and `id="hero-title"`; sections use `<section>` and headings.
- **External links:** `target="_blank"` is paired with `rel="noreferrer noopener"` where checked.
- **Focus styles:** Buttons use `focus-visible:ring-*` and `outline` for keyboard users.
- **Reduced data:** `@media (prefers-reduced-data: reduce)` in `globals.css` replaces the hero image with a gradient.
- **Theme:** Rasta/island colors and CSS variables match the project rules; `.heading-rasta` and stripe accents give clear branding.

### Issues & recommendations

| Item | Severity | Details |
|------|----------|---------|
| **Contact form labels** | Low | Inputs use a single `<label>` wrapping both label text and `<input>`. Consider explicit `htmlFor` and `id` on inputs for better screen reader association and tap targets. |
| **Header active state** | Low | Active nav link uses `text-white`; contrast on the current header background may be fine but worth checking against WCAG AA (e.g. in dark/light variants). |
| **Playlists page comment** | Trivial | Comment says “Show the most recent playlist (September 5, 2025)” but data is dynamic; remove the date or rephrase to “most recent playlist” only. |
| **Duplicate “Listen Live”** | Low | “Listen Live” appears in both Header and Home hero. Intentional for prominence; ensure the two links stay in sync (same URL). |

---

## 4. Data layer & types (Subagent: Data)

### Strengths
- **Shared types:** `types/content.ts` defines `Track`, `Playlist`, `Recording`, `EventItem` and is imported by data and components.
- **CSV pipeline:** `lib/csv.ts` and `lib/feeds.ts` give a clear path from CSV URLs to playlists/recordings; `parseTracksField` handles “Artist - Title (Album)” and newline/semicolon.
- **Graceful fallback:** When `NEXT_PUBLIC_PLAYLISTS_CSV_URL` (or recordings/tracks URLs) are unset, hooks fall back to local data without breaking the UI.

### Issues & recommendations

| Item | Severity | Details |
|------|----------|---------|
| **Track shape in `useTracks`** | Medium | `useTracks` builds objects as `{ title, artist, album }` (title first), while `Track` in `content.ts` is `{ artist, title, album? }`. The code assigns to `r.Title`, `r.Artist`, `r.Album` then returns `{ title, artist, album }`, so the runtime shape matches, but the type assertion `as Track` is loose. Prefer building the object with the correct keys and typing the CSV row (e.g. `Record<string, string>`) so the mapping is type-safe. |
| **Playlist sort** | Low | `PlaylistsList` and `usePlaylists` both sort by `id` (desc). Consider a single source of truth: e.g. sort once in the hook and treat “playlists from hook” as already sorted. |
| **Empty recordings/events** | Low | `recordings.ts` and `events.ts` export empty arrays; events page correctly shows external links when `events.length === 0`. No change required; just confirming behavior is intentional. |

---

## 5. Performance & deployment (Subagent: DevOps)

### Strengths
- **GitHub Actions:** Two-job workflow (build → deploy) with `actions/upload-pages-artifact` and `actions/deploy-pages` is the right pattern for GitHub Pages.
- **CNAME:** `public/CNAME` with `theisland.radio.fm` is present for custom domain.
- **Images:** `images: { unoptimized: true }` is appropriate for static export on GitHub Pages.

### Issues & recommendations

| Item | Severity | Details |
|------|----------|---------|
| **`npx next export` in workflow** | High | In Next.js 15 the `next export` CLI command was removed. With `output: 'export'` in `next.config.ts`, `npm run build` already produces `out/`. The workflow runs `npm run build && npx next export`; the second part can fail or be invalid. **Fix:** Use only `npm run build` and publish `web/out` (or the path your artifact uses). Remove `npx next export` and the `"export": "next export"` script from `package.json` if unused elsewhere. |
| **`path: web/out`** | Check | Workflow uploads `path: web/out`. Ensure the build is run with `working-directory: web` so that `out/` is created at `web/out/`. Current `working-directory: web` on Install and Build steps is correct. |
| **Sitemap in static export** | Low | Sitemap is generated at build time; no runtime revalidation. Fine for static export. Optional: add more routes if you add dynamic playlist/recording detail pages later. |

---

## 6. Code quality, DRY & maintainability (Subagent: Quality)

### Strengths
- **Early returns:** Contact form and components use early returns for loading/error/empty states.
- **Reusable components:** `PlaylistsList` is reused on index, archive, and archive/all with `showAll`, `excludeCurrent`, and `limit`.
- **Consistent styling:** Shared classes (e.g. `card card-dark`, `section-heading`, `btn btn-primary`) keep UI consistent.
- **ESLint:** `no-console` warn (with allow for warn/error) and Next config are in place.

### Issues & recommendations

| Item | Severity | Details |
|------|----------|---------|
| **Page header duplication** | Low | Playlists, Recordings, Events, Contact each repeat a similar header pattern (title + optional subtitle + optional description list). Consider a small `<PageHeader title="..." subtitle="..." />` or shared layout to reduce duplication. |
| **`(window as any).grecaptcha`** | Low | Contact page uses `(window as any).grecaptcha`. You have `types/recaptcha.d.ts` extending `Window` with `grecaptcha`; ensure the global is applied so you can drop the `as any` (and avoid disabling the lint rule). |
| **Key in list** | Low | `PlaylistsList` uses `key={i}` for tracks; `PlaylistsList` uses `key={p.id}` for playlists. Prefer a stable key for tracks when possible (e.g. `${t.artist}-${t.title}` or `i` only when list is static), and document why if you keep index. |
| **useTracks `console.error`** | Low | `useTracks` logs on fetch error; other hooks swallow errors. Either add consistent minimal logging (e.g. `console.warn`) in all three hooks or centralize a tiny error reporter. |

---

## Summary: Priority actions

1. **High:** Fix deployment: remove `npx next export` from the GitHub Actions workflow and rely on `npm run build` with `output: 'export'`.
2. **Medium:** Move reCAPTCHA site key and Formspree form ID to env vars (e.g. `NEXT_PUBLIC_*`) and document in `.env.example`.
3. **Medium:** Remove or relocate backup files from `src/data/` (e.g. write to `web/backups/` or `tmp/` and keep gitignored).
4. **Low:** Align `useTracks` CSV row typing with `Track` and avoid broad `as Track`; add optional dev logging or error path for CSV fetch failures in hooks.
5. **Low:** Small UX/consistency wins: page header component, update playlists comment, verify sitemap/static config.

---

## Checklist (from development plan)

- [ ] All pages responsive (assumed; not fully tested in this review).
- [ ] Audio player: `RecordingsList` uses native `<audio>` with `controls` and `preload="none"`.
- [ ] Contact form: working with Formspree + reCAPTCHA; move IDs to env.
- [ ] SEO: metadata and `metadataBase` set in layout; sitemap present.
- [ ] Performance: static export and minimal client JS; consider Lighthouse run.
- [ ] Accessibility: semantic HTML and focus styles in place; high-contrast option not implemented (optional per plan).
- [ ] Domain/SSL: CNAME and GitHub Pages config to be verified in repo settings.

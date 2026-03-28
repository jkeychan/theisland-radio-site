# island-show: Post-Show Automation Script

**Date:** 2026-03-28
**Status:** Approved

## Problem

After each Friday show, the following steps are done manually:

1. Download exportify CSV → clean up in Google Sheets (delete columns, replace `;` with `, `, make public, re-download)
2. Open WART MP3 in Audacity → set ID3 tags, rename file, save
3. Run ffmpeg manually to embed cover art
4. Run `archive-playlist.js` from the web directory
5. Upload to archive.org via browser

Goal: reduce this to one command run from the show folder, with only two manual prerequisites (download exportify CSV, download WART recording).

---

## Fixed Paths (constants at top of script)

```js
const WEB_DIR  = '/Users/jeff/Documents/Code/Git-Managed/theisland/web'
const SHOW_DIR = '/Users/jeff/Documents/The Island'
const ARCHIVES = '/Users/jeff/Documents/The Island/SHOW ARCHIVES'
const WART_DIR = '/Users/jeff/Documents/The Island/SHOW ARCHIVES/downloaded from WART'
const LOGO     = '/Users/jeff/Documents/The Island/SHOW ARCHIVES/dub-tractor-theisland-logo.png'
```

---

## Script Location & Global Access

- Lives at `web/island-show.js` (version-controlled in the git repo)
- Symlinked to `~/bin/island-show` for global access
- Has a `#!/usr/bin/env node` shebang and is chmod +x

---

## Invocation

Typical usage — run from the show folder with no arguments:

```bash
cd ~/Documents/The\ Island/The\ Island\ April\ 3\ 2026
island-show
```

All overrides are optional:

```
--csv <file>          Explicit CSV path (default: auto-detect exportify CSV in cwd)
--wart <file>         Explicit WART MP3 path (default: auto-detect by date in WART_DIR)
--trim-start HH:MM:SS Start trim point for ffmpeg (default: no trim)
--trim-end HH:MM:SS   End trim point for ffmpeg (default: no trim)
--no-mp3              Skip the ffmpeg/MP3 step
--no-website          Skip the playlists.ts update step
--no-upload           Skip the archive.org upload step
--force-mp3           Overwrite output MP3 if it already exists
```

---

## Auto-Detection

**Date** — parsed from the current working directory name.
Pattern: `The Island [Month] [D] [YYYY]` → `YYYY-MM-DD`

**Exportify CSV** — the CSV file in the current folder with the most columns (identifiable by having `Track Name`, `Artist Name(s)` headers). Falls back to any `.csv` if only one exists. Error if ambiguous.

**WART MP3** — looks in `WART_DIR` for a file matching `YYMMDD_*.mp3` where YYMMDD is derived from the show date. Error if none or multiple match; user specifies `--wart`.

---

## Step 1: Parse Exportify CSV

- Reads raw exportify CSV (columns: `Track Name`, `Artist Name(s)`, `Album Name`, + many others)
- Extracts only: Title (`Track Name`), Artist (`Artist Name(s)`), Album (`Album Name`)
- Replaces `;` with `, ` in artist names (Spotify multi-artist separator)
- Produces cleaned records identical to what the Google Sheets step previously produced
- Skips Google Sheets entirely

---

## Step 2: Process MP3

Runs a single ffmpeg pass:
- Input: WART file (e.g. `260327_0161.mp3`)
- Trim: if `--trim-start` / `--trim-end` provided, applies `-ss` / `-to`
- Cover art: embeds `dub-tractor-theisland-logo.png`
- ID3 tags (exact format matching existing files):
  - `title`: `The Island with Dub Tractor - March 27 2026` (no comma, no zero-pad on day)
  - `artist`: `Dub Tractor`
  - `album`: `The Island`
  - `date`: `2026` (year only)
  - `track`: `1`
  - `genre`: `Dub Reggae`
  - `id3v2_version`: `3`
- Output: `ARCHIVES/The Island with Dub Tractor - March 27 2026.mp3`
- Skipped with warning if output already exists (use `--force-mp3` to overwrite)

---

## Step 3: Update Website

Delegates to existing `archive-playlist.js` logic (imported as a module, not shell-called):
- Generates pipe-delimited tracklist (`The Island March 27, 2026_archive.txt`) written to the show folder (cwd)
- Prepends new entry to `web/src/data/playlists.ts` with:
  - `id`, `title`, `archiveUrl` (auto-generated from date), `description`, `tracks`
- Skips if date already exists in playlists.ts

---

## Step 4: Upload to Archive.org

Uses the `ia` CLI (must be installed: `uv tool install internetarchive` and configured: `ia configure`).

Metadata uploaded (identical to current manual process):
- `mediatype`: `audio`
- `title`: `The Island with Dub Tractor - March 27, 2026` (with comma — archive.org title format)
- `description`: auto-generated from first 3 artists in tracklist
- `subject`: `wartfm`, `dub`, `reggae`, `community radio`
- `date`: `2026-03-27`
- `collection`: `opensource_audio`

Files uploaded: the processed MP3 + the pipe-delimited `_archive.txt`.

---

## Output Summary

At the end the script prints what it did and what it skipped, e.g.:

```
[SUCCESS] MP3:     The Island with Dub Tractor - March 27 2026.mp3
[SUCCESS] Website: playlists.ts updated
[SUCCESS] Upload:  https://archive.org/details/the-island-with-dub-tractor-march-27-2026
```

---

## Error Handling

| Condition | Behavior |
|---|---|
| No CSV found in cwd | Exit with message; suggest `--csv` |
| Multiple CSVs, ambiguous | Exit with list; suggest `--csv` |
| No WART file matches date | Exit with message; suggest `--wart` |
| Multiple WART files match | Exit listing them; suggest `--wart` |
| Output MP3 already exists | Skip step with warning; use `--force-mp3` to overwrite |
| playlists.ts already has date | Skip silently |
| `ia` not installed/configured | Print install instructions; exit before uploading |
| Network/archive.org error | `ia` reports its own error; prior steps already complete |

---

## Not In Scope (future)

- Bulk metadata update of existing archive.org items via `ia`
- Audacity replacement for audio editing beyond trimming
- Automatic WART download
- Automatic Exportify/Spotify playlist pull

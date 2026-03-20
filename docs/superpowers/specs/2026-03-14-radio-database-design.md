# Radio Show Database — Design Spec
**Date:** 2026-03-14
**Status:** Approved

---

## Overview

A local SQLite database and Python CLI for storing every track played on The Island radio show. The goal is to enable play-count queries, artist frequency analysis, and show history browsing — queryable by a human or a Claude agent. Built local-first with a clear, low-friction migration path to a cloud-hosted Postgres database when ready.

---

## Goals

- Store all historical and future show data (shows, tracks, artists)
- Support insights: play counts, artist frequency, show history, tempo/energy trends
- Enrich track metadata via Exportify CSV exports (BPM, energy, release date, Spotify ID, etc.)
- CLI designed for both human use (rich tables) and machine use (JSON/CSV/plain output)
- Zero impact on the existing GitHub Pages site until deliberately wired up
- Cloud-ready schema and config from day one

---

## Non-Goals (this phase)

- Public-facing API or website integration
- Audio file management
- Automated ingestion (beyond importing from existing CSVs, `playlists.ts`, and Exportify exports)
- Direct Spotify API integration (Exportify CSVs cover the needed data without OAuth)

---

## Repository Structure

```
theisland/
├── web/                    # existing Next.js site — unchanged
└── db/
    ├── cli.py              # CLI entry point
    ├── schema.sql          # declarative schema (version-controlled)
    ├── config.toml         # local config — DB path, DATABASE_URL (gitignored)
    ├── requirements.txt    # Python deps: click, rich, requests (tomllib is stdlib 3.11+)
    ├── importers/
    │   ├── from_playlists_ts.py     # one-time import of existing playlists.ts data
    │   ├── from_csv.py              # import from generic CSV files (existing workflow)
    │   └── from_exportify_csv.py    # import rich metadata from Exportify exports
    └── queries/
        ├── top_artists.sql
        ├── play_count.sql
        ├── show_history.sql
        ├── bpm_trends.sql
        └── release_year_spread.sql
```

`radio.db` lives at the path specified in `config.toml` and is gitignored.

---

## Schema

The schema targets SQLite for local use. For Postgres migration, `INTEGER PRIMARY KEY` auto-increment syntax differs (`SERIAL` or `GENERATED ALWAYS AS IDENTITY`) — noted in the migration section. All other SQL is ANSI-compatible.

Foreign key enforcement must be explicitly enabled in SQLite: `PRAGMA foreign_keys = ON` — the CLI sets this on every connection.

**Minimum Python version: 3.11+**

### `shows`

```sql
CREATE TABLE shows (
    id               TEXT     PRIMARY KEY,  -- ISO date: "2026-03-13" (one show per date by design)
    aired_at         DATE     NOT NULL,
    archive_url      TEXT,
    description      TEXT,
    duration_seconds INTEGER,               -- show length; auto-filled via fetch-meta if archive_url set
    archive_downloads INTEGER               -- download count from archive.org metadata API
);
```

Note: no `title` column — display names are derived from `aired_at`. The show is always "The Island." One show per date is an intentional constraint; if this ever needs to change, the `id` scheme will be revisited.

### `tracks`

```sql
CREATE TABLE tracks (
    id              INTEGER PRIMARY KEY,  -- AUTOINCREMENT in SQLite; SERIAL/IDENTITY in Postgres
    title           TEXT    NOT NULL,
    album           TEXT,
    raw_artist      TEXT    NOT NULL,     -- original string exactly as entered, e.g. "Chase & Status, Bou, Flowdan"
    -- Spotify/Exportify enrichment fields (all nullable — populated when available)
    spotify_id      TEXT    UNIQUE,       -- Spotify track URI/ID; enables dedup and deep linking
    duration_ms     INTEGER,              -- track length in milliseconds
    release_date    TEXT,                 -- album release date stored as-is from Spotify (YYYY, YYYY-MM, or YYYY-MM-DD);
                                          --   all release-year queries extract the leading 4 characters: substr(release_date, 1, 4)
    bpm             REAL,                 -- tempo in beats per minute
    energy          REAL,                 -- Spotify audio feature: 0.0–1.0
    danceability    REAL,                 -- Spotify audio feature: 0.0–1.0
    musical_key     INTEGER,              -- Spotify pitch class notation: 0=C … 11=B; -1=undetected; NULL=unknown
    mode            INTEGER,              -- 0=minor, 1=major; -1=undetected; NULL=unknown
    genres          TEXT,                 -- comma-separated genre tags from Exportify (e.g. "reggae,dub")
    album_image_url TEXT,                 -- Spotify album art URL
    UNIQUE(raw_artist, title, album)      -- album included to allow distinct versions/remixes
);
```

### `artists`

```sql
CREATE TABLE artists (
    id      INTEGER PRIMARY KEY,  -- AUTOINCREMENT in SQLite; SERIAL/IDENTITY in Postgres
    name    TEXT    NOT NULL UNIQUE
);
```

### `track_artists`

```sql
CREATE TABLE track_artists (
    track_id    INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id   INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (track_id, artist_id)
);
```

### `show_tracks`

```sql
CREATE TABLE show_tracks (
    id          INTEGER PRIMARY KEY,  -- AUTOINCREMENT in SQLite; SERIAL/IDENTITY in Postgres
    show_id     TEXT    REFERENCES shows(id) ON DELETE CASCADE,
    track_id    INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL      -- track order within the show
);
```

### Artist Parsing Strategy

The importer stores the original `raw_artist` string on `tracks` unchanged. It also attempts to parse individual artist names and populate `artists` + `track_artists`. Parsing splits on `,`, ` & `, and `feat.`/`ft.` with whitespace trimming. If parsing produces ambiguous results, the raw string is still preserved and queries fall back to it. Manual correction is always possible via direct SQL.

---

## CLI

**Entry point:** `python db/cli.py <command> [options]`

### Output Modes (available on every command)

| Flag | Format | Use case |
|------|--------|----------|
| *(default)* | Rich table | Human reading |
| `--json` | JSON array/object | Claude agents, scripts |
| `--csv` | CSV with headers | Spreadsheet export |
| `--plain` | One item per line, no borders | Shell pipelines (`xargs`, `grep`, `sort`, `wc -l`) |

### Commands

```
shows list                          # all shows, newest first (includes id column)
shows search <query>                # search by ISO date prefix ("2026-03") or month name ("march") —
                                    #   month names are mapped to month numbers in application code,
                                    #   then matched against aired_at; case-insensitive
shows import --source <src> --file <path>
                                    #   --source: playlists-ts | csv | exportify
                                    #   --file: path to the source file
                                    #   runs the corresponding importer module
shows fetch-meta <show-id>          # pull runtime, downloads, description from archive.org API;
                                    #   writes to DB and prints updated fields; exits 0 on success,
                                    #   non-zero on failure with error on stderr; safe to run via xargs
shows update <show-id> [--field value ...]  # update individual fields on a show (e.g. --archive-url)

tracks search <query>               # search by title or raw_artist string
tracks top-artists [--limit N]      # artist frequency ranked by appearance count
tracks play-count <artist>          # total appearances across all shows
tracks history <artist>             # list of shows that featured this artist
tracks update <track-id> [--title <t>] [--album <a>] [--raw-artist <r>]  # correct track fields

stats summary                       # total shows, total track plays, unique artists, unique tracks
stats archive-downloads             # downloads per show from archive.org, ranked
stats bpm [--show <show-id>]        # average BPM per show, or BPM spread across all shows
stats energy [--show <show-id>]     # average energy score per show
stats release-years                 # distribution of track release years across all plays

db export [--format sql|csv|json]   # export full DB contents for backup or migration
```

### Shell Pipeline Examples

```bash
# Count unique parsed artists
python db/cli.py tracks top-artists --plain | wc -l

# All shows in 2025
python db/cli.py shows list --plain | grep "^2025"

# Fetch archive.org metadata for all shows
python db/cli.py shows list --plain | xargs -I{} python db/cli.py shows fetch-meta {}

# Find every show Mungo's Hi Fi appeared on
python db/cli.py tracks history "Mungo's Hi Fi" --json | jq '.[].show_id'
```

---

## Import Workflow

### Historical data (one-time)

`importers/from_playlists_ts.py` parses `web/src/data/playlists.ts` using regex and loads all 20 existing shows (~451 tracks) into the DB.

### Ongoing (new shows)

`importers/from_csv.py` reads the CSV files produced by the existing workflow (`convert-playlist.py`, `add-playlist.sh`) and upserts into the DB. This slots into the existing process with no changes to the site workflow.

### Spotify/Exportify enrichment

`importers/from_exportify_csv.py` reads a CSV exported from [Exportify](https://exportify.net) and enriches existing track records with Spotify metadata. Exportify exports include:

| Exportify Field | Maps to `tracks` column |
|---|---|
| `Spotify URI` | `spotify_id` |
| `Track Duration (ms)` | `duration_ms` |
| `Release Date` | `release_date` |
| `BPM` | `bpm` |
| `Energy` | `energy` |
| `Danceability` | `danceability` |
| `Key` | `musical_key` |
| `Mode` | `mode` |
| `Genres` | `genres` |
| `Album Image URL` | `album_image_url` |

The importer is invoked via `shows import --source exportify --file <path>`. It matches Exportify rows to existing `tracks` rows using this priority:

1. **Exact match on `spotify_id`** — most reliable
2. **Exact match on `(raw_artist, title)`** — case-insensitive
3. **No match** — row is logged to stderr and skipped; never auto-created

Enrichment is non-destructive — it only fills `NULL` columns. Pass `--overwrite` to replace existing values for Exportify-mapped columns only (`spotify_id`, `duration_ms`, `release_date`, `bpm`, `energy`, `danceability`, `musical_key`, `mode`, `genres`, `album_image_url`). `--overwrite` never touches `raw_artist`, `title`, or `album`. Unmatched rows are summarized at the end of the run.

### Manual entry

Direct SQL or a future `shows add` / `tracks add` CLI command (out of scope for v1 but the schema supports it).

---

## .gitignore Additions

Add to root `.gitignore`:

```
db/radio.db
db/__pycache__/
db/**/*.pyc
db/config.toml
db/.venv/
```

---

## Cloud Migration Path

### When to migrate

When you want the GitHub Pages site to query live show data, or when you want to access the DB from multiple machines.

### How to migrate

1. **Provision a Postgres database** — recommended free-tier options:
   - [Supabase](https://supabase.com) — Postgres + auto-generated REST API + good free tier
   - [Neon](https://neon.tech) — serverless Postgres, generous free tier
   - [Railway](https://railway.app) — simple Postgres hosting

2. **Update `config.toml`**:
   ```toml
   DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
   ```

3. **Swap the driver** — `sqlite3` → `psycopg2-binary`. All queries are ANSI SQL and run unchanged. The only schema change required: replace `INTEGER PRIMARY KEY` (SQLite auto-increment) with `SERIAL PRIMARY KEY` or `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY` in Postgres.

4. **Run the adapted `schema.sql`** against the new Postgres instance to initialize it.

5. **Export from SQLite and import to Postgres** — use `python db/cli.py db export --format sql` to dump data as INSERT statements, then load into Postgres. Note: the SQL output targets SQLite syntax; minor manual adjustments may be needed for `release_date` partial strings (`YYYY`, `YYYY-MM`) and comma-separated `genres` text if you later normalize those columns in Postgres. Additionally, after loading data, Postgres sequences for auto-increment columns must be reset to avoid `id` collisions on subsequent inserts: `SELECT setval('<table>_id_seq', (SELECT MAX(id) FROM <table>))` for each table.

### Public API layer (future phase)

GitHub Pages is a static host — it cannot run server-side code. To expose show data to the site, add a thin read-only API:

- **Recommended:** Supabase auto-generated REST API (zero additional code if using Supabase)
- **Alternative:** A Cloudflare Worker or Vercel serverless function that queries the DB and returns JSON

The Next.js site would call this API at build time (static generation) or at runtime (client-side fetch). No changes to the `web/` codebase are needed until this phase begins.

### Security note

The API layer must be **read-only**. Write access stays with the CLI only. If using Supabase, use Row Level Security (RLS) to enforce this with an `anon` key that has SELECT-only permissions.

---

## Dependencies

**Python version: 3.11+ required** (`tomllib` stdlib). Recommended: run in a venv (`python3 -m venv db/.venv`) so you can use any Python version installed on the machine — 3.13, 3.14, or whatever is current — without touching the system Python.

```
click>=8.1.8     # CLI framework
rich>=14.3.3     # terminal tables and formatting
requests>=2.32.5 # archive.org API calls
# tomllib — stdlib, no install needed on Python 3.11+
```

For cloud migration (not needed now):
```
psycopg2-binary  # Postgres driver (version pinned at migration time)
```

---

## Out of Scope / Future Considerations

- Direct Spotify API integration (OAuth flow, real-time data) — Exportify CSV covers the needed data
- Automated show ingestion (e.g. scraping archive.org for new uploads)
- Admin UI / web dashboard (deferred to post-cloud-migration phase)
- Listener analytics beyond archive.org download counts

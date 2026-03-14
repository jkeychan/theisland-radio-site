# Radio Show Database Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local SQLite database and Python CLI for storing and querying every track played on The Island radio show, with Exportify enrichment and a cloud migration path.

**Architecture:** Foundation layer (schema, config, DB connection, shared output, stub command files) built first as a sequential task, then 4 parallel subagents implement importers, shows commands, tracks commands, and stats+export commands independently in separate files. All importers are standalone modules; CLI command groups each live in their own file under `commands/`.

**Tech Stack:** Python 3.11+ (venv), SQLite (stdlib), click>=8.1.8, rich>=14.3.3, requests>=2.32.5, pytest for tests.

---

## File Map

```
db/
├── cli.py                       # entry point — registers command groups, nothing else
├── database.py                  # get_connection(), init_db(), FK pragma
├── config.py                    # load_config(), get_db_path()
├── output.py                    # shared output: table/json/csv/plain helpers
├── schema.sql                   # CREATE TABLE statements
├── requirements.txt             # click, rich, requests, pytest
├── config.toml.example          # committed template; user copies to config.toml
├── commands/
│   ├── __init__.py              # output_options decorator
│   ├── shows.py                 # shows group: list, search, import, fetch-meta, update
│   ├── tracks.py                # tracks group: search, top-artists, play-count, history, update
│   ├── stats.py                 # stats group: summary, archive-downloads, bpm, energy, release-years
│   └── db_cmds.py               # db group: init, export
├── importers/
│   ├── __init__.py
│   ├── artist_parser.py         # parse_artists() — shared by all importers
│   ├── from_playlists_ts.py     # parse web/src/data/playlists.ts
│   ├── from_csv.py              # generic CSV: Title,Artist,Album,Duration (ms)
│   └── from_exportify_csv.py    # Exportify enrichment CSV
├── queries/
│   ├── top_artists.sql
│   ├── play_count.sql
│   ├── show_history.sql
│   ├── bpm_trends.sql
│   └── release_year_spread.sql
└── tests/
    ├── __init__.py              # makes tests/ a package (required for cross-test imports)
    ├── conftest.py              # in-memory SQLite fixture, sample data helpers
    ├── test_database.py
    ├── test_config.py
    ├── test_artist_parser.py
    ├── test_importers.py
    ├── test_shows_commands.py
    ├── test_tracks_commands.py
    └── test_stats_commands.py
```

**Subagent file ownership (no overlap):**
- Foundation (sequential): everything except `commands/shows.py`, `commands/tracks.py`, `commands/stats.py`, `commands/db_cmds.py`, `importers/artist_parser.py`, `importers/from_*.py`, `tests/test_importers.py`, `tests/test_artist_parser.py`, `tests/test_shows_commands.py`, `tests/test_tracks_commands.py`, `tests/test_stats_commands.py`
- Subagent A — Importers: `importers/artist_parser.py`, `importers/from_playlists_ts.py`, `importers/from_csv.py`, `importers/from_exportify_csv.py`, `tests/test_artist_parser.py`, `tests/test_importers.py`
- Subagent B — Shows commands: `commands/shows.py`, `tests/test_shows_commands.py`
- Subagent C — Tracks commands: `commands/tracks.py`, `queries/top_artists.sql`, `queries/play_count.sql`, `queries/show_history.sql`, `tests/test_tracks_commands.py`
- Subagent D — Stats + DB export: `commands/stats.py`, `commands/db_cmds.py`, `queries/bpm_trends.sql`, `queries/release_year_spread.sql`, `tests/test_stats_commands.py`

---

## Chunk 1: Foundation

This chunk runs **sequentially first**. All subagents depend on it.

### Task 1: Scaffold the db/ directory

**Files:**
- Create: `db/requirements.txt`
- Create: `db/config.toml.example`
- Modify: `.gitignore` (root)

- [ ] **Step 1: Update root .gitignore**

Add to `/theisland/.gitignore`:
```
db/radio.db
db/__pycache__/
db/**/*.pyc
db/config.toml
db/.venv/
```

- [ ] **Step 2: Create requirements.txt**

Create `db/requirements.txt`:
```
click>=8.1.8
rich>=14.3.3
requests>=2.32.5
pytest>=8.0.0
```

- [ ] **Step 3: Create config template**

Create `db/config.toml.example`:
```toml
# Copy this file to config.toml and adjust as needed.
# config.toml is gitignored — never commit it.

[database]
# Path to the SQLite database file. Relative paths resolve from db/
path = "radio.db"

# Uncomment and set DATABASE_URL to switch to Postgres (cloud migration)
# DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
```

- [ ] **Step 4: Create and activate venv**

```bash
cd /path/to/theisland/db
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 5: Commit scaffold**

```bash
git add db/requirements.txt db/config.toml.example .gitignore
git commit -m "feat: scaffold db/ directory, requirements, gitignore"
```

---

### Task 2: Schema

**Files:**
- Create: `db/schema.sql`

- [ ] **Step 1: Write schema.sql**

Create `db/schema.sql`:
```sql
-- The Island Radio Show Database
-- SQLite schema. For Postgres: replace INTEGER PRIMARY KEY with SERIAL PRIMARY KEY.
-- Initialise with: python db/cli.py db init

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shows (
    id                TEXT     PRIMARY KEY,  -- ISO date "2026-03-13"; one show per date by design
    aired_at          DATE     NOT NULL,
    archive_url       TEXT,
    description       TEXT,
    duration_seconds  INTEGER,
    archive_downloads INTEGER
);

CREATE TABLE IF NOT EXISTS tracks (
    id              INTEGER PRIMARY KEY,
    title           TEXT    NOT NULL,
    album           TEXT,
    raw_artist      TEXT    NOT NULL,
    spotify_id      TEXT    UNIQUE,
    duration_ms     INTEGER,
    release_date    TEXT,   -- stored as-is (YYYY / YYYY-MM / YYYY-MM-DD); use substr(release_date,1,4)
    bpm             REAL,
    energy          REAL,
    danceability    REAL,
    musical_key     INTEGER,  -- 0=C…11=B; -1=undetected; NULL=unknown
    mode            INTEGER,  -- 0=minor, 1=major; -1=undetected; NULL=unknown
    genres          TEXT,     -- comma-separated
    album_image_url TEXT,
    UNIQUE(raw_artist, title, album)
);

CREATE TABLE IF NOT EXISTS artists (
    id   INTEGER PRIMARY KEY,
    name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS track_artists (
    track_id  INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (track_id, artist_id)
);

CREATE TABLE IF NOT EXISTS show_tracks (
    id       INTEGER PRIMARY KEY,
    show_id  TEXT    NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    UNIQUE(show_id, track_id, position)  -- enables idempotent re-import via ON CONFLICT DO NOTHING
);
```

- [ ] **Step 2: Commit schema**

```bash
git add db/schema.sql
git commit -m "feat: add SQLite schema"
```

---

### Task 3: Config and database modules + tests

**Files:**
- Create: `db/config.py`
- Create: `db/database.py`
- Create: `db/tests/__init__.py`
- Create: `db/tests/conftest.py`
- Create: `db/tests/test_config.py`
- Create: `db/tests/test_database.py`

- [ ] **Step 1: Write failing tests for config**

Create `db/tests/test_config.py`:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from config import get_db_path


def test_get_db_path_default(tmp_path, monkeypatch):
    """Default path resolves to radio.db sibling to config.py when no config.toml exists."""
    import config as cfg_mod
    monkeypatch.setattr(cfg_mod, "_CONFIG_PATH", tmp_path / "config.toml")
    path = get_db_path()
    assert path.endswith("radio.db")


def test_get_db_path_from_config(tmp_path, monkeypatch):
    """Reads path from config.toml when present."""
    config_file = tmp_path / "config.toml"
    config_file.write_text('[database]\npath = "/tmp/test_island.db"\n')
    import config as cfg_mod
    monkeypatch.setattr(cfg_mod, "_CONFIG_PATH", config_file)
    path = get_db_path()
    assert path == "/tmp/test_island.db"
```

- [ ] **Step 2: Write failing tests for database**

Create `db/tests/test_database.py`:
```python
import sqlite3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest


def test_init_db_creates_tables(tmp_db):
    """init_db() creates all 5 expected tables."""
    tables = {row[0] for row in tmp_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert tables == {"shows", "tracks", "artists", "track_artists", "show_tracks"}


def test_foreign_keys_enforced(tmp_db):
    """FK constraint rejects orphan show_tracks rows."""
    with pytest.raises(sqlite3.IntegrityError):
        tmp_db.execute(
            "INSERT INTO show_tracks (show_id, track_id, position) VALUES (?, ?, ?)",
            ("nonexistent", 999, 1)
        )
        tmp_db.commit()


def test_track_unique_constraint(tmp_db):
    """Duplicate (raw_artist, title, album) raises IntegrityError."""
    tmp_db.execute(
        "INSERT INTO tracks (title, raw_artist, album) VALUES (?, ?, ?)",
        ("Song", "Artist", "Album")
    )
    tmp_db.commit()
    with pytest.raises(sqlite3.IntegrityError):
        tmp_db.execute(
            "INSERT INTO tracks (title, raw_artist, album) VALUES (?, ?, ?)",
            ("Song", "Artist", "Album")
        )
        tmp_db.commit()


def test_show_tracks_unique_constraint(tmp_db):
    """Duplicate (show_id, track_id, position) is rejected."""
    from tests.conftest import insert_show, insert_track
    insert_show(tmp_db)
    tid = insert_track(tmp_db)
    tmp_db.execute(
        "INSERT INTO show_tracks (show_id, track_id, position) VALUES (?, ?, ?)",
        ("2026-01-01", tid, 1)
    )
    tmp_db.commit()
    with pytest.raises(sqlite3.IntegrityError):
        tmp_db.execute(
            "INSERT INTO show_tracks (show_id, track_id, position) VALUES (?, ?, ?)",
            ("2026-01-01", tid, 1)
        )
        tmp_db.commit()
```

- [ ] **Step 3: Write tests/__init__.py and conftest.py**

Create `db/tests/__init__.py`:
```python
# Makes tests/ importable as a package (required for `from tests.conftest import ...`)
```

Create `db/tests/conftest.py`:
```python
import sqlite3
import pytest
from pathlib import Path
import sys

# Add db/ to path so all modules are importable from tests
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def tmp_db():
    """In-memory SQLite DB with full schema applied and FK pragma on."""
    schema = (Path(__file__).parent.parent / "schema.sql").read_text()
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    for stmt in schema.split(";"):
        stmt = stmt.strip()
        if stmt and not stmt.upper().startswith("PRAGMA"):
            conn.execute(stmt)
    conn.commit()
    yield conn
    conn.close()


def insert_show(conn, show_id="2026-01-01", aired_at="2026-01-01"):
    conn.execute(
        "INSERT INTO shows (id, aired_at) VALUES (?, ?)",
        (show_id, aired_at)
    )
    conn.commit()


def insert_track(conn, title="Test Track", raw_artist="Test Artist", album="Test Album"):
    cur = conn.execute(
        "INSERT INTO tracks (title, raw_artist, album) VALUES (?, ?, ?)",
        (title, raw_artist, album)
    )
    conn.commit()
    return cur.lastrowid


def insert_show_track(conn, show_id, track_id, position=1):
    conn.execute(
        "INSERT INTO show_tracks (show_id, track_id, position) VALUES (?, ?, ?)",
        (show_id, track_id, position)
    )
    conn.commit()
```

- [ ] **Step 4: Run tests — expect failures**

```bash
cd db && source .venv/bin/activate
pytest tests/test_config.py tests/test_database.py -v
```
Expected: tests fail because `config.py` and `database.py` don't exist yet.

- [ ] **Step 5: Write config.py**

Create `db/config.py`:
```python
import tomllib
from pathlib import Path
from typing import Any

_CONFIG_PATH = Path(__file__).parent / "config.toml"


def load_config() -> dict[str, Any]:
    if not _CONFIG_PATH.exists():
        return {}
    with open(_CONFIG_PATH, "rb") as f:
        return tomllib.load(f)


def get_db_path() -> str:
    config = load_config()
    path = config.get("database", {}).get("path", "radio.db")
    p = Path(path)
    if not p.is_absolute():
        p = Path(__file__).parent / p
    return str(p)
```

- [ ] **Step 6: Write database.py**

Create `db/database.py`:
```python
import sqlite3
from pathlib import Path
from config import get_db_path


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    path = db_path or get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: str | None = None) -> None:
    schema = (Path(__file__).parent / "schema.sql").read_text()
    conn = get_connection(db_path)
    for stmt in schema.split(";"):
        stmt = stmt.strip()
        if stmt and not stmt.upper().startswith("PRAGMA"):
            conn.execute(stmt)
    conn.commit()
    conn.close()
```

- [ ] **Step 7: Run tests — expect pass**

```bash
pytest tests/test_config.py tests/test_database.py -v
```
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add db/config.py db/database.py db/tests/__init__.py db/tests/conftest.py db/tests/test_config.py db/tests/test_database.py
git commit -m "feat: add config, database modules and tests"
```

---

### Task 4: Shared output module + CLI skeleton + stub command files

**Files:**
- Create: `db/output.py`
- Create: `db/cli.py`
- Create: `db/commands/__init__.py`
- Create: `db/commands/shows.py` (stub)
- Create: `db/commands/tracks.py` (stub)
- Create: `db/commands/stats.py` (stub)
- Create: `db/commands/db_cmds.py` (stub)
- Create: `db/importers/__init__.py`
- Create: `db/queries/.gitkeep`

**Important:** Stub command files are created here so `cli.py` can import them immediately. Each subagent will fill in the real implementations.

- [ ] **Step 1: Write output.py**

Create `db/output.py`:
```python
"""Shared output helpers for all CLI commands.

Usage:
    from output import print_output
    print_output(rows, columns=["id", "aired_at"], fmt=fmt)

`fmt` is one of: "table" (default), "json", "csv", "plain".
`rows` is a list of dicts.
`plain_key` is the column to use for --plain mode (defaults to first column).
"""
import csv
import json
import sys
from typing import Any

from rich.console import Console
from rich.table import Table

console = Console()


def print_output(
    rows: list[dict[str, Any]],
    columns: list[str],
    fmt: str = "table",
    plain_key: str | None = None,
    title: str | None = None,
) -> None:
    if not rows:
        if fmt == "table":
            console.print("[dim]No results.[/dim]")
        return

    if fmt == "json":
        print(json.dumps(rows, indent=2, default=str))
    elif fmt == "csv":
        writer = csv.DictWriter(sys.stdout, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    elif fmt == "plain":
        key = plain_key or columns[0]
        for row in rows:
            print(row.get(key, ""))
    else:  # table (default)
        table = Table(title=title, show_header=True, header_style="bold")
        for col in columns:
            table.add_column(col)
        for row in rows:
            table.add_row(*[str(row.get(c, "") or "") for c in columns])
        console.print(table)
```

- [ ] **Step 2: Write commands/__init__.py**

Create `db/commands/__init__.py`:
```python
"""CLI command groups for The Island DB."""
import click


def output_options(func):
    """Decorator that adds --json, --csv, --plain, and --format flags to a command."""
    func = click.option("--plain", "fmt", flag_value="plain",
                        help="One item per line (for pipes).")(func)
    func = click.option("--csv", "fmt", flag_value="csv",
                        help="Output as CSV.")(func)
    func = click.option("--json", "fmt", flag_value="json",
                        help="Output as JSON.")(func)
    func = click.option("--format", "fmt", default="table",
                        type=click.Choice(["table", "json", "csv", "plain"]),
                        hidden=True)(func)
    return func
```

- [ ] **Step 3: Write stub command files**

These stubs define the click groups so `cli.py` can import them immediately. Subagents fill in the commands.

Create `db/commands/shows.py`:
```python
"""Shows command group — stub. Subagent B implements the full commands."""
import click


@click.group()
def shows():
    """Commands for managing shows."""
```

Create `db/commands/tracks.py`:
```python
"""Tracks command group — stub. Subagent C implements the full commands."""
import click


@click.group()
def tracks():
    """Commands for querying tracks."""
```

Create `db/commands/stats.py`:
```python
"""Stats command group — stub. Subagent D implements the full commands."""
import click


@click.group()
def stats():
    """Insight queries across all show data."""
```

Create `db/commands/db_cmds.py`:
```python
"""DB utility commands — stub. Subagent D implements the full commands."""
import click


@click.group("db")
def db():
    """Database utility commands."""
```

- [ ] **Step 4: Write cli.py**

Create `db/cli.py`:
```python
#!/usr/bin/env python3
"""The Island Radio Show CLI."""
import click
from commands.shows import shows
from commands.tracks import tracks
from commands.stats import stats
from commands.db_cmds import db


@click.group()
def cli():
    """The Island radio show database CLI."""


cli.add_command(shows)
cli.add_command(tracks)
cli.add_command(stats)
cli.add_command(db)

if __name__ == "__main__":
    cli()
```

- [ ] **Step 5: Write importers/__init__.py**

Create `db/importers/__init__.py`:
```python
"""Data importers for The Island radio show database."""
```

- [ ] **Step 6: Create queries directory**

```bash
mkdir -p db/queries
touch db/queries/.gitkeep
```

- [ ] **Step 7: Verify CLI skeleton works**

```bash
python db/cli.py --help
```
Expected: help text with shows, tracks, stats, db subcommands listed.

- [ ] **Step 8: Commit skeleton**

```bash
git add db/cli.py db/output.py db/commands/ db/importers/__init__.py db/queries/.gitkeep
git commit -m "feat: add CLI skeleton, output module, stub command files"
```

---

## Chunk 2: Importers (Subagent A)

**Context for subagent:** Work in `/theisland` on branch `feature/radio-database`. Foundation files already exist: `db/database.py`, `db/config.py`, `db/output.py`, `db/schema.sql`, `db/tests/__init__.py`, `db/tests/conftest.py`. The venv is at `db/.venv` — activate with `source db/.venv/bin/activate` before running pytest. Only touch: `db/importers/artist_parser.py`, `db/importers/from_playlists_ts.py`, `db/importers/from_csv.py`, `db/importers/from_exportify_csv.py`, `db/tests/test_artist_parser.py`, `db/tests/test_importers.py`.

**Spec:** `docs/superpowers/specs/2026-03-14-radio-database-design.md`

### Task 5: Artist parser

**Files:**
- Create: `db/importers/artist_parser.py`
- Create: `db/tests/test_artist_parser.py`

- [ ] **Step 1: Write failing tests**

Create `db/tests/test_artist_parser.py`:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from importers.artist_parser import parse_artists


def test_single_artist():
    assert parse_artists("King Tubby") == ["King Tubby"]


def test_comma_separated():
    assert parse_artists("Dylan Judah, Scientist") == ["Dylan Judah", "Scientist"]


def test_multiple_commas():
    result = parse_artists("Chase & Status, Bou, Flowdan, IRAH, Trigga, Takura")
    assert "Chase & Status" in result
    assert "Bou" in result
    assert "Flowdan" in result
    assert len(result) == 6


def test_feat_separator():
    result = parse_artists("Skrillex feat. Flowdan")
    assert "Skrillex" in result
    assert "Flowdan" in result


def test_ft_separator():
    result = parse_artists("Rodney P ft. Mighty Moe")
    assert "Rodney P" in result
    assert "Mighty Moe" in result


def test_ampersand_within_name_preserved():
    """'Chase & Status' is one artist — no comma means & is part of the name."""
    result = parse_artists("Chase & Status")
    assert result == ["Chase & Status"]


def test_whitespace_trimmed():
    result = parse_artists("  Artist One  ,  Artist Two  ")
    assert result == ["Artist One", "Artist Two"]


def test_empty_string():
    assert parse_artists("") == []
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /path/to/theisland && source db/.venv/bin/activate
pytest db/tests/test_artist_parser.py -v
```
Expected: `ImportError` — module doesn't exist yet.

- [ ] **Step 3: Implement artist_parser.py**

Create `db/importers/artist_parser.py`:
```python
"""Parse raw artist strings into individual artist names.

Strategy:
- Split on 'feat.' / 'ft.' (case-insensitive) — always a separator
- Split on comma (,) — most common list separator
- Split on ' & ' only when a comma is also present (i.e., list context, not part of a name)
- Trim whitespace; drop empty parts

Examples:
    "King Tubby"                     → ["King Tubby"]
    "Dylan Judah, Scientist"         → ["Dylan Judah", "Scientist"]
    "Chase & Status, Bou, Flowdan"   → ["Chase & Status", "Bou", "Flowdan"]
    "Chase & Status"                 → ["Chase & Status"]
    "Skrillex feat. Flowdan"         → ["Skrillex", "Flowdan"]
"""
import re


def parse_artists(raw: str) -> list[str]:
    if not raw or not raw.strip():
        return []

    has_comma = "," in raw

    # Split on feat./ft. first
    parts = re.split(r"\s+feat\.\s+|\s+ft\.\s+", raw, flags=re.IGNORECASE)

    # Split on comma
    expanded: list[str] = []
    for part in parts:
        expanded.extend(part.split(","))

    # Split on ' & ' only in list context (comma present in original)
    if has_comma:
        final: list[str] = []
        for part in expanded:
            final.extend(re.split(r"\s+&\s+", part))
        expanded = final

    return [p.strip() for p in expanded if p.strip()]
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest db/tests/test_artist_parser.py -v
```
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add db/importers/artist_parser.py db/tests/test_artist_parser.py
git commit -m "feat: add artist_parser with tests"
```

---

### Task 6: from_playlists_ts importer

**Files:**
- Create: `db/importers/from_playlists_ts.py`
- Create: `db/tests/test_importers.py` (initial)

The real `playlists.ts` format (verify at `web/src/data/playlists.ts`):
```typescript
export const playlists: Playlist[] = [
  {
    id: "2026-03-13",
    title: "March 13, 2026",
    archiveUrl: "https://archive.org/details/...",
    tracks: [
      { artist: "The Upsetters", title: "Underground", album: "Super Ape" },
      ...
    ],
  },
  ...
];
```

**Parsing strategy:** Use a two-pass approach — first split on `id: "` boundaries to isolate each playlist block as a string slice, then extract fields from each slice with simple targeted regexes. This avoids nested-brace matching issues.

- [ ] **Step 1: Write failing tests**

Create `db/tests/test_importers.py`:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from importers.from_playlists_ts import parse_playlists_ts, import_playlists_ts
from tests.conftest import insert_show


FIXTURE_TS = '''
export const playlists: Playlist[] = [
  {
    id: "2026-01-10",
    title: "January 10, 2026",
    archiveUrl: "https://archive.org/details/the-island-jan-10",
    tracks: [
      { artist: "King Tubby", title: "Bag a Wire Dub", album: "Test Album" },
      { artist: "Dylan Judah, Scientist", title: "Loving Dub", album: "Loving Dub" },
    ],
  },
  {
    id: "2025-12-05",
    title: "December 5, 2025",
    tracks: [
      { artist: "The Upsetters", title: "Underground", album: "Super Ape" },
    ],
  },
];
'''


def test_parse_playlists_ts_show_count():
    playlists = parse_playlists_ts(FIXTURE_TS)
    assert len(playlists) == 2


def test_parse_playlists_ts_fields():
    playlists = parse_playlists_ts(FIXTURE_TS)
    show = playlists[0]
    assert show["id"] == "2026-01-10"
    assert show["archive_url"] == "https://archive.org/details/the-island-jan-10"
    assert len(show["tracks"]) == 2


def test_parse_playlists_ts_track_fields():
    playlists = parse_playlists_ts(FIXTURE_TS)
    track = playlists[0]["tracks"][0]
    assert track["artist"] == "King Tubby"
    assert track["title"] == "Bag a Wire Dub"
    assert track["album"] == "Test Album"


def test_parse_playlists_ts_optional_archive_url():
    playlists = parse_playlists_ts(FIXTURE_TS)
    assert playlists[1].get("archive_url") is None


def test_import_playlists_ts_inserts_shows(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    shows = tmp_db.execute("SELECT * FROM shows").fetchall()
    assert len(shows) == 2


def test_import_playlists_ts_inserts_tracks(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    tracks = tmp_db.execute("SELECT * FROM tracks").fetchall()
    assert len(tracks) == 3  # 2 in first show + 1 in second


def test_import_playlists_ts_inserts_show_tracks(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    st = tmp_db.execute("SELECT * FROM show_tracks").fetchall()
    assert len(st) == 3


def test_import_playlists_ts_parses_artists(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    artists = {row["name"] for row in tmp_db.execute("SELECT name FROM artists").fetchall()}
    assert "King Tubby" in artists
    assert "Dylan Judah" in artists
    assert "Scientist" in artists


def test_import_playlists_ts_idempotent(tmp_db):
    """Running import twice produces no duplicate rows."""
    import_playlists_ts(FIXTURE_TS, tmp_db)
    import_playlists_ts(FIXTURE_TS, tmp_db)
    shows = tmp_db.execute("SELECT * FROM shows").fetchall()
    assert len(shows) == 2
    show_tracks = tmp_db.execute("SELECT * FROM show_tracks").fetchall()
    assert len(show_tracks) == 3
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pytest db/tests/test_importers.py -k "playlists_ts" -v
```
Expected: `ImportError`.

- [ ] **Step 3: Implement from_playlists_ts.py**

Create `db/importers/from_playlists_ts.py`:
```python
"""Import show data from web/src/data/playlists.ts.

Two-pass parsing strategy:
1. Split the file content on the pattern `id: "` to get per-playlist slices.
   Each slice starts with the show ID and ends at the next show's boundary.
2. Extract fields from each slice with simple targeted regexes.

This avoids nested-brace matching entirely.
"""
import re
import sqlite3
from typing import Any
from importers.artist_parser import parse_artists


def parse_playlists_ts(content: str) -> list[dict[str, Any]]:
    """Parse playlists.ts content into a list of show dicts."""
    playlists = []

    # Split on `  {` + newline + whitespace + `id: "` — each split starts a new playlist block
    # We include the delimiter by splitting on a lookahead that keeps the id value
    raw_blocks = re.split(r'\n\s*\{\s*\n\s*id:\s*"', content)

    for block in raw_blocks[1:]:  # skip the preamble before first playlist
        # First line of block is the ID value
        id_match = re.match(r'([^"]+)"', block)
        if not id_match:
            continue
        show_id = id_match.group(1)

        # archiveUrl (optional)
        archive_match = re.search(r'archiveUrl:\s*"([^"]+)"', block)
        archive_url = archive_match.group(1) if archive_match else None

        # Extract tracks block — everything between `tracks: [` and the matching `]`
        tracks_match = re.search(r'tracks:\s*\[(.*?)\]', block, re.DOTALL)
        tracks = []
        if tracks_match:
            tracks_block = tracks_match.group(1)
            for tm in re.finditer(
                r'\{\s*artist:\s*"([^"]+)"\s*,\s*title:\s*"([^"]+)"'
                r'(?:\s*,\s*album:\s*"([^"]*)")?',
                tracks_block,
            ):
                tracks.append({
                    "artist": tm.group(1),
                    "title": tm.group(2),
                    "album": tm.group(3) if tm.group(3) is not None else None,
                })

        playlists.append({
            "id": show_id,
            "archive_url": archive_url,
            "tracks": tracks,
        })

    return playlists


def _upsert_track(conn: sqlite3.Connection, title: str, raw_artist: str, album: str | None) -> int:
    """Upsert a track and return its id."""
    conn.execute(
        """INSERT INTO tracks (title, raw_artist, album)
           VALUES (?, ?, ?)
           ON CONFLICT(raw_artist, title, album) DO NOTHING""",
        (title, raw_artist, album),
    )
    row = conn.execute(
        "SELECT id FROM tracks WHERE raw_artist=? AND title=? AND album IS ?",
        (raw_artist, title, album),
    ).fetchone()
    return row[0]


def _upsert_artists(conn: sqlite3.Connection, track_id: int, raw_artist: str) -> None:
    for name in parse_artists(raw_artist):
        conn.execute(
            "INSERT INTO artists (name) VALUES (?) ON CONFLICT DO NOTHING", (name,)
        )
        artist_row = conn.execute(
            "SELECT id FROM artists WHERE name=?", (name,)
        ).fetchone()
        conn.execute(
            "INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            (track_id, artist_row[0]),
        )


def import_playlists_ts(content: str, conn: sqlite3.Connection) -> dict[str, int]:
    """Import parsed playlists into the DB. Returns counts."""
    playlists = parse_playlists_ts(content)
    shows_inserted = tracks_inserted = 0

    for playlist in playlists:
        conn.execute(
            """INSERT INTO shows (id, aired_at, archive_url)
               VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET archive_url=excluded.archive_url""",
            (playlist["id"], playlist["id"], playlist.get("archive_url")),
        )
        shows_inserted += 1

        for pos, track in enumerate(playlist["tracks"], start=1):
            track_id = _upsert_track(conn, track["title"], track["artist"], track.get("album"))
            tracks_inserted += 1
            conn.execute(
                """INSERT INTO show_tracks (show_id, track_id, position)
                   VALUES (?, ?, ?)
                   ON CONFLICT(show_id, track_id, position) DO NOTHING""",
                (playlist["id"], track_id, pos),
            )
            _upsert_artists(conn, track_id, track["artist"])

    conn.commit()
    return {"shows": shows_inserted, "tracks": tracks_inserted}


def import_from_file(ts_path: str, conn: sqlite3.Connection) -> dict[str, int]:
    content = open(ts_path, encoding="utf-8").read()
    return import_playlists_ts(content, conn)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest db/tests/test_importers.py -k "playlists_ts" -v
```
Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add db/importers/from_playlists_ts.py db/tests/test_importers.py
git commit -m "feat: add playlists.ts importer with tests"
```

---

### Task 7: from_csv importer

**Files:**
- Modify: `db/tests/test_importers.py`
- Create: `db/importers/from_csv.py`

CSV format (from existing workflow — Title is first column, Artist is second):
```
Title,Artist,Album,Duration (ms)
Underground,The Upsetters,Super Ape,176133
```

- [ ] **Step 1: Add failing tests**

Append to `db/tests/test_importers.py`:
```python
from importers.from_csv import parse_csv, import_csv

CSV_FIXTURE = """Title,Artist,Album,Duration (ms)
Underground,The Upsetters,Super Ape,176133
"Loving Dub","Dylan Judah, Scientist",Loving Dub,247261
No Partial,Rhythm & Sound,,180000
"""


def test_parse_csv_track_count():
    tracks = parse_csv(CSV_FIXTURE)
    assert len(tracks) == 3


def test_parse_csv_fields():
    tracks = parse_csv(CSV_FIXTURE)
    assert tracks[0]["title"] == "Underground"
    assert tracks[0]["artist"] == "The Upsetters"
    assert tracks[0]["album"] == "Super Ape"
    assert tracks[0]["duration_ms"] == 176133


def test_parse_csv_empty_album():
    tracks = parse_csv(CSV_FIXTURE)
    assert tracks[2]["album"] is None


def test_import_csv_inserts_tracks(tmp_db):
    insert_show(tmp_db, "2026-01-01", "2026-01-01")
    import_csv(CSV_FIXTURE, "2026-01-01", tmp_db)
    tracks = tmp_db.execute("SELECT * FROM tracks").fetchall()
    assert len(tracks) == 3


def test_import_csv_sets_duration_ms(tmp_db):
    insert_show(tmp_db, "2026-01-01", "2026-01-01")
    import_csv(CSV_FIXTURE, "2026-01-01", tmp_db)
    track = tmp_db.execute(
        "SELECT duration_ms FROM tracks WHERE title='Underground'"
    ).fetchone()
    assert track["duration_ms"] == 176133


def test_import_csv_position_order(tmp_db):
    insert_show(tmp_db, "2026-01-01", "2026-01-01")
    import_csv(CSV_FIXTURE, "2026-01-01", tmp_db)
    rows = tmp_db.execute(
        "SELECT position FROM show_tracks ORDER BY position"
    ).fetchall()
    assert [r["position"] for r in rows] == [1, 2, 3]
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pytest db/tests/test_importers.py -k "csv and not exportify" -v
```
Expected: `ImportError`.

- [ ] **Step 3: Implement from_csv.py**

Create `db/importers/from_csv.py`:
```python
"""Import track data from generic CSV files.

CSV format (from existing workflow):
    Title,Artist,Album,Duration (ms)
    Underground,The Upsetters,Super Ape,176133

The show_id (ISO date string) must be supplied by the caller — it's not in the CSV.
"""
import csv
import io
import sqlite3
from typing import Any
from importers.artist_parser import parse_artists


def parse_csv(content: str) -> list[dict[str, Any]]:
    tracks = []
    reader = csv.DictReader(io.StringIO(content.strip()))
    for row in reader:
        album = row.get("Album", "").strip() or None
        dur_raw = row.get("Duration (ms)", "").strip()
        tracks.append({
            "title": row["Title"].strip(),
            "artist": row["Artist"].strip(),
            "album": album,
            "duration_ms": int(dur_raw) if dur_raw else None,
        })
    return tracks


def import_csv(content: str, show_id: str, conn: sqlite3.Connection) -> dict[str, int]:
    """Import tracks from CSV into an existing show. Show must already exist in DB."""
    tracks = parse_csv(content)
    tracks_inserted = 0

    for pos, track in enumerate(tracks, start=1):
        conn.execute(
            """INSERT INTO tracks (title, raw_artist, album, duration_ms)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(raw_artist, title, album) DO UPDATE
               SET duration_ms=COALESCE(tracks.duration_ms, excluded.duration_ms)""",
            (track["title"], track["artist"], track["album"], track["duration_ms"]),
        )
        row = conn.execute(
            "SELECT id FROM tracks WHERE raw_artist=? AND title=? AND album IS ?",
            (track["artist"], track["title"], track["album"]),
        ).fetchone()
        track_id = row[0]
        tracks_inserted += 1

        conn.execute(
            """INSERT INTO show_tracks (show_id, track_id, position)
               VALUES (?, ?, ?)
               ON CONFLICT(show_id, track_id, position) DO NOTHING""",
            (show_id, track_id, pos),
        )

        for name in parse_artists(track["artist"]):
            conn.execute(
                "INSERT INTO artists (name) VALUES (?) ON CONFLICT DO NOTHING", (name,)
            )
            artist_row = conn.execute(
                "SELECT id FROM artists WHERE name=?", (name,)
            ).fetchone()
            conn.execute(
                "INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                (track_id, artist_row[0]),
            )

    conn.commit()
    return {"tracks": tracks_inserted}


def import_from_file(csv_path: str, show_id: str, conn: sqlite3.Connection) -> dict[str, int]:
    content = open(csv_path, encoding="utf-8").read()
    return import_csv(content, show_id, conn)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest db/tests/test_importers.py -k "csv and not exportify" -v
```
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add db/importers/from_csv.py db/tests/test_importers.py
git commit -m "feat: add CSV importer with tests"
```

---

### Task 8: from_exportify_csv importer

**Files:**
- Modify: `db/tests/test_importers.py`
- Create: `db/importers/from_exportify_csv.py`

Exportify CSV columns used:
`Spotify URI, Track Name, Artist Name(s), Album Name, Album Image URL, Track Duration (ms), Genres, Release Date, BPM, Key, Mode, Danceability, Energy`

- [ ] **Step 1: Add failing tests**

Append to `db/tests/test_importers.py`:
```python
from importers.from_exportify_csv import parse_exportify_csv, enrich_from_exportify

EXPORTIFY_FIXTURE = """Spotify URI,Track Name,Artist Name(s),Album Name,Album Image URL,Track Duration (ms),Added By,Added At,Genres,Record Label,Release Date,ISRC,BPM,Key,Mode,Danceability,Energy
spotify:track:abc123,Underground,The Upsetters,Super Ape,https://img/1.jpg,176133,user,2026-01-01,reggae,Label,1973,ISRC1,130.5,0,1,0.65,0.80
spotify:track:def456,Loving Dub,"Dylan Judah, Scientist",Loving Dub,https://img/2.jpg,247261,user,2026-01-01,dub,Label,2010-05-01,ISRC2,85.0,-1,0,0.55,0.60
"""


def test_parse_exportify_row_count():
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    assert len(rows) == 2


def test_parse_exportify_fields():
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    r = rows[0]
    assert r["spotify_id"] == "spotify:track:abc123"
    assert r["title"] == "Underground"
    assert r["raw_artist"] == "The Upsetters"
    assert r["bpm"] == 130.5
    assert r["musical_key"] == 0
    assert r["mode"] == 1
    assert r["release_date"] == "1973"
    assert r["genres"] == "reggae"


def test_parse_exportify_undetected_key():
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    assert rows[1]["musical_key"] == -1


def test_enrich_matches_by_raw_artist_title(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=False)
    row = tmp_db.execute("SELECT bpm, spotify_id FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["bpm"] == 130.5
    assert row["spotify_id"] == "spotify:track:abc123"


def test_enrich_no_overwrite(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    tmp_db.execute("UPDATE tracks SET bpm=999.0 WHERE id=?", (track_id,))
    tmp_db.commit()
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=False)
    row = tmp_db.execute("SELECT bpm FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["bpm"] == 999.0  # not overwritten


def test_enrich_with_overwrite(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    tmp_db.execute("UPDATE tracks SET bpm=999.0 WHERE id=?", (track_id,))
    tmp_db.commit()
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=True)
    row = tmp_db.execute("SELECT bpm FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["bpm"] == 130.5  # overwritten


def test_enrich_never_overwrites_core_fields(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=True)
    row = tmp_db.execute("SELECT raw_artist, title, album FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["raw_artist"] == "The Upsetters"
    assert row["title"] == "Underground"


def test_enrich_unmatched_returns_count(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    result = enrich_from_exportify(rows, tmp_db, overwrite=False)
    assert result["unmatched"] == 2  # no tracks in DB to match
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pytest db/tests/test_importers.py -k "exportify" -v
```
Expected: `ImportError`.

- [ ] **Step 3: Implement from_exportify_csv.py**

Create `db/importers/from_exportify_csv.py`:
```python
"""Enrich existing track records from an Exportify CSV export.

Matching priority:
1. Exact match on spotify_id
2. Exact case-insensitive match on (raw_artist, title)
3. No match — log to stderr and skip

Enrichable columns (never includes raw_artist, title, album):
    spotify_id, duration_ms, release_date, bpm, energy, danceability,
    musical_key, mode, genres, album_image_url
"""
import csv
import io
import sqlite3
import sys
from typing import Any

ENRICHABLE_COLS = [
    "spotify_id", "duration_ms", "release_date", "bpm", "energy",
    "danceability", "musical_key", "mode", "genres", "album_image_url",
]


def _int_or_none(val: str) -> int | None:
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _float_or_none(val: str) -> float | None:
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def parse_exportify_csv(content: str) -> list[dict[str, Any]]:
    rows = []
    reader = csv.DictReader(io.StringIO(content.strip()))
    for row in reader:
        rows.append({
            "spotify_id": row.get("Spotify URI", "").strip() or None,
            "title": row.get("Track Name", "").strip(),
            "raw_artist": row.get("Artist Name(s)", "").strip(),
            "album": row.get("Album Name", "").strip() or None,
            "album_image_url": row.get("Album Image URL", "").strip() or None,
            "duration_ms": _int_or_none(row.get("Track Duration (ms)", "")),
            "genres": row.get("Genres", "").strip() or None,
            "release_date": row.get("Release Date", "").strip() or None,
            "bpm": _float_or_none(row.get("BPM", "")),
            "musical_key": _int_or_none(row.get("Key", "")),
            "mode": _int_or_none(row.get("Mode", "")),
            "energy": _float_or_none(row.get("Energy", "")),
            "danceability": _float_or_none(row.get("Danceability", "")),
        })
    return rows


def _find_track_id(row: dict[str, Any], conn: sqlite3.Connection) -> int | None:
    if row.get("spotify_id"):
        r = conn.execute(
            "SELECT id FROM tracks WHERE spotify_id=?", (row["spotify_id"],)
        ).fetchone()
        if r:
            return r[0]
    r = conn.execute(
        "SELECT id FROM tracks WHERE lower(raw_artist)=lower(?) AND lower(title)=lower(?)",
        (row["raw_artist"], row["title"]),
    ).fetchone()
    return r[0] if r else None


def enrich_from_exportify(
    rows: list[dict[str, Any]],
    conn: sqlite3.Connection,
    overwrite: bool = False,
) -> dict[str, int]:
    matched = unmatched = updated = 0

    for row in rows:
        track_id = _find_track_id(row, conn)
        if track_id is None:
            print(f"UNMATCHED: {row['raw_artist']} — {row['title']}", file=sys.stderr)
            unmatched += 1
            continue

        matched += 1
        existing = conn.execute(
            f"SELECT {', '.join(ENRICHABLE_COLS)} FROM tracks WHERE id=?",
            (track_id,),
        ).fetchone()

        updates: dict[str, Any] = {}
        for col in ENRICHABLE_COLS:
            new_val = row.get(col)
            if new_val is None:
                continue
            if overwrite or existing[col] is None:
                updates[col] = new_val

        if updates:
            set_clause = ", ".join(f"{col}=?" for col in updates)
            conn.execute(
                f"UPDATE tracks SET {set_clause} WHERE id=?",
                (*updates.values(), track_id),
            )
            updated += 1

    conn.commit()
    return {"matched": matched, "unmatched": unmatched, "updated": updated}


def enrich_from_file(
    csv_path: str,
    conn: sqlite3.Connection,
    overwrite: bool = False,
) -> dict[str, int]:
    content = open(csv_path, encoding="utf-8").read()
    rows = parse_exportify_csv(content)
    return enrich_from_exportify(rows, conn, overwrite=overwrite)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest db/tests/test_importers.py -k "exportify" -v
```
Expected: all 8 tests PASS.

- [ ] **Step 5: Run full importer suite**

```bash
pytest db/tests/test_importers.py db/tests/test_artist_parser.py -v
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add db/importers/from_exportify_csv.py db/tests/test_importers.py
git commit -m "feat: add Exportify enrichment importer with tests"
```

---

## Chunk 3: Shows Commands (Subagent B)

**Context for subagent:** Work in `/theisland` on branch `feature/radio-database`. Foundation already exists including a stub `db/commands/shows.py` — replace it entirely with the full implementation. Activate venv: `source db/.venv/bin/activate`. Only touch `db/commands/shows.py` and `db/tests/test_shows_commands.py`.

**Key note on monkeypatching:** Commands import `get_connection` with `from database import get_connection`. To patch it in tests, you must patch `commands.shows.get_connection`, NOT `database.get_connection`.

**Spec:** `docs/superpowers/specs/2026-03-14-radio-database-design.md`

### Task 9: Shows commands

**Files:**
- Modify: `db/commands/shows.py` (replace stub)
- Create: `db/tests/test_shows_commands.py`

- [ ] **Step 1: Write failing tests**

Create `db/tests/test_shows_commands.py`:
```python
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from click.testing import CliRunner
from cli import cli
from tests.conftest import insert_show, insert_track, insert_show_track


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def populated_db(tmp_db):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    insert_show(tmp_db, "2026-01-02", "2026-01-02")
    insert_show(tmp_db, "2025-12-05", "2025-12-05")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    return tmp_db


def test_shows_list_returns_all(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["shows", "list", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) == 3


def test_shows_list_newest_first(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["shows", "list", "--json"])
    data = json.loads(result.output)
    assert data[0]["id"] == "2026-03-13"
    assert data[-1]["id"] == "2025-12-05"


def test_shows_list_plain_outputs_ids(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["shows", "list", "--plain"])
    lines = result.output.strip().split("\n")
    assert "2026-03-13" in lines


def test_shows_search_by_year_month(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["shows", "search", "2026-01", "--json"])
    data = json.loads(result.output)
    assert len(data) == 1
    assert data[0]["id"] == "2026-01-02"


def test_shows_search_by_month_name(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["shows", "search", "march", "--json"])
    data = json.loads(result.output)
    assert len(data) == 1
    assert data[0]["id"] == "2026-03-13"


def test_shows_search_case_insensitive(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["shows", "search", "DECEMBER", "--json"])
    data = json.loads(result.output)
    assert len(data) == 1


def test_shows_update_archive_url(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.shows.get_connection", lambda: populated_db)
    result = runner.invoke(cli, [
        "shows", "update", "2026-03-13",
        "--archive-url", "https://archive.org/test"
    ])
    assert result.exit_code == 0
    row = populated_db.execute(
        "SELECT archive_url FROM shows WHERE id='2026-03-13'"
    ).fetchone()
    assert row["archive_url"] == "https://archive.org/test"
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pytest db/tests/test_shows_commands.py -v
```
Expected: tests fail because `shows.py` is a stub with no commands.

- [ ] **Step 3: Implement commands/shows.py**

Replace `db/commands/shows.py` entirely:
```python
"""Shows command group."""
import json
import sys
import click
import requests
from commands import output_options
from database import get_connection
from output import print_output

MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}


@click.group()
def shows():
    """Commands for managing shows."""


@shows.command("list")
@output_options
def shows_list(fmt):
    """List all shows, newest first."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, aired_at, archive_url, duration_seconds, archive_downloads "
        "FROM shows ORDER BY aired_at DESC"
    ).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["id", "aired_at", "archive_url", "duration_seconds", "archive_downloads"],
                 fmt=fmt, plain_key="id", title="Shows")


@shows.command("search")
@click.argument("query")
@output_options
def shows_search(query, fmt):
    """Search shows by date prefix (2026-03) or month name (march)."""
    conn = get_connection()
    q = query.strip().lower()
    month = MONTH_MAP.get(q)
    if month:
        rows = conn.execute(
            "SELECT id, aired_at, archive_url FROM shows "
            "WHERE strftime('%m', aired_at)=? ORDER BY aired_at DESC",
            (month,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, aired_at, archive_url FROM shows "
            "WHERE id LIKE ? ORDER BY aired_at DESC",
            (f"{query}%",)
        ).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["id", "aired_at", "archive_url"],
                 fmt=fmt, plain_key="id")


@shows.command("import")
@click.option("--source", required=True,
              type=click.Choice(["playlists-ts", "csv", "exportify"]))
@click.option("--file", "file_path", required=True, type=click.Path(exists=True))
@click.option("--show-id", default=None, help="Show ID (required for --source csv).")
@click.option("--overwrite", is_flag=True, default=False,
              help="Overwrite existing enrichment fields (exportify only).")
def shows_import(source, file_path, show_id, overwrite):
    """Import show data from a file."""
    conn = get_connection()
    if source == "playlists-ts":
        from importers.from_playlists_ts import import_from_file
        result = import_from_file(file_path, conn)
        click.echo(f"Imported {result['shows']} shows, {result['tracks']} tracks.")
    elif source == "csv":
        if not show_id:
            click.echo("--show-id is required for --source csv", err=True)
            conn.close()
            sys.exit(1)
        from importers.from_csv import import_from_file
        result = import_from_file(file_path, show_id, conn)
        click.echo(f"Imported {result['tracks']} tracks into show {show_id}.")
    elif source == "exportify":
        from importers.from_exportify_csv import enrich_from_file
        result = enrich_from_file(file_path, conn, overwrite=overwrite)
        click.echo(
            f"Matched {result['matched']}, updated {result['updated']}, "
            f"unmatched {result['unmatched']}."
        )
    conn.close()


@shows.command("fetch-meta")
@click.argument("show_id")
def shows_fetch_meta(show_id):
    """Pull runtime, downloads, description from archive.org. Exits 0 on success."""
    conn = get_connection()
    row = conn.execute("SELECT archive_url FROM shows WHERE id=?", (show_id,)).fetchone()
    if not row or not row["archive_url"]:
        click.echo(f"No archive_url for show {show_id}", err=True)
        conn.close()
        sys.exit(1)

    identifier = row["archive_url"].rstrip("/").split("/")[-1]
    api_url = f"https://archive.org/metadata/{identifier}"

    try:
        resp = requests.get(api_url, timeout=10)
        resp.raise_for_status()
        meta = resp.json()
    except Exception as e:
        click.echo(f"Failed to fetch metadata: {e}", err=True)
        conn.close()
        sys.exit(1)

    server_meta = meta.get("metadata", {})
    duration_seconds = None
    runtime = server_meta.get("runtime")
    if runtime:
        try:
            parts = str(runtime).split(":")
            if len(parts) == 3:
                duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(float(parts[2]))
            elif len(parts) == 2:
                duration_seconds = int(parts[0]) * 60 + int(float(parts[1]))
        except (ValueError, IndexError):
            pass

    downloads = None
    try:
        downloads = int(meta.get("item", {}).get("downloads", 0))
    except (ValueError, TypeError):
        pass

    description = server_meta.get("description")

    conn.execute(
        """UPDATE shows SET
               duration_seconds=COALESCE(?, duration_seconds),
               archive_downloads=?,
               description=COALESCE(?, description)
           WHERE id=?""",
        (duration_seconds, downloads, description, show_id),
    )
    conn.commit()
    updated = {"show_id": show_id, "duration_seconds": duration_seconds,
               "archive_downloads": downloads, "description": description}
    click.echo(json.dumps(updated, indent=2))
    conn.close()


@shows.command("update")
@click.argument("show_id")
@click.option("--archive-url", default=None)
@click.option("--description", default=None)
@click.option("--duration-seconds", type=int, default=None)
def shows_update(show_id, archive_url, description, duration_seconds):
    """Update fields on a show."""
    conn = get_connection()
    updates = {}
    if archive_url is not None:
        updates["archive_url"] = archive_url
    if description is not None:
        updates["description"] = description
    if duration_seconds is not None:
        updates["duration_seconds"] = duration_seconds

    if not updates:
        click.echo("No fields to update.", err=True)
        conn.close()
        sys.exit(1)

    set_clause = ", ".join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE shows SET {set_clause} WHERE id=?",
                 (*updates.values(), show_id))
    conn.commit()
    click.echo(f"Updated show {show_id}.")
    conn.close()
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest db/tests/test_shows_commands.py -v
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add db/commands/shows.py db/tests/test_shows_commands.py
git commit -m "feat: implement shows commands with tests"
```

---

## Chunk 4: Tracks Commands (Subagent C)

**Context for subagent:** Work in `/theisland` on branch `feature/radio-database`. Replace the stub `db/commands/tracks.py` with the full implementation. Activate venv: `source db/.venv/bin/activate`. Only touch `db/commands/tracks.py`, `db/queries/top_artists.sql`, `db/queries/play_count.sql`, `db/queries/show_history.sql`, and `db/tests/test_tracks_commands.py`.

**Key note on monkeypatching:** Patch `commands.tracks.get_connection`, NOT `database.get_connection`.

**Spec:** `docs/superpowers/specs/2026-03-14-radio-database-design.md`

### Task 10: Named SQL queries for tracks

- [ ] **Step 1: Write top_artists.sql**

Create `db/queries/top_artists.sql`:
```sql
-- Top artists by number of show appearances.
-- Param: :limit
SELECT
    a.name                     AS artist,
    COUNT(st.id)               AS play_count,
    COUNT(DISTINCT st.show_id) AS shows_appeared
FROM artists a
JOIN track_artists ta ON a.id = ta.artist_id
JOIN show_tracks st   ON ta.track_id = st.track_id
GROUP BY a.id, a.name
ORDER BY play_count DESC
LIMIT :limit;
```

- [ ] **Step 2: Write play_count.sql**

Create `db/queries/play_count.sql`:
```sql
-- Total times a specific artist has appeared across all shows.
-- Param: :artist (case-insensitive substring match)
SELECT
    a.name                     AS artist,
    COUNT(st.id)               AS play_count,
    COUNT(DISTINCT st.show_id) AS shows_appeared
FROM artists a
JOIN track_artists ta ON a.id = ta.artist_id
JOIN show_tracks st   ON ta.track_id = st.track_id
WHERE lower(a.name) LIKE lower('%' || :artist || '%')
GROUP BY a.id, a.name
ORDER BY play_count DESC;
```

- [ ] **Step 3: Write show_history.sql**

Create `db/queries/show_history.sql`:
```sql
-- All shows that featured a given artist.
-- Param: :artist (case-insensitive substring match)
SELECT
    sh.id          AS show_id,
    sh.aired_at    AS aired_at,
    t.title        AS track_title,
    t.raw_artist   AS raw_artist,
    t.album        AS album,
    st.position    AS position
FROM artists a
JOIN track_artists ta ON a.id = ta.artist_id
JOIN tracks t         ON ta.track_id = t.id
JOIN show_tracks st   ON t.id = st.track_id
JOIN shows sh         ON st.show_id = sh.id
WHERE lower(a.name) LIKE lower('%' || :artist || '%')
ORDER BY sh.aired_at DESC, st.position ASC;
```

- [ ] **Step 4: Commit SQL files**

```bash
git add db/queries/top_artists.sql db/queries/play_count.sql db/queries/show_history.sql
git commit -m "feat: add tracks SQL query files"
```

---

### Task 11: Tracks commands

- [ ] **Step 1: Write failing tests**

Create `db/tests/test_tracks_commands.py`:
```python
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from click.testing import CliRunner
from cli import cli
from tests.conftest import insert_show, insert_track, insert_show_track


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def populated_db(tmp_db):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    insert_show(tmp_db, "2026-01-02", "2026-01-02")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Loving Dub", "Dylan Judah, Scientist", "Loving Dub")
    t3 = insert_track(tmp_db, "Underground", "The Upsetters", "Dub Marley")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    insert_show_track(tmp_db, "2026-01-02", t3, 1)
    # Seed artists for The Upsetters
    tmp_db.execute("INSERT OR IGNORE INTO artists (name) VALUES ('The Upsetters')")
    tmp_db.commit()
    aid = tmp_db.execute("SELECT id FROM artists WHERE name='The Upsetters'").fetchone()[0]
    tmp_db.execute("INSERT OR IGNORE INTO track_artists VALUES (?, ?)", (t1, aid))
    tmp_db.execute("INSERT OR IGNORE INTO track_artists VALUES (?, ?)", (t3, aid))
    tmp_db.commit()
    return tmp_db


def test_tracks_search_by_title(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["tracks", "search", "Underground", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) == 2


def test_tracks_search_by_artist(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["tracks", "search", "Upsetters", "--json"])
    data = json.loads(result.output)
    assert all("Upsetters" in row["raw_artist"] for row in data)


def test_tracks_top_artists(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["tracks", "top-artists", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert data[0]["artist"] == "The Upsetters"
    assert data[0]["play_count"] == 2


def test_tracks_top_artists_limit(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["tracks", "top-artists", "--limit", "1", "--json"])
    data = json.loads(result.output)
    assert len(data) == 1


def test_tracks_play_count(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["tracks", "play-count", "Upsetters", "--json"])
    data = json.loads(result.output)
    assert data[0]["play_count"] == 2


def test_tracks_history(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    result = runner.invoke(cli, ["tracks", "history", "Upsetters", "--json"])
    data = json.loads(result.output)
    show_ids = {r["show_id"] for r in data}
    assert "2026-03-13" in show_ids
    assert "2026-01-02" in show_ids


def test_tracks_update_title(runner, populated_db, monkeypatch):
    monkeypatch.setattr("commands.tracks.get_connection", lambda: populated_db)
    track_id = populated_db.execute(
        "SELECT id FROM tracks WHERE title='Underground' LIMIT 1"
    ).fetchone()[0]
    result = runner.invoke(cli, ["tracks", "update", str(track_id), "--title", "Underground (Remaster)"])
    assert result.exit_code == 0
    row = populated_db.execute("SELECT title FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["title"] == "Underground (Remaster)"
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pytest db/tests/test_tracks_commands.py -v
```
Expected: tests fail — stub has no commands.

- [ ] **Step 3: Implement commands/tracks.py**

Replace `db/commands/tracks.py` entirely:
```python
"""Tracks command group."""
from pathlib import Path
import click
from commands import output_options
from database import get_connection
from output import print_output

_QUERIES = Path(__file__).parent.parent / "queries"


def _load_query(name: str) -> str:
    return (_QUERIES / f"{name}.sql").read_text()


@click.group()
def tracks():
    """Commands for querying tracks."""


@tracks.command("search")
@click.argument("query")
@output_options
def tracks_search(query, fmt):
    """Search tracks by title or artist."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, raw_artist, album FROM tracks "
        "WHERE lower(title) LIKE lower(?) OR lower(raw_artist) LIKE lower(?) "
        "ORDER BY raw_artist, title",
        (f"%{query}%", f"%{query}%"),
    ).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["id", "title", "raw_artist", "album"],
                 fmt=fmt, plain_key="id")


@tracks.command("top-artists")
@click.option("--limit", default=20, show_default=True)
@output_options
def tracks_top_artists(limit, fmt):
    """Artists ranked by total play count."""
    conn = get_connection()
    rows = conn.execute(_load_query("top_artists"), {"limit": limit}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["artist", "play_count", "shows_appeared"],
                 fmt=fmt, plain_key="artist", title="Top Artists")


@tracks.command("play-count")
@click.argument("artist")
@output_options
def tracks_play_count(artist, fmt):
    """Total plays for an artist across all shows."""
    conn = get_connection()
    rows = conn.execute(_load_query("play_count"), {"artist": artist}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["artist", "play_count", "shows_appeared"], fmt=fmt)


@tracks.command("history")
@click.argument("artist")
@output_options
def tracks_history(artist, fmt):
    """All shows that featured an artist."""
    conn = get_connection()
    rows = conn.execute(_load_query("show_history"), {"artist": artist}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "track_title", "raw_artist", "album", "position"],
                 fmt=fmt, plain_key="show_id")


@tracks.command("update")
@click.argument("track_id", type=int)
@click.option("--title", default=None)
@click.option("--album", default=None)
@click.option("--raw-artist", default=None)
def tracks_update(track_id, title, album, raw_artist):
    """Correct fields on a track."""
    conn = get_connection()
    updates = {}
    if title is not None:
        updates["title"] = title
    if album is not None:
        updates["album"] = album
    if raw_artist is not None:
        updates["raw_artist"] = raw_artist

    if not updates:
        click.echo("No fields to update.", err=True)
        conn.close()
        sys.exit(1)

    set_clause = ", ".join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE tracks SET {set_clause} WHERE id=?", (*updates.values(), track_id))
    conn.commit()
    click.echo(f"Updated track {track_id}.")
    conn.close()
```

**Note:** Add `import sys` at the top of the file.

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest db/tests/test_tracks_commands.py -v
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add db/commands/tracks.py db/queries/ db/tests/test_tracks_commands.py
git commit -m "feat: implement tracks commands and SQL queries with tests"
```

---

## Chunk 5: Stats + DB Export (Subagent D)

**Context for subagent:** Work in `/theisland` on branch `feature/radio-database`. Replace stubs `db/commands/stats.py` and `db/commands/db_cmds.py` with full implementations. Activate venv: `source db/.venv/bin/activate`. Only touch `db/commands/stats.py`, `db/commands/db_cmds.py`, `db/queries/bpm_trends.sql`, `db/queries/release_year_spread.sql`, and `db/tests/test_stats_commands.py`.

**Key note on monkeypatching:** Patch `commands.stats.get_connection` and `commands.db_cmds.get_connection`, NOT `database.get_connection`.

**Spec:** `docs/superpowers/specs/2026-03-14-radio-database-design.md`

### Task 12: Stats SQL files

- [ ] **Step 1: Write bpm_trends.sql**

Create `db/queries/bpm_trends.sql`:
```sql
-- Average BPM per show. Pass :show_id = NULL to get all shows.
SELECT
    sh.id                       AS show_id,
    sh.aired_at                 AS aired_at,
    ROUND(AVG(t.bpm), 1)        AS avg_bpm,
    ROUND(MIN(t.bpm), 1)        AS min_bpm,
    ROUND(MAX(t.bpm), 1)        AS max_bpm,
    COUNT(t.bpm)                AS tracks_with_bpm
FROM shows sh
JOIN show_tracks st ON sh.id = st.show_id
JOIN tracks t       ON st.track_id = t.id
WHERE t.bpm IS NOT NULL
  AND (:show_id IS NULL OR sh.id = :show_id)
GROUP BY sh.id, sh.aired_at
ORDER BY sh.aired_at DESC;
```

- [ ] **Step 2: Write release_year_spread.sql**

Create `db/queries/release_year_spread.sql`:
```sql
-- Distribution of track plays by release year.
SELECT
    substr(t.release_date, 1, 4)  AS release_year,
    COUNT(st.id)                  AS play_count,
    COUNT(DISTINCT t.id)          AS unique_tracks
FROM tracks t
JOIN show_tracks st ON t.id = st.track_id
WHERE t.release_date IS NOT NULL
  AND length(substr(t.release_date, 1, 4)) = 4
  AND substr(t.release_date, 1, 4) GLOB '[0-9][0-9][0-9][0-9]'
GROUP BY release_year
ORDER BY release_year DESC;
```

- [ ] **Step 3: Commit SQL files**

```bash
git add db/queries/bpm_trends.sql db/queries/release_year_spread.sql
git commit -m "feat: add stats SQL query files"
```

---

### Task 13: Stats commands and db export

- [ ] **Step 1: Write failing tests**

Create `db/tests/test_stats_commands.py`:
```python
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from click.testing import CliRunner
from cli import cli
from tests.conftest import insert_show, insert_track, insert_show_track


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def enriched_db(tmp_db):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    insert_show(tmp_db, "2026-01-02", "2026-01-02")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Loving Dub", "Dylan Judah", "Loving Dub")
    tmp_db.execute("UPDATE tracks SET bpm=130.5, release_date='1976', energy=0.8 WHERE id=?", (t1,))
    tmp_db.execute("UPDATE tracks SET bpm=85.0, release_date='2010-05', energy=0.5 WHERE id=?", (t2,))
    tmp_db.commit()
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    insert_show_track(tmp_db, "2026-01-02", t1, 1)
    return tmp_db


def test_stats_summary(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "summary", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    # summary returns a JSON array with one row
    assert isinstance(data, list) and len(data) == 1
    row = data[0]
    assert row["total_shows"] == 2
    assert row["total_tracks"] == 2
    assert row["total_plays"] == 3


def test_stats_bpm_all_shows(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "bpm", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) == 2


def test_stats_bpm_single_show(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "bpm", "--show", "2026-03-13", "--json"])
    data = json.loads(result.output)
    assert len(data) == 1
    assert data[0]["show_id"] == "2026-03-13"


def test_stats_release_years(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "release-years", "--json"])
    data = json.loads(result.output)
    years = [r["release_year"] for r in data]
    assert "1976" in years
    assert "2010" in years


def test_stats_energy(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "energy", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) >= 1
    assert "avg_energy" in data[0]


def test_stats_archive_downloads(runner, enriched_db, monkeypatch):
    enriched_db.execute(
        "UPDATE shows SET archive_downloads=500 WHERE id='2026-03-13'"
    )
    enriched_db.commit()
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "archive-downloads", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) == 1
    assert data[0]["archive_downloads"] == 500


def test_db_export_json(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.db_cmds.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["db", "export", "--format", "json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert "shows" in data
    assert "tracks" in data
    assert len(data["shows"]) == 2
    assert len(data["tracks"]) == 2


def test_db_export_sql_numeric_values(runner, enriched_db, monkeypatch):
    """Numeric values in SQL export are not quoted (for Postgres compatibility)."""
    monkeypatch.setattr("commands.db_cmds.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["db", "export", "--format", "sql"])
    assert result.exit_code == 0
    # Find a line with a numeric bpm value and verify it's not single-quoted
    bpm_lines = [l for l in result.output.splitlines() if "130.5" in l]
    assert bpm_lines, "Expected a line containing bpm value 130.5"
    assert "'130.5'" not in bpm_lines[0], "Numeric values must not be quoted in SQL export"
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pytest db/tests/test_stats_commands.py -v
```
Expected: tests fail — stubs have no commands.

- [ ] **Step 3: Implement commands/stats.py**

Replace `db/commands/stats.py` entirely:
```python
"""Stats command group."""
from pathlib import Path
import click
from commands import output_options
from database import get_connection
from output import print_output

_QUERIES = Path(__file__).parent.parent / "queries"


def _load_query(name: str) -> str:
    return (_QUERIES / f"{name}.sql").read_text()


@click.group()
def stats():
    """Insight queries across all show data."""


@stats.command("summary")
@output_options
def stats_summary(fmt):
    """Overall DB stats: shows, tracks, plays, artists."""
    conn = get_connection()
    row = conn.execute("""
        SELECT
            (SELECT COUNT(*) FROM shows)       AS total_shows,
            (SELECT COUNT(*) FROM tracks)      AS total_tracks,
            (SELECT COUNT(*) FROM show_tracks) AS total_plays,
            (SELECT COUNT(*) FROM artists)     AS total_artists
    """).fetchone()
    conn.close()
    data = [dict(row)]
    print_output(data, list(data[0].keys()), fmt=fmt, title="Summary")


@stats.command("archive-downloads")
@output_options
def stats_archive_downloads(fmt):
    """Archive.org download counts per show, ranked."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT id AS show_id, aired_at, archive_downloads
        FROM shows
        WHERE archive_downloads IS NOT NULL
        ORDER BY archive_downloads DESC
    """).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "archive_downloads"],
                 fmt=fmt, title="Archive Downloads")


@stats.command("bpm")
@click.option("--show", "show_id", default=None, help="Limit to one show.")
@output_options
def stats_bpm(show_id, fmt):
    """Average BPM per show (or for a single show)."""
    conn = get_connection()
    rows = conn.execute(_load_query("bpm_trends"), {"show_id": show_id}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "avg_bpm", "min_bpm", "max_bpm", "tracks_with_bpm"],
                 fmt=fmt, title="BPM by Show")


@stats.command("energy")
@click.option("--show", "show_id", default=None, help="Limit to one show.")
@output_options
def stats_energy(show_id, fmt):
    """Average energy score per show."""
    conn = get_connection()
    # Use parameterized query — no f-string SQL
    if show_id is not None:
        rows = conn.execute("""
            SELECT sh.id AS show_id, sh.aired_at,
                   ROUND(AVG(t.energy), 3) AS avg_energy,
                   COUNT(t.energy) AS tracks_with_energy
            FROM shows sh
            JOIN show_tracks st ON sh.id = st.show_id
            JOIN tracks t ON st.track_id = t.id
            WHERE t.energy IS NOT NULL AND sh.id = ?
            GROUP BY sh.id, sh.aired_at
            ORDER BY sh.aired_at DESC
        """, (show_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT sh.id AS show_id, sh.aired_at,
                   ROUND(AVG(t.energy), 3) AS avg_energy,
                   COUNT(t.energy) AS tracks_with_energy
            FROM shows sh
            JOIN show_tracks st ON sh.id = st.show_id
            JOIN tracks t ON st.track_id = t.id
            WHERE t.energy IS NOT NULL
            GROUP BY sh.id, sh.aired_at
            ORDER BY sh.aired_at DESC
        """).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "avg_energy", "tracks_with_energy"],
                 fmt=fmt, title="Energy by Show")


@stats.command("release-years")
@output_options
def stats_release_years(fmt):
    """Track plays by release year."""
    conn = get_connection()
    rows = conn.execute(_load_query("release_year_spread")).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["release_year", "play_count", "unique_tracks"],
                 fmt=fmt, title="Release Year Spread")
```

- [ ] **Step 4: Implement commands/db_cmds.py**

Replace `db/commands/db_cmds.py` entirely:
```python
"""DB utility commands (init, export)."""
import csv
import json
import sys
import click
from database import get_connection, init_db

TABLES = ["shows", "tracks", "artists", "track_artists", "show_tracks"]


@click.group("db")
def db():
    """Database utility commands."""


@db.command("init")
def db_init():
    """Initialize (or re-initialize) the database schema."""
    init_db()
    click.echo("Database initialized.")


@db.command("export")
@click.option("--format", "fmt", default="json",
              type=click.Choice(["json", "csv", "sql"]), show_default=True)
def db_export(fmt):
    """Export all DB data for backup or migration."""
    conn = get_connection()

    if fmt == "json":
        export = {}
        for table in TABLES:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            export[table] = [dict(r) for r in rows]
        conn.close()
        print(json.dumps(export, indent=2, default=str))

    elif fmt == "csv":
        for table in TABLES:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                continue
            cols = list(dict(rows[0]).keys())
            writer = csv.DictWriter(sys.stdout, fieldnames=cols)
            sys.stdout.write(f"-- TABLE: {table}\n")
            writer.writeheader()
            writer.writerows([dict(r) for r in rows])
            sys.stdout.write("\n")
        conn.close()

    elif fmt == "sql":
        for table in TABLES:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            for row in rows:
                d = dict(row)
                cols = ", ".join(d.keys())
                vals = ", ".join(_sql_value(v) for v in d.values())
                print(f"INSERT INTO {table} ({cols}) VALUES ({vals});")
        conn.close()


def _sql_value(v) -> str:
    """Render a Python value as a SQL literal. Numerics are unquoted."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    # String: escape single quotes
    return "'" + str(v).replace("'", "''") + "'"
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pytest db/tests/test_stats_commands.py -v
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add db/commands/stats.py db/commands/db_cmds.py db/queries/bpm_trends.sql db/queries/release_year_spread.sql db/tests/test_stats_commands.py
git commit -m "feat: implement stats commands, db export, and SQL files with tests"
```

---

## Chunk 6: Integration + Smoke Test

Run after all subagents complete. Executed in main session.

### Task 14: Full test suite + smoke test with real data

- [ ] **Step 1: Run full test suite**

```bash
cd /path/to/theisland && source db/.venv/bin/activate
pytest db/tests/ -v --tb=short
```
Expected: all tests PASS.

- [ ] **Step 2: Initialize a real DB**

```bash
python db/cli.py db init
```
Expected: `Database initialized.`

- [ ] **Step 3: Import historical data from playlists.ts**

```bash
python db/cli.py shows import --source playlists-ts --file web/src/data/playlists.ts
```
Expected: `Imported 20 shows, NNN tracks.`

- [ ] **Step 4: Smoke test key commands**

```bash
python db/cli.py shows list
python db/cli.py shows list --plain | wc -l
python db/cli.py tracks top-artists --limit 10
python db/cli.py tracks play-count "Mungo's Hi Fi"
python db/cli.py tracks history "Mungo's Hi Fi" --json | head -30
python db/cli.py stats summary
python db/cli.py stats release-years
```

- [ ] **Step 5: Verify JSON output is machine-parseable**

```bash
python db/cli.py shows list --json | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d), 'shows')"
python db/cli.py tracks top-artists --json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0])"
```
Expected: valid JSON, correct counts.

- [ ] **Step 6: Verify plain output works in pipelines**

```bash
python db/cli.py shows list --plain | grep "^2026"
python db/cli.py tracks top-artists --plain | wc -l
```

- [ ] **Step 7: Commit final state**

```bash
git add -A
git commit -m "feat: complete radio database CLI — all commands implemented and tested"
```

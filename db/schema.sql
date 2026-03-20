-- The Island Radio Show Database
-- SQLite schema. For Postgres: replace INTEGER PRIMARY KEY with SERIAL PRIMARY KEY.
-- Initialise with: python db/cli.py db init

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shows (
    id                TEXT     PRIMARY KEY,  -- ISO date "2026-03-13" (one show per date by design)
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

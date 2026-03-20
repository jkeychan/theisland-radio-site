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

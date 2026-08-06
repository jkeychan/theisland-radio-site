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

    # Replace this show's tracklist wholesale so re-imports after edits don't
    # leave stale rows behind (see from_playlists_ts.import_playlists_ts).
    conn.execute("DELETE FROM show_tracks WHERE show_id=?", (show_id,))

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

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

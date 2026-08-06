"""Import a show and all its tracks from an Exportify CSV in one step.

Unlike from_exportify_csv (which only enriches existing tracks), this importer
creates the show record, inserts/upserts tracks with all Exportify fields, links
them in show_tracks, and upserts artist records.
"""
import csv
import io
import sqlite3
from typing import Any

from importers.artist_parser import parse_artists
from importers.from_exportify_csv import parse_exportify_csv


def import_exportify_show(
    rows: list[dict[str, Any]],
    show_id: str,
    archive_url: str | None,
    conn: sqlite3.Connection,
    overwrite: bool = False,
) -> dict[str, int]:
    """Import a show from pre-parsed Exportify rows. Returns counts."""
    conn.execute(
        """INSERT INTO shows (id, aired_at, archive_url)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
               archive_url=COALESCE(excluded.archive_url, shows.archive_url)""",
        (show_id, show_id, archive_url),
    )

    # Replace this show's tracklist wholesale so re-imports after edits don't
    # leave stale rows behind (see from_playlists_ts.import_playlists_ts).
    conn.execute("DELETE FROM show_tracks WHERE show_id=?", (show_id,))

    tracks_inserted = 0
    for pos, row in enumerate(rows, start=1):
        title = row.get("title", "").strip()
        raw_artist = row.get("raw_artist", "").strip()
        if not title or not raw_artist:
            continue

        album = row.get("album") or None

        if overwrite:
            conn.execute(
                """INSERT INTO tracks
                       (title, raw_artist, album, spotify_id, duration_ms,
                        release_date, bpm, energy, danceability,
                        musical_key, mode, genres, album_image_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(raw_artist, title, album) DO UPDATE SET
                       spotify_id     = COALESCE(excluded.spotify_id, tracks.spotify_id),
                       duration_ms    = COALESCE(excluded.duration_ms, tracks.duration_ms),
                       release_date   = COALESCE(excluded.release_date, tracks.release_date),
                       bpm            = COALESCE(excluded.bpm, tracks.bpm),
                       energy         = COALESCE(excluded.energy, tracks.energy),
                       danceability   = COALESCE(excluded.danceability, tracks.danceability),
                       musical_key    = COALESCE(excluded.musical_key, tracks.musical_key),
                       mode           = COALESCE(excluded.mode, tracks.mode),
                       genres         = COALESCE(excluded.genres, tracks.genres),
                       album_image_url= COALESCE(excluded.album_image_url, tracks.album_image_url)""",
                (
                    title, raw_artist, album,
                    row.get("spotify_id"), row.get("duration_ms"),
                    row.get("release_date"), row.get("bpm"), row.get("energy"),
                    row.get("danceability"), row.get("musical_key"), row.get("mode"),
                    row.get("genres"), row.get("album_image_url"),
                ),
            )
        else:
            conn.execute(
                """INSERT INTO tracks
                       (title, raw_artist, album, spotify_id, duration_ms,
                        release_date, bpm, energy, danceability,
                        musical_key, mode, genres, album_image_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(raw_artist, title, album) DO UPDATE SET
                       spotify_id     = COALESCE(tracks.spotify_id,      excluded.spotify_id),
                       duration_ms    = COALESCE(tracks.duration_ms,     excluded.duration_ms),
                       release_date   = COALESCE(tracks.release_date,    excluded.release_date),
                       bpm            = COALESCE(tracks.bpm,             excluded.bpm),
                       energy         = COALESCE(tracks.energy,          excluded.energy),
                       danceability   = COALESCE(tracks.danceability,    excluded.danceability),
                       musical_key    = COALESCE(tracks.musical_key,     excluded.musical_key),
                       mode           = COALESCE(tracks.mode,            excluded.mode),
                       genres         = COALESCE(tracks.genres,          excluded.genres),
                       album_image_url= COALESCE(tracks.album_image_url, excluded.album_image_url)""",
                (
                    title, raw_artist, album,
                    row.get("spotify_id"), row.get("duration_ms"),
                    row.get("release_date"), row.get("bpm"), row.get("energy"),
                    row.get("danceability"), row.get("musical_key"), row.get("mode"),
                    row.get("genres"), row.get("album_image_url"),
                ),
            )

        track_row = conn.execute(
            "SELECT id FROM tracks WHERE raw_artist=? AND title=? AND album IS ?",
            (raw_artist, title, album),
        ).fetchone()
        track_id = track_row[0]
        tracks_inserted += 1

        conn.execute(
            """INSERT INTO show_tracks (show_id, track_id, position)
               VALUES (?, ?, ?)
               ON CONFLICT(show_id, track_id, position) DO NOTHING""",
            (show_id, track_id, pos),
        )

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

    conn.commit()
    return {"tracks": tracks_inserted}


def import_from_file(
    csv_path: str,
    show_id: str,
    archive_url: str | None,
    conn: sqlite3.Connection,
    overwrite: bool = False,
) -> dict[str, int]:
    content = open(csv_path, encoding="utf-8").read()
    rows = parse_exportify_csv(content)
    return import_exportify_show(rows, show_id, archive_url, conn, overwrite=overwrite)

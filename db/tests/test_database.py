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

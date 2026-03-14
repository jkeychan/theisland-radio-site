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

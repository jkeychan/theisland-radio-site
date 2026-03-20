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

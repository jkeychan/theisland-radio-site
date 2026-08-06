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


VERIFY_FIXTURE_TS = '''
export const playlists: Playlist[] = [
  {
    id: "2026-03-13",
    title: "March 13, 2026",
    archiveUrl: "https://archive.org/details/the-island-march-13",
    tracks: [
      { artist: "The Upsetters", title: "Underground", album: "Super Ape" },
      { artist: "King Tubby", title: "Bag a Wire Dub", album: "Test Album" },
    ],
  },
];
'''


@pytest.fixture
def verify_ts_file(tmp_path):
    p = tmp_path / "playlists.ts"
    p.write_text(VERIFY_FIXTURE_TS, encoding="utf-8")
    return str(p)


def test_shows_verify_in_sync(runner, tmp_db, verify_ts_file, monkeypatch):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Bag a Wire Dub", "King Tubby", "Test Album")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    monkeypatch.setattr("commands.shows.get_connection", lambda: tmp_db)

    result = runner.invoke(cli, [
        "shows", "verify", "--playlists-file", verify_ts_file, "--no-check-archive",
    ])
    assert result.exit_code == 0
    assert "In sync" in result.output


def test_shows_verify_detects_track_count_mismatch(runner, tmp_db, verify_ts_file, monkeypatch):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)  # missing the 2nd track
    monkeypatch.setattr("commands.shows.get_connection", lambda: tmp_db)

    result = runner.invoke(cli, [
        "shows", "verify", "--playlists-file", verify_ts_file, "--no-check-archive",
    ])
    assert result.exit_code == 1
    assert "2026-03-13" in result.output
    assert "2 tracks" in result.output and "db has 1" in result.output


def test_shows_verify_detects_show_missing_from_ts(runner, tmp_db, verify_ts_file, monkeypatch):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Bag a Wire Dub", "King Tubby", "Test Album")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    insert_show(tmp_db, "2026-05-02", "2026-05-02")  # phantom, not in playlists.ts
    monkeypatch.setattr("commands.shows.get_connection", lambda: tmp_db)

    result = runner.invoke(cli, [
        "shows", "verify", "--playlists-file", verify_ts_file, "--no-check-archive",
    ])
    assert result.exit_code == 1
    assert "2026-05-02: in db but not in playlists.ts" in result.output


def test_shows_verify_detects_broken_archive_link(runner, tmp_db, verify_ts_file, monkeypatch):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    tmp_db.execute(
        "UPDATE shows SET archive_url=? WHERE id=?",
        ("https://archive.org/details/does-not-exist", "2026-03-13"),
    )
    tmp_db.commit()
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Bag a Wire Dub", "King Tubby", "Test Album")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    monkeypatch.setattr("commands.shows.get_connection", lambda: tmp_db)

    class FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {}

    monkeypatch.setattr("commands.shows.requests.get", lambda *a, **k: FakeResp())

    result = runner.invoke(cli, ["shows", "verify", "--playlists-file", verify_ts_file])
    assert result.exit_code == 1
    assert "does-not-exist' not found" in result.output


def test_shows_verify_skips_shows_without_archive_url(runner, tmp_db, verify_ts_file, monkeypatch):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")  # no archive_url
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Bag a Wire Dub", "King Tubby", "Test Album")
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    monkeypatch.setattr("commands.shows.get_connection", lambda: tmp_db)

    def fail_if_called(*a, **k):
        raise AssertionError("should not check archive.org when archive_url is unset")

    monkeypatch.setattr("commands.shows.requests.get", fail_if_called)

    result = runner.invoke(cli, ["shows", "verify", "--playlists-file", verify_ts_file])
    assert result.exit_code == 0

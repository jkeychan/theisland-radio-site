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

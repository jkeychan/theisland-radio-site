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
def enriched_db(tmp_db):
    insert_show(tmp_db, "2026-03-13", "2026-03-13")
    insert_show(tmp_db, "2026-01-02", "2026-01-02")
    t1 = insert_track(tmp_db, "Underground", "The Upsetters", "Super Ape")
    t2 = insert_track(tmp_db, "Loving Dub", "Dylan Judah", "Loving Dub")
    tmp_db.execute("UPDATE tracks SET bpm=130.5, release_date='1976', energy=0.8 WHERE id=?", (t1,))
    tmp_db.execute("UPDATE tracks SET bpm=85.0, release_date='2010-05', energy=0.5 WHERE id=?", (t2,))
    tmp_db.commit()
    insert_show_track(tmp_db, "2026-03-13", t1, 1)
    insert_show_track(tmp_db, "2026-03-13", t2, 2)
    insert_show_track(tmp_db, "2026-01-02", t1, 1)
    return tmp_db


def test_stats_summary(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "summary", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    # summary returns a JSON array with one row
    assert isinstance(data, list) and len(data) == 1
    row = data[0]
    assert row["total_shows"] == 2
    assert row["total_tracks"] == 2
    assert row["total_plays"] == 3


def test_stats_bpm_all_shows(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "bpm", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) == 2


def test_stats_bpm_single_show(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "bpm", "--show", "2026-03-13", "--json"])
    data = json.loads(result.output)
    assert len(data) == 1
    assert data[0]["show_id"] == "2026-03-13"


def test_stats_release_years(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "release-years", "--json"])
    data = json.loads(result.output)
    years = [r["release_year"] for r in data]
    assert "1976" in years
    assert "2010" in years


def test_stats_energy(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "energy", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) >= 1
    assert "avg_energy" in data[0]


def test_stats_archive_downloads(runner, enriched_db, monkeypatch):
    enriched_db.execute(
        "UPDATE shows SET archive_downloads=500 WHERE id='2026-03-13'"
    )
    enriched_db.commit()
    monkeypatch.setattr("commands.stats.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["stats", "archive-downloads", "--json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert len(data) == 1
    assert data[0]["archive_downloads"] == 500


def test_db_export_json(runner, enriched_db, monkeypatch):
    monkeypatch.setattr("commands.db_cmds.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["db", "export", "--format", "json"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert "shows" in data
    assert "tracks" in data
    assert len(data["shows"]) == 2
    assert len(data["tracks"]) == 2


def test_db_export_sql_numeric_values(runner, enriched_db, monkeypatch):
    """Numeric values in SQL export are not quoted (for Postgres compatibility)."""
    monkeypatch.setattr("commands.db_cmds.get_connection", lambda: enriched_db)
    result = runner.invoke(cli, ["db", "export", "--format", "sql"])
    assert result.exit_code == 0
    # Find a line with a numeric bpm value and verify it's not single-quoted
    bpm_lines = [l for l in result.output.splitlines() if "130.5" in l]
    assert bpm_lines, "Expected a line containing bpm value 130.5"
    assert "'130.5'" not in bpm_lines[0], "Numeric values must not be quoted in SQL export"

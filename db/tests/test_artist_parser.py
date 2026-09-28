import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
from importers.artist_parser import parse_artists


def cache_split(conn, credit, acts):
    conn.execute(
        "INSERT INTO artist_splits (credit, acts, confidence) VALUES (?, ?, 1.0)",
        (credit, json.dumps(acts)),
    )


def test_single_artist(tmp_db):
    assert parse_artists("King Tubby", tmp_db) == ["King Tubby"]


def test_comma_separated(tmp_db):
    assert parse_artists("Dylan Judah, Scientist", tmp_db) == ["Dylan Judah", "Scientist"]


def test_semicolon_separated(tmp_db):
    assert parse_artists("Dub Judah;Kibir La Amlak", tmp_db) == ["Dub Judah", "Kibir La Amlak"]


def test_joiner_segments_use_cached_split(tmp_db):
    cache_split(tmp_db, "Chase & Status", ["Chase & Status"])
    cache_split(tmp_db, "Skrillex feat. Flowdan", ["Skrillex", "Flowdan"])
    assert parse_artists("Chase & Status, Bou", tmp_db) == ["Chase & Status", "Bou"]
    assert parse_artists("Skrillex feat. Flowdan", tmp_db) == ["Skrillex", "Flowdan"]


def test_uncached_joiner_without_key_raises(tmp_db, monkeypatch):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="TYPESAFE_API_KEY"):
        parse_artists("Sly & Robbie", tmp_db)


def test_whitespace_trimmed(tmp_db):
    assert parse_artists("  Artist One  ,  Artist Two  ", tmp_db) == ["Artist One", "Artist Two"]


def test_empty_string(tmp_db):
    assert parse_artists("", tmp_db) == []

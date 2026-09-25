import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from importers.from_playlists_ts import parse_playlists_ts, import_playlists_ts
from tests.conftest import insert_show


FIXTURE_TS = '''
export const playlists: Playlist[] = [
  {
    id: "2026-01-10",
    title: "January 10, 2026",
    archiveUrl: "https://archive.org/details/the-island-jan-10",
    tracks: [
      { artist: "King Tubby", title: "Bag a Wire Dub", album: "Test Album" },
      { artist: "Dylan Judah, Scientist", title: "Loving Dub", album: "Loving Dub" },
    ],
  },
  {
    id: "2025-12-05",
    title: "December 5, 2025",
    tracks: [
      { artist: "The Upsetters", title: "Underground", album: "Super Ape" },
    ],
  },
];
'''


def test_parse_playlists_ts_show_count():
    playlists = parse_playlists_ts(FIXTURE_TS)
    assert len(playlists) == 2


def test_parse_playlists_ts_fields():
    playlists = parse_playlists_ts(FIXTURE_TS)
    show = playlists[0]
    assert show["id"] == "2026-01-10"
    assert show["archive_url"] == "https://archive.org/details/the-island-jan-10"
    assert len(show["tracks"]) == 2


def test_parse_playlists_ts_track_fields():
    playlists = parse_playlists_ts(FIXTURE_TS)
    track = playlists[0]["tracks"][0]
    assert track["artist"] == "King Tubby"
    assert track["title"] == "Bag a Wire Dub"
    assert track["album"] == "Test Album"


def test_parse_playlists_ts_optional_archive_url():
    playlists = parse_playlists_ts(FIXTURE_TS)
    assert playlists[1].get("archive_url") is None


def test_import_playlists_ts_inserts_shows(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    shows = tmp_db.execute("SELECT * FROM shows").fetchall()
    assert len(shows) == 2


def test_import_playlists_ts_inserts_tracks(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    tracks = tmp_db.execute("SELECT * FROM tracks").fetchall()
    assert len(tracks) == 3  # 2 in first show + 1 in second


def test_import_playlists_ts_inserts_show_tracks(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    st = tmp_db.execute("SELECT * FROM show_tracks").fetchall()
    assert len(st) == 3


def test_import_playlists_ts_parses_artists(tmp_db):
    import_playlists_ts(FIXTURE_TS, tmp_db)
    artists = {row["name"] for row in tmp_db.execute("SELECT name FROM artists").fetchall()}
    assert "King Tubby" in artists
    assert "Dylan Judah" in artists
    assert "Scientist" in artists


def test_import_playlists_ts_idempotent(tmp_db):
    """Running import twice produces no duplicate rows."""
    import_playlists_ts(FIXTURE_TS, tmp_db)
    import_playlists_ts(FIXTURE_TS, tmp_db)
    shows = tmp_db.execute("SELECT * FROM shows").fetchall()
    assert len(shows) == 2
    show_tracks = tmp_db.execute("SELECT * FROM show_tracks").fetchall()
    assert len(show_tracks) == 3

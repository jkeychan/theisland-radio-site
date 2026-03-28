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


from importers.from_csv import parse_csv, import_csv

CSV_FIXTURE = """Title,Artist,Album,Duration (ms)
Underground,The Upsetters,Super Ape,176133
"Loving Dub","Dylan Judah, Scientist",Loving Dub,247261
No Partial,Rhythm & Sound,,180000
"""


def test_parse_csv_track_count():
    tracks = parse_csv(CSV_FIXTURE)
    assert len(tracks) == 3


def test_parse_csv_fields():
    tracks = parse_csv(CSV_FIXTURE)
    assert tracks[0]["title"] == "Underground"
    assert tracks[0]["artist"] == "The Upsetters"
    assert tracks[0]["album"] == "Super Ape"
    assert tracks[0]["duration_ms"] == 176133


def test_parse_csv_empty_album():
    tracks = parse_csv(CSV_FIXTURE)
    assert tracks[2]["album"] is None


def test_import_csv_inserts_tracks(tmp_db):
    insert_show(tmp_db, "2026-01-01", "2026-01-01")
    import_csv(CSV_FIXTURE, "2026-01-01", tmp_db)
    tracks = tmp_db.execute("SELECT * FROM tracks").fetchall()
    assert len(tracks) == 3


def test_import_csv_sets_duration_ms(tmp_db):
    insert_show(tmp_db, "2026-01-01", "2026-01-01")
    import_csv(CSV_FIXTURE, "2026-01-01", tmp_db)
    track = tmp_db.execute(
        "SELECT duration_ms FROM tracks WHERE title='Underground'"
    ).fetchone()
    assert track["duration_ms"] == 176133


def test_import_csv_position_order(tmp_db):
    insert_show(tmp_db, "2026-01-01", "2026-01-01")
    import_csv(CSV_FIXTURE, "2026-01-01", tmp_db)
    rows = tmp_db.execute(
        "SELECT position FROM show_tracks ORDER BY position"
    ).fetchall()
    assert [r["position"] for r in rows] == [1, 2, 3]


from importers.from_exportify_csv import parse_exportify_csv, enrich_from_exportify

EXPORTIFY_FIXTURE = """Spotify URI,Track Name,Artist Name(s),Album Name,Album Image URL,Track Duration (ms),Added By,Added At,Genres,Record Label,Release Date,ISRC,BPM,Key,Mode,Danceability,Energy
spotify:track:abc123,Underground,The Upsetters,Super Ape,https://img/1.jpg,176133,user,2026-01-01,reggae,Label,1973,ISRC1,130.5,0,1,0.65,0.80
spotify:track:def456,Loving Dub,"Dylan Judah, Scientist",Loving Dub,https://img/2.jpg,247261,user,2026-01-01,dub,Label,2010-05-01,ISRC2,85.0,-1,0,0.55,0.60
"""


def test_parse_exportify_row_count():
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    assert len(rows) == 2


def test_parse_exportify_fields():
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    r = rows[0]
    assert r["spotify_id"] == "spotify:track:abc123"
    assert r["title"] == "Underground"
    assert r["raw_artist"] == "The Upsetters"
    assert r["bpm"] == 130.5
    assert r["musical_key"] == 0
    assert r["mode"] == 1
    assert r["release_date"] == "1973"
    assert r["genres"] == "reggae"


def test_parse_exportify_undetected_key():
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    assert rows[1]["musical_key"] == -1


def test_enrich_matches_by_raw_artist_title(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=False)
    row = tmp_db.execute("SELECT bpm, spotify_id FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["bpm"] == 130.5
    assert row["spotify_id"] == "spotify:track:abc123"


def test_enrich_no_overwrite(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    tmp_db.execute("UPDATE tracks SET bpm=999.0 WHERE id=?", (track_id,))
    tmp_db.commit()
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=False)
    row = tmp_db.execute("SELECT bpm FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["bpm"] == 999.0  # not overwritten


def test_enrich_with_overwrite(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    tmp_db.execute("UPDATE tracks SET bpm=999.0 WHERE id=?", (track_id,))
    tmp_db.commit()
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=True)
    row = tmp_db.execute("SELECT bpm FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["bpm"] == 130.5  # overwritten


def test_enrich_never_overwrites_core_fields(tmp_db):
    from tests.conftest import insert_track
    track_id = insert_track(tmp_db, title="Underground", raw_artist="The Upsetters", album="Super Ape")
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    enrich_from_exportify(rows, tmp_db, overwrite=True)
    row = tmp_db.execute("SELECT raw_artist, title, album FROM tracks WHERE id=?", (track_id,)).fetchone()
    assert row["raw_artist"] == "The Upsetters"
    assert row["title"] == "Underground"


def test_enrich_unmatched_returns_count(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    result = enrich_from_exportify(rows, tmp_db, overwrite=False)
    assert result["unmatched"] == 2  # no tracks in DB to match


from importers.from_exportify_show import import_exportify_show


def test_import_exportify_show_creates_show(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    import_exportify_show(rows, "2026-03-28", "https://archive.org/details/test", tmp_db)
    show = tmp_db.execute("SELECT * FROM shows WHERE id='2026-03-28'").fetchone()
    assert show is not None
    assert show["archive_url"] == "https://archive.org/details/test"


def test_import_exportify_show_inserts_tracks(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    result = import_exportify_show(rows, "2026-03-28", None, tmp_db)
    assert result["tracks"] == 2
    tracks = tmp_db.execute("SELECT * FROM tracks").fetchall()
    assert len(tracks) == 2


def test_import_exportify_show_populates_metadata(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    import_exportify_show(rows, "2026-03-28", None, tmp_db)
    track = tmp_db.execute(
        "SELECT bpm, energy, spotify_id, genres FROM tracks WHERE title='Underground'"
    ).fetchone()
    assert track["bpm"] == 130.5
    assert track["energy"] == 0.80
    assert track["spotify_id"] == "spotify:track:abc123"
    assert track["genres"] == "reggae"


def test_import_exportify_show_creates_show_tracks(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    import_exportify_show(rows, "2026-03-28", None, tmp_db)
    st = tmp_db.execute("SELECT * FROM show_tracks WHERE show_id='2026-03-28'").fetchall()
    assert len(st) == 2
    assert [r["position"] for r in st] == [1, 2]


def test_import_exportify_show_idempotent(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    import_exportify_show(rows, "2026-03-28", None, tmp_db)
    import_exportify_show(rows, "2026-03-28", None, tmp_db)
    tracks = tmp_db.execute("SELECT * FROM tracks").fetchall()
    assert len(tracks) == 2
    st = tmp_db.execute("SELECT * FROM show_tracks").fetchall()
    assert len(st) == 2


def test_import_exportify_show_no_overwrite(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    import_exportify_show(rows, "2026-03-28", None, tmp_db)
    tmp_db.execute("UPDATE tracks SET bpm=999.0 WHERE title='Underground'")
    tmp_db.commit()
    import_exportify_show(rows, "2026-03-28", None, tmp_db, overwrite=False)
    track = tmp_db.execute("SELECT bpm FROM tracks WHERE title='Underground'").fetchone()
    assert track["bpm"] == 999.0


def test_import_exportify_show_overwrite(tmp_db):
    rows = parse_exportify_csv(EXPORTIFY_FIXTURE)
    import_exportify_show(rows, "2026-03-28", None, tmp_db)
    tmp_db.execute("UPDATE tracks SET bpm=999.0 WHERE title='Underground'")
    tmp_db.commit()
    import_exportify_show(rows, "2026-03-28", None, tmp_db, overwrite=True)
    track = tmp_db.execute("SELECT bpm FROM tracks WHERE title='Underground'").fetchone()
    assert track["bpm"] == 130.5

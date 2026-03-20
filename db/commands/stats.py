"""Stats command group."""
from pathlib import Path
import click
from commands import output_options
from database import get_connection
from output import print_output

_QUERIES = Path(__file__).parent.parent / "queries"


def _load_query(name: str) -> str:
    return (_QUERIES / f"{name}.sql").read_text()


@click.group()
def stats():
    """Insight queries across all show data."""


@stats.command("summary")
@output_options
def stats_summary(fmt):
    """Overall DB stats: shows, tracks, plays, artists."""
    conn = get_connection()
    row = conn.execute("""
        SELECT
            (SELECT COUNT(*) FROM shows)       AS total_shows,
            (SELECT COUNT(*) FROM tracks)      AS total_tracks,
            (SELECT COUNT(*) FROM show_tracks) AS total_plays,
            (SELECT COUNT(*) FROM artists)     AS total_artists
    """).fetchone()
    conn.close()
    data = [dict(row)]
    print_output(data, list(data[0].keys()), fmt=fmt, title="Summary")


@stats.command("archive-downloads")
@output_options
def stats_archive_downloads(fmt):
    """Archive.org download counts per show, ranked."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT id AS show_id, aired_at, archive_downloads
        FROM shows
        WHERE archive_downloads IS NOT NULL
        ORDER BY archive_downloads DESC
    """).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "archive_downloads"],
                 fmt=fmt, title="Archive Downloads")


@stats.command("bpm")
@click.option("--show", "show_id", default=None, help="Limit to one show.")
@output_options
def stats_bpm(show_id, fmt):
    """Average BPM per show (or for a single show)."""
    conn = get_connection()
    rows = conn.execute(_load_query("bpm_trends"), {"show_id": show_id}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "avg_bpm", "min_bpm", "max_bpm", "tracks_with_bpm"],
                 fmt=fmt, title="BPM by Show")


@stats.command("energy")
@click.option("--show", "show_id", default=None, help="Limit to one show.")
@output_options
def stats_energy(show_id, fmt):
    """Average energy score per show."""
    conn = get_connection()
    # Use two separate parameterized queries — no f-string SQL
    if show_id is not None:
        rows = conn.execute("""
            SELECT sh.id AS show_id, sh.aired_at,
                   ROUND(AVG(t.energy), 3) AS avg_energy,
                   COUNT(t.energy) AS tracks_with_energy
            FROM shows sh
            JOIN show_tracks st ON sh.id = st.show_id
            JOIN tracks t ON st.track_id = t.id
            WHERE t.energy IS NOT NULL AND sh.id = ?
            GROUP BY sh.id, sh.aired_at
            ORDER BY sh.aired_at DESC
        """, (show_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT sh.id AS show_id, sh.aired_at,
                   ROUND(AVG(t.energy), 3) AS avg_energy,
                   COUNT(t.energy) AS tracks_with_energy
            FROM shows sh
            JOIN show_tracks st ON sh.id = st.show_id
            JOIN tracks t ON st.track_id = t.id
            WHERE t.energy IS NOT NULL
            GROUP BY sh.id, sh.aired_at
            ORDER BY sh.aired_at DESC
        """).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "avg_energy", "tracks_with_energy"],
                 fmt=fmt, title="Energy by Show")


@stats.command("release-years")
@output_options
def stats_release_years(fmt):
    """Track plays by release year."""
    conn = get_connection()
    rows = conn.execute(_load_query("release_year_spread")).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["release_year", "play_count", "unique_tracks"],
                 fmt=fmt, title="Release Year Spread")

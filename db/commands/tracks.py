"""Tracks command group."""
import sys
from pathlib import Path
import click
from commands import output_options
from database import get_connection
from output import print_output

_QUERIES = Path(__file__).parent.parent / "queries"


def _load_query(name: str) -> str:
    return (_QUERIES / f"{name}.sql").read_text()


@click.group()
def tracks():
    """Commands for querying tracks."""


@tracks.command("search")
@click.argument("query")
@output_options
def tracks_search(query, fmt):
    """Search tracks by title or artist."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, raw_artist, album FROM tracks "
        "WHERE lower(title) LIKE lower(?) OR lower(raw_artist) LIKE lower(?) "
        "ORDER BY raw_artist, title",
        (f"%{query}%", f"%{query}%"),
    ).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["id", "title", "raw_artist", "album"],
                 fmt=fmt, plain_key="id")


@tracks.command("top-artists")
@click.option("--limit", default=20, show_default=True)
@output_options
def tracks_top_artists(limit, fmt):
    """Artists ranked by total play count."""
    conn = get_connection()
    rows = conn.execute(_load_query("top_artists"), {"limit": limit}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["artist", "play_count", "shows_appeared"],
                 fmt=fmt, plain_key="artist", title="Top Artists")


@tracks.command("play-count")
@click.argument("artist")
@output_options
def tracks_play_count(artist, fmt):
    """Total plays for an artist across all shows."""
    conn = get_connection()
    rows = conn.execute(_load_query("play_count"), {"artist": artist}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["artist", "play_count", "shows_appeared"], fmt=fmt)


@tracks.command("history")
@click.argument("artist")
@output_options
def tracks_history(artist, fmt):
    """All shows that featured an artist."""
    conn = get_connection()
    rows = conn.execute(_load_query("show_history"), {"artist": artist}).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["show_id", "aired_at", "track_title", "raw_artist", "album", "position"],
                 fmt=fmt, plain_key="show_id")


@tracks.command("update")
@click.argument("track_id", type=int)
@click.option("--title", default=None)
@click.option("--album", default=None)
@click.option("--raw-artist", default=None)
def tracks_update(track_id, title, album, raw_artist):
    """Correct fields on a track."""
    conn = get_connection()
    updates = {}
    if title is not None:
        updates["title"] = title
    if album is not None:
        updates["album"] = album
    if raw_artist is not None:
        updates["raw_artist"] = raw_artist

    if not updates:
        click.echo("No fields to update.", err=True)
        conn.close()
        sys.exit(1)

    set_clause = ", ".join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE tracks SET {set_clause} WHERE id=?", (*updates.values(), track_id))
    conn.commit()
    click.echo(f"Updated track {track_id}.")

"""Shows command group."""
import json
import sys
from pathlib import Path
import click
import requests
from commands import output_options
from database import get_connection
from output import print_output

DEFAULT_PLAYLISTS_TS = Path(__file__).parent.parent.parent / "web" / "src" / "data" / "playlists.ts"

MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}


@click.group()
def shows():
    """Commands for managing shows."""


@shows.command("list")
@output_options
def shows_list(fmt):
    """List all shows, newest first."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, aired_at, archive_url, duration_seconds, archive_downloads "
        "FROM shows ORDER BY aired_at DESC"
    ).fetchall()
    conn.close()
    print_output([dict(r) for r in rows],
                 ["id", "aired_at", "archive_url", "duration_seconds", "archive_downloads"],
                 fmt=fmt, plain_key="id", title="Shows")


@shows.command("search")
@click.argument("query")
@output_options
def shows_search(query, fmt):
    """Search shows by date prefix (2026-03) or month name (march)."""
    conn = get_connection()
    q = query.strip().lower()
    month = MONTH_MAP.get(q)
    if month:
        rows = conn.execute(
            "SELECT id, aired_at, archive_url FROM shows "
            "WHERE strftime('%m', aired_at)=? ORDER BY aired_at DESC",
            (month,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, aired_at, archive_url FROM shows "
            "WHERE id LIKE ? ORDER BY aired_at DESC",
            (f"{query}%",)
        ).fetchall()
    conn.close()
    print_output([dict(r) for r in rows], ["id", "aired_at", "archive_url"],
                 fmt=fmt, plain_key="id")


@shows.command("import")
@click.option("--source", required=True,
              type=click.Choice(["playlists-ts", "csv", "exportify", "exportify-show"]))
@click.option("--file", "file_path", required=True, type=click.Path(exists=True))
@click.option("--show-id", default=None,
              help="Show ID (required for --source csv and exportify-show).")
@click.option("--archive-url", default=None,
              help="Archive.org URL (optional for --source exportify-show).")
@click.option("--overwrite", is_flag=True, default=False,
              help="Overwrite existing enrichment fields (exportify sources only).")
def shows_import(source, file_path, show_id, archive_url, overwrite):
    """Import show data from a file."""
    conn = get_connection()
    if source == "playlists-ts":
        from importers.from_playlists_ts import import_from_file
        result = import_from_file(file_path, conn)
        click.echo(f"Imported {result['shows']} shows, {result['tracks']} tracks.")
    elif source == "csv":
        if not show_id:
            click.echo("--show-id is required for --source csv", err=True)
            conn.close()
            sys.exit(1)
        from importers.from_csv import import_from_file
        result = import_from_file(file_path, show_id, conn)
        click.echo(f"Imported {result['tracks']} tracks into show {show_id}.")
    elif source == "exportify":
        from importers.from_exportify_csv import enrich_from_file
        result = enrich_from_file(file_path, conn, overwrite=overwrite)
        click.echo(
            f"Matched {result['matched']}, updated {result['updated']}, "
            f"unmatched {result['unmatched']}."
        )
    elif source == "exportify-show":
        if not show_id:
            click.echo("--show-id is required for --source exportify-show", err=True)
            conn.close()
            sys.exit(1)
        from importers.from_exportify_show import import_from_file
        result = import_from_file(file_path, show_id, archive_url, conn, overwrite=overwrite)
        click.echo(f"Imported show {show_id} with {result['tracks']} tracks.")
    conn.close()


@shows.command("fetch-meta")
@click.argument("show_id")
def shows_fetch_meta(show_id):
    """Pull runtime, downloads, description from archive.org. Exits 0 on success."""
    conn = get_connection()
    row = conn.execute("SELECT archive_url FROM shows WHERE id=?", (show_id,)).fetchone()
    if not row or not row["archive_url"]:
        click.echo(f"No archive_url for show {show_id}", err=True)
        conn.close()
        sys.exit(1)

    identifier = row["archive_url"].rstrip("/").split("/")[-1]
    api_url = f"https://archive.org/metadata/{identifier}"

    try:
        resp = requests.get(api_url, timeout=10)
        resp.raise_for_status()
        meta = resp.json()
    except Exception as e:
        click.echo(f"Failed to fetch metadata: {e}", err=True)
        conn.close()
        sys.exit(1)

    server_meta = meta.get("metadata", {})
    duration_seconds = None
    runtime = server_meta.get("runtime")
    if runtime:
        try:
            parts = str(runtime).split(":")
            if len(parts) == 3:
                duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(float(parts[2]))
            elif len(parts) == 2:
                duration_seconds = int(parts[0]) * 60 + int(float(parts[1]))
        except (ValueError, IndexError):
            pass

    downloads = None
    try:
        downloads = int(meta.get("item", {}).get("downloads", 0))
    except (ValueError, TypeError):
        pass

    description = server_meta.get("description")

    conn.execute(
        """UPDATE shows SET
               duration_seconds=COALESCE(?, duration_seconds),
               archive_downloads=?,
               description=COALESCE(?, description)
           WHERE id=?""",
        (duration_seconds, downloads, description, show_id),
    )
    conn.commit()
    updated = {"show_id": show_id, "duration_seconds": duration_seconds,
               "archive_downloads": downloads, "description": description}
    click.echo(json.dumps(updated, indent=2))
    conn.close()


@shows.command("update")
@click.argument("show_id")
@click.option("--archive-url", default=None)
@click.option("--description", default=None)
@click.option("--duration-seconds", type=int, default=None)
def shows_update(show_id, archive_url, description, duration_seconds):
    """Update fields on a show."""
    conn = get_connection()
    updates = {}
    if archive_url is not None:
        updates["archive_url"] = archive_url
    if description is not None:
        updates["description"] = description
    if duration_seconds is not None:
        updates["duration_seconds"] = duration_seconds

    if not updates:
        click.echo("No fields to update.", err=True)
        conn.close()
        sys.exit(1)

    set_clause = ", ".join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE shows SET {set_clause} WHERE id=?",
                 (*updates.values(), show_id))
    conn.commit()
    click.echo(f"Updated show {show_id}.")


@shows.command("verify")
@click.option("--playlists-file", default=None, type=click.Path(exists=True),
              help="Path to playlists.ts (defaults to web/src/data/playlists.ts in this repo).")
@click.option("--check-archive/--no-check-archive", default=True,
              help="Also confirm each show's archive_url resolves on archive.org.")
def shows_verify(playlists_file, check_archive):
    """Cross-check radio.db against playlists.ts and archive.org.

    playlists.ts is the source of truth for what's on the live site (it's what
    Next.js statically imports at build time), so any show whose track count
    disagrees with radio.db, or whose archive_url 404s, points at a real import
    or data-entry bug rather than a site problem.
    """
    from importers.from_playlists_ts import parse_playlists_ts

    path = Path(playlists_file) if playlists_file else DEFAULT_PLAYLISTS_TS
    conn = get_connection()
    problems = []

    ts_shows = parse_playlists_ts(path.read_text(encoding="utf-8"))
    ts_ids = {s["id"] for s in ts_shows}
    db_ids = {r[0] for r in conn.execute("SELECT id FROM shows").fetchall()}

    for s in ts_shows:
        expected = len(s["tracks"])
        actual = conn.execute(
            "SELECT COUNT(*) FROM show_tracks WHERE show_id=?", (s["id"],)
        ).fetchone()[0]
        if actual != expected:
            problems.append(f"{s['id']}: playlists.ts has {expected} tracks, db has {actual}")

    for show_id in sorted(db_ids - ts_ids):
        problems.append(f"{show_id}: in db but not in playlists.ts")

    if check_archive:
        for show_id in sorted(db_ids):
            row = conn.execute(
                "SELECT archive_url FROM shows WHERE id=?", (show_id,)
            ).fetchone()
            if not row["archive_url"]:
                continue  # not archived yet — not a sync problem
            identifier = row["archive_url"].rstrip("/").split("/")[-1]
            try:
                resp = requests.get(f"https://archive.org/metadata/{identifier}", timeout=10)
                resp.raise_for_status()
                if not resp.json():
                    problems.append(f"{show_id}: archive.org item '{identifier}' not found")
            except requests.RequestException as e:
                problems.append(f"{show_id}: archive.org check failed ({e})")

    conn.close()

    if problems:
        for p in problems:
            click.echo(f"✗ {p}", err=True)
        click.echo(f"\n{len(problems)} problem(s) found.", err=True)
        sys.exit(1)

    click.echo(f"In sync — {len(db_ids)} shows match across db, playlists.ts, and archive.org.")

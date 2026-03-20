"""Shows command group."""
import json
import sys
import click
import requests
from commands import output_options
from database import get_connection
from output import print_output

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
              type=click.Choice(["playlists-ts", "csv", "exportify"]))
@click.option("--file", "file_path", required=True, type=click.Path(exists=True))
@click.option("--show-id", default=None, help="Show ID (required for --source csv).")
@click.option("--overwrite", is_flag=True, default=False,
              help="Overwrite existing enrichment fields (exportify only).")
def shows_import(source, file_path, show_id, overwrite):
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

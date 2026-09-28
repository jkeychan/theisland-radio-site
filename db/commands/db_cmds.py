"""DB utility commands (init, export)."""
import csv
import json
import sys
import click
from database import get_connection, init_db

TABLES = ["shows", "tracks", "artists", "track_artists", "show_tracks", "artist_splits", "artist_aliases"]


@click.group("db")
def db():
    """Database utility commands."""


@db.command("init")
def db_init():
    """Initialize (or re-initialize) the database schema."""
    init_db()
    click.echo("Database initialized.")


@db.command("split")
@click.argument("credit")
@click.argument("acts", nargs=-1, required=True)
def db_split(credit, acts):
    """Set how an artist credit splits into acts, e.g. split "Jahtari and Pupajim" Jahtari Pupajim.

    Re-run `island shows import` afterwards to relink tracks.
    """
    conn = get_connection()
    conn.execute(
        "INSERT INTO artist_splits (credit, acts, confidence) VALUES (?, ?, 1.0) "
        "ON CONFLICT(credit) DO UPDATE SET acts=excluded.acts, confidence=1.0",
        (credit, json.dumps(list(acts))),
    )
    conn.commit()
    conn.close()
    click.echo(f"{credit} -> {' | '.join(acts)}")


@db.command("alias")
@click.argument("alias")
@click.argument("canonical")
def db_alias(alias, canonical):
    """Record ALIAS as another spelling of CANONICAL. Re-run `island shows import` after."""
    conn = get_connection()
    conn.execute(
        "INSERT INTO artist_aliases (alias, canonical) VALUES (?, ?) "
        "ON CONFLICT(alias) DO UPDATE SET canonical=excluded.canonical",
        (alias, canonical),
    )
    # Keep lookups one hop: anything pointing at ALIAS now points at CANONICAL
    conn.execute("UPDATE artist_aliases SET canonical=? WHERE canonical=?", (canonical, alias))
    conn.execute("DELETE FROM artist_aliases WHERE alias=canonical")
    conn.commit()
    conn.close()
    click.echo(f"{alias} -> {canonical}")


@db.command("find-aliases")
@click.option("--apply", is_flag=True, help="Save the proposed merges.")
def db_find_aliases(apply):
    """Use TypeSafe Jev to find duplicate/misspelled artist names."""
    from importers.artist_parser import find_aliases
    conn = get_connection()
    merges, rejected = find_aliases(conn)
    for alias, canonical, conf in merges:
        click.echo(f"merge  {alias}  ->  {canonical}   (spelling conf {conf:.2f})")
    for a, b, p in rejected:
        label = "review" if p >= 0.4 else "keep  "
        click.echo(f"{label} {a}  /  {b}   (same-act p={p:.2f})")
    if apply:
        conn.executemany(
            "INSERT INTO artist_aliases (alias, canonical) VALUES (?, ?) "
            "ON CONFLICT(alias) DO UPDATE SET canonical=excluded.canonical",
            [(a, c) for a, c, _ in merges],
        )
        conn.commit()
        click.echo(f"Saved {len(merges)} aliases. Run `island shows import` to relink.")
    conn.close()


@db.command("export")
@click.option("--format", "fmt", default="json",
              type=click.Choice(["json", "csv", "sql"]), show_default=True)
def db_export(fmt):
    """Export all DB data for backup or migration."""
    conn = get_connection()

    if fmt == "json":
        export = {}
        for table in TABLES:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            export[table] = [dict(r) for r in rows]
        conn.close()
        print(json.dumps(export, indent=2, default=str))

    elif fmt == "csv":
        for table in TABLES:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                continue
            cols = list(dict(rows[0]).keys())
            writer = csv.DictWriter(sys.stdout, fieldnames=cols)
            sys.stdout.write(f"-- TABLE: {table}\n")
            writer.writeheader()
            writer.writerows([dict(r) for r in rows])
            sys.stdout.write("\n")
        conn.close()

    elif fmt == "sql":
        for table in TABLES:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            for row in rows:
                d = dict(row)
                cols = ", ".join(d.keys())
                vals = ", ".join(_sql_value(v) for v in d.values())
                print(f"INSERT INTO {table} ({cols}) VALUES ({vals});")
        conn.close()


def _sql_value(v) -> str:
    """Render a Python value as a SQL literal. Numerics are unquoted."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    # String: escape single quotes
    return "'" + str(v).replace("'", "''") + "'"

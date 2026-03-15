"""DB utility commands (init, export)."""
import csv
import json
import sys
import click
from database import get_connection, init_db

TABLES = ["shows", "tracks", "artists", "track_artists", "show_tracks"]


@click.group("db")
def db():
    """Database utility commands."""


@db.command("init")
def db_init():
    """Initialize (or re-initialize) the database schema."""
    init_db()
    click.echo("Database initialized.")


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

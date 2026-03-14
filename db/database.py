import sqlite3
from pathlib import Path
from config import get_db_path


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    path = db_path or get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: str | None = None) -> None:
    schema = (Path(__file__).parent / "schema.sql").read_text()
    conn = get_connection(db_path)
    for stmt in schema.split(";"):
        stmt = stmt.strip()
        if stmt and not stmt.upper().startswith("PRAGMA"):
            conn.execute(stmt)
    conn.commit()
    conn.close()

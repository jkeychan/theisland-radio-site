"""Shared output helpers for all CLI commands.

Usage:
    from output import print_output
    print_output(rows, columns=["id", "aired_at"], fmt=fmt)

`fmt` is one of: "table" (default), "json", "csv", "plain".
`rows` is a list of dicts.
`plain_key` is the column to use for --plain mode (defaults to first column).
"""
import csv
import json
import sys
from typing import Any

from rich.console import Console
from rich.table import Table

console = Console()


def print_output(
    rows: list[dict[str, Any]],
    columns: list[str],
    fmt: str = "table",
    plain_key: str | None = None,
    title: str | None = None,
) -> None:
    if not rows:
        if fmt == "table":
            console.print("[dim]No results.[/dim]")
        return

    if fmt == "json":
        print(json.dumps(rows, indent=2, default=str))
    elif fmt == "csv":
        writer = csv.DictWriter(sys.stdout, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    elif fmt == "plain":
        key = plain_key or columns[0]
        for row in rows:
            print(row.get(key, ""))
    else:  # table (default)
        table = Table(title=title, show_header=True, header_style="bold")
        for col in columns:
            table.add_column(col)
        for row in rows:
            table.add_row(*[str(row.get(c, "") or "") for c in columns])
        console.print(table)

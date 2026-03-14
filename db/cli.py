#!/usr/bin/env python3
"""The Island Radio Show CLI."""
import click
from commands.shows import shows
from commands.tracks import tracks
from commands.stats import stats
from commands.db_cmds import db


@click.group()
def cli():
    """The Island radio show database CLI."""


cli.add_command(shows)
cli.add_command(tracks)
cli.add_command(stats)
cli.add_command(db)

if __name__ == "__main__":
    cli()

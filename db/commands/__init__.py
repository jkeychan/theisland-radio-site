"""CLI command groups for The Island DB."""
import click


def output_options(func):
    """Decorator that adds --json, --csv, --plain, and --format flags to a command."""
    func = click.option("--plain", "fmt", flag_value="plain",
                        help="One item per line (for pipes).")(func)
    func = click.option("--csv", "fmt", flag_value="csv",
                        help="Output as CSV.")(func)
    func = click.option("--json", "fmt", flag_value="json",
                        help="Output as JSON.")(func)
    func = click.option("--format", "fmt", default="table",
                        type=click.Choice(["table", "json", "csv", "plain"]),
                        hidden=True)(func)
    return func

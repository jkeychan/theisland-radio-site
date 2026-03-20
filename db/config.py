import tomllib
from pathlib import Path
from typing import Any

_CONFIG_PATH = Path(__file__).parent / "config.toml"


def load_config() -> dict[str, Any]:
    if not _CONFIG_PATH.exists():
        return {}
    with open(_CONFIG_PATH, "rb") as f:
        return tomllib.load(f)


def get_db_path() -> str:
    config = load_config()
    path = config.get("database", {}).get("path", "radio.db")
    p = Path(path)
    if not p.is_absolute():
        p = Path(__file__).parent / p
    return str(p)

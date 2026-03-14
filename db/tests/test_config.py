import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from config import get_db_path


def test_get_db_path_default(tmp_path, monkeypatch):
    """Default path resolves to radio.db sibling to config.py when no config.toml exists."""
    import config as cfg_mod
    monkeypatch.setattr(cfg_mod, "_CONFIG_PATH", tmp_path / "config.toml")
    path = get_db_path()
    assert path.endswith("radio.db")


def test_get_db_path_from_config(tmp_path, monkeypatch):
    """Reads path from config.toml when present."""
    config_file = tmp_path / "config.toml"
    config_file.write_text('[database]\npath = "/tmp/test_island.db"\n')
    import config as cfg_mod
    monkeypatch.setattr(cfg_mod, "_CONFIG_PATH", config_file)
    path = get_db_path()
    assert path == "/tmp/test_island.db"

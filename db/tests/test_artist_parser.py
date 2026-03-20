import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from importers.artist_parser import parse_artists


def test_single_artist():
    assert parse_artists("King Tubby") == ["King Tubby"]


def test_comma_separated():
    assert parse_artists("Dylan Judah, Scientist") == ["Dylan Judah", "Scientist"]


def test_multiple_commas():
    result = parse_artists("Chase & Status, Bou, Flowdan, IRAH, Trigga, Takura")
    assert "Chase & Status" in result
    assert "Bou" in result
    assert "Flowdan" in result
    assert len(result) == 6


def test_feat_separator():
    result = parse_artists("Skrillex feat. Flowdan")
    assert "Skrillex" in result
    assert "Flowdan" in result


def test_ft_separator():
    result = parse_artists("Rodney P ft. Mighty Moe")
    assert "Rodney P" in result
    assert "Mighty Moe" in result


def test_ampersand_within_name_preserved():
    """'Chase & Status' is one artist — no comma means & is part of the name."""
    result = parse_artists("Chase & Status")
    assert result == ["Chase & Status"]


def test_whitespace_trimmed():
    result = parse_artists("  Artist One  ,  Artist Two  ")
    assert result == ["Artist One", "Artist Two"]


def test_empty_string():
    assert parse_artists("") == []

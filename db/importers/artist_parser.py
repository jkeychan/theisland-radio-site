"""Parse raw artist strings into individual artist names.

Strategy:
- Split on 'feat.' / 'ft.' (case-insensitive) — always a separator
- Split on comma (,) — most common list separator
- Never split on ' & ' — it is part of artist names (e.g. "Chase & Status")
- Trim whitespace; drop empty parts

Examples:
    "King Tubby"                     → ["King Tubby"]
    "Dylan Judah, Scientist"         → ["Dylan Judah", "Scientist"]
    "Chase & Status, Bou, Flowdan"   → ["Chase & Status", "Bou", "Flowdan"]
    "Chase & Status"                 → ["Chase & Status"]
    "Skrillex feat. Flowdan"         → ["Skrillex", "Flowdan"]
"""
import re


def parse_artists(raw: str) -> list[str]:
    if not raw or not raw.strip():
        return []

    # Split on feat./ft. first
    parts = re.split(r"\s+feat\.\s+|\s+ft\.\s+", raw, flags=re.IGNORECASE)

    # Split on comma
    expanded: list[str] = []
    for part in parts:
        expanded.extend(part.split(","))

    return [p.strip() for p in expanded if p.strip()]

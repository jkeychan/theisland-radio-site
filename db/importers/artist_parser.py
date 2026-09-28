"""Parse raw artist strings into individual artist names.

Strategy:
- Split on comma (,) and semicolon (;) — always list separators
- A remaining segment containing a joiner (&, and, feat., ft., vs, meets, x) is
  ambiguous: "Sly & Robbie" is one act, "Scientist & Jah Thomas" is two. Code
  enumerates every way to split it and TypeSafe's Jev model picks one. A singer
  with their backing band ("King Tubby & The Aggrovators") counts as one act.
- Decisions are cached in the artist_splits table, so each credit costs at most
  one API call and re-imports are deterministic. Rows with confidence 1.0 were
  set by hand (`island db split`).

Examples:
    "King Tubby"                     → ["King Tubby"]
    "Dylan Judah, Scientist"         → ["Dylan Judah", "Scientist"]
    "Chase & Status, Bou, Flowdan"   → ["Chase & Status", "Bou", "Flowdan"]
    "Skrillex feat. Flowdan"         → ["Skrillex", "Flowdan"]
    "10 Ft. Ganja Plant"             → ["10 Ft. Ganja Plant"]
"""
import difflib
import itertools
import json
import os
import re
import sqlite3
import time
import urllib.error
import urllib.request

JOINER = re.compile(r"\s+(?:&|and|feat\.?|ft\.?|x|vs\.?|meets)\s+", re.IGNORECASE)
REVIEW_BELOW = 0.5
ALIAS_THRESHOLD = 0.7

_INSTRUCTIONS = (
    "`artist_credit` is the artist credit on a reggae/dub/dancehall track. "
    "Which option lists the distinct acts credited? A duo, band, or group that "
    "performs under a combined name (e.g. 'Sly & Robbie', 'Toots & The Maytals') "
    "is one act. A singer or producer credited with their backing band "
    "(e.g. 'King Tubby & The Aggrovators', 'Bob Marley & The Wailers') is one act. "
    "Independent artists credited together (e.g. 'Scientist & Jah Thomas') are separate acts."
)


def _segmentations(credit: str) -> list[list[str]]:
    # ponytail: 2^n options, Choice caps at 255, so credits with >7 joiners would fail
    joins = list(JOINER.finditer(credit))
    out = []
    for mask in itertools.product([False, True], repeat=len(joins)):
        parts, start = [], 0
        for split, m in zip(mask, joins):
            if split:
                parts.append(credit[start:m.start()])
                start = m.end()
        parts.append(credit[start:])
        out.append(parts)
    return out


def _jev(state: object, questions: dict, purpose: str) -> dict:
    """POST one TypeSafe request and return its answers, retrying transient failures."""
    key = os.environ.get("TYPESAFE_API_KEY")
    if not key:
        raise RuntimeError(f"TYPESAFE_API_KEY not set; needed to {purpose}")
    req = urllib.request.Request(
        "https://api.typesafe.ai/v1/systemone",
        data=json.dumps({"state": state, "model": "jev-latest", "questions": questions}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)["answers"]
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise AssertionError("unreachable")


def _ask_jev(credit: str, known: set[str]) -> tuple[list[str], float]:
    options = {
        " | ".join(parts): {
            "acts": parts,
            "acts_credited_alone_elsewhere_in_library": [p.lower() in known for p in parts],
        }
        for parts in _segmentations(credit)
    }
    answer = _jev(
        {"artist_credit": credit},
        {"split": {"type": "choice", "instructions": _INSTRUCTIONS, "criteria": options}},
        f"split artist credit {credit!r}",
    )["split"]
    return options[answer["choice"]]["acts"], answer["confidence"]


def _split_segment(segment: str, conn: sqlite3.Connection) -> list[str]:
    row = conn.execute("SELECT acts FROM artist_splits WHERE credit=?", (segment,)).fetchone()
    if row:
        return json.loads(row[0])
    known = {
        seg.strip().lower()
        for (raw,) in conn.execute("SELECT DISTINCT raw_artist FROM tracks")
        for seg in re.split(r"[,;]", raw)
    }
    acts, confidence = _ask_jev(segment, known)
    conn.execute(
        "INSERT INTO artist_splits (credit, acts, confidence) VALUES (?, ?, ?)",
        (segment, json.dumps(acts), confidence),
    )
    return acts


def parse_artists(raw: str, conn: sqlite3.Connection) -> list[str]:
    names: list[str] = []
    for segment in (s.strip() for s in re.split(r"[,;]", raw or "")):
        if not segment:
            continue
        if JOINER.search(segment):
            names.extend(_split_segment(segment, conn))
        else:
            names.append(segment)
    aliases = dict(conn.execute("SELECT alias, canonical FROM artist_aliases").fetchall())
    return [aliases.get(n, n) for n in names]


def _alias_key(name: str) -> str:
    name = re.sub(r"\b(the|and)\b|&", " ", name.lower())
    return re.sub(r"[^a-z0-9]", "", name)


def _tokens(name: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", name.lower().replace("'", ""))) - {"the", "and"}


def find_aliases(
    conn: sqlite3.Connection,
) -> tuple[list[tuple[str, str, float]], list[tuple[str, str, float]]]:
    """Propose merges among current artist names.

    Returns (merges as (alias, canonical, spelling confidence),
             rejected pairs as (name_a, name_b, same-act probability)).

    Names identical once punctuation, "the" and "and" are ignored merge outright.
    Code finds the fuzzier candidates (near-identical spelling, or one name's
    words a subset of the other's) and Jev judges each "same act?" in one request,
    then picks the standard spelling for each merged group in a second.
    """
    names = [r[0] for r in conn.execute("SELECT name FROM artists ORDER BY name")]
    probs: dict[tuple[str, str], float] = {}
    pairs = []
    for a, b in itertools.combinations(names, 2):
        ka, kb, ta, tb = _alias_key(a), _alias_key(b), _tokens(a), _tokens(b)
        if ka == kb:
            probs[(a, b)] = 1.0
        elif (difflib.SequenceMatcher(None, ka, kb).ratio() >= 0.85
                or ((ta < tb or tb < ta) and min(len(ta), len(tb)) >= 2)):
            pairs.append((a, b))

    def tracks_by(name: str) -> list[str]:
        return [
            f"{r[0]} ({r[1]})" for r in conn.execute(
                "SELECT t.title, t.raw_artist FROM tracks t JOIN track_artists ta ON ta.track_id=t.id "
                "JOIN artists a ON a.id=ta.artist_id WHERE a.name=? LIMIT 3", (name,))
        ]

    state = {"pairs": [
        {"name_a": a, "tracks_a": tracks_by(a), "name_b": b, "tracks_b": tracks_by(b)} for a, b in pairs
    ]}
    same = {} if not pairs else _jev(state, {
        f"p{i}": {
            "type": "noul",
            "instructions": (
                f"Artist names from a reggae/dub radio show's library: are `pairs[{i}].name_a` and "
                f"`pairs[{i}].name_b` the same act, spelled or formatted differently? A solo artist and "
                "a credit that pairs them with a band or another act are not the same act."
            ),
        } for i in range(len(pairs))
    }, "find duplicate artists")

    # Union accepted pairs into groups
    group: dict[str, str] = {}

    def root(n: str) -> str:
        while group.get(n, n) != n:
            n = group[n]
        return n

    for i, pair in enumerate(pairs):
        probs[pair] = same[f"p{i}"]["noul"]
    for (a, b), v in probs.items():
        if v >= ALIAS_THRESHOLD:
            group[root(b)] = root(a)
    members: dict[str, list[str]] = {}
    for n in {n for pair in probs for n in pair}:
        members.setdefault(root(n), []).append(n)
    groups = [sorted(m) for m in members.values() if len(m) > 1]
    if not groups:
        return [], [(a, b, v) for (a, b), v in probs.items()]

    spelling = _jev({"groups": groups}, {
        f"g{i}": {
            "type": "choice",
            "instructions": (
                f"`groups[{i}]` lists spellings of one reggae/dub act's name. "
                "Which is the act's standard, correctly spelled name?"
            ),
            "criteria": {n: None for n in g},
        } for i, g in enumerate(groups)
    }, "pick standard artist spellings")

    merges = []
    for i, g in enumerate(groups):
        canonical = spelling[f"g{i}"]["choice"]
        merges += [(n, canonical, spelling[f"g{i}"]["confidence"]) for n in g if n != canonical]
    rejected = [(a, b, v) for (a, b), v in probs.items() if v < ALIAS_THRESHOLD]
    return merges, rejected

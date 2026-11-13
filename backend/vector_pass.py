# backend/vector_pass.py
from __future__ import annotations

import base64
import math
import re
from dataclasses import dataclass, field, replace
from typing import Literal, Sequence

import fitz  # PyMuPDF


@dataclass(frozen=True)
class Point2D:
    x: float
    y: float

    def distance_to(self, other: Point2D) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


@dataclass(frozen=True)
class BBox:
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        return max(0.0, self.x1 - self.x0)

    @property
    def height(self) -> float:
        return max(0.0, self.y1 - self.y0)

    @property
    def center(self) -> Point2D:
        return Point2D((self.x0 + self.x1) * 0.5, (self.y0 + self.y1) * 0.5)

    def union(self, other: BBox) -> BBox:
        return BBox(
            min(self.x0, other.x0),
            min(self.y0, other.y0),
            max(self.x1, other.x1),
            max(self.y1, other.y1),
        )

    def expanded(self, pad: float) -> BBox:
        return BBox(self.x0 - pad, self.y0 - pad, self.x1 + pad, self.y1 + pad)

    def contains_point(self, pt: Point2D, tol: float = 0.0) -> bool:
        return (
            (self.x0 - tol) <= pt.x <= (self.x1 + tol)
            and (self.y0 - tol) <= pt.y <= (self.y1 + tol)
        )

    def min_distance_to_point(self, pt: Point2D) -> float:
        dx = max(self.x0 - pt.x, 0.0, pt.x - self.x1)
        dy = max(self.y0 - pt.y, 0.0, pt.y - self.y1)
        return math.hypot(dx, dy)


@dataclass
class TextSpan:
    span_id: str
    text: str
    bbox: BBox
    origin: Point2D
    font_name: str
    font_size: float
    rotation_deg: float
    is_clustered: bool = False
    constituent_texts: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class LineSegment:
    p1: Point2D
    p2: Point2D
    width: float
    color: tuple[float, ...] = (0.0, 0.0, 0.0)

    @property
    def length(self) -> float:
        return self.p1.distance_to(self.p2)

    @property
    def angle_deg(self) -> float:
        return math.degrees(math.atan2(self.p2.y - self.p1.y, self.p2.x - self.p1.x))

    @property
    def midpoint(self) -> Point2D:
        return Point2D((self.p1.x + self.p2.x) * 0.5, (self.p1.y + self.p2.y) * 0.5)


@dataclass(frozen=True)
class Arrowhead:
    tip: Point2D
    base_center: Point2D
    direction_deg: float  # Points toward tip
    kind: Literal["filled_polygon", "open_vee"]


@dataclass(frozen=True)
class LeaderLine:
    leader_id: str
    arrow_tip: Point2D
    tail_end: Point2D
    vertices: list[Point2D]
    has_horizontal_shoulder: bool


@dataclass(frozen=True)
class DimensionLine:
    dim_line_id: str
    tip_a: Point2D
    tip_b: Point2D
    midpoint: Point2D
    length_pt: float
    angle_deg: float


@dataclass
class PageVectorModel:
    page_number: int
    width_pt: float
    height_pt: float
    raw_spans: list[TextSpan]
    clustered_spans: list[TextSpan]
    line_segments: list[LineSegment]
    rectangles: list[BBox]
    circle_centers: list[tuple[Point2D, float]]  # (center, radius)
    arrowheads: list[Arrowhead]
    leader_lines: list[LeaderLine]
    dimension_lines: list[DimensionLine]
    table_records: list[dict] = field(default_factory=list)
    locked_table_span_ids: set = field(default_factory=set)


TITLE_BLOCK_BOILERPLATE = {
    "PROPRIETARY", "CONFIDENTIAL", "DO NOT SCALE", "THIRD ANGLE", "PROJECTION",
    "DRAWN BY", "CHECKED BY", "APPROVED BY", "SCALE", "SHEET", "WEIGHT",
    "DIMENSIONS ARE IN", "UNLESS OTHERWISE SPECIFIED", "TITLE", "DWG NO",
    "REV", "DATE", "SIZE", "CAGE CODE",
}


def _extract_rotation_deg(line_dir: tuple[float, float]) -> float:
    dx, dy = line_dir
    angle = math.degrees(math.atan2(dy, dx))
    return round(angle, 2)


def extract_text_spans(page: fitz.Page) -> list[TextSpan]:
    raw_dict = page.get_text("rawdict")
    spans: list[TextSpan] = []
    idx = 0
    for block in raw_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            line_dir = line.get("dir", (1.0, 0.0))
            rot_deg = _extract_rotation_deg(line_dir)
            for sp in line.get("spans", []):
                chars = sp.get("chars", [])
                text = "".join(c.get("c", "") for c in chars).strip() if chars else sp.get("text", "").strip()
                if not text:
                    continue
                b = sp.get("bbox", (0.0, 0.0, 0.0, 0.0))
                orig = sp.get("origin", (b[0], b[3]))
                idx += 1
                spans.append(
                    TextSpan(
                        span_id=f"sp_{idx:04d}",
                        text=text,
                        bbox=BBox(float(b[0]), float(b[1]), float(b[2]), float(b[3])),
                        origin=Point2D(float(orig[0]), float(orig[1])),
                        font_name=str(sp.get("font", "unknown")),
                        font_size=round(float(sp.get("size", 10.0)), 2),
                        rotation_deg=rot_deg,
                        constituent_texts=[text],
                    )
                )
    return spans


# Pre-cluster PUA & symbol normalization map so cluster v2 classifies PUA tolerances as TOLNUM/SIGN
PUA_PRE_CLUSTER_MAP: dict[int, str] = {
    **{0xF030 + d: str(d) for d in range(10)},  # U+F030..U+F039 -> '0'..'9'
    0xF02E: ".",   # PUA decimal point
    0xF02B: "+",   # PUA plus
    0xF02D: "-",   # PUA minus
    0x2212: "-",   # Unicode minus
    0x2013: "-",   # En-dash
    0x2014: "-",   # Em-dash
    0xF0B1: "±",   # PUA plus-minus (Symbol font)
    0xF0B0: "°",   # PUA degree
    0xF032: "Ø",   # PUA diameter glyph ('' in real03)
    0xF0AC: "Ø",   # PUA diameter glyph variant
    0x2300: "Ø",   # Unicode diameter
    0xF0A3: "≤",   # PUA less-than-or-equal
    0xF0B3: "≥",   # PUA greater-than-or-equal
}

GDT_SYMBOLS_SET = {"⌖", "⏥", "⏤", "◯", "⌭", "⌒", "⌓", "⟂", "⊥", "∠", "//", "∥", "◎", "⌯", "↗", "⌰", "\x00"}

# Updated FIT regex: accepts H6, g6, js6 AND trailing envelope/material modifiers like 'H6 Ⓔ' or 'H6 (E)'
_PREFIX_CHARS = {"Ø", "⌀", "R", "M", "Z"}

FIT_TOKEN_RE = re.compile(
    r"^(?:[A-HJ-Za-hj-z]|js|JS)\d{1,2}(?:\s*(?:[ⒺⓂⓁ]|\([EML]\)))?$"
)
ENVELOPE_ONLY_RE = re.compile(r"^(?:[ⒺⓂⓁ]|\([EML]\))$")
TOLNUM_TOKEN_RE = re.compile(r"^(?:±|\+/-|\+-|[+-])\s*\d+(?:\.\d+)?°?$")
PREFIX_TOKEN_RE = re.compile(r"^(?:[Ø⌀RM]|Ra|Rz|[≤≥]|min\.?|max\.?|\d+\s*[xX×])$", re.IGNORECASE)
GDT_DATUM_RE = re.compile(r"^[A-D](?:-[A-D])?(?:\s*(?:[ⓂⓁ]|\([ML]\)))?$")
GDT_QTY_RE = re.compile(r"^\(?\s*\d+\s*[xX×]\s*\)?$")


def normalize_pua_for_clustering(text: str) -> str:
    """Translates PUA digits, PUA ±, PUA Ø, and dashes BEFORE token classification."""
    out = "".join(PUA_PRE_CLUSTER_MAP.get(ord(ch), ch) for ch in text)
    return " ".join(out.strip().split())


def classify_span_token(raw_text: str) -> str:
    t = normalize_pua_for_clustering(raw_text)
    if not t:
        return "OTHER"
    if t in ("+", "-", "±", "+/-", "≤", "≥"):
        return "SIGN"
    if TOLNUM_TOKEN_RE.match(t):
        return "TOLNUM"
    # Thread guard: a token starting with M + digit is a THREAD, never a FIT class
    if re.match(r"^M\d", t, re.IGNORECASE):
        return "OTHER"
    if FIT_TOKEN_RE.match(t):
        return "FIT"
    if ENVELOPE_ONLY_RE.match(t):
        return "ENVELOPE"
    if (
        PREFIX_TOKEN_RE.match(t)
        or (len(t) == 1 and 0xE000 <= ord(t) <= 0xF8FF)
        or (len(t) == 1 and t in _PREFIX_CHARS)
    ):
        return "PREFIX"
    if re.match(r"^(?:Ra|Rz)\b", t, re.IGNORECASE):
        return "ROUGH"
    if re.match(r"^[Ø⌀R]?\s*\d+(?:\.\d+)?°?$", t):
        return "NUM"
    if re.match(r"^\.\d+$", t):
        return "DECCONT"
    return "OTHER"


def _token_class(text: str) -> str:
    """Coarse class of a single text span, for the merge rules."""
    return classify_span_token(text)


def assemble_boxed_gdt_frames(spans: list[TextSpan]) -> list[TextSpan]:
    """
    Fixes Issue A (` 0.1` x4, ` 0.2` extras) and Issue B (7 missed GD&T frames on real03):
    Assembles horizontally adjacent GD&T compartment spans:
      [Symbol: ◎ / ⌖ / ↗ / \\x00] + [Tol: Ø 0.1 /  0.2] + [Datum: A / B] + [Optional: (4x) / (3x)]
    into a single pipe-delimited frame span `|◎|Ø 0.1|B| (4x)` BEFORE dimension clustering steals `Ø 0.1`.
    """
    if not spans:
        return []

    used: set[str] = set()
    result: list[TextSpan] = []
    sorted_spans = sorted(spans, key=lambda s: (round(s.bbox.y0, 1), s.bbox.x0))

    for sp in sorted_spans:
        if sp.span_id in used:
            continue
        norm_t = normalize_pua_for_clustering(sp.text)
        # Check if this span is a single GD&T symbol cell (not already a full pipe frame)
        is_sym_head = (
            norm_t in GDT_SYMBOLS_SET
            or (len(norm_t) == 1 and ord(norm_t) >= 0xF000)
        ) and "|" not in norm_t

        if not is_sym_head:
            continue

        h = max(sp.font_size, sp.bbox.height, 6.0)
        row_cells = [sp]
        curr_bbox = sp.bbox

        # Sweep right across the same horizontal row to collect [Tol Cell], [Datum Cells], and [(Nx)]
        for cand in sorted_spans:
            if cand.span_id == sp.span_id or cand.span_id in used:
                continue
            if abs(cand.rotation_deg - sp.rotation_deg) > 5.0:
                continue
            dy = abs(cand.bbox.center.y - sp.bbox.center.y)
            dx = cand.bbox.x0 - curr_bbox.x1
            if dy > 0.65 * h or dx < -0.3 * h or dx > 2.8 * h:
                continue

            c_norm = normalize_pua_for_clustering(cand.text)
            # Cell 2 must be a tolerance zone (e.g. 'Ø 0.1', '0.05', 'Ø0.2(M)')
            if len(row_cells) == 1:
                if re.match(r"^[Ø⌀]?\s*0\.\d+(?:\s*(?:[ⓂⓁ]|\([ML]\)))?$", c_norm):
                    row_cells.append(cand)
                    curr_bbox = curr_bbox.union(cand.bbox)
            else:
                # Subsequent cells are Datum letters (A, B, C) or trailing quantity (4x), (3x)
                if GDT_DATUM_RE.match(c_norm) or GDT_QTY_RE.match(c_norm):
                    row_cells.append(cand)
                    curr_bbox = curr_bbox.union(cand.bbox)

        if len(row_cells) >= 2:
            for c in row_cells:
                used.add(c.span_id)
            compartments: list[str] = []
            qty_suffix = ""
            for c in row_cells:
                cn = normalize_pua_for_clustering(c.text)
                if GDT_QTY_RE.match(cn):
                    qty_suffix = f" ({cn.strip('() ')})"
                else:
                    compartments.append(cn)
            frame_str = "|" + "|".join(compartments) + "|" + qty_suffix
            result.append(
                replace(
                    sp,
                    text=frame_str,
                    bbox=curr_bbox,
                    is_clustered=True,
                    constituent_texts=[c.text for c in row_cells],
                )
            )

    for sp in sorted_spans:
        if sp.span_id not in used:
            result.append(sp)
    return result


def resolve_cluster_v2_claims(
    primary_text: str,
    right_tokens: list[tuple[str, str, float]],  # list of (span_id, raw_text, distance_pt)
    left_tokens: list[tuple[str, str, float]],   # list of (span_id, raw_text, distance_pt)
) -> tuple[str, list[str]]:
    """
    Enforces the 3 critical cluster v2 guards:
    1. NEVER left-claim a bare NUM ('2') onto a decimal dimension ('0.35 ±0.5') unless it has 'x'/'×' or is PREFIX/SIGN.
    2. Explicit numeric tolerance (TOLNUM: '+0.2', '±0.5') ALWAYS takes precedence over a competing FIT token ('h9').
    3. Attaches FIT with envelope modifier ('H6 Ⓔ') or a trailing ENVELOPE token ('Ⓔ') onto a FIT dimension ('Ø 59 H6 Ⓔ').
    """
    claimed_ids: list[str] = []
    p_norm = normalize_pua_for_clustering(primary_text)

    # 1. Left-prefix claiming: ONLY claim PREFIX ('Ø', '4x', '≥', 'Rz') or SIGN — never bare NUM ('2')!
    prefix_parts: list[str] = []
    for sid, l_raw, _dist in left_tokens:
        l_cls = classify_span_token(l_raw)
        l_norm = normalize_pua_for_clustering(l_raw)
        if l_cls in ("PREFIX", "SIGN"):
            prefix_parts.append(l_norm)
            claimed_ids.append(sid)

    # 2. Right-side claiming with Explicit-Tolerance-Beats-Fit precedence
    tol_tokens = [(sid, normalize_pua_for_clustering(r_raw), d) for sid, r_raw, d in right_tokens if classify_span_token(r_raw) == "TOLNUM"]
    fit_tokens = [(sid, normalize_pua_for_clustering(r_raw), d) for sid, r_raw, d in right_tokens if classify_span_token(r_raw) == "FIT"]
    env_tokens = [(sid, normalize_pua_for_clustering(r_raw), d) for sid, r_raw, d in right_tokens if classify_span_token(r_raw) == "ENVELOPE"]

    suffix_parts: list[str] = []
    if tol_tokens:
        # Explicit numeric tolerance present -> claim up to 2 stacked +/- tolerances, IGNORE competing bare fit ('h9')
        for sid, t_norm, _d in tol_tokens[:2]:
            suffix_parts.append(t_norm)
            claimed_ids.append(sid)
        if len(suffix_parts) == 2 and suffix_parts[0].startswith("+") and suffix_parts[1].startswith("-"):
            suffix_parts = [f"{suffix_parts[0]} / {suffix_parts[1]}"]
    elif fit_tokens:
        # No explicit tolerance -> claim the closest FIT token (e.g., 'H6' or 'H6 Ⓔ')
        f_sid, f_norm, _d = min(fit_tokens, key=lambda x: x[2])
        suffix_parts.append(f_norm)
        claimed_ids.append(f_sid)
        # Also claim immediately adjacent envelope modifier 'Ⓔ' if split into its own span
        if env_tokens and not any(e in f_norm for e in ("Ⓔ", "Ⓜ", "Ⓛ")):
            e_sid, e_norm, _ed = min(env_tokens, key=lambda x: x[2])
            suffix_parts.append(e_norm)
            claimed_ids.append(e_sid)

    assembled = " ".join(prefix_parts + [p_norm] + suffix_parts).strip()
    return assembled, claimed_ids


def _has_digit(text: str) -> bool:
    return any(c.isdigit() for c in text)


def _x_overlap_ratio(a: BBox, b: BBox) -> float:
    inter = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    return inter / max(1.0, min(a.width, b.width))


def _reading_key(rot: float):
    """Sort key putting spans in reading order for the merged text."""
    if rot == -90.0:
        return lambda s: (-round(s.bbox.y0, 1), round(s.bbox.x0, 1))
    if rot == 90.0:
        return lambda s: (round(s.bbox.y0, 1), round(s.bbox.x0, 1))
    if rot == 180.0:
        return lambda s: (-round(s.bbox.x0, 1), round(s.bbox.y0, 1))
    return lambda s: (round(s.bbox.x0, 1), round(s.bbox.y0, 1))


def cluster_split_tolerance_spans(spans: list[TextSpan]) -> list[TextSpan]:
    """
    Merges CAD split tolerance tokens: e.g. base nominal '30.00' (10pt) followed
    closely on the right by smaller superscript '+0.021' (7pt) and subscript '-0.000' (7pt),
    or a leading prefix like '4X' / 'Ø' split into an adjacent span.

    Real-sheet cases handled (verified on SICK / HEIDENHAIN / KHK drawings):
    - en-dash tolerances ('3.4' + '–0.2') — dash variants normalised to '-'.
    - rotated text: the tolerance is stacked along the reading direction
      ('Ø 38' + '±0.1' for -90 deg text, tolerance directly above the dimension).
    - split sign + number ('±' + '0.1' -> '±0.1'; 'R' + 'Z' + '6.3' -> 'Rz 6.3').
    - split decimals ('0' + '.625' -> '0.625').
    - a lone prefix glyph left of the number ('\\uf086' + '1.7', 'Ø' + '2.000').

    A tolerance merges into the dimension it FOLLOWS in reading order:
    for -90 deg text that is the dimension directly BELOW it. This stops a
    tolerance stacked between two dimensions from joining the wrong one.
    """
    if not spans:
        return []

    spans = assemble_boxed_gdt_frames(spans)

    # Normalise dash variants and PUA characters in the clustered view (raw spans untouched).
    norm: list[TextSpan] = []
    for s in spans:
        t = normalize_pua_for_clustering(s.text)
        norm.append(
            TextSpan(
                s.span_id, t, s.bbox, s.origin, s.font_name, s.font_size,
                s.rotation_deg, s.is_clustered, s.constituent_texts,
            )
        )

    # Dimension-like spans claim first; a tolerance that sorts a tenth of a
    # point earlier must not become its own primary before its dimension.
    # (Rank by leading sign, not by "has a digit": '+0.021' has a digit
    # but is still a tolerance — it must not claim '-0.000' first.)
    def _primary_key(s: TextSpan):
        t = s.text.strip()
        cls = _token_class(t)
        if t[:1] in ("±", "+", "-"):
            rank = 1
        elif _has_digit(t):
            rank = 0
        elif cls in ("PREFIX", "ROUGH"):
            rank = 1
        else:
            rank = 2
        return (rank, round(s.bbox.y0, 1), round(s.bbox.x0, 1))

    ordered = sorted(norm, key=_primary_key)
    by_id = {s.span_id: s for s in norm}
    used: set[str] = set()
    clustered: list[TextSpan] = []
    # Singleton clusters (a primary that claimed nothing) may be stolen by
    # a later dimension primary: '0.1' sorts before '2.4', but it is the
    # tolerance's number, so '2.4' reclaims it as its '± 0.1' continuation.
    singletons: dict[str, int] = {}
    dead: set[int] = set()

    for primary in ordered:
        if primary.span_id in used:
            continue
        rot = primary.rotation_deg
        h = max(primary.font_size, primary.bbox.height, 4.0)
        group = [primary]
        used.add(primary.span_id)
        current = primary.bbox
        # A long sentence / note and a parenthesised fragment are never a
        # dimension base: they claim nothing (a lone glyph must not join a
        # note, and a paren echo must not swallow a thread callout).
        ptext = primary.text.strip()
        if len(ptext) > 25 or ptext.startswith("(") or ptext.startswith("|"):
            singletons[primary.span_id] = len(clustered)
            clustered.append(primary)
            continue
        # A fit class ('H7') only completes a dimension number ('Ø30' +
        # 'H7'), never a paren or a thread ('(0.31)' + 'M4' merged wrongly).
        base_is_dim_number = bool(re.match(r"^[Ø⌀R]?\s*\d", ptext))
        # Stacked-tolerance budget: one stacked tolerance per dimension,
        # unless it is the opposite half of a +/- pair.
        stacked_signs: list[str] = []

        # Left prefixes: a lone glyph / letter run immediately left of the
        # number ('R' + 'Z' + '6.3', '\\uf086' + '1.7', 'Ø' + '2.000').
        edge = primary.bbox.x0
        for _ in range(2):
            best: TextSpan | None = None
            best_gap = float("inf")
            for cand in norm:
                if cand.span_id in used and cand.span_id not in singletons:
                    continue
                if abs(cand.rotation_deg - rot) > 5.0:
                    continue
                if _token_class(cand.text) not in ("PREFIX", "ROUGH"):
                    continue
                gap = edge - cand.bbox.x1
                dy = abs(cand.bbox.center.y - primary.bbox.center.y)
                if -0.35 * h <= gap <= 0.35 * h and dy <= 0.8 * h and gap < best_gap:
                    best, best_gap = cand, gap
            if best is None:
                break
            if best.span_id in singletons:
                dead.add(singletons.pop(best.span_id))
            group.append(best)
            used.add(best.span_id)
            edge = best.bbox.x0
            current = current.union(best.bbox)

        last_class = _token_class(primary.text)
        # Right / stacked candidates, re-scanned as the union bbox grows
        # (a sign claimed first lets its number follow in the next pass).
        changed = True
        while changed:
            changed = False
            for cand in norm:
                if cand.span_id in used and cand.span_id not in singletons:
                    continue
                if abs(cand.rotation_deg - rot) > 5.0:
                    continue
                cls = _token_class(cand.text)
                dx = cand.bbox.x0 - current.x1
                dy_center = abs(cand.bbox.center.y - primary.bbox.center.y)
                _right = -0.35 * h <= dx <= 1.45 * h and dy_center <= 1.15 * h
                # The "following" direction is the reading direction: for
                # 0 deg it is page-right, for 180 deg page-left, for -90 /
                # +90 deg there is no page-side follow — a tolerance there
                # sits in the stack, never in the next column.
                dx_left = current.x0 - cand.bbox.x1
                _left = -0.35 * h <= dx_left <= 1.45 * h and dy_center <= 1.15 * h
                right = _right if rot == 0.0 else (_left if rot == 180.0 else False)
                # A stacked tolerance may overlap the union's edge by up to
                # 0.6h (superscript/subscript spans share the line's height).
                above = (
                    -0.6 * h <= (current.y0 - cand.bbox.y1) <= 0.6 * h
                    and _x_overlap_ratio(cand.bbox, current) >= 0.5
                )
                below = (
                    -0.6 * h <= (cand.bbox.y0 - current.y1) <= 0.6 * h
                    and _x_overlap_ratio(cand.bbox, current) >= 0.5
                )
                # Stacked tolerances follow the reading direction: above
                # for 0 deg / -90 deg, below for 0 deg / +90 deg.
                stacked = (above and rot in (0.0, -90.0, 180.0)) or (below and rot in (0.0, 90.0, 180.0))
                if not (right or stacked):
                    continue
                # One stacked tolerance per dimension (a column of stacked
                # tolerances belongs to the dimensions above it, not to this
                # one) — unless it is the opposite half of a +/- pair.
                via_stacked_only = stacked and not right
                if via_stacked_only and cls in ("TOLNUM", "SIGN"):
                    sign = cand.text.strip()[:1]
                    if stacked_signs:
                        first = stacked_signs[0]
                        if not ((first == "+" and sign == "-") or (first == "-" and sign == "+")):
                            continue
                    stacked_signs.append(sign)
                accept = False
                if cls in ("TOLNUM", "SIGN"):
                    accept = True
                elif cls == "FIT" and base_is_dim_number and not re.match(r"^M\d", cand.text.strip()):
                    has_competing_tolnum = any(
                        _token_class(c.text) == "TOLNUM"
                        and (c.span_id not in used or c.span_id in singletons)
                        and abs(c.rotation_deg - rot) <= 5.0
                        and abs(c.bbox.center.y - primary.bbox.center.y) <= 1.15 * h
                        for c in norm
                    )
                    if not has_competing_tolnum:
                        accept = True
                elif cls == "ENVELOPE" and (base_is_dim_number or last_class == "FIT"):
                    accept = True
                elif cls == "NUM" and last_class in ("SIGN", "ROUGH"):
                    accept = True
                elif cls == "DECCONT":
                    accept = True
                elif cls == "ROUGH" and last_class == "PREFIX":
                    accept = True
                elif cls == "PREFIX" and last_class == "PREFIX":
                    accept = True
                elif (last_class == "ROUGH" or ptext.startswith(("Ra", "Rz", "RA", "RZ"))) and re.match(r"^(?:…|\.{2,3}|[-–—~])\s*\d", cand.text.strip()):
                    accept = True
                if not accept:
                    continue
                if cand.span_id in singletons:
                    # Steal a lone span back from its singleton cluster.
                    dead.add(singletons.pop(cand.span_id))
                group.append(cand)
                used.add(cand.span_id)
                current = current.union(cand.bbox)
                last_class = cls
                changed = True
                break

        if len(group) == 1:
            singletons[primary.span_id] = len(clustered)
            clustered.append(primary)
            continue

        # Merged text in reading order; decimal continuations and single
        # prefix letters attach without a space ('0' + '.625', 'R' + 'Z').
        ordered_group = sorted(group, key=_reading_key(rot))
        base = ordered_group[0]
        rest = ordered_group[1:]
        parts = [base.text]
        for r in rest:
            if r.text.startswith(".") or (len(parts[-1]) == 1 and parts[-1] in _PREFIX_CHARS):
                parts[-1] = parts[-1] + r.text
            else:
                parts.append(r.text)
        merged_str = " ".join(parts)
        # Format stacked +tol -tol cleanly with slash if both are signed
        if len(rest) == 2 and rest[0].text.startswith("+") and rest[1].text.startswith("-"):
            merged_str = f"{base.text} {rest[0].text} / {rest[1].text}"

        clustered.append(
            TextSpan(
                span_id=base.span_id,
                text=merged_str,
                bbox=current,
                origin=base.origin,
                font_name=base.font_name,
                font_size=base.font_size,
                rotation_deg=base.rotation_deg,
                is_clustered=True,
                constituent_texts=[g.text for g in group],
            )
        )

    # Drop stolen singletons, then the tolerance-column post-pass.
    clustered = [s for i, s in enumerate(clustered) if i not in dead]
    clustered = _merge_tolerance_columns(clustered)
    return clustered


def _merge_tolerance_columns(clustered: list[TextSpan]) -> list[TextSpan]:
    """Attach a lone tolerance token to the nearest dimension on its row."""
    # A tolerance fragment is ONE sign + ONE number ('±1.2', '± 1.2').
    # A merged pair ('+0.021 -0.000') is not a fragment and must not move.
    tol_idx = [
        i for i, s in enumerate(clustered)
        if re.match(r"^[±+\-]\s*\d+(\.\d+)?°?\s*$", s.text.strip())
    ]
    if not tol_idx:
        return clustered
    claimed_dim: set[str] = set()
    merged: dict[int, tuple[str, BBox, str]] = {}
    drop: set[int] = set()
    for ti in tol_idx:
        tol = clustered[ti]
        h = max(tol.font_size, tol.bbox.height, 4.0)
        best_i: int | None = None
        best_d = float("inf")
        for i, dim in enumerate(clustered):
            if i == ti or dim.span_id in claimed_dim:
                continue
            if not _has_digit(dim.text) or _token_class(dim.text) == "TOLNUM":
                continue
            if abs(dim.rotation_deg - tol.rotation_deg) > 5.0:
                continue
            if "±" in dim.text or re.search(r"[+-]\d+\.?\d*\s*$", dim.text):
                continue
            dy = abs(dim.bbox.center.y - tol.bbox.center.y)
            dx = tol.bbox.x0 - dim.bbox.x1
            if dy <= 1.5 * h and 0.0 <= dx <= 6.0 * h:
                d = (dx * dx + dy * dy) ** 0.5
                if d < best_d:
                    best_d, best_i = d, i
        if best_i is not None:
            dim = clustered[best_i]
            merged[best_i] = (f"{dim.text} {tol.text}", dim.bbox.union(tol.bbox), tol.text)
            claimed_dim.add(dim.span_id)
            drop.add(ti)
    if not merged:
        return clustered
    out: list[TextSpan] = []
    for i, s in enumerate(clustered):
        if i in drop:
            continue
        if i in merged:
            text, bbox, extra = merged[i]
            out.append(
                TextSpan(
                    s.span_id, text, bbox, s.origin, s.font_name, s.font_size,
                    s.rotation_deg, True, s.constituent_texts + [extra],
                )
            )
        else:
            out.append(s)
    return out


def _detect_filled_triangle_arrow(items: list) -> Arrowhead | None:
    pts: list[Point2D] = []
    for item in items:
        if item[0] == "l":
            p1 = Point2D(float(item[1].x), float(item[1].y))
            p2 = Point2D(float(item[2].x), float(item[2].y))
            if not pts or pts[-1].distance_to(p1) > 0.1:
                pts.append(p1)
            pts.append(p2)
    # Deduplicate closing point
    unique_pts: list[Point2D] = []
    for p in pts:
        if not any(p.distance_to(u) < 0.25 for u in unique_pts):
            unique_pts.append(p)

    if len(unique_pts) != 3:
        return None

    a, b, c = unique_pts
    d_ab = a.distance_to(b)
    d_bc = b.distance_to(c)
    d_ca = c.distance_to(a)
    sides = sorted([d_ab, d_bc, d_ca])
    # CAD arrowheads have side lengths between 1.5 pt and 15 pt, with two long sides and one shorter base
    if sides[0] < 0.8 or sides[2] > 16.0:
        return None

    # The tip is the vertex opposite the shortest side (the base)
    if d_ab == sides[0]:
        tip, b1, b2 = c, a, b
    elif d_bc == sides[0]:
        tip, b1, b2 = a, b, c
    else:
        tip, b1, b2 = b, c, a

    base_mid = Point2D((b1.x + b2.x) * 0.5, (b1.y + b2.y) * 0.5)
    direction = math.degrees(math.atan2(tip.y - base_mid.y, tip.x - base_mid.x))
    return Arrowhead(tip=tip, base_center=base_mid, direction_deg=round(direction, 2), kind="filled_polygon")


def _detect_open_vee_arrows(segments: list[LineSegment]) -> list[Arrowhead]:
    """Detects open V-shaped arrowheads formed by two short strokes (2.0–12.0 pt) meeting at 15°–60°."""
    short_segs = [s for s in segments if 1.8 <= s.length <= 12.5 and s.width <= 1.8]
    arrows: list[Arrowhead] = []
    used_pairs: set[tuple[int, int]] = set()

    for i, s1 in enumerate(short_segs):
        for j in range(i + 1, len(short_segs)):
            if (i, j) in used_pairs:
                continue
            s2 = short_segs[j]
            # Check if any endpoints coincide within 1.0 pt
            shared_tip: Point2D | None = None
            other1: Point2D | None = None
            other2: Point2D | None = None

            for p1_end, p1_other in ((s1.p1, s1.p2), (s1.p2, s1.p1)):
                for p2_end, p2_other in ((s2.p1, s2.p2), (s2.p2, s2.p1)):
                    if p1_end.distance_to(p2_end) <= 1.0:
                        shared_tip = Point2D((p1_end.x + p2_end.x) * 0.5, (p1_end.y + p2_end.y) * 0.5)
                        other1, other2 = p1_other, p2_other
                        break
                if shared_tip:
                    break

            if not shared_tip or not other1 or not other2:
                continue

            # Check angle between the two wings
            v1 = (other1.x - shared_tip.x, other1.y - shared_tip.y)
            v2 = (other2.x - shared_tip.x, other2.y - shared_tip.y)
            mag = math.hypot(*v1) * math.hypot(*v2)
            if mag < 1e-5:
                continue
            cos_theta = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / mag))
            angle_between = math.degrees(math.acos(cos_theta))
            if 15.0 <= angle_between <= 65.0:
                base_mid = Point2D((other1.x + other2.x) * 0.5, (other1.y + other2.y) * 0.5)
                dir_deg = math.degrees(math.atan2(shared_tip.y - base_mid.y, shared_tip.x - base_mid.x))
                arrows.append(
                    Arrowhead(
                        tip=shared_tip,
                        base_center=base_mid,
                        direction_deg=round(dir_deg, 2),
                        kind="open_vee",
                    )
                )
                used_pairs.add((i, j))
    return arrows


def _build_leaders_and_dimension_lines(
    segments: list[LineSegment], arrowheads: list[Arrowhead]
) -> tuple[list[LeaderLine], list[DimensionLine]]:
    leaders: list[LeaderLine] = []
    dim_lines: list[DimensionLine] = []
    thin_segs = [s for s in segments if s.width <= 1.6 and s.length >= 6.0]

    used_seg_indices: set[int] = set()

    # 1. Detect Dimension Lines: single segment with arrowheads at BOTH ends pointing outward
    for idx, seg in enumerate(thin_segs):
        arrows_at_p1 = [a for a in arrowheads if a.tip.distance_to(seg.p1) <= 3.5 or a.base_center.distance_to(seg.p1) <= 3.5]
        arrows_at_p2 = [a for a in arrowheads if a.tip.distance_to(seg.p2) <= 3.5 or a.base_center.distance_to(seg.p2) <= 3.5]
        if arrows_at_p1 and arrows_at_p2:
            used_seg_indices.add(idx)
            dim_lines.append(
                DimensionLine(
                    dim_line_id=f"dl_{len(dim_lines) + 1:03d}",
                    tip_a=arrows_at_p1[0].tip,
                    tip_b=arrows_at_p2[0].tip,
                    midpoint=seg.midpoint,
                    length_pt=round(seg.length, 2),
                    angle_deg=round(seg.angle_deg, 2),
                )
            )

    # 2. Detect Leader Lines: start from an arrowhead and trace up to 3 connected segments (shaft -> horizontal shoulder)
    for a_idx, arrow in enumerate(arrowheads):
        # Find shaft segment touching arrow tip or base_center
        best_idx: int | None = None
        touch_at_p1 = True
        for idx, seg in enumerate(thin_segs):
            if idx in used_seg_indices:
                continue
            d1 = min(seg.p1.distance_to(arrow.tip), seg.p1.distance_to(arrow.base_center))
            d2 = min(seg.p2.distance_to(arrow.tip), seg.p2.distance_to(arrow.base_center))
            if d1 <= 3.5 and seg.length > 6.5:
                best_idx = idx
                touch_at_p1 = True
                break
            if d2 <= 3.5 and seg.length > 6.5:
                best_idx = idx
                touch_at_p1 = False
                break

        if best_idx is None:
            continue

        shaft = thin_segs[best_idx]
        curr_end = shaft.p2 if touch_at_p1 else shaft.p1
        vertices = [arrow.tip, curr_end]
        has_shoulder = False

        # Follow up to 2 connected shoulder segments within 3.0 pt
        visited = {best_idx}
        for _hop in range(2):
            next_idx: int | None = None
            next_pt: Point2D | None = None
            for idx, cand in enumerate(thin_segs):
                if idx in visited or idx in used_seg_indices:
                    continue
                if cand.p1.distance_to(curr_end) <= 3.0:
                    next_idx, next_pt = idx, cand.p2
                    break
                if cand.p2.distance_to(curr_end) <= 3.0:
                    next_idx, next_pt = idx, cand.p1
                    break
            if next_idx is not None and next_pt is not None:
                visited.add(next_idx)
                seg_hop = thin_segs[next_idx]
                if abs(seg_hop.p2.y - seg_hop.p1.y) <= 1.5 and seg_hop.length >= 4.0:
                    has_shoulder = True
                curr_end = next_pt
                vertices.append(curr_end)
            else:
                break

        leaders.append(
            LeaderLine(
                leader_id=f"ldr_{a_idx + 1:03d}",
                arrow_tip=arrow.tip,
                tail_end=curr_end,
                vertices=vertices,
                has_horizontal_shoulder=has_shoulder,
            )
        )

    return leaders, dim_lines


PUA_TRANSLATION_MAP: dict[int, str] = {
    **{0xF030 + d: str(d) for d in range(10)},
    0xF02E: ".", 0xF02B: "+", 0xF02D: "-", 0x2212: "-", 0x2013: "-", 0x2014: "-",
    0xF0B1: "±", 0xF0B0: "°", 0xF032: "Ø", 0xF0AC: "Ø", 0x2300: "Ø",
    0xF0A3: "≤", 0xF0B3: "≥",
}

GDT_TEXT_SYMBOLS = {
    "⌖", "⏥", "⏤", "◯", "⌭", "⌒", "⌓", "⟂", "⊥", "∠", "//", "∥", "◎", "⌯", "↗", "⌰", "\x00"
}

PREFIX_RE = re.compile(
    r"^(?:[Ø⌀RM]|PCD|Ra|Rz|[≤≥]|min\.?|max\.?|\d+\s*[xX×])$", re.IGNORECASE
)
FIT_RE = re.compile(
    r"^(?:[A-HJ-Za-hj-z]|js|JS)\d{1,2}(?:\s*(?:[ⒺⓂⓁ]|\([EML]\)))?$"
)
TOL_RE = re.compile(
    r"^(?:±|\+/-|\+-|[+-])\s*\d+(?:\.\d+)?°?$"
)
NUM_RE = re.compile(
    r"^[Ø⌀R]?\s*\d+(?:\.\d+)?°?$"
)
RANGE_CONT_RE = re.compile(
    r"^(?:…|\.{2,3}|[-–—~])\s*\d+(?:\.\d+)?$"
)


def normalize_glyphs(text: str) -> str:
    if not text:
        return ""
    s = "".join(PUA_TRANSLATION_MAP.get(ord(c), c) for c in text)
    return " ".join(s.strip().split())


def _baseline_frame(rot_deg: float) -> tuple[tuple[float, float], tuple[float, float]]:
    """
    Returns unit tangent vector u_hat (along reading direction) and
    unit normal vector v_hat (perpendicular downward in PDF coordinates).
    """
    rad = math.radians(rot_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    vx, vy = -math.sin(rad), math.cos(rad)
    return (ux, uy), (vx, vy)


def _project_bbox(
    bbox: BBox, origin: Point2D, u_hat: tuple[float, float], v_hat: tuple[float, float]
) -> tuple[float, float, float, float, float, float]:
    """
    Projects bbox corners relative to origin onto (u_hat, v_hat).
    Returns (u_min, u_max, v_min, v_max, u_center, v_center).
    """
    corners = [
        (bbox.x0 - origin.x, bbox.y0 - origin.y),
        (bbox.x1 - origin.x, bbox.y0 - origin.y),
        (bbox.x0 - origin.x, bbox.y1 - origin.y),
        (bbox.x1 - origin.x, bbox.y1 - origin.y),
    ]
    us = [dx * u_hat[0] + dy * u_hat[1] for dx, dy in corners]
    vs = [dx * v_hat[0] + dy * v_hat[1] for dx, dy in corners]
    u_min, u_max = min(us), max(us)
    v_min, v_max = min(vs), max(vs)
    return u_min, u_max, v_min, v_max, 0.5 * (u_min + u_max), 0.5 * (v_min + v_max)


def _angles_compatible(a_deg: float, b_deg: float, tol_deg: float = 8.0) -> bool:
    diff = abs((a_deg - b_deg + 180.0) % 360.0 - 180.0)
    return diff <= tol_deg


def _Infer_vector_fcf_symbol(
    left_cell_bbox: BBox,
    segments: Sequence[LineSegment],
    circles: Sequence[tuple[Point2D, float]],
) -> str:
    """
    Infers the GD&T symbol when Compartment 1 of a vector FCF box contains
    stroked vector geometry instead of a font glyph (fixes new01 & new03).
    """
    c_count = sum(
        1 for cpt, rad in circles
        if rad <= left_cell_bbox.height * 0.7 and left_cell_bbox.contains_point(cpt, tol=2.0)
    )
    diag_count = 0
    horiz_count = 0
    vert_count = 0
    max_len = max(20.0, left_cell_bbox.height * 1.6)
    for seg in segments:
        if not (1.0 <= seg.length <= max_len):
            continue
        if not left_cell_bbox.contains_point(seg.midpoint, tol=1.5):
            continue
        ang = abs(seg.angle_deg) % 180.0
        if ang > 90.0:
            ang = 180.0 - ang
        if 20.0 <= ang <= 70.0:
            diag_count += 1
        elif ang <= 10.0:
            horiz_count += 1
        elif ang >= 80.0:
            vert_count += 1
    if c_count >= 2:
        return "◎"
    if c_count == 1 and horiz_count >= 1 and vert_count >= 1:
        return "⌖"
    if c_count == 1:
        return "◯"
    if diag_count >= 1 and (horiz_count + vert_count) <= 2:
        return "↗"
    if horiz_count >= 1 and vert_count >= 1 and diag_count == 0:
        return "⟂"
    if diag_count >= 2 and horiz_count == 0:
        return "//"
    return "\x00"  # Triggers Gemini Vision symbol patch resolver


def extract_vector_boxed_gdt_frames(
    spans: list[TextSpan],
    rectangles: list[BBox],
    segments: list[LineSegment],
    circles: list[tuple[Point2D, float]],
) -> tuple[list[TextSpan], set[str]]:
    """
    Fixes Issue 1 (missed GD&T frames on new01) & Issue 5 (32 FCF internal fragments on new03):
    1. Detects GD&T Feature Control Frame (FCF) containers from vector rectangles/lines AND
       from text rows containing a tolerance cell ('0.05', '0.005', 'Ø 0.1') followed by datum cells ('A', 'B', 'C').
    2. Captures all internal spans ('0.05', '0.005', 'A', 'B') into the assembled '|sym|tol|datum|' span
       and marks their span_ids as consumed so they NEVER leak out as standalone dimensions!
    """
    consumed_ids: set[str] = set()
    assembled_frames: list[TextSpan] = []
    # Step A: Reconstruct FCF boxes from vector rectangles (height 7..26 pt, width 20..180 pt)
    candidate_boxes: list[BBox] = []
    fcf_rects = [
        r for r in rectangles
        if (7.0 <= r.height <= 26.0 and 7.0 <= r.width <= 180.0)
        or (7.0 <= r.width <= 26.0 and 7.0 <= r.height <= 180.0)
    ]
    # Merge adjacent compartment rectangles into full FCF strip boxes
    used_r: set[int] = set()
    for i, r in enumerate(fcf_rects):
        if i in used_r:
            continue
        box = r
        used_r.add(i)
        changed = True
        while changed:
            changed = False
            for j, other in enumerate(fcf_rects):
                if j in used_r:
                    continue
                # Horizontal strip merge
                if abs(other.y0 - box.y0) <= 2.5 and abs(other.height - box.height) <= 3.0:
                    if -2.0 <= (other.x0 - box.x1) <= 4.0 or -2.0 <= (box.x0 - other.x1) <= 4.0:
                        box = box.union(other)
                        used_r.add(j)
                        changed = True
                # Vertical strip merge (for 90-deg rotated FCFs on new01/new03)
                elif abs(other.x0 - box.x0) <= 2.5 and abs(other.width - box.width) <= 3.0:
                    if -2.0 <= (other.y0 - box.y1) <= 4.0 or -2.0 <= (box.y0 - other.y1) <= 4.0:
                        box = box.union(other)
                        used_r.add(j)
                        changed = True
        if max(box.width, box.height) >= 22.0 and min(box.width, box.height) <= 28.0:
            candidate_boxes.append(box)
    # Step B: Check each candidate vector FCF box for internal tolerance + datum spans
    for f_box in candidate_boxes:
        inside = [
            sp for sp in spans
            if sp.span_id not in consumed_ids and f_box.contains_point(sp.bbox.center, tol=3.0)
        ]
        if not inside:
            continue
        # Sort cells along the strip's major axis
        is_vert_box = f_box.height > f_box.width * 1.5
        inside_sorted = sorted(
            inside,
            key=lambda s: (-s.bbox.y0 if s.rotation_deg < -45 else s.bbox.y0) if is_vert_box else s.bbox.x0,
        )
        norm_cells = [normalize_glyphs(s.text) for s in inside_sorted]
        # Must contain at least one small GD&T tolerance value (0.001..2.0) and either a symbol or a datum letter
        has_gdt_tol = any(
            re.match(r"^[Ø⌀]?\s*0\.\d+(?:\s*(?:[ⓂⓁⒺ]|\([MLE]\)))?$", c) for c in norm_cells
        )
        has_datum_or_sym = any(
            re.match(r"^[A-D](?:-[A-D])?(?:\s*(?:[ⓂⓁ]|\([ML]\)))?$", c) or c in GDT_TEXT_SYMBOLS
            for c in norm_cells
        )
        if not has_gdt_tol:
            continue
        # Check if first span is already a symbol; if not, infer from the left compartment vector strokes!
        first_norm = norm_cells[0]
        if first_norm not in GDT_TEXT_SYMBOLS and not any(first_norm.startswith(s) for s in GDT_TEXT_SYMBOLS if s != "\x00"):
            h_cell = min(f_box.width, f_box.height)
            left_cell = (
                BBox(f_box.x0, f_box.y1 - h_cell * 1.35, f_box.x1, f_box.y1)
                if is_vert_box
                else BBox(f_box.x0, f_box.y0, f_box.x0 + h_cell * 1.35, f_box.y1)
            )
            inferred_sym = _Infer_vector_fcf_symbol(left_cell, segments, circles)
            norm_cells.insert(0, inferred_sym)
        # Look for adjacent (Nx) quantity span just outside the right end of f_box
        qty_suffix = ""
        for sp in spans:
            if sp.span_id in consumed_ids or sp in inside_sorted:
                continue
            sp_norm = normalize_glyphs(sp.text)
            if re.match(r"^\(?\s*\d+\s*[xX×]\s*\)?$", sp_norm):
                if f_box.min_distance_to_point(sp.bbox.center) <= 18.0:
                    qty_suffix = f" ({sp_norm.strip('() ')})"
                    consumed_ids.add(sp.span_id)
                    break
        for sp in inside_sorted:
            consumed_ids.add(sp.span_id)
        base_sp = inside_sorted[0]
        frame_text = "|" + "|".join(norm_cells) + "|" + qty_suffix
        assembled_frames.append(
            replace(
                base_sp,
                text=frame_text,
                bbox=f_box,
                is_clustered=True,
                constituent_texts=[s.text for s in inside_sorted],
            )
        )
    # Step C: Also assemble unboxed/line-framed GD&T rows along rotated baseline (u, v)
    remaining = [s for s in spans if s.span_id not in consumed_ids]
    for sp in remaining:
        if sp.span_id in consumed_ids:
            continue
        t_norm = normalize_glyphs(sp.text)
        is_sym = (t_norm in GDT_TEXT_SYMBOLS or (len(t_norm) == 1 and ord(t_norm) >= 0xF000)) and "|" not in t_norm
        if not is_sym:
            continue
        u_hat, v_hat = _baseline_frame(sp.rotation_deg)
        h = max(sp.font_size, min(sp.bbox.width, sp.bbox.height), 6.0)
        row_group = [sp]
        curr_u_max = _project_bbox(sp.bbox, sp.origin, u_hat, v_hat)[1]
        # Collect cells along +u_hat
        cands_with_u: list[tuple[float, TextSpan]] = []
        for cand in remaining:
            if cand.span_id == sp.span_id or cand.span_id in consumed_ids:
                continue
            if not _angles_compatible(sp.rotation_deg, cand.rotation_deg):
                continue
            u_min, u_max, _, _, _, v_c = _project_bbox(cand.bbox, sp.origin, u_hat, v_hat)
            if abs(v_c) <= 0.75 * h and -0.3 * h <= u_min <= curr_u_max + 8.0 * h:
                cands_with_u.append((u_min, cand))
        cands_with_u.sort(key=lambda x: x[0])
        for u_min, cand in cands_with_u:
            if u_min - curr_u_max > 3.0 * h:
                break
            cn = normalize_glyphs(cand.text)
            if len(row_group) == 1 and re.match(r"^[Ø⌀]?\s*0\.\d+(?:\s*(?:[ⓂⓁⒺ]|\([MLE]\)))?$", cn):
                row_group.append(cand)
                curr_u_max = max(curr_u_max, _project_bbox(cand.bbox, sp.origin, u_hat, v_hat)[1])
            elif len(row_group) >= 2 and (
                re.match(r"^[A-D](?:-[A-D])?(?:\s*(?:[ⓂⓁ]|\([ML]\)))?$", cn)
                or re.match(r"^\(?\s*\d+\s*[xX×]\s*\)?$", cn)
            ):
                row_group.append(cand)
                curr_u_max = max(curr_u_max, _project_bbox(cand.bbox, sp.origin, u_hat, v_hat)[1])
        if len(row_group) >= 2:
            union_b = row_group[0].bbox
            parts: list[str] = []
            q_str = ""
            for g in row_group:
                consumed_ids.add(g.span_id)
                union_b = union_b.union(g.bbox)
                gn = normalize_glyphs(g.text)
                if re.match(r"^\(?\s*\d+\s*[xX×]\s*\)?$", gn):
                    q_str = f" ({gn.strip('() ')})"
                else:
                    parts.append(gn)
            assembled_frames.append(
                replace(
                    sp,
                    text="|" + "|".join(parts) + "|" + q_str,
                    bbox=union_b,
                    is_clustered=True,
                    constituent_texts=[g.text for g in row_group],
                )
            )
    return assembled_frames, consumed_ids


try:
    from geometry_first_clustering import (
        BBox as TupleBBox,
        Segment as TupleSegment,
        cluster_spans_geometry_guided,
        find_fcf_locked_span_ids,
        _extract_rect_bboxes,
    )
except ImportError:
    from backend.geometry_first_clustering import (
        BBox as TupleBBox,
        Segment as TupleSegment,
        cluster_spans_geometry_guided,
        find_fcf_locked_span_ids,
        _extract_rect_bboxes,
    )


def _span_to_dict(sp: "TextSpan") -> dict[str, Any]:
    """Convert repo `TextSpan` dataclass into the dict format for `cluster_spans_geometry_guided`."""
    b = sp.bbox
    t = sp.text.replace("\xad", "-").replace("\xa0", " ")
    return {
        "id": sp.span_id,
        "text": t,
        "bbox": (float(b.x0), float(b.y0), float(b.x1), float(b.y1)),
        "angle_deg": float(getattr(sp, "rotation_deg", 0.0) or 0.0),
        "size": float(getattr(sp, "font_size", 8.0) or 8.0),
    }


def _rect_to_tuple(r: Any) -> Optional[TupleBBox]:
    """Convert repo `BBox` dataclass (or dict/tuple) into `(x0, y0, x1, y1)`."""
    if hasattr(r, "x0") and hasattr(r, "y0") and hasattr(r, "x1") and hasattr(r, "y1"):
        return (float(r.x0), float(r.y0), float(r.x1), float(r.y1))
    if hasattr(r, "bbox"):
        b = r.bbox
        return (float(b.x0), float(b.y0), float(b.x1), float(b.y1))
    if isinstance(r, dict) and "bbox" in r:
        b = r["bbox"]
        return (float(b[0]), float(b[1]), float(b[2]), float(b[3]))
    if isinstance(r, (tuple, list)) and len(r) >= 4:
        return (float(r[0]), float(r[1]), float(r[2]), float(r[3]))
    return None


def _seg_to_tuple(s: Any) -> Optional[TupleSegment]:
    """Convert repo `LineSegment` dataclass (`p1: Point2D, p2: Point2D`) into `(x0, y0, x1, y1)`."""
    if hasattr(s, "p1") and hasattr(s, "p2"):
        return (float(s.p1.x), float(s.p1.y), float(s.p2.x), float(s.p2.y))
    if hasattr(s, "x0") and hasattr(s, "y0") and hasattr(s, "x1") and hasattr(s, "y1"):
        return (float(s.x0), float(s.y0), float(s.x1), float(s.y1))
    if isinstance(s, (tuple, list)) and len(s) >= 4:
        return (float(s[0]), float(s[1]), float(s[2]), float(s[3]))
    return None


def _cluster_dict_to_span(
    cluster: dict[str, Any],
    span_by_id: dict[Any, "TextSpan"],
    fallback_span: "TextSpan",
) -> "TextSpan":
    """
    Reconstruct a repo `TextSpan` dataclass from a cluster dict, preserving the
    seed span's `span_id`, `origin`, `font_name`, `font_size`, and `rotation_deg`.
    """
    span_ids = cluster.get("span_ids") or []
    seed_span = next(
        (span_by_id[sid] for sid in span_ids if sid in span_by_id),
        fallback_span,
    )
    bx0, by0, bx1, by1 = cluster["bbox"]
    merged_bbox = BBox(x0=float(bx0), y0=float(by0), x1=float(bx1), y1=float(by1))
    raw_callout = cluster["raw_callout"]
    # Normalize stacked bilateral tolerances '+0.10/-0.05' -> '+0.10 / -0.05'
    # so that repo assertions like '4.7 +0.10 / -0.05' match and spacing is consistent
    formatted_callout = re.sub(
        r"([+-]\d*(?:\.\d+)?)\s*/\s*([+-]?\d*(?:\.\d+)?)",
        r"\1 / \2",
        raw_callout,
    )
    return TextSpan(
        span_id=seed_span.span_id,
        text=formatted_callout,
        bbox=merged_bbox,
        origin=seed_span.origin,
        font_name=seed_span.font_name,
        font_size=seed_span.font_size,
        rotation_deg=seed_span.rotation_deg,
        is_clustered=True,
        constituent_texts=[formatted_callout],
    )


def cluster_spans_rotation_aware(
    raw_spans: Sequence["TextSpan"],
    rectangles: Optional[Sequence[Any]] = None,
    segments: Optional[Sequence[Any]] = None,
    circles: Optional[Sequence[Any]] = None,
    locked_table_span_ids: Optional[Set[Any]] = None,
) -> list["TextSpan"]:
    """
    Drop-in replacement for `cluster_spans_rotation_aware` in `backend/vector_pass.py` (line 1174)
    matching the exact call signature at commit `baf6ad1`. `circles` is accepted and unused.
    """
    if not raw_spans:
        return []

    rects = rectangles or []
    segs = segments or []
    circs = circles or []

    # Phase 0: Boxed & Row GD&T Frame Extraction
    gdt_frames, gdt_consumed = extract_vector_boxed_gdt_frames(list(raw_spans), rects, segs, circs)

    span_by_id = {sp.span_id: sp for sp in raw_spans}
    span_dicts = [_span_to_dict(sp) for sp in raw_spans if sp.span_id not in gdt_consumed]
    rect_tuples = [rt for r in rects if (rt := _rect_to_tuple(r)) is not None]
    seg_tuples = [st for s in segs if (st := _seg_to_tuple(st_item := s)) is not None]

    clustered_dicts = cluster_spans_geometry_guided(
        spans=span_dicts,
        rects=rect_tuples,
        segments=seg_tuples,
        locked_span_ids=locked_table_span_ids,
    )

    consumed_ids: set[Any] = set(gdt_consumed)
    for c in clustered_dicts:
        consumed_ids.update(c.get("span_ids", []))

    final_spans: list[TextSpan] = list(gdt_frames)
    for c in clustered_dicts:
        final_spans.append(_cluster_dict_to_span(c, span_by_id, raw_spans[0]))

    # Retain standalone unclustered spans that are valid callouts or GD&T frames
    # (e.g. pipe GD&T frames, chamfers, or prefixed dims) while suppressing orphan tolerance fragments
    try:
        from dimension_grammar import parse_dimension_callout
        from gdt_parser import parse_gdt_frame
    except ImportError:
        from backend.dimension_grammar import parse_dimension_callout
        from backend.gdt_parser import parse_gdt_frame

    fcf_boxes = _extract_rect_bboxes(rect_tuples)
    locked_ids = find_fcf_locked_span_ids(span_dicts, fcf_boxes)
    if locked_table_span_ids:
        locked_ids = set(locked_ids) | set(locked_table_span_ids)
    for s in raw_spans:
        if s.span_id not in consumed_ids and s.span_id not in locked_ids:
            norm_t = s.text.replace("\xad", "-").replace("\xa0", " ")
            if parse_gdt_frame(norm_t) or parse_dimension_callout(norm_t):
                final_spans.append(
                    TextSpan(
                        span_id=s.span_id,
                        text=norm_t,
                        bbox=s.bbox,
                        origin=s.origin,
                        font_name=s.font_name,
                        font_size=s.font_size,
                        rotation_deg=s.rotation_deg,
                        is_clustered=False,
                        constituent_texts=[norm_t],
                    )
                )

    return final_spans


def run_vector_pass(doc: fitz.Document, page_index: int = 0) -> PageVectorModel:
    page = doc[page_index]
    rect = page.rect
    raw_spans = extract_text_spans(page)

    segments: list[LineSegment] = []
    rectangles: list[BBox] = []
    circles: list[tuple[Point2D, float]] = []
    arrowheads: list[Arrowhead] = []

    for drw in page.get_drawings():
        items = drw.get("items", [])
        width = float(drw.get("width") or 0.5)
        fill = drw.get("fill")

        # Check if this drawing path is a filled triangle arrowhead
        if fill is not None and 3 <= len(items) <= 4:
            tri_arrow = _detect_filled_triangle_arrow(items)
            if tri_arrow:
                arrowheads.append(tri_arrow)
                continue

        for item in items:
            kind = item[0]
            if kind == "l":
                p1 = Point2D(float(item[1].x), float(item[1].y))
                p2 = Point2D(float(item[2].x), float(item[2].y))
                if p1.distance_to(p2) > 0.5:
                    segments.append(LineSegment(p1=p1, p2=p2, width=width))
            elif kind == "re":
                r = item[1]
                rectangles.append(BBox(float(r.x0), float(r.y0), float(r.x1), float(r.y1)))
            elif kind == "c":
                # Bezier curve approximation for circle arcs
                r = drw.get("rect")
                if r and abs(r.width - r.height) < 2.0 and r.width > 4.0:
                    center = Point2D(float(r.x0 + r.x1) * 0.5, float(r.y0 + r.y1) * 0.5)
                    rad = float(r.width) * 0.5
                    if not any(center.distance_to(c[0]) < 1.5 and abs(rad - c[1]) < 1.5 for c in circles):
                        circles.append((center, rad))

    arrowheads.extend(_detect_open_vee_arrows(segments))
    leaders, dim_lines = _build_leaders_and_dimension_lines(segments, arrowheads)

    try:
        from table_extractor import extract_structured_dimension_tables
    except ImportError:
        from backend.table_extractor import extract_structured_dimension_tables

    locked_table_span_ids, table_records = extract_structured_dimension_tables(
        raw_spans,
        rectangles,
        segments,
        page_index=page_index,
    )

    clustered_spans = cluster_spans_rotation_aware(
        raw_spans,
        rectangles=rectangles,
        segments=segments,
        circles=circles,
        locked_table_span_ids=locked_table_span_ids,
    )

    return PageVectorModel(
        page_number=page_index + 1,
        width_pt=float(rect.width),
        height_pt=float(rect.height),
        raw_spans=raw_spans,
        clustered_spans=clustered_spans,
        line_segments=segments,
        rectangles=rectangles,
        circle_centers=circles,
        arrowheads=arrowheads,
        leader_lines=leaders,
        dimension_lines=dim_lines,
        table_records=table_records,
        locked_table_span_ids=locked_table_span_ids,
    )


def crop_callout_patch_base64(page: fitz.Page, bbox: BBox, dpi: int = 300, pad_pt: float = 8.0) -> str:
    """Renders only the small bounding-box clip at 300 DPI to prevent full-page OOM on 512MB RAM."""
    clip = fitz.Rect(
        max(0.0, bbox.x0 - pad_pt),
        max(0.0, bbox.y0 - pad_pt),
        min(page.rect.width, bbox.x1 + pad_pt),
        min(page.rect.height, bbox.y1 + pad_pt),
    )
    pix = page.get_pixmap(clip=clip, dpi=dpi, alpha=False)
    png_bytes = pix.tobytes("png")
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")


def test_vector_pass() -> None:
    doc = fitz.open()
    page = doc.new_page(width=842, height=595)
    shape = page.new_shape()

    # Draw a leader line from feature at (200, 200) -> angled to (240, 160) -> horizontal shoulder to (265, 160)
    shape.draw_line(fitz.Point(200, 200), fitz.Point(240, 160))
    shape.draw_line(fitz.Point(240, 160), fitz.Point(265, 160))
    # Open-vee arrowhead at (200, 200)
    shape.draw_line(fitz.Point(200, 200), fitz.Point(206, 191))
    shape.draw_line(fitz.Point(200, 200), fitz.Point(209, 194))
    shape.finish(width=0.75, color=(0, 0, 0))
    shape.commit()

    # Insert split nominal and stacked +tol / -tol spans
    page.insert_text(fitz.Point(268, 162), "Ø30.00", fontsize=10)
    page.insert_text(fitz.Point(304, 158), "+0.021", fontsize=6.5)
    page.insert_text(fitz.Point(304, 165), "-0.000", fontsize=6.5)

    model = run_vector_pass(doc, 0)
    assert len(model.arrowheads) >= 1, "Expected open-vee arrowhead detection"
    assert len(model.leader_lines) >= 1, "Expected multi-segment leader detection"
    assert model.leader_lines[0].has_horizontal_shoulder is True
    assert any("Ø30.00 +0.021 / -0.000" in s.text for s in model.clustered_spans), (
        f"Expected clustered tolerance span, got {[s.text for s in model.clustered_spans]}"
    )
    doc.close()


if __name__ == "__main__":
    test_vector_pass()
    print("test_vector_pass PASSED")


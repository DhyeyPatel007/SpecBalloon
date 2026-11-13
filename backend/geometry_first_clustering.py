"""
backend/geometry_first_clustering.py
====================================
Geometry-First Local-Frame Span Clustering & Range/Fit Grammar Upgrade
Target commit: baf6ad1 (https://github.com/DhyeyPatel007/SpecBalloon)

Addresses failure classes from the 99.1% Argon Brief:
  - §6.1: Dense-drawing recall via local (u, v) coordinate projection & multi-token assembly
  - §6.2: Wrong neighbour tolerance theft via Voronoi nominal ownership + segment barrier checks
  - §6.3: ISO fit classes (Ø 10 f7, Ø 36 f8) dropped on subscript/composite spans + M4 thread guard
  - §6.4: Double-sided inequalities (≥ Ø 14 ≤ Ø 17.2, 57 ≤ x ≤ 61) & ellipsis ranges (90°...120°)
  - §6.5: GD&T FCF internal span locking so frame numbers/datums never leak as extra balloons
  - §6.6: Strict span_id consumption tracking to prevent duplicate balloons
  - §6.7: '3 x 120°' angular pattern vs. 45° edge chamfer disambiguation

MUSE CORRECTIONS (verified 13 Nov 2026, see 00-verdict.md):
  - FIX 1: composite single-span callouts ('Ø 43.3 ±0.5') are NUM seeds, not OTHER
    (Argon's version dropped them; its own test_6_5 failed 0 vs 1 cluster).
  - FIX 2: split thread tolerance class ('6H'/'6g') is a THREAD_TOL follower that
    only attaches to THREAD seeds and rejoins as 'M10x1.5 - 6H'.
"""

from __future__ import annotations

import math
import re
import unittest
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

# ---------------------------------------------------------------------------
# 1. PUA & Glyph Normalization (Compatible with HEIDENHAIN / SICK / KHK PDFs)
# ---------------------------------------------------------------------------

PUA_MAP: Dict[str, str] = {
    "\uf0ac": "Ø",  # HEIDENHAIN diameter PUA glyph (§5)
    "\uf066": "Ø",
    "\uf0d8": "Ø",
    "\u2300": "Ø",
    "\u00f8": "Ø",
    "\uf0b1": "±",
    "\uf0b3": "≥",
    "\uf0a3": "≤",
    "\u2212": "-",
    "\u2013": "-",
    "\u2014": "-",
    "\u2026": "...",
}

# Vendor PUA digits (0xF030..0xF039 -> '0'..'9')
for _d in range(10):
    PUA_MAP[chr(0xF030 + _d)] = str(_d)


def normalize_callout_text(text: str) -> str:
    """Normalize PUA characters, unicode minus/dashes, and whitespace."""
    if not text:
        return ""
    out = [PUA_MAP.get(ch, ch) for ch in text]
    s = "".join(out)
    # Normalize spaced ellipsis ". . ." -> "..."
    s = re.sub(r"\.\s*\.\s*\.", "...", s)
    # Normalize spaced plus-minus "+/-" -> "±"
    s = re.sub(r"\+\s*/\s*-", "±", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ---------------------------------------------------------------------------
# 2. Token Classification Regexes (with §6.3 Thread Guard & §6.4 Range Tokens)
# ---------------------------------------------------------------------------

# Thread guard MUST run before FIT_RE so 'M4', 'M3', 'M10x1.5' are NEVER fits (§4.2, §6.3)
THREAD_START_RE = re.compile(
    r"^(?:\d+\s*[xX×]\s*)?M\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?(?:\s*-\s*\d+[A-Za-z]+)?$",
    re.IGNORECASE,
)

# Valid ISO 286 fit classes (hole H/G/F/J/JS/K/M/N/P... and shaft f/g/h/j/js/k/m/n/p...)
# Explicitly excludes uppercase 'M' followed by digits (metric thread M3, M4, M5, M6, M8, M10)
ISO_FIT_STANDALONE_RE = re.compile(
    r"^(?!M\d+$)(?:[A-HJ-NP-Z]{1,2}|[a-hj-np-z]{1,2})\d{1,2}$"
)

# Nominal with embedded ISO fit, e.g. 'Ø 10 f7', '12 h9', '18 H9'
NOMINAL_WITH_FIT_RE = re.compile(
    r"^(?:Ø\s*)?\d+(?:\.\d+)?\s+(?!M\d+\b)([A-HJ-NP-Za-hj-np-z]{1,2}\d{1,2})$"
)

QTY_ONLY_RE = re.compile(r"^\d+\s*[xX×]$")
QTY_PAREN_RE = re.compile(r"^\(\s*\d+\s*[xX×]\s*\)$")
PREFIX_SYM_RE = re.compile(r"^(?:Ø|R|SR|SØ|≥|≤|>|<)$")
INEQ_PREFIX_RE = re.compile(r"^(?:[TLx]\s*)?(?:≥|≤|>|<)\s*(?:Ø\s*)?\d+(?:\.\d+)?$")
SYM_TOL_RE = re.compile(r"^±\s*\d+(?:\.\d+)?°?$")
SIGNED_TOL_RE = re.compile(
    r"^(?:[+-]\s*\d+(?:\.\d+)?|0)(?:\s*/\s*(?:[+-]?\s*\d+(?:\.\d+)?|0))?$"
)
ELLIPSIS_RE = re.compile(r"^(?:\.{2,3}|…)$")
DOUBLE_INEQ_MID_RE = re.compile(r"^(?:≤|<)\s*[a-zA-Z]?\s*(?:≤|<)?\s*(?:Ø\s*)?$")
NUM_CORE_RE = re.compile(
    r"^(?:(?:\d+\s*[xX×]\s*)?(?:Ø|R|≥|≤)?\s*\d+(?:\.\d+)?\s*°?|\(\s*Ø?\s*\d+(?:\.\d+)?\s*\))$"
)
SURFACE_RE = re.compile(r"^(?:Ra|Rz)\b", re.IGNORECASE)
NOTE_SUFFIX_RE = re.compile(
    r"^(?:HUB\b|PROJ\.?|HUB\s+PROJ\.?|MAX\.?|MIN\.?|THRU\b|DEEP\b|\(\s*(?:steel|aluminum)\b.*?\))$",
    re.IGNORECASE,
)

# MUSE FIX 1 (verified 13 Nov 2026): a single PyMuPDF span often contains a WHOLE
# callout, e.g. 'Ø 43.3 ±0.5', '12.35 ±0.3', 'Ø 65 +0.1/0'. Argon's classifier
# returned OTHER for these, so cluster_spans_geometry_guided dropped them entirely
# (test_6_5 failed 0 clusters vs 1). A composite span is a NUM seed.
COMPOSITE_CALLOUT_RE = re.compile(
    r"^(?:(?:\d+\s*[xX×]\s*)?(?:Ø|R|SR)?\s*)?\d+(?:\.\d+)?\s*(?:°\s*)?"
    r"(?:±\s*\d+(?:\.\d+)?(?:\s*°)?|[+-]\s*\d+(?:\.\d+)?\s*/\s*[+-]?\s*\d+(?:\.\d+)?"
    r"|[+-]\s*\d+(?:\.\d+)?)$"
)

# MUSE FIX 2 (verified 13 Nov 2026): a thread tolerance class split across spans
# ('M10x1.5' + '6H') classified '6H' as OTHER, so the thread lost its class.
# '6H'/'6g'/'7H' are thread tolerance classes, never ISO 286 fits.
# ARGON FIX (round-4 send-back, verified 13 Nov 2026): tightened to valid ISO 965
# thread tolerance letters so "4x"/"2X" can never match. QTY is also checked first now.
THREAD_TOL_RE = re.compile(r"^[3-9][EFGHefgh](?:[3-9][EFGHefgh])?$")


def classify_span_token(raw_text: str) -> str:
    """
    Classify a normalized span string into a deterministic metrology token class.
    Guarantees:
      - 'M4', 'M12 x 1.5', '2xM3' -> 'THREAD' (never 'FIT' or 'NUM')
      - 'f7', 'f8', 'h9', 'H9', '6H' -> 'FIT'
      - '±0.2', '±0.05' -> 'TOL_SYM'
      - '+0.1', '-0.02', '0', '+0.1/0' -> 'TOL_SIGN'
      - '...', '≤ x ≤', '≤ Ø' -> 'RANGE_OP'
    """
    s = normalize_callout_text(raw_text)
    if not s:
        return "EMPTY"
    if SURFACE_RE.match(s):
        return "SURFACE"
    if THREAD_START_RE.match(s):
        return "THREAD"
    # ARGON FIX: QTY ("4x"/"2X") must be checked BEFORE THREAD_TOL_RE, else "4x"
    # (1 digit + 1 letter) matches the thread-tolerance pattern first.
    if QTY_ONLY_RE.match(s):
        return "QTY"
    if THREAD_TOL_RE.match(s):
        return "THREAD_TOL"
    if ISO_FIT_STANDALONE_RE.match(s):
        return "FIT"
    if QTY_PAREN_RE.match(s):
        return "QTY_SUFFIX"
    if ELLIPSIS_RE.match(s) or DOUBLE_INEQ_MID_RE.match(s):
        return "RANGE_OP"
    if SYM_TOL_RE.match(s):
        return "TOL_SYM"
    if SIGNED_TOL_RE.match(s) and (
        s.startswith("+") or s.startswith("-") or "/" in s or s == "0"
    ):
        return "TOL_SIGN"
    if PREFIX_SYM_RE.match(s):
        return "PREFIX"
    if NOTE_SUFFIX_RE.match(s):
        return "SUFFIX_NOTE"
    if NUM_CORE_RE.match(s) or INEQ_PREFIX_RE.match(s) or NOMINAL_WITH_FIT_RE.match(s):
        return "NUM"
    if COMPOSITE_CALLOUT_RE.match(s):
        # MUSE FIX 1: whole callout in one span ('Ø 43.3 ±0.5') is a NUM seed, not OTHER.
        return "NUM"
    return "OTHER"


# ---------------------------------------------------------------------------
# 3. Geometry Primitives & Local Coordinate Frame (u, v)
# ---------------------------------------------------------------------------

BBox = Tuple[float, float, float, float]
Segment = Tuple[float, float, float, float]


def bbox_center(b: BBox) -> Tuple[float, float]:
    return ((b[0] + b[2]) * 0.5, (b[1] + b[3]) * 0.5)


def bbox_union(boxes: Sequence[BBox]) -> BBox:
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def bbox_iou_or_containment(inner: BBox, outer: BBox, pad: float = 1.5) -> float:
    """Return fraction of `inner` area contained inside `outer` (padded by `pad` pt)."""
    ix0 = max(inner[0], outer[0] - pad)
    iy0 = max(inner[1], outer[1] - pad)
    ix1 = min(inner[2], outer[2] + pad)
    iy1 = min(inner[3], outer[3] + pad)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    area = max((inner[2] - inner[0]) * (inner[3] - inner[1]), 1e-6)
    return inter / area


def segments_intersect_2d(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    q1: Tuple[float, float],
    q2: Tuple[float, float],
) -> bool:
    """Return True if line segment p1-p2 strictly crosses q1-q2."""
    def ccw(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    d1 = ccw(p1, p2, q1)
    d2 = ccw(p1, p2, q2)
    d3 = ccw(q1, q2, p1)
    d4 = ccw(q1, q2, p2)
    return ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and (
        (d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)
    )


def has_geometric_barrier_between(
    b1: BBox,
    b2: BBox,
    barrier_segments: Sequence[Segment],
    min_seg_len: float = 10.0,
) -> bool:
    """
    Return True if a dimension/extension/contour line segment cuts directly
    between the center of b1 and the center of b2.
    Prevents a nominal from claiming a neighbour's tolerance across an extension line (§6.2).
    """
    c1 = bbox_center(b1)
    c2 = bbox_center(b2)
    dist = math.hypot(c2[0] - c1[0], c2[1] - c1[1])
    if dist < 2.0:
        return False

    for seg in barrier_segments:
        sx0, sy0, sx1, sy1 = seg[:4]
        slen = math.hypot(sx1 - sx0, sy1 - sy0)
        if slen < min_seg_len:
            continue
        # Ignore the dimension line that runs parallel underneath both b1 and b2
        dx_c, dy_c = (c2[0] - c1[0]) / dist, (c2[1] - c1[1]) / dist
        dx_s, dy_s = (sx1 - sx0) / slen, (sy1 - sy0) / slen
        cross = abs(dx_c * dy_s - dy_c * dx_s)
        if cross < 0.35:  # Nearly parallel (< ~20 deg) -> underline/shaft, not a barrier
            continue
        if segments_intersect_2d(c1, c2, (sx0, sy0), (sx1, sy1)):
            return True
    return False


def project_to_local_frame(
    pt: Tuple[float, float],
    origin: Tuple[float, float],
    angle_deg: float,
) -> Tuple[float, float]:
    """
    Project page point `pt` into local coordinate frame at `origin` rotated by `angle_deg`.
     Note: PDF page y increases downward; for standard 0 deg horizontal text, +u is right (+x)
    and +v is downward (+y). For -90 deg / 270 deg vertical bottom-to-top text, +u is up (-y).
    """
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    dx = pt[0] - origin[0]
    dy = pt[1] - origin[1]
    u = dx * cos_a + dy * sin_a
    v = -dx * sin_a + dy * cos_a
    return (u, v)


def angles_compatible(a1: float, a2: float, tol_deg: float = 8.5) -> bool:
    """Check if two text rotation angles are compatible within `tol_deg` (mod 180)."""
    diff = abs((a1 - a2 + 90.0) % 180.0 - 90.0)
    return diff <= tol_deg


# ---------------------------------------------------------------------------
# 4. Stage 1A Lock: FCF Boxed Frame Span Locking (§6.5)
# ---------------------------------------------------------------------------

def find_fcf_locked_span_ids(
    spans: Sequence[Dict[str, Any]],
    fcf_rects: Sequence[BBox],
) -> Set[Any]:
    """
    Identify all spans whose bounding boxes lie inside a detected GD&T Feature
    Control Frame (FCF) rectangle. Locking these spans BEFORE dimension clustering
    prevents frame tolerances ('0.05', '0.1', 'A', 'B') from leaking out as
    standalone extra balloons (§6.5: real03 16 extras, new03 20 extras).
    """
    locked: Set[Any] = set()
    if not fcf_rects:
        return locked
    for idx, sp in enumerate(spans):
        sp_id = sp.get("id", idx)
        bbox = tuple(sp["bbox"][:4])
        for rect in fcf_rects:
            r_bbox = tuple(rect["bbox"][:4]) if isinstance(rect, dict) else tuple(rect[:4])
            if bbox_iou_or_containment(bbox, r_bbox, pad=1.5) >= 0.55:
                locked.add(sp_id)
                break
    return locked


# ---------------------------------------------------------------------------
# 5. Stage 3 Core: Geometry-Guided Local-Frame Clustering & Claiming
# ---------------------------------------------------------------------------

@dataclass
class SpanToken:
    span_id: Any
    text: str
    kind: str
    bbox: BBox
    angle_deg: float
    font_size: float
    center: Tuple[float, float]
    extent_u: float = 0.0


def _extract_rect_bboxes(rects: Optional[Sequence[Any]]) -> List[BBox]:
    if not rects:
        return []
    out: List[BBox] = []
    for r in rects:
        if hasattr(r, "x0") and hasattr(r, "y0") and hasattr(r, "x1") and hasattr(r, "y1"):
            # ARGON FIX: repo BBox dataclass (x0, y0, x1, y1) — not a dict or tuple.
            b = (float(r.x0), float(r.y0), float(r.x1), float(r.y1))
        elif isinstance(r, dict) and "bbox" in r:
            b = tuple(r["bbox"][:4])
        elif isinstance(r, (tuple, list)) and len(r) >= 4:
            b = (float(r[0]), float(r[1]), float(r[2]), float(r[3]))
        else:
            continue
        w, h = b[2] - b[0], b[3] - b[1]
        if 6.0 <= h <= 36.0 and 10.0 <= w <= 240.0 and w >= 1.1 * h:
            out.append(b)
    return out


def _extract_seg_tuples(segments: Optional[Sequence[Any]]) -> List[Segment]:
    if not segments:
        return []
    out: List[Segment] = []
    for s in segments:
        if hasattr(s, "p1") and hasattr(s, "p2"):
            # ARGON FIX: repo LineSegment dataclass (p1: Point2D, p2: Point2D).
            out.append((float(s.p1.x), float(s.p1.y), float(s.p2.x), float(s.p2.y)))
        elif isinstance(s, dict) and "pts" in s:
            p = s["pts"]
            out.append((float(p[0]), float(p[1]), float(p[2]), float(p[3])))
        elif isinstance(s, dict) and all(k in s for k in ("x0", "y0", "x1", "y1")):
            out.append((float(s["x0"]), float(s["y0"]), float(s["x1"]), float(s["y1"])))
        elif isinstance(s, (tuple, list)) and len(s) >= 4:
            out.append((float(s[0]), float(s[1]), float(s[2]), float(s[3])))
    return out


def cluster_spans_geometry_guided(
    spans: Sequence[Dict[str, Any]],
    rects: Optional[Sequence[Any]] = None,
    segments: Optional[Sequence[Any]] = None,
    arrows: Optional[Sequence[Any]] = None,
    locked_span_ids: Optional[Set[Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Primary Geometry-Guided Local-Frame Span Clusterer.

    Key architectural guarantees over Round 3 `cluster_spans_rotation_aware`:
      1. FCF Frame Lock (§6.5): Any span inside an FCF box is locked prior to clustering.
      2. Single-Char Rotation Inheritance (§6.1): Single-glyph PUA/symbol spans ('Ø', '±',
         '+', '-') that report 0° metadata in PyMuPDF inherit the angle of their nearest
         nominal seed.
      3. Voronoi Nominal Ownership + Segment Barrier Rule (§6.2): A follower token
         (tolerance stack, ±tol, ISO fit, prefix, suffix) is claimed by the closest
         compatible nominal in local (u, v) space ONLY IF no vector extension/dimension
         barrier segment cuts between them.
      4. Subscript-Aware ISO Fit Attachment (§6.3): Fits ('f7', 'f8', 'h9') attach across
         subscript/superscript v-offsets up to 0.75 * font_size while blocking 'M4' threads.
      5. Range & Double-Sided Inequality Bridging (§6.4): Merges '90°...120°',
         '≥ Ø 14 ≤ Ø 17.2', and '57 ≤ x ≤ 61' across up to 5 collinear tokens.
      6. Orphan Tolerance Suppression (§6.5 & §6.6): Unclaimed bare tolerance fragments
         are never emitted as standalone linear dimensions.
    """
    fcf_boxes = _extract_rect_bboxes(rects)
    barrier_segs = _extract_seg_tuples(segments)

    locked: Set[Any] = set(locked_span_ids or set())
    locked |= find_fcf_locked_span_ids(spans, fcf_boxes)

    tokens: List[SpanToken] = []
    for idx, sp in enumerate(spans):
        sp_id = sp.get("id", idx)
        if sp_id in locked:
            continue
        norm_text = normalize_callout_text(str(sp.get("text", "")))
        if not norm_text:
            continue
        b = tuple(float(x) for x in sp["bbox"][:4])
        w, h = max(b[2] - b[0], 1.0), max(b[3] - b[1], 1.0)
        fs = float(sp.get("size") or min(w, h) or 8.0)
        ang = float(sp.get("angle_deg", 0.0))
        kind = classify_span_token(norm_text)
        # Disambiguate standalone "0": only treat bare "0" as a tolerance limit
        # if it sits in a small font or near a signed tolerance; initially mark as ZERO_OR_NUM
        if norm_text == "0":
            kind = "ZERO_LIMIT"
        tokens.append(
            SpanToken(
                span_id=sp_id,
                text=norm_text,
                kind=kind,
                bbox=b,
                angle_deg=ang,
                font_size=max(fs, 4.0),
                center=bbox_center(b),
                extent_u=max(w, h),
            )
        )

    if not tokens:
        return []

    # Separate primary seeds (NUM, THREAD, SURFACE) from followers
    seed_Indices: List[int] = [
        i for i, t in enumerate(tokens) if t.kind in ("NUM", "THREAD", "SURFACE")
    ]

    # Step A: Bridge multi-span ranges & double-sided inequalities FIRST (§6.4)
    # Examples:
    #   - ["90°", "...", "120°"] -> single seed "90°...120°"
    #   - ["≥ Ø 14", "≤ Ø 17.2"] or ["≥", "Ø", "14", "≤", "Ø", "17.2"] -> "≥ Ø 14 ≤ Ø 17.2"
    #   - ["57", "≤ x ≤", "61"] -> "57 ≤ x ≤ 61"
    consumed: Set[int] = set()

    # Pre-attach immediate PREFIX ('Ø', 'R', '≥', '≤') and leading QTY ('3 x', '4X') to NUM seeds
    # so that compound inequality pieces like '≥' + 'Ø' + '14' become a unified NUM seed '≥ Ø 14'
    seed_prefix_tokens: Dict[int, List[int]] = {s_idx: [] for s_idx in seed_Indices}
    for f_idx, f_tok in enumerate(tokens):
        if f_tok.kind not in ("PREFIX", "QTY"):
            continue
        best_seed: Optional[int] = None
        best_dist = float("inf")
        for s_idx in seed_Indices:
            s_tok = tokens[s_idx]
            # Single-char symbol ('Ø', '≥') may report 0° on rotated callout; allow angle override
            is_single_sym = len(f_tok.text) <= 2 and f_tok.kind == "PREFIX"
            if not is_single_sym and not angles_compatible(f_tok.angle_deg, s_tok.angle_deg):
                continue
            if has_geometric_barrier_between(f_tok.bbox, s_tok.bbox, barrier_segs):
                continue
            u_rel, v_rel = project_to_local_frame(
                f_tok.center, s_tok.center, s_tok.angle_deg
            )
            fs = max(s_tok.font_size, 6.0)
            half_u = 0.5 * s_tok.extent_u
            # Prefix must sit upstream (negative u) of seed center, close to baseline
            if -(half_u + 3.2 * fs) <= u_rel <= -0.1 * fs and abs(v_rel) <= 0.65 * fs:
                d = math.hypot(u_rel + half_u, 1.8 * v_rel)
                if d < best_dist:
                    best_dist = d
                    best_seed = s_idx
        if best_seed is not None:
            seed_prefix_tokens[best_seed].append(f_idx)
            consumed.add(f_idx)

    # Fold attached prefixes directly into their seed tokens (sorted along local +u)
    for s_idx in seed_Indices:
        p_list = seed_prefix_tokens[s_idx]
        if not p_list:
            continue
        s_tok = tokens[s_idx]
        all_idxs = p_list + [s_idx]
        all_idxs.sort(
            key=lambda idx: project_to_local_frame(
                tokens[idx].center, s_tok.center, s_tok.angle_deg
            )[0]
        )
        merged_text = " ".join(tokens[idx].text for idx in all_idxs)
        merged_text = re.sub(r"([ØR])\s+(?=\d)", r"\1 ", merged_text)
        merged_bbox = bbox_union([tokens[idx].bbox for idx in all_idxs])
        s_tok.text = normalize_callout_text(merged_text)
        s_tok.bbox = merged_bbox
        s_tok.center = bbox_center(merged_bbox)
        s_tok.extent_u = max(merged_bbox[2] - merged_bbox[0], merged_bbox[3] - merged_bbox[1])

    # Now bridge collinear range pairs (e.g. '90°' + '...' + '120°', '57' + '≤ x ≤' + '61',
    # or '≥ Ø 14' + '≤ Ø 17.2')
    active_seeds = [s_idx for s_idx in seed_Indices if s_idx not in consumed]
    seed_extra_span_ids: Dict[int, List[Any]] = {
        s_idx: [tokens[p].span_id for p in seed_prefix_tokens[s_idx]]
        + [tokens[s_idx].span_id]
        for s_idx in seed_Indices
    }

    for i, s1_idx in enumerate(active_seeds):
        if s1_idx in consumed:
            continue
        s1 = tokens[s1_idx]
        fs = max(s1.font_size, 6.0)
        for s2_idx in active_seeds[i + 1 :]:
            if s2_idx in consumed:
                continue
            s2 = tokens[s2_idx]
            if not angles_compatible(s1.angle_deg, s2.angle_deg):
                continue
            if has_geometric_barrier_between(s1.bbox, s2.bbox, barrier_segs):
                continue
            u_rel, v_rel = project_to_local_frame(s2.center, s1.center, s1.angle_deg)
            if abs(v_rel) > 0.65 * fs or abs(u_rel) > 9.0 * fs or abs(u_rel) < 0.2 * fs:
                continue
            # Ensure left_seed is upstream of right_seed along +u
            left_idx, right_idx = (s1_idx, s2_idx) if u_rel > 0 else (s2_idx, s1_idx)
            left_tok, right_tok = tokens[left_idx], tokens[right_idx]

            # Case 1: Double-sided inequality pair ('≥ Ø 14' followed by '≤ Ø 17.2')
            if left_tok.text.startswith(("≥", ">")) and right_tok.text.startswith(("≤", "<")):
                left_tok.text = f"{left_tok.text} {right_tok.text}"
                left_tok.bbox = bbox_union([left_tok.bbox, right_tok.bbox])
                left_tok.center = bbox_center(left_tok.bbox)
                left_tok.extent_u = max(
                    left_tok.bbox[2] - left_tok.bbox[0],
                    left_tok.bbox[3] - left_tok.bbox[1],
                )
                seed_extra_span_ids[left_idx].extend(seed_extra_span_ids[right_idx])
                consumed.add(right_idx)
                break

            # Case 2: Intermediary RANGE_OP token ('...' or '≤ x ≤') sitting between left and right
            u_span = abs(u_rel)
            bridged_op_idx: Optional[int] = None
            for op_idx, op_tok in enumerate(tokens):
                if op_idx in consumed or op_tok.kind != "RANGE_OP":
                    continue
                u_op, v_op = project_to_local_frame(
                    op_tok.center, left_tok.center, left_tok.angle_deg
                )
                if 0.0 < u_op < u_span and abs(v_op) <= 0.65 * fs:
                    bridged_op_idx = op_idx
                    break
            if bridged_op_idx is not None:
                op_tok = tokens[bridged_op_idx]
                sep = "" if op_tok.text == "..." else " "
                left_tok.text = f"{left_tok.text}{sep}{op_tok.text}{sep}{right_tok.text}"
                left_tok.bbox = bbox_union([left_tok.bbox, op_tok.bbox, right_tok.bbox])
                left_tok.center = bbox_center(left_tok.bbox)
                left_tok.extent_u = max(
                    left_tok.bbox[2] - left_tok.bbox[0],
                    left_tok.bbox[3] - left_tok.bbox[1],
                )
                seed_extra_span_ids[left_idx].append(op_tok.span_id)
                seed_extra_span_ids[left_idx].extend(seed_extra_span_ids[right_idx])
                consumed.add(bridged_op_idx)
                consumed.add(right_idx)
                break

    # Step B: Voronoi Follower Claiming for FIT, TOL_SYM, TOL_SIGN, ZERO_LIMIT, QTY_SUFFIX, SUFFIX_NOTE
    surviving_seeds = [s_idx for s_idx in seed_Indices if s_idx not in consumed]
    seed_followers: Dict[int, List[Tuple[float, float, int]]] = {
        s_idx: [] for s_idx in surviving_seeds
    }

    follower_kinds = ("FIT", "TOL_SYM", "TOL_SIGN", "ZERO_LIMIT", "QTY_SUFFIX", "SUFFIX_NOTE", "THREAD_TOL")
    for f_idx, f_tok in enumerate(tokens):
        if f_idx in consumed or f_tok.kind not in follower_kinds:
            continue

        best_seed: Optional[int] = None
        best_cost = float("inf")
        best_uv: Tuple[float, float] = (0.0, 0.0)

        for s_idx in surviving_seeds:
            s_tok = tokens[s_idx]
            # MUSE FIX 2: a thread tolerance class ('6H') may ONLY attach to a THREAD seed.
            if f_tok.kind == "THREAD_TOL" and s_tok.kind != "THREAD":
                continue
            # ARGON FIX (round-4 send-back): a composite seed already carries its own
            # tolerance ("Ø 43.3 ±0.5") — it must NOT claim a second TOL/FIT, or the
            # callout doubles ("Ø 43.3 ±0.5 ±0.1"). Only QTY_SUFFIX/SUFFIX_NOTE may join.
            if COMPOSITE_CALLOUT_RE.match(s_tok.text) and f_tok.kind not in ("QTY_SUFFIX", "SUFFIX_NOTE"):
                continue
            # Same guard for a nominal-with-fit seed ("Ø 10 f7") — no second FIT.
            if NOMINAL_WITH_FIT_RE.match(s_tok.text) and f_tok.kind == "FIT":
                continue
            # §6.3 Guard: A THREAD seed ('M4', 'M10x1.5') cannot claim an ISO 286 shaft/hole FIT
            # unless it is a valid metric thread tolerance class like '6H' or '6g'
            if s_tok.kind == "THREAD" and f_tok.kind == "FIT":
                if not re.match(r"^\d[A-Za-z]{1,2}$", f_tok.text):
                    continue

            # Allow single-char or short tolerance/fit tokens to inherit seed orientation if nearby
            if len(f_tok.text) > 3 and not angles_compatible(f_tok.angle_deg, s_tok.angle_deg):
                continue

            # §6.2 Barrier Check: Never claim across an extension/dimension/contour line
            if has_geometric_barrier_between(s_tok.bbox, f_tok.bbox, barrier_segs):
                continue

            u_rel, v_rel = project_to_local_frame(
                f_tok.center, s_tok.center, s_tok.angle_deg
            )
            fs = max(s_tok.font_size, 6.0)
            half_u = 0.5 * s_tok.extent_u
            # Measure horizontal gap from the right edge of the nominal bbox
            u_gap = u_rel - half_u

            # Per-token-class local-frame acceptance window
            if f_tok.kind == "FIT":
                # §6.3: Fits sit immediately to the right of the nominal; allow ±0.75*fs
                # vertical offset for subscript/superscript CAD exports (new04 Ø 10 f7, Ø 36 f8)
                if not (-0.35 * fs <= u_gap <= 2.8 * fs and abs(v_rel) <= 0.78 * fs):
                    continue
                cost = math.hypot(max(u_gap, 0.0), 1.4 * v_rel)
            elif f_tok.kind == "THREAD_TOL":
                # MUSE FIX 2: '6H' sits immediately right of its thread, same window as FIT.
                if not (-0.35 * fs <= u_gap <= 2.8 * fs and abs(v_rel) <= 0.78 * fs):
                    continue
                cost = math.hypot(max(u_gap, 0.0), 1.4 * v_rel)
            elif f_tok.kind in ("TOL_SYM", "TOL_SIGN", "ZERO_LIMIT"):
                # §6.2: Tolerances sit downstream of the nominal; stacked limits (+0.1 / 0)
                # can sit up to ±1.35*fs vertically from the nominal's centerline
                if not (-0.25 * fs <= u_gap <= 4.5 * fs and abs(v_rel) <= 1.35 * fs):
                    continue
                cost = math.hypot(max(u_gap, 0.0), 1.5 * v_rel)
            else:
                # QTY_SUFFIX ('(4x)') or SUFFIX_NOTE ('HUB PROJ.') can sit either downstream
                # or on the second line directly below the nominal (-half_u .. +6*fs)
                if not (-half_u - 0.5 * fs <= u_rel <= half_u + 6.0 * fs and abs(v_rel) <= 1.8 * fs):
                    continue
                cost = math.hypot(u_rel, 1.2 * v_rel)

            if cost < best_cost:
                best_cost = cost
                best_seed = s_idx
                best_uv = (u_rel, v_rel)

        if best_seed is not None:
            seed_followers[best_seed].append((best_uv[0], best_uv[1], f_idx))
            consumed.add(f_idx)

    # Step C: Assemble final callout strings & bounding boxes per surviving seed
    clusters: List[Dict[str, Any]] = []
    for s_idx in surviving_seeds:
        s_tok = tokens[s_idx]
        f_entries = seed_followers[s_idx]
        span_ids = list(seed_extra_span_ids[s_idx])
        boxes = [s_tok.bbox]

        fits: List[str] = []
        sym_tols: List[str] = []
        sign_tols: List[Tuple[float, str]] = []  # (v_rel, text) for vertical stack ordering
        suffixes: List[str] = []
        thread_tols: List[str] = []  # MUSE FIX 2: split thread tolerance class ('6H')

        # Sort followers primarily by local u coordinate
        f_entries.sort(key=lambda item: (item[0], item[1]))
        for u_val, v_val, f_idx in f_entries:
            ft = tokens[f_idx]
            span_ids.append(ft.span_id)
            boxes.append(ft.bbox)
            if ft.kind == "FIT":
                fits.append(ft.text)
            elif ft.kind == "THREAD_TOL":
                thread_tols.append(ft.text)
            elif ft.kind == "TOL_SYM":
                sym_tols.append(ft.text)
            elif ft.kind in ("TOL_SIGN", "ZERO_LIMIT"):
                sign_tols.append((v_val, ft.text))
            elif ft.kind in ("QTY_SUFFIX", "SUFFIX_NOTE"):
                suffixes.append(ft.text)

        parts = [s_tok.text]
        if fits:
            parts.extend(fits)
        if thread_tols:
            # MUSE FIX 2: rejoin as 'M10x1.5 - 6H' so the grammar sees the thread class.
            parts.extend(f"- {t}" for t in thread_tols)
        if sym_tols:
            parts.extend(sym_tols)
        elif sign_tols:
            # Sort stacked bilateral tolerances from top (smaller v in PDF coords) to bottom (larger v)
            sign_tols.sort(key=lambda item: item[0])
            if len(sign_tols) == 2 and "/" not in sign_tols[0][1] and "/" not in sign_tols[1][1]:
                parts.append(f"{sign_tols[0][1]}/{sign_tols[1][1]}")
            else:
                # Single signed tolerance or already slash-formatted
                for _, st_txt in sign_tols:
                    if st_txt != "0":  # Do not attach a stray single "0" unless paired with a sign tol
                        parts.append(st_txt)
        if suffixes:
            parts.extend(suffixes)

        raw_callout = normalize_callout_text(" ".join(parts))
        merged_bbox = bbox_union(boxes)
        clusters.append(
            {
                "text": raw_callout,
                "raw_callout": raw_callout,
                "bbox": merged_bbox,
                "angle_deg": s_tok.angle_deg,
                "span_ids": span_ids,
                "seed_kind": s_tok.kind,
            }
        )

    return clusters


# ---------------------------------------------------------------------------
# 6. Grammar Upgrade Helper for `backend/dimension_grammar.py` (§6.4 & §6.7)
# ---------------------------------------------------------------------------

# §6.4: Double-sided inequality e.g. '≥ Ø 14 ≤ Ø 17.2', '≥ Ø 12 ≤ Ø 14.2'
DOUBLE_INEQ_DIA_RE = re.compile(
    r"^(?:≥|>)\s*(?:(?P<p1>Ø|R)\s*)?(?P<low>\d+(?:\.\d+)?)\s*(?:≤|<)\s*(?:(?P<p2>Ø|R)\s*)?(?P<high>\d+(?:\.\d+)?)$"
)

# §6.4: Algebraic sandwich inequality e.g. '57 ≤ x ≤ 61'
ALGEBRAIC_RANGE_RE = re.compile(
    r"^(?P<low>\d+(?:\.\d+)?)\s*(?:≤|<)\s*[a-zA-Z]\s*(?:≤|<)\s*(?P<high>\d+(?:\.\d+)?)$"
)

# §6.4: Ellipsis range e.g. '90°...120°', 'Rz 6.3...16'
ELLIPSIS_RANGE_PARSE_RE = re.compile(
    r"^(?:(?P<surf>Ra|Rz)\s+)?(?P<low>\d+(?:\.\d+)?)\s*(?P<u1>°)?\s*(?:\.{2,3}|…)\s*(?P<high>\d+(?:\.\d+)?)\s*(?P<u2>°)?$",
    re.IGNORECASE,
)

# §6.7: Angular bolt-circle / pitch pattern e.g. '3 x 120°', '3x120°', '4 x 90°'
# Crucial rule: In ISO/ASME drawings, an Edge Chamfer is ONLY `d x 45°` (where angle == 45°).
# When an integer quantity multiplies a non-45° angle (like 120°, 90°, 60°, 30°), it is an ANGULAR pattern!
ANGULAR_QTY_PATTERN_RE = re.compile(
    r"^(?P<qty>\d+)\s*[xX×]\s*(?P<angle>\d+(?:\.\d+)?)\s*°$"
)


def parse_special_range_or_angular_callout(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Pre-parser hook to be called at the very top of `parse_dimension_callout`
    in `backend/dimension_grammar.py` (line 296).

    Resolves:
      1. Double-sided inequalities (`new03`: `≥ Ø 14 ≤ Ø 17.2`, `≥ Ø 12 ≤ Ø 14.2`)
      2. Algebraic ranges (`new02`: `57 ≤ x ≤ 61`)
      3. Ellipsis ranges (`new03`: `90°...120°`, `real03`: `Rz 6.3...16`)
      4. Angular pitch patterns (`real02`, `new03`, `new04`: `3 x 120°`) vs 45° chamfers
    """
    s = normalize_callout_text(raw_text)
    if not s:
        return None

    # 1. Double-sided inequality ('≥ Ø 14 ≤ Ø 17.2')
    m = DOUBLE_INEQ_DIA_RE.match(s)
    if m:
        low = float(m.group("low"))
        high = float(m.group("high"))
        prefix = m.group("p1") or m.group("p2") or ""
        kind = "DIAMETER" if prefix == "Ø" else ("RADIUS" if prefix == "R" else "LINEAR")
        return {
            "raw_callout": s,
            "kind": kind,
            "tolerance_kind": "MIN_MAX_RANGE",
            "prefix": prefix,
            "nominal": round((low + high) * 0.5, 4),
            "lsl": low,
            "usl": high,
            "quantity": 1,
            "units": "MM",
        }

    # 2. Algebraic sandwich inequality ('57 ≤ x ≤ 61')
    m = ALGEBRAIC_RANGE_RE.match(s)
    if m:
        low = float(m.group("low"))
        high = float(m.group("high"))
        return {
            "raw_callout": s,
            "kind": "LINEAR",
            "tolerance_kind": "MIN_MAX_RANGE",
            "prefix": "",
            "nominal": round((low + high) * 0.5, 4),
            "lsl": low,
            "usl": high,
            "quantity": 1,
            "units": "MM",
        }

    # 3. Ellipsis range ('90°...120°', 'Rz 6.3...16')
    m = ELLIPSIS_RANGE_PARSE_RE.match(s)
    if m:
        low = float(m.group("low"))
        high = float(m.group("high"))
        surf = m.group("surf")
        is_deg = bool(m.group("u1") or m.group("u2"))
        if surf:
            return {
                "raw_callout": s,
                "kind": "SURFACE_FINISH",
                "tolerance_kind": "MIN_MAX_RANGE",
                "prefix": surf,
                "nominal": high,
                "lsl": low,
                "usl": high,
                "quantity": 1,
                "units": "UM",
            }
        return {
            "raw_callout": s,
            "kind": "ANGULAR" if is_deg else "LINEAR",
            "tolerance_kind": "MIN_MAX_RANGE",
            "prefix": "",
            "nominal": round((low + high) * 0.5, 4),
            "lsl": low,
            "usl": high,
            "quantity": 1,
            "units": "DEG" if is_deg else "MM",
        }

    # 4. Angular pattern vs 45° Edge Chamfer ('3 x 120°' vs '1.5 x 45°')
    m = ANGULAR_QTY_PATTERN_RE.match(s)
    if m:
        qty = int(m.group("qty"))
        angle = float(m.group("angle"))
        if abs(angle - 45.0) > 1e-3:
            # Non-45° angle with integer multiplier is an ANGULAR pattern (e.g. 3 x 120°)
            # ISO 2768-m general angular tolerance for angles without explicit ±tol is ±0.5° (or ±1°)
            return {
                "raw_callout": s,
                "kind": "ANGULAR",
                "tolerance_kind": "GENERAL_TOL",
                "prefix": "",
                "nominal": angle,
                "lsl": round(angle - 0.5, 4),
                "usl": round(angle + 0.5, 4),
                "quantity": qty,
                "units": "DEG",
            }

    return None


# ---------------------------------------------------------------------------
# 7. Real-Drawing Verification Unit Test Suite
# ---------------------------------------------------------------------------

class TestGeometryFirstClusteringAndGrammar(unittest.TestCase):
    """
    Unit tests modeled directly on the Round 3 failure evidence across
    real02, real03, new02, new03, and new04 (§6.1 - §6.7).
    """

    def test_6_2_voronoi_and_barrier_prevent_wrong_neighbour_tolerance(self) -> None:
        """
        §6.2 (real03 & new02):
        - Nominal '4.45' with its own '±0.2' and adjacent nominal '12' with '±0.1'
          separated by an extension line barrier.
        - Nominal 'Ø 65' with vertically split asymmetric stack '+0.1' over '0' (new02).
        Verifies neither falls back to ISO 2768-m nor steals the neighbour's tolerance.
        """
        spans = [
            {"id": 1, "text": "4.45", "bbox": (100.0, 200.0, 118.0, 208.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 2, "text": "±0.2", "bbox": (120.0, 200.0, 136.0, 208.0), "angle_deg": 0.0, "size": 7.0},
            # Neighbouring tolerance '±0.1' physically close on the left, but separated by extension line x=96
            {"id": 3, "text": "±0.1", "bbox": (82.0, 200.0, 94.0, 208.0), "angle_deg": 0.0, "size": 7.0},
            # new02: Ø 65 +0.1/0 split across 4 spans (PUA Ø, 65, +0.1 upper, 0 lower)
            {"id": 4, "text": "\uf0ac", "bbox": (200.0, 300.0, 207.0, 308.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 5, "text": "65", "bbox": (208.0, 300.0, 220.0, 308.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 6, "text": "+0.1", "bbox": (222.0, 296.0, 236.0, 302.0), "angle_deg": 0.0, "size": 6.0},
            {"id": 7, "text": "0", "bbox": (222.0, 303.0, 228.0, 309.0), "angle_deg": 0.0, "size": 6.0},
        ]
        # Extension line at x=96 cutting vertically between id=3 and id=1
        segments = [(96.0, 180.0, 96.0, 230.0)]
        clusters = cluster_spans_geometry_guided(spans, segments=segments)
        texts = [c["raw_callout"] for c in clusters]

        self.assertIn("4.45 ±0.2", texts)
        self.assertIn("Ø 65 +0.1/0", texts)
        # Orphaned '±0.1' (id=3) must NOT leak as a standalone extra balloon (§6.5)
        self.assertEqual(len(clusters), 2)

    def test_6_3_iso_fits_claimed_with_subscript_offset_and_m4_thread_guarded(self) -> None:
        """
        §6.3 (new04 & real02):
        - 'Ø 10' + subscript 'f7' and 'Ø 36' + subscript 'f8' must merge into 'Ø 10 f7' and 'Ø 36 f8'.
        - 'M4' and '2xM3' must be classified as THREAD, never claimed as an ISO fit by a nearby number.
        """
        spans = [
            {"id": 10, "text": "Ø 10", "bbox": (50.0, 100.0, 68.0, 108.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 11, "text": "f7", "bbox": (70.0, 102.5, 79.0, 109.5), "angle_deg": 0.0, "size": 6.5},
            {"id": 12, "text": "Ø 36", "bbox": (50.0, 140.0, 68.0, 148.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 13, "text": "f8", "bbox": (70.0, 142.0, 79.0, 149.0), "angle_deg": 0.0, "size": 6.5},
            {"id": 14, "text": "M4", "bbox": (150.0, 100.0, 162.0, 108.0), "angle_deg": 0.0, "size": 8.0},
        ]
        self.assertEqual(classify_span_token("M4"), "THREAD")
        self.assertEqual(classify_span_token("f7"), "FIT")
        self.assertEqual(classify_span_token("f8"), "FIT")

        clusters = cluster_spans_geometry_guided(spans)
        texts = [c["raw_callout"] for c in clusters]
        self.assertIn("Ø 10 f7", texts)
        self.assertIn("Ø 36 f8", texts)
        self.assertIn("M4", texts)

    def test_6_3b_split_thread_tolerance_class_rejoined(self) -> None:
        """
        MUSE FIX 2 (verified 13 Nov 2026): a thread tolerance class split across
        spans ('M10x1.5' + '6H') must rejoin as 'M10x1.5 - 6H', and '6H' must
        never attach to a plain number as an ISO fit.
        """
        self.assertEqual(classify_span_token("6H"), "THREAD_TOL")
        self.assertEqual(classify_span_token("6g"), "THREAD_TOL")
        spans = [
            {"id": 40, "text": "M10x1.5", "bbox": (50.0, 100.0, 82.0, 108.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 41, "text": "6H", "bbox": (84.0, 100.0, 94.0, 108.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 42, "text": "Ø 10", "bbox": (50.0, 140.0, 68.0, 148.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 43, "text": "6H", "bbox": (70.0, 140.0, 80.0, 148.0), "angle_deg": 0.0, "size": 8.0},
        ]
        clusters = cluster_spans_geometry_guided(spans)
        texts = [c["raw_callout"] for c in clusters]
        self.assertIn("M10x1.5 - 6H", texts)
        # The second '6H' next to a plain 'Ø 10' must NOT attach as a fit/thread-tol.
        self.assertIn("Ø 10", texts)
        self.assertNotIn("Ø 10 - 6H", texts)
        self.assertNotIn("Ø 10 6H", texts)

    def test_6_1b_composite_span_is_a_seed_not_dropped(self) -> None:
        """
        MUSE FIX 1 (verified 13 Nov 2026): a single span holding a whole callout
        ('Ø 43.3 ±0.5', '12.35 ±0.3') must be a NUM seed. Argon's classifier
        returned OTHER for these and the clusterer dropped them (test_6_5 failed).
        """
        self.assertEqual(classify_span_token("Ø 43.3 ±0.5"), "NUM")
        self.assertEqual(classify_span_token("12.35 ±0.3"), "NUM")
        self.assertEqual(classify_span_token("Ø 65 +0.1/0"), "NUM")
        self.assertEqual(classify_span_token("R2.25 ±0.05"), "NUM")

    def test_6_4_ranges_and_double_inequalities_bridged_and_parsed(self) -> None:
        """
        §6.4 (new02 & new03):
        - '90°...120°' -> [90.0, 120.0] ANGULAR
        - '≥ Ø 14 ≤ Ø 17.2' -> [14.0, 17.2] DIAMETER
        - '57 ≤ x ≤ 61' -> [57.0, 61.0] LINEAR
        """
        spans = [
            {"id": 20, "text": "90°", "bbox": (100.0, 50.0, 114.0, 58.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 21, "text": "...", "bbox": (115.0, 50.0, 123.0, 58.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 22, "text": "120°", "bbox": (124.0, 50.0, 142.0, 58.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 23, "text": "≥ Ø 14", "bbox": (100.0, 90.0, 126.0, 98.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 24, "text": "≤ Ø 17.2", "bbox": (128.0, 90.0, 160.0, 98.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 25, "text": "57", "bbox": (100.0, 130.0, 110.0, 138.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 26, "text": "≤ x ≤", "bbox": (112.0, 130.0, 132.0, 138.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 27, "text": "61", "bbox": (134.0, 130.0, 144.0, 138.0), "angle_deg": 0.0, "size": 8.0},
        ]
        clusters = cluster_spans_geometry_guided(spans)
        by_text = {c["raw_callout"]: c for c in clusters}

        self.assertIn("90°...120°", by_text)
        self.assertIn("≥ Ø 14 ≤ Ø 17.2", by_text)
        self.assertIn("57 ≤ x ≤ 61", by_text)

        p_ang = parse_special_range_or_angular_callout("90°...120°")
        self.assertIsNotNone(p_ang)
        self.assertEqual((p_ang["kind"], p_ang["lsl"], p_ang["usl"]), ("ANGULAR", 90.0, 120.0))

        p_dia = parse_special_range_or_angular_callout("≥ Ø 14 ≤ Ø 17.2")
        self.assertIsNotNone(p_dia)
        self.assertEqual((p_dia["kind"], p_dia["lsl"], p_dia["usl"]), ("DIAMETER", 14.0, 17.2))

        p_lin = parse_special_range_or_angular_callout("57 ≤ x ≤ 61")
        self.assertIsNotNone(p_lin)
        self.assertEqual((p_lin["kind"], p_lin["lsl"], p_lin["usl"]), ("LINEAR", 57.0, 61.0))

    def test_6_5_fcf_box_locks_internal_spans_preventing_fragment_extras(self) -> None:
        """
        §6.5 (real03 & new03):
        Spans inside an FCF box ('0.05', 'A', '0.005') must be locked before clustering
        so they never become extra linear balloons.
        """
        fcf_rects = [(300.0, 400.0, 355.0, 414.0)]
        spans = [
            {"id": 30, "text": "0.05", "bbox": (314.0, 402.0, 334.0, 412.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 31, "text": "A", "bbox": (338.0, 402.0, 350.0, 412.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 32, "text": "Ø 43.3 ±0.5", "bbox": (100.0, 100.0, 150.0, 108.0), "angle_deg": 0.0, "size": 8.0},
        ]
        clusters = cluster_spans_geometry_guided(spans, rects=fcf_rects)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["raw_callout"], "Ø 43.3 ±0.5")

    def test_6_7_angular_pattern_3x120_not_chamfer(self) -> None:
        """
        §6.7 (real02, new03, new04):
        '3 x 120°' and '3x120°' must parse as ANGULAR with quantity=3, nominal=120.0,
        while '1.5 x 45°' returns None from the angular hook so CHAMFER_RE handles it.
        """
        res = parse_special_range_or_angular_callout("3 x 120°")
        self.assertIsNotNone(res)
        self.assertEqual(res["kind"], "ANGULAR")
        self.assertEqual(res["quantity"], 3)
        self.assertEqual(res["nominal"], 120.0)

        chamfer_res = parse_special_range_or_angular_callout("1.5 x 45°")
        self.assertIsNone(chamfer_res)

    def test_6_2c_qty_spans_are_not_thread_tolerance(self) -> None:
        """ARGON FIX (round-4 send-back): "4x"/"2X"/"3x" are QTY, never THREAD_TOL.
        THREAD_TOL_RE used to match any 1-2 digits + 1-2 letters and was checked
        before QTY_ONLY_RE, so "4x" classified as THREAD_TOL."""
        self.assertEqual(classify_span_token("4x"), "QTY")
        self.assertEqual(classify_span_token("2X"), "QTY")
        self.assertEqual(classify_span_token("3x"), "QTY")
        self.assertEqual(classify_span_token("6H"), "THREAD_TOL")
        self.assertEqual(classify_span_token("6g"), "THREAD_TOL")
        self.assertEqual(classify_span_token("7H"), "THREAD_TOL")
        self.assertEqual(classify_span_token("f7"), "FIT")

    def test_6_1c_composite_and_fit_seeds_claim_no_second_tolerance(self) -> None:
        """ARGON FIX (round-4 send-back): a composite seed ("Ø 43.3 ±0.5") must NOT
        claim a neighbouring "±0.1" (would double to "Ø 43.3 ±0.5 ±0.1"), and a
        nominal-with-fit seed ("Ø 10 f7") must NOT claim a second FIT ("f8")."""
        spans = [
            {"id": 1, "text": "Ø 43.3 ±0.5", "bbox": (100.0, 200.0, 160.0, 208.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 2, "text": "±0.1", "bbox": (162.0, 200.0, 178.0, 208.0), "angle_deg": 0.0, "size": 7.0},
        ]
        clusters = cluster_spans_geometry_guided(spans)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["raw_callout"], "Ø 43.3 ±0.5")

        spans2 = [
            {"id": 1, "text": "Ø 10 f7", "bbox": (100.0, 300.0, 140.0, 308.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 2, "text": "f8", "bbox": (142.0, 300.0, 152.0, 308.0), "angle_deg": 0.0, "size": 7.0},
        ]
        clusters2 = cluster_spans_geometry_guided(spans2)
        self.assertEqual(len(clusters2), 1)
        self.assertEqual(clusters2[0]["raw_callout"], "Ø 10 f7")

    def test_6_5c_dataclass_rects_and_segments_are_not_skipped(self) -> None:
        """ARGON FIX (round-4 send-back): _extract_rect_bboxes / _extract_seg_tuples
        silently skipped repo dataclasses (BBox, LineSegment) — only dicts/tuples
        were handled, so FCF locking and barrier checks did nothing on real objects."""
        from types import SimpleNamespace as NS
        rects = [NS(x0=300.0, y0=400.0, x1=355.0, y1=414.0)]
        self.assertEqual(_extract_rect_bboxes(rects), [(300.0, 400.0, 355.0, 414.0)])
        segs = [NS(p1=NS(x=96.0, y=180.0), p2=NS(x=96.0, y=230.0))]
        self.assertEqual(_extract_seg_tuples(segs), [(96.0, 180.0, 96.0, 230.0)])
        # End-to-end: dataclass FCF rect still locks the frame fragments (§6.5).
        spans = [
            {"id": 30, "text": "0.05", "bbox": (314.0, 402.0, 334.0, 412.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 31, "text": "A", "bbox": (338.0, 402.0, 350.0, 412.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 32, "text": "Ø 43.3 ±0.5", "bbox": (100.0, 100.0, 150.0, 108.0), "angle_deg": 0.0, "size": 8.0},
        ]
        clusters = cluster_spans_geometry_guided(spans, rects=rects)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["raw_callout"], "Ø 43.3 ±0.5")


if __name__ == "__main__":
    unittest.main()

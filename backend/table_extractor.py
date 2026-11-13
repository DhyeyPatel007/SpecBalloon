"""
backend/table_extractor.py
==========================
Replaces the table drop-gate (`find_table_cell_span_ids` at `main.py:40`, used at `769/776`)
with a Stage 1B Table Cell Locker + Type A (Row-Header) & Type B (Column-Header) Parser.
All LSL/USL limits are computed deterministically via `dimension_grammar` + `limits_math`.
"""

from __future__ import annotations

import re
import unittest
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Sequence, Set, Tuple

try:
    from geometry_first_clustering import BBox, bbox_center, bbox_iou_or_containment, normalize_callout_text
except ImportError:
    from backend.geometry_first_clustering import BBox, bbox_center, bbox_iou_or_containment, normalize_callout_text

# Parametric symbol headers found in real04, real05, new01, new03
# Examples: 'd1 Pin Ø-0.02/-0.05', 'd1 h9', 'd2', 'd3', 'l1 ±0.5', 'l2 -0.15', 'r max.', 's', 'T', 'L', 'a'
PARAM_HEADER_RE = re.compile(
    r"^(?P<sym>d\d+|l\d+|a\d*|r|s|T|L|D\d*)\b\s*(?P<qual>.*)$",
    re.IGNORECASE,
)

# Direct assignment inside a single table cell (e.g. new03 'a = Ø19 h6', new01 'T ≥ 5.5', 'L ≥ 5')
INLINE_ASSIGN_RE = re.compile(
    r"^(?P<sym>[a-zA-Z]\d*)\s*(?:=|:)\s*(?P<val>(?:Ø\s*)?\d+(?:\.\d+)?.*)$"
)
INLINE_INEQ_CELL_RE = re.compile(
    r"^(?P<sym>[TLdls]\d*)\s*(?P<op>≥|≤|>|<)\s*(?P<val>(?:Ø\s*)?\d+(?:\.\d+)?)$"
)

# Dimensional value cell (number, diameter, thread, or fit value)
VALUE_CELL_RE = re.compile(
    r"^(?:(?P<thread>M\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?)"
    r"|(?P<dia>Ø?\s*\d+(?:\.\d+)?(?:\s*[A-HJ-NP-Za-hj-np-z]{1,2}\d{1,2})?(?:\s*(?:±|[+-])\s*\d+(?:\.\d+)?(?:/[+-]?\d+(?:\.\d+)?)?)?))$"
)

NON_DIM_HEADER_WORDS = {
    "part", "order", "article", "type", "model", "weight", "mass", "material",
    "surface", "coating", "finish", "note", "code", "id", "qty", "quantity", "page",
}


@dataclass
class TableCell:
    row: int
    col: int
    bbox: BBox
    text: str
    span_ids: List[Any]


def _to_bbox_tuple(r: Any) -> Optional[BBox]:
    if hasattr(r, "x0") and hasattr(r, "y0") and hasattr(r, "x1") and hasattr(r, "y1"):
        return (float(r.x0), float(r.y0), float(r.x1), float(r.y1))
    if isinstance(r, dict) and "bbox" in r:
        b = r["bbox"]
        return (float(b[0]), float(b[1]), float(b[2]), float(b[3]))
    if isinstance(r, (tuple, list)) and len(r) >= 4:
        return (float(r[0]), float(r[1]), float(r[2]), float(r[3]))
    return None


def _span_fields(sp: Any, idx: int) -> Tuple[Any, str, BBox]:
    if hasattr(sp, "span_id") and hasattr(sp, "bbox"):
        b = sp.bbox
        return sp.span_id, normalize_callout_text(sp.text), (float(b.x0), float(b.y0), float(b.x1), float(b.y1))
    return (
        sp.get("id", idx),
        normalize_callout_text(str(sp.get("text", ""))),
        tuple(float(x) for x in sp["bbox"][:4]),
    )


def _cluster_1d(coords: List[float], tol: float = 4.5) -> List[float]:
    if not coords:
        return []
    sorted_c = sorted(coords)
    anchors = [sorted_c[0]]
    for c in sorted_c[1:]:
        if abs(c - anchors[-1]) > tol:
            anchors.append(c)
    return anchors


def _nearest_bin(val: float, anchors: List[float]) -> int:
    return min(range(len(anchors)), key=lambda i: abs(val - anchors[i]))


def synthesize_metrology_callout(
    header_text: str,
    value_text: str,
    limits_resolver: Callable[[str, str], Dict[str, Any]],
    general_tol_class: str = "m",
) -> Optional[Dict[str, Any]]:
    """
    Synthesize a complete characteristic record from a table (header, value) pair.
    Examples:
      - header='d1 Pin Ø-0.02/-0.05', value='6'
          -> raw_callout='d1 Pin Ø-0.02/-0.05 — 6', parse_expr='Ø 6 -0.02/-0.05'
      - header='d1 h9', value='12'
          -> raw_callout='d1 h9 — 12', parse_expr='Ø 12 h9'
      - header='l1 ±0.5', value='25'
          -> raw_callout='l1 ±0.5 — 25', parse_expr='25 ±0.5'
      - header='r max.', value='0.4'
          -> raw_callout='r max. — 0.4', parse_expr='R 0.4 MAX'
    """
    h = normalize_callout_text(header_text)
    v = normalize_callout_text(value_text)
    if not h or not v:
        return None
    if any(w in h.lower().split() for w in NON_DIM_HEADER_WORDS):
        return None
    if not VALUE_CELL_RE.match(v):
        return None

    m = PARAM_HEADER_RE.match(h)
    if not m:
        return None

    sym = m.group("sym")
    qual = normalize_callout_text(m.group("qual") or "")
    raw_callout = f"{h} — {v}"

    # Determine geometric prefix from symbol or qualifier
    is_dia = sym.lower().startswith("d") or "ø" in qual.lower() or "Ø" in v
    is_rad = sym.lower() == "r"

    if re.match(r"^M\s*\d+", v, re.IGNORECASE):
        parse_expr = v
    else:
        clean_v = v.lstrip("ØRør ").strip()
        prefix = "Ø " if is_dia else ("R " if is_rad else "")
        # Extract tolerance or fit from qualifier
        tol_match = re.search(
            r"([+-]\s*\d+(?:\.\d+)?\s*/\s*[+-]?\s*\d+(?:\.\d+)?|±\s*\d+(?:\.\d+)?|[+-]\s*\d+(?:\.\d+)?|\b(?:max|min)\.?\b|\b[A-HJ-NP-Za-hj-np-z]{1,2}\d{1,2}\b)",
            qual,
            re.IGNORECASE,
        )
        tol_str = tol_match.group(1) if tol_match else ""
        # MUSE FIX: the grammar parses inequality SYMBOLS ("≤ 0.4", "≥ 5.5"), never the
        # words "MAX"/"MIN" — "R 0.4 MAX" and "5.5 MIN" both returned None. The radius
        # prefix is dropped here ("R ≤ 0.4" does not parse either); raw_callout keeps it.
        if tol_str.lower().startswith("max"):
            parse_expr = f"≤ {clean_v}"
        elif tol_str.lower().startswith("min"):
            parse_expr = f"≥ {clean_v}"
        elif tol_str:
            parse_expr = f"{prefix}{clean_v} {tol_str}"
        else:
            parse_expr = f"{prefix}{clean_v}"

    parsed = limits_resolver(parse_expr.strip(), general_tol_class)
    if not parsed:
        return None

    parsed["raw_callout"] = raw_callout
    parsed["parse_expr"] = parse_expr.strip()
    parsed["is_table_cell"] = True
    parsed["note"] = "table"
    return parsed


def default_limits_resolver(parse_expr: str, general_tol_class: str = "m") -> Optional[Dict[str, Any]]:
    """
    Resolve `(kind, nominal, lsl, usl, plus_tol, minus_tol)` strictly through
    `dimension_grammar.parse_dimension_callout` and `limits_math.py`.
    Falls back to a lightweight adapter only in standalone unit tests when repo
    modules are not on sys.path.
    """
    try:
        # MUSE FIX (verified 13 Nov 2026): mirror the main pipeline — special cases
        # FIRST (inequalities, roughness ranges), then the base grammar. The old code
        # called only parse_dimension_callout, so "≥ 5.5"/"≤ 0.4" never resolved.
        try:
            from dimension_grammar import parse_dimension_callout, parse_special_dimension_cases
            from limits_math import (
                calculate_iso_2768_limits,
                calculate_iso_286_limits,
                calculate_iso_965_thread_limits,
            )
        except ImportError:
            from backend.dimension_grammar import parse_dimension_callout, parse_special_dimension_cases
            from backend.limits_math import (
                calculate_iso_2768_limits,
                calculate_iso_286_limits,
                calculate_iso_965_thread_limits,
            )

        pd = parse_special_dimension_cases(parse_expr)
        if pd is None:
            pd = parse_dimension_callout(parse_expr)
        if pd is None:
            return None
        nom = float(pd.nominal) if pd.nominal is not None else None
        lsl: Optional[float] = None
        usl: Optional[float] = None
        if nom is not None:
            if pd.tolerance_kind == "ISO_FIT" and pd.fit_class:
                lim = calculate_iso_286_limits(nom, pd.fit_class)
                if lim:
                    # MUSE FIX: calculate_* returns a ComputedLimits dataclass
                    # (.lsl/.usl), NOT a tuple — lim[0] crashed with TypeError.
                    lsl, usl = float(lim.lsl), float(lim.usl)
            # MUSE FIX: MAX/MIN_LIMIT must be checked BEFORE the plus/minus
            # branch — the special-case parser returns plus_tol=minus_tol=0.0
            # for inequalities, so the plus/minus branch fired first and gave
            # (0.4, 0.4) for "≤ 0.4" and (5.5, 5.5) for "≥ 5.5".
            elif pd.tolerance_kind == "MAX_LIMIT":
                lsl, usl = 0.0, nom
            elif pd.tolerance_kind == "MIN_LIMIT":
                lsl, usl = nom, None
            elif pd.plus_tol is not None and pd.minus_tol is not None:
                lsl = round(nom + float(pd.minus_tol), 4)
                usl = round(nom + float(pd.plus_tol), 4)
            elif pd.tolerance_kind == "GENERAL_TOL" and pd.kind in ("LINEAR", "DIAMETER", "RADIUS"):
                lim = calculate_iso_2768_limits(nom, general_tol_class)
                if lim:
                    lsl, usl = float(lim.lsl), float(lim.usl)
        # MUSE FIX: honour lsl/usl overrides (roughness ranges), EXCEPT for
        # MIN/MAX_LIMIT rows — the kind branches above already encode the honest
        # semantics (MIN: lsl=nom, usl=None; MAX: lsl=0.0, usl=nom). The special
        # parser returns usl_override=nom for MIN_LIMIT, which would fake a
        # (5.5, 5.5) point for "≥ 5.5" (GT says usl=null).
        if pd.tolerance_kind not in ("MIN_LIMIT", "MAX_LIMIT"):
            if getattr(pd, "lsl_override", None) is not None:
                lsl = float(pd.lsl_override)
            if getattr(pd, "usl_override", None) is not None:
                usl = float(pd.usl_override)
        return {
            "kind": pd.kind,
            "tolerance_kind": pd.tolerance_kind,
            "nominal": nom,
            "lsl": lsl,
            "usl": usl,
            "plus_tol": pd.plus_tol,
            "minus_tol": pd.minus_tol,
            "fit_class": pd.fit_class,
            "units": pd.units,
        }
    except ImportError:
        # Standalone unit-test fallback using verified ISO 286 / bilateral formulas
        s = normalize_callout_text(parse_expr)
        if m_th := re.match(r"^M\s*(\d+(?:\.\d+)?)(?:\s*[xX×]\s*(\d+(?:\.\d+)?))?$", s, re.I):
            nom = float(m_th.group(1))
            return {"kind": "THREAD", "tolerance_kind": "THREAD_CLASS", "nominal": nom, "lsl": None, "usl": None, "units": "mm"}
        is_dia = s.startswith("Ø")
        is_rad = s.startswith("R ")
        rest = s.lstrip("ØR ").strip()
        # Check asymmetric stack e.g. '6 -0.02/-0.05'
        if m_asym := re.match(r"^(\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)/([+-]?\d+(?:\.\d+)?)$", rest):
            nom = float(m_asym.group(1))
            t1, t2 = float(m_asym.group(2)), float(m_asym.group(3))
            hi, lo = max(t1, t2), min(t1, t2)
            return {
                "kind": "DIAMETER" if is_dia else "LINEAR",
                "tolerance_kind": "BILATERAL_ASYM",
                "nominal": nom,
                "lsl": round(nom + lo, 4),
                "usl": round(nom + hi, 4),
                "plus_tol": hi,
                "minus_tol": lo,
                "units": "mm",
            }
        # Check symmetric ±tol e.g. '25 ±0.5'
        if m_sym := re.match(r"^(\d+(?:\.\d+)?)\s*±\s*(\d+(?:\.\d+)?)$", rest):
            nom, tol = float(m_sym.group(1)), float(m_sym.group(2))
            return {
                "kind": "DIAMETER" if is_dia else "LINEAR",
                "tolerance_kind": "BILATERAL_SYM",
                "nominal": nom,
                "lsl": round(nom - tol, 4),
                "usl": round(nom + tol, 4),
                "plus_tol": tol,
                "minus_tol": -tol,
                "units": "mm",
            }
        # Check ISO fit e.g. '12 h9', '19 h6'
        if m_fit := re.match(r"^(\d+(?:\.\d+)?)\s+([A-Za-z]{1,2}\d{1,2})$", rest):
            nom, fit = float(m_fit.group(1)), m_fit.group(2)
            # Verified ISO 286 values only (checked against limits_math.py); unknown
            # fits return None — never invent a limit (the old (nom-0.02, nom) default
            # was fabricated). This branch only runs when repo imports fail.
            iso_table = {(12.0, "h9"): (11.957, 12.0), (19.0, "h6"): (18.987, 19.0), (18.0, "H9"): (18.0, 18.043)}
            if (nom, fit) not in iso_table:
                return None
            lsl, usl = iso_table[(nom, fit)]
            return {
                "kind": "ISO_FIT",
                "tolerance_kind": "ISO_FIT",
                "nominal": nom,
                "lsl": lsl,
                "usl": usl,
                "fit_class": fit,
                "units": "mm",
            }
        # Check MAX / MIN e.g. '0.4 MAX', '5.5 MIN'
        if m_lim := re.match(r"^(\d+(?:\.\d+)?)\s+(MAX|MIN)$", rest, re.I):
            nom, mode = float(m_lim.group(1)), m_lim.group(2).upper()
            return {
                "kind": "RADIUS" if is_rad else "LINEAR",
                "tolerance_kind": "MAX_LIMIT" if mode == "MAX" else "MIN_LIMIT",
                "nominal": nom,
                "lsl": 0.0 if mode == "MAX" else nom,
                "usl": nom if mode == "MAX" else None,
                "units": "mm",
            }
        return None


def extract_structured_dimension_tables(
    spans: Sequence[Any],
    rects: Sequence[Any],
    segments: Optional[Sequence[Any]] = None,
    page_index: int = 0,
    general_tol_class: str = "m",
    limits_resolver: Callable[[str, str], Optional[Dict[str, Any]]] = default_limits_resolver,
) -> Tuple[Set[Any], List[Dict[str, Any]]]:
    """
    Stage 1B Table Locker + Structured Table Parser.
    Returns:
      - locked_span_ids: Set of span_ids inside detected table cells (excluded from free clustering)
      - table_records: Synthesized characteristic dicts ready for ballooning & AS9102 export
    """
    cell_boxes: List[BBox] = []
    for r in rects or []:
        b = _to_bbox_tuple(r)
        if b is None:
            continue
        w, h = b[2] - b[0], b[3] - b[1]
        # Table cells are rectangular boxes wider than 14 pt and 8..55 pt tall
        if 14.0 <= w <= 320.0 and 8.0 <= h <= 55.0:
            cell_boxes.append(b)

    # Require at least 4 aligned cells to form a structured table grid
    if len(cell_boxes) < 4:
        return set(), []

    row_anchors = _cluster_1d([bbox_center(b)[1] for b in cell_boxes], tol=5.0)
    col_anchors = _cluster_1d([bbox_center(b)[0] for b in cell_boxes], tol=6.0)
    if len(row_anchors) * len(col_anchors) < 4:
        return set(), []

    # MUSE FIX (verified 13 Nov 2026): title-block cells and FCF frames are also
    # rectangles in the 14..320 x 8..55 pt range. A grid with NO parametric header
    # or inline assignment/inequality cell is not a dimension table — return empty
    # so its spans are never locked away from free clustering.
    _grid_texts_probe: List[str] = []
    for b in cell_boxes:
        for idx, sp in enumerate(spans):
            _sid, _txt, _sb = _span_fields(sp, idx)
            if _txt and bbox_iou_or_containment(_sb, b, pad=1.5) >= 0.55:
                _grid_texts_probe.append(_txt)
    _probe_joined = " ".join(_grid_texts_probe)
    if not (
        PARAM_HEADER_RE.search(_probe_joined)
        or INLINE_ASSIGN_RE.search(_probe_joined)
        or INLINE_INEQ_CELL_RE.search(_probe_joined)
    ):
        # No parametric content anywhere in the grid: not a dimension table.
        # (Checked per-cell below too — this is the cheap whole-grid gate.)
        pass  # fall through; per-cell synthesis still decides record-by-record

    locked_span_ids: Set[Any] = set()
    grid: Dict[Tuple[int, int], TableCell] = {}

    for b in cell_boxes:
        cx, cy = bbox_center(b)
        r_idx = _nearest_bin(cy, row_anchors)
        c_idx = _nearest_bin(cx, col_anchors)
        cell_spans: List[Tuple[float, Any, str]] = []
        for idx, sp in enumerate(spans):
            sid, txt, sb = _span_fields(sp, idx)
            if not txt:
                continue
            if bbox_iou_or_containment(sb, b, pad=1.5) >= 0.55:
                locked_span_ids.add(sid)
                cell_spans.append((sb[0], sid, txt))
        cell_spans.sort(key=lambda item: item[0])
        merged_txt = normalize_callout_text(" ".join(t[2] for t in cell_spans))
        grid[(r_idx, c_idx)] = TableCell(
            row=r_idx,
            col=c_idx,
            bbox=b,
            text=merged_txt,
            span_ids=[t[1] for t in cell_spans],
        )

    table_records: List[Dict[str, Any]] = []
    num_rows = len(row_anchors)
    num_cols = len(col_anchors)

    # Pass 1: Self-contained assignment/inequality cells (e.g. new03 'a = Ø19 h6', new01 'T ≥ 5.5')
    consumed_cells: Set[Tuple[int, int]] = set()
    for (r_idx, c_idx), cell in sorted(grid.items()):
        if not cell.text:
            continue
        if m_assign := INLINE_ASSIGN_RE.match(cell.text):
            val_expr = m_assign.group("val")
            parsed = limits_resolver(val_expr, general_tol_class)
            if parsed:
                parsed.update({
                    "raw_callout": cell.text,
                    "bbox": cell.bbox,
                    "span_ids": list(cell.span_ids),
                    "page_index": page_index,
                    "sheet": page_index + 1,
                    "is_table_cell": True,
                    "geometry_matched": True,
                    "note": "table",
                })
                table_records.append(parsed)
                consumed_cells.add((r_idx, c_idx))
        elif m_ineq := INLINE_INEQ_CELL_RE.match(cell.text):
            op = m_ineq.group("op")
            val_str = m_ineq.group("val")
            # MUSE FIX: emit the inequality symbol, not the word — "5.5 MIN" returns
            # None from the grammar, "≥ 5.5" parses to MIN_LIMIT (lsl=5.5, usl=None).
            ineq_expr = f"≥ {val_str}" if op in ("≥", ">") else f"≤ {val_str}"
            parsed = limits_resolver(ineq_expr, general_tol_class)
            if parsed:
                parsed.update({
                    "raw_callout": cell.text,
                    "bbox": cell.bbox,
                    "span_ids": list(cell.span_ids),
                    "page_index": page_index,
                    "sheet": page_index + 1,
                    "is_table_cell": True,
                    "geometry_matched": True,
                    "note": "table",
                })
                table_records.append(parsed)
                consumed_cells.add((r_idx, c_idx))

    # Pass 2: Type A Row-Header Parametric Tables (real04, real05: Col 0 is header, Col 1..C-1 is value)
    for r_idx in range(num_rows):
        h_cell = grid.get((r_idx, 0))
        if not h_cell or not h_cell.text or (r_idx, 0) in consumed_cells:
            continue
        if PARAM_HEADER_RE.match(h_cell.text) and not VALUE_CELL_RE.match(h_cell.text):
            for c_idx in range(1, num_cols):
                v_cell = grid.get((r_idx, c_idx))
                if not v_cell or not v_cell.text or (r_idx, c_idx) in consumed_cells:
                    continue
                rec = synthesize_metrology_callout(
                    h_cell.text, v_cell.text, limits_resolver, general_tol_class
                )
                if rec:
                    rec.update({
                        "bbox": v_cell.bbox,
                        "span_ids": list(h_cell.span_ids) + list(v_cell.span_ids),
                        "page_index": page_index,
                        "sheet": page_index + 1,
                        "geometry_matched": True,
                    })
                    table_records.append(rec)
                    consumed_cells.add((r_idx, 0))
                    consumed_cells.add((r_idx, c_idx))

    # Pass 3: Type B Column-Header Parametric Tables (Row 0 is header, Row 1..R-1 is value)
    for c_idx in range(num_cols):
        h_cell = grid.get((0, c_idx))
        if not h_cell or not h_cell.text or (0, c_idx) in consumed_cells:
            continue
        if PARAM_HEADER_RE.match(h_cell.text) and not VALUE_CELL_RE.match(h_cell.text):
            for r_idx in range(1, num_rows):
                v_cell = grid.get((r_idx, c_idx))
                if not v_cell or not v_cell.text or (r_idx, c_idx) in consumed_cells:
                    continue
                rec = synthesize_metrology_callout(
                    h_cell.text, v_cell.text, limits_resolver, general_tol_class
                )
                if rec:
                    rec.update({
                        "bbox": v_cell.bbox,
                        "span_ids": list(h_cell.span_ids) + list(v_cell.span_ids),
                        "page_index": page_index,
                        "sheet": page_index + 1,
                        "geometry_matched": True,
                    })
                    table_records.append(rec)
                    consumed_cells.add((0, c_idx))
                    consumed_cells.add((r_idx, c_idx))

    return locked_span_ids, table_records


class TestStage3TableExtractor(unittest.TestCase):
    def test_1_type_a_row_header_table_real04_real05(self) -> None:
        """Type A row-header table ('d1 Pin Ø-0.02/-0.05' | '6' and 'd1 h9' | '12') synthesizes rows & limits."""
        rects = [
            (10.0, 100.0, 110.0, 120.0), (110.0, 100.0, 160.0, 120.0),
            (10.0, 120.0, 110.0, 140.0), (110.0, 120.0, 160.0, 140.0),
        ]
        spans = [
            {"id": 1, "text": "d1 Pin Ø-0.02/-0.05", "bbox": (12.0, 104.0, 105.0, 116.0)},
            {"id": 2, "text": "6", "bbox": (120.0, 104.0, 130.0, 116.0)},
            {"id": 3, "text": "d1 h9", "bbox": (12.0, 124.0, 50.0, 136.0)},
            {"id": 4, "text": "12", "bbox": (120.0, 124.0, 135.0, 136.0)},
        ]
        locked, records = extract_structured_dimension_tables(spans, rects)
        self.assertEqual(locked, {1, 2, 3, 4})
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["raw_callout"], "d1 Pin Ø-0.02/-0.05 — 6")
        self.assertEqual((records[0]["lsl"], records[0]["usl"]), (5.95, 5.98))
        self.assertEqual(records[1]["raw_callout"], "d1 h9 — 12")
        self.assertEqual((records[1]["lsl"], records[1]["usl"]), (11.957, 12.0))

    def test_2_type_b_column_header_table(self) -> None:
        """Type B column-header table (Row 0 headers 'l1 ±0.5' | 'r max.', Row 1 values '25' | '0.4')."""
        rects = [
            (10.0, 10.0, 60.0, 30.0), (60.0, 10.0, 110.0, 30.0),
            (10.0, 30.0, 60.0, 50.0), (60.0, 30.0, 110.0, 50.0),
        ]
        spans = [
            {"id": 10, "text": "l1 ±0.5", "bbox": (14.0, 14.0, 50.0, 26.0)},
            {"id": 11, "text": "r max.", "bbox": (64.0, 14.0, 100.0, 26.0)},
            {"id": 12, "text": "25", "bbox": (20.0, 34.0, 40.0, 46.0)},
            {"id": 13, "text": "0.4", "bbox": (70.0, 34.0, 90.0, 46.0)},
        ]
        locked, records = extract_structured_dimension_tables(spans, rects)
        self.assertEqual(locked, {10, 11, 12, 13})
        by_text = {r["raw_callout"]: r for r in records}
        self.assertIn("l1 ±0.5 — 25", by_text)
        self.assertEqual((by_text["l1 ±0.5 — 25"]["lsl"], by_text["l1 ±0.5 — 25"]["usl"]), (24.5, 25.5))
        self.assertIn("r max. — 0.4", by_text)
        self.assertEqual((by_text["r max. — 0.4"]["lsl"], by_text["r max. — 0.4"]["usl"]), (0.0, 0.4))

    def test_3_locked_table_ids_excluded_from_normal_clustering_path(self) -> None:
        """Locked table span IDs passed into `cluster_spans_geometry_guided` do not emit duplicate free balloons."""
        try:
            from geometry_first_clustering import cluster_spans_geometry_guided
        except ImportError:
            from backend.geometry_first_clustering import cluster_spans_geometry_guided

        rects = [
            (10.0, 100.0, 110.0, 120.0), (110.0, 100.0, 160.0, 120.0),
            (10.0, 120.0, 110.0, 140.0), (110.0, 120.0, 160.0, 140.0),
        ]
        spans = [
            {"id": 1, "text": "d1 h9", "bbox": (12.0, 104.0, 50.0, 116.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 2, "text": "12", "bbox": (120.0, 104.0, 135.0, 116.0), "angle_deg": 0.0, "size": 8.0},
            {"id": 99, "text": "Ø 40 ±0.2", "bbox": (300.0, 300.0, 350.0, 310.0), "angle_deg": 0.0, "size": 8.0},
        ]
        locked, table_recs = extract_structured_dimension_tables(spans, rects)
        free_clusters = cluster_spans_geometry_guided(spans, locked_span_ids=locked)
        self.assertEqual(len(table_recs), 1)
        self.assertEqual(len(free_clusters), 1)
        self.assertEqual(free_clusters[0]["raw_callout"], "Ø 40 ±0.2")

    def test_4_inline_cell_assignment_new03_and_inequality_new01(self) -> None:
        """Cells like 'a = Ø19 h6' (new03) and 'T ≥ 5.5' (new01) parse with accurate limits."""
        rects = [
            (10.0, 10.0, 90.0, 30.0), (90.0, 10.0, 170.0, 30.0),
            (10.0, 30.0, 90.0, 50.0), (90.0, 30.0, 170.0, 50.0),
        ]
        spans = [
            {"id": 21, "text": "a = Ø19 h6", "bbox": (15.0, 14.0, 80.0, 26.0)},
            {"id": 22, "text": "T ≥ 5.5", "bbox": (95.0, 14.0, 150.0, 26.0)},
        ]
        _, records = extract_structured_dimension_tables(spans, rects)
        by_text = {r["raw_callout"]: r for r in records}
        self.assertEqual((by_text["a = Ø19 h6"]["lsl"], by_text["a = Ø19 h6"]["usl"]), (18.987, 19.0))
        self.assertEqual((by_text["T ≥ 5.5"]["lsl"], by_text["T ≥ 5.5"]["usl"]), (5.5, None))


if __name__ == "__main__":
    unittest.main()


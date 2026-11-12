# backend/dimension_grammar.py
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

DimensionKind = Literal[
    "DIAMETER",
    "RADIUS",
    "LINEAR",
    "ANGULAR",
    "ISO_FIT",
    "THREAD",
    "SURFACE_ROUGHNESS",
    "CHAMFER",
    "COMPOUND_HOLE",
    "REFERENCE",
]

ToleranceKind = Literal[
    "BILATERAL_SYM",
    "BILATERAL_ASYM",
    "LIMIT_STACK",
    "ISO_FIT",
    "THREAD_CLASS",
    "MAX_LIMIT",
    "GENERAL_TOL",
    "BASIC_REF",
]


@dataclass(frozen=True)
class ParsedDimension:
    raw_callout: str
    kind: DimensionKind
    tolerance_kind: ToleranceKind
    quantity: int
    prefix_symbol: str  # 'Ø', 'R', 'M', 'Ra', ''
    nominal: float
    plus_tol: float | None
    minus_tol: float | None  # Signed negative or 0.0, e.g. -0.05
    fit_class: str | None
    thread_pitch: float | None
    thread_class: str | None
    chamfer_angle_deg: float | None
    units: Literal["mm", "deg", "um"]
    is_reference: bool = False
    sub_callouts: tuple[str, ...] = ()


# Reject strings that are clearly drawing metadata, dates, revisions, or zone indices
REJECT_PATTERNS = re.compile(
    r"^(?:"
    r"REV\s*[A-Z0-9]+|SHEET\s*\d+\s*OF\s*\d+|SCALE\s*\d+:\d+|"
    r"SECTION\s*[A-Z]-[A-Z]|DETAIL\s*[A-Z]|VIEW\s*[A-Z]|"
    r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|"
    r"[A-Z]{2,5}-\d{3,6}(?:-[A-Z0-9]+)?|"  # Part numbers like AS-4092-C, XA-901-004
    r"ISO\s*\d+|ASME\s*[A-Z0-9.]+|ALUMINUM\s*\d+|"
    r"[A-D]|[1-9]"  # Single border zone characters
    r")$",
    re.IGNORECASE,
)

QTY_PREFIX_RE = re.compile(r"^\s*(\d+)\s*[xX×]\s*(.+)$")
REFERENCE_RE = re.compile(r"^\s*\(\s*([Ø⌀R]?\s*\d+(?:\.\d+)?°?)\s*\)\s*$")
SURFACE_RA_RE = re.compile(
    r"^\s*(Ra|Rz)\s*(\d+(?:\.\d+)?)\s*(?:µm|um)?\s*(?:MAX)?\s*$", re.IGNORECASE
)
THREAD_RE = re.compile(
    r"^\s*M\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:-\s*|\s+)?([4-8][gGhH](?:[4-8][gGhH])?)?"
    r"(?:\s*(?:↧|DEPTH|DP)\s*(\d+(?:\.\d+)?))?\s*$"
)
CHAMFER_RE = re.compile(
    r"^\s*(?:C\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)°)\s*$"
)
ISO_FIT_RE = re.compile(
    r"^\s*([Ø⌀]?)\s*(\d+(?:\.\d+)?)\s+([A-Za-z]{1,2}\d{1,2})"
    r"(?:\s*\(\s*\+?(\d+(?:\.\d+)?)\s*/\s*([+-]?\d+(?:\.\d+)?)\s*\))?\s*$"
)
ASYM_TOL_RE = re.compile(
    r"^\s*([Ø⌀R]?)\s*(\d+(?:\.\d+)?)(°?)\s*"
    r"\(\s*\+?(\d+(?:\.\d+)?)\s*/\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$"
    r"|^\s*([Ø⌀R]?)\s*(\d+(?:\.\d+)?)(°?)\s+"
    r"\+(\d+(?:\.\d+)?)\s*(?:/|\s+)\s*([+-]?\d+(?:\.\d+)?)\s*$"
)
SYM_TOL_RE = re.compile(
    r"^\s*(?:PCD\s*)?([Ø⌀R]?)\s*(\d+(?:\.\d+)?)(°?)\s*(?:±|\+/-|\+-)\s*(\d+(?:\.\d+)?)(°?)"
    r"(?:\s*(THRU|PCD|TYP))?\s*$",
    re.IGNORECASE,
)
LIMIT_STACK_RE = re.compile(
    r"^\s*([Ø⌀R]?)\s*(\d+\.\d+)\s*/\s*(\d+\.\d+)\s*$"
)
COMPOUND_HOLE_RE = re.compile(
    r"^\s*([Ø⌀]\s*\d+(?:\.\d+)?[^⌴⌵↧]+)\s*([⌴⌵].+)$"
)
GENERAL_DIM_RE = re.compile(
    r"^\s*(?:PCD\s*)?([Ø⌀R]?)\s*(\d+(?:\.\d+)?)(°?)\s*(?:THRU|TYP|FULL)?\s*$",
    re.IGNORECASE,
)


def _norm_prefix(sym: str) -> str:
    if sym in ("Ø", "⌀"):
        return "Ø"
    return sym.upper()


def parse_dimension_callout(raw_text: str) -> ParsedDimension | None:
    text = " ".join(raw_text.strip().split())
    if not text or len(text) > 75:
        return None
    if REJECT_PATTERNS.match(text):
        return None
    # GD&T frames start with '|' or '[' or geometric symbols and belong to gdt_parser
    if text.startswith(("|", "[")) or any(
        g in text for g in ("⌖", "⏥", "⏤", "◯", "⌭", "⌒", "⌓", "⟂", "∠", "//", "◎", "⌯", "↗", "⌰")
    ):
        return None

    # 1. Extract leading multiplier (e.g., '4X ')
    quantity = 1
    qty_match = QTY_PREFIX_RE.match(text)
    body = text
    if qty_match:
        # Ensure it's not a chamfer like '0.5 x 45°' (where group 1 is a decimal, handled by \d+ above)
        if not body.endswith("°"):
            quantity = int(qty_match.group(1))
            body = qty_match.group(2).strip()

    # 2. Compound Hole Callout (e.g., 'Ø8.50 THRU ⌴ Ø14.0 ±0.1 ↧ 6.5')
    comp_match = COMPOUND_HOLE_RE.match(body)
    if comp_match:
        primary_part = comp_match.group(1).strip()
        secondary_part = comp_match.group(2).strip()
        parsed_primary = parse_dimension_callout(primary_part)
        if parsed_primary:
            return ParsedDimension(
                raw_callout=text,
                kind="COMPOUND_HOLE",
                tolerance_kind=parsed_primary.tolerance_kind,
                quantity=quantity,
                prefix_symbol=parsed_primary.prefix_symbol,
                nominal=parsed_primary.nominal,
                plus_tol=parsed_primary.plus_tol,
                minus_tol=parsed_primary.minus_tol,
                fit_class=parsed_primary.fit_class,
                thread_pitch=None,
                thread_class=None,
                chamfer_angle_deg=None,
                units="mm",
                sub_callouts=(primary_part, secondary_part),
            )

    # 3. Reference Dimension '(50.0)'
    ref_match = REFERENCE_RE.match(body)
    if ref_match:
        inner = ref_match.group(1).replace("⌀", "Ø").strip()
        pref = "Ø" if inner.startswith("Ø") else ("R" if inner.startswith("R") else "")
        num_str = inner.lstrip("ØR").rstrip("°").strip()
        return ParsedDimension(
            raw_callout=text,
            kind="REFERENCE",
            tolerance_kind="BASIC_REF",
            quantity=quantity,
            prefix_symbol=pref,
            nominal=float(num_str),
            plus_tol=0.0,
            minus_tol=0.0,
            fit_class=None,
            thread_pitch=None,
            thread_class=None,
            chamfer_angle_deg=None,
            units="deg" if inner.endswith("°") else "mm",
            is_reference=True,
        )

    # 4. Surface Roughness 'Ra 1.6'
    ra_match = SURFACE_RA_RE.match(body)
    if ra_match:
        val = float(ra_match.group(2))
        return ParsedDimension(
            raw_callout=text,
            kind="SURFACE_ROUGHNESS",
            tolerance_kind="MAX_LIMIT",
            quantity=quantity,
            prefix_symbol=ra_match.group(1).capitalize(),
            nominal=0.0,
            plus_tol=val,
            minus_tol=0.0,
            fit_class=None,
            thread_pitch=None,
            thread_class=None,
            chamfer_angle_deg=None,
            units="um",
        )

    # 5. ISO Metric Thread 'M10x1.5 - 6H'
    thr_match = THREAD_RE.match(body)
    if thr_match:
        maj_dia = float(thr_match.group(1))
        pitch = float(thr_match.group(2))
        t_class = thr_match.group(3) or "6H"
        return ParsedDimension(
            raw_callout=text,
            kind="THREAD",
            tolerance_kind="THREAD_CLASS",
            quantity=quantity,
            prefix_symbol="M",
            nominal=maj_dia,
            plus_tol=None,
            minus_tol=None,
            fit_class=None,
            thread_pitch=pitch,
            thread_class=t_class,
            chamfer_angle_deg=None,
            units="mm",
        )

    # 6. Chamfer '0.5 x 45°' or 'C1.5'
    ch_match = CHAMFER_RE.match(body)
    if ch_match:
        size = float(ch_match.group(1) or ch_match.group(2))
        angle = float(ch_match.group(3)) if ch_match.group(3) else 45.0
        return ParsedDimension(
            raw_callout=text,
            kind="CHAMFER",
            tolerance_kind="GENERAL_TOL",
            quantity=quantity,
            prefix_symbol="C",
            nominal=size,
            plus_tol=None,
            minus_tol=None,
            fit_class=None,
            thread_pitch=None,
            thread_class=None,
            chamfer_angle_deg=angle,
            units="mm",
        )

    # 7. ISO 286 Hole/Shaft Fit 'Ø30.00 H7' or 'Ø30.00 H7 (+0.021 / -0.000)'
    fit_match = ISO_FIT_RE.match(body)
    if fit_match:
        pref = _norm_prefix(fit_match.group(1))
        nom = float(fit_match.group(2))
        f_class = fit_match.group(3)
        # Validate fit letter + IT grade (e.g. H7, g6, js6, f7, k6, p6)
        if re.match(r"^(?:[A-HJ-Za-hj-z]|js|JS)\d{1,2}$", f_class):
            p_tol = float(fit_match.group(4)) if fit_match.group(4) is not None else None
            m_tol = float(fit_match.group(5)) if fit_match.group(5) is not None else None
            if m_tol is not None and m_tol > 0:
                m_tol = -m_tol
            return ParsedDimension(
                raw_callout=text,
                kind="ISO_FIT",
                tolerance_kind="ISO_FIT",
                quantity=quantity,
                prefix_symbol=pref or "Ø",
                nominal=nom,
                plus_tol=p_tol,
                minus_tol=m_tol,
                fit_class=f_class,
                thread_pitch=None,
                thread_class=None,
                chamfer_angle_deg=None,
                units="mm",
            )

    # 8. Asymmetric / Unilateral Bilateral Tolerance 'Ø8.50 +0.10 / -0.00'
    asym_match = ASYM_TOL_RE.match(body)
    if asym_match:
        groups = asym_match.groups()
        pref_raw, nom_s, deg_s, p_s, m_s = (
            groups[0:5] if groups[1] is not None else groups[5:10]
        )
        pref = _norm_prefix(pref_raw or "")
        nom = float(nom_s)
        p_tol = abs(float(p_s))
        m_val = float(m_s)
        m_tol = -abs(m_val) if m_val <= 0 else m_val
        kind: DimensionKind = "ANGULAR" if deg_s else ("DIAMETER" if pref == "Ø" else ("RADIUS" if pref == "R" else "LINEAR"))
        return ParsedDimension(
            raw_callout=text,
            kind=kind,
            tolerance_kind="BILATERAL_ASYM",
            quantity=quantity,
            prefix_symbol=pref,
            nominal=nom,
            plus_tol=p_tol,
            minus_tol=m_tol,
            fit_class=None,
            thread_pitch=None,
            thread_class=None,
            chamfer_angle_deg=None,
            units="deg" if deg_s else "mm",
        )

    # 9. Symmetric Bilateral Tolerance 'Ø120.0 ±0.15' or '45° ±0.5°'
    sym_match = SYM_TOL_RE.match(body)
    if sym_match:
        pref = _norm_prefix(sym_match.group(1) or "")
        nom = float(sym_match.group(2))
        is_deg = bool(sym_match.group(3) or sym_match.group(5))
        tol = abs(float(sym_match.group(4)))
        kind = "ANGULAR" if is_deg else ("DIAMETER" if pref == "Ø" else ("RADIUS" if pref == "R" else "LINEAR"))
        return ParsedDimension(
            raw_callout=text,
            kind=kind,
            tolerance_kind="BILATERAL_SYM",
            quantity=quantity,
            prefix_symbol=pref,
            nominal=nom,
            plus_tol=tol,
            minus_tol=-tol,
            fit_class=None,
            thread_pitch=None,
            thread_class=None,
            chamfer_angle_deg=None,
            units="deg" if is_deg else "mm",
        )

    # 10. Stacked Limit Dimensions '30.05 / 29.95'
    lim_match = LIMIT_STACK_RE.match(body)
    if lim_match:
        pref = _norm_prefix(lim_match.group(1) or "")
        v1, v2 = float(lim_match.group(2)), float(lim_match.group(3))
        hi, lo = max(v1, v2), min(v1, v2)
        if 0.001 <= (hi - lo) <= 5.0:
            mid = round((hi + lo) * 0.5, 4)
            half = round((hi - lo) * 0.5, 4)
            return ParsedDimension(
                raw_callout=text,
                kind="DIAMETER" if pref == "Ø" else "LINEAR",
                tolerance_kind="LIMIT_STACK",
                quantity=quantity,
                prefix_symbol=pref,
                nominal=mid,
                plus_tol=half,
                minus_tol=-half,
                fit_class=None,
                thread_pitch=None,
                thread_class=None,
                chamfer_angle_deg=None,
                units="mm",
            )

    # 11. Untoleranced General Dimension ('Ø78.0', 'R12.5', '45°', '64.0')
    gen_match = GENERAL_DIM_RE.match(body)
    if gen_match:
        pref = _norm_prefix(gen_match.group(1) or "")
        num_str = gen_match.group(2)
        is_deg = bool(gen_match.group(3))
        nom = float(num_str)
        # Reject isolated bare integers with no prefix/decimal/degree (e.g. border grid numbers 1..8)
        if not pref and not is_deg and "." not in num_str:
            return None
        if nom <= 0.0 or nom > 10000.0:
            return None
        kind = "ANGULAR" if is_deg else ("DIAMETER" if pref == "Ø" else ("RADIUS" if pref == "R" else "LINEAR"))
        return ParsedDimension(
            raw_callout=text,
            kind=kind,
            tolerance_kind="GENERAL_TOL",
            quantity=quantity,
            prefix_symbol=pref,
            nominal=nom,
            plus_tol=None,
            minus_tol=None,
            fit_class=None,
            thread_pitch=None,
            thread_class=None,
            chamfer_angle_deg=None,
            units="deg" if is_deg else "mm",
        )

    return None


def test_dimension_grammar() -> None:
    # 1. ISO 286 Fit
    d1 = parse_dimension_callout("Ø30.00 H7 (+0.021 / -0.000)")
    assert d1 and d1.kind == "ISO_FIT" and d1.fit_class == "H7" and d1.nominal == 30.0

    # 2. Multiplier + Asymmetric tolerance
    d2 = parse_dimension_callout("4x Ø8.50 +0.10 / -0.00")
    assert d2 and d2.quantity == 4 and d2.plus_tol == 0.10 and d2.minus_tol == 0.0

    # 3. Symmetric bilateral
    d3 = parse_dimension_callout("Ø120.0 ±0.15")
    assert d3 and d3.kind == "DIAMETER" and d3.plus_tol == 0.15 and d3.minus_tol == -0.15

    # 4. Thread
    d4 = parse_dimension_callout("4X M10x1.5 - 6H")
    assert d4 and d4.kind == "THREAD" and d4.nominal == 10.0 and d4.thread_pitch == 1.5 and d4.thread_class == "6H"

    # 5. Surface roughness
    d5 = parse_dimension_callout("Ra 1.6 µm Max")
    assert d5 and d5.kind == "SURFACE_ROUGHNESS" and d5.plus_tol == 1.6 and d5.nominal == 0.0

    # 6. Chamfer
    d6 = parse_dimension_callout("0.5 x 45°")
    assert d6 and d6.kind == "CHAMFER" and d6.nominal == 0.5 and d6.chamfer_angle_deg == 45.0

    # 7. Reject boilerplate and bare border numbers
    assert parse_dimension_callout("AS-4092-C") is None
    assert parse_dimension_callout("SHEET 1 OF 1") is None
    assert parse_dimension_callout("4") is None
    assert parse_dimension_callout("|⌖|Ø0.05(M)|A|B|") is None


if __name__ == "__main__":
    test_dimension_grammar()
    print("test_dimension_grammar PASSED")

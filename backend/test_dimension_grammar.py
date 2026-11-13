# backend/test_dimension_grammar.py
from dimension_grammar import parse_dimension_callout, parse_special_dimension_cases
from gdt_parser import parse_gdt_frame_with_quantity


def test_parse_iso_fit():
    p = parse_dimension_callout("Ø30.00 H7")
    assert p is not None
    assert p.kind == "ISO_FIT"
    assert p.nominal == 30.0
    assert p.fit_class == "H7"
    assert p.prefix_symbol in ("Ø", "⌀")


def test_parse_bilateral_tolerance():
    p = parse_dimension_callout("120.0 ±0.15")
    assert p is not None
    assert p.nominal == 120.0
    assert p.plus_tol == 0.15
    assert p.minus_tol == -0.15


def test_parse_deviational_limits():
    p = parse_dimension_callout("4x Ø8.50 +0.10 / -0.00")
    assert p is not None
    assert p.quantity == 4
    assert p.nominal == 8.5
    assert p.plus_tol == 0.10
    assert p.minus_tol == 0.00


def test_parse_thread():
    p = parse_dimension_callout("4X M10x1.5 - 6H")
    assert p is not None
    assert p.kind == "THREAD"
    assert p.nominal == 10.0
    assert p.thread_pitch == 1.5
    assert p.thread_class == "6H"


def test_parse_surface_roughness():
    p = parse_dimension_callout("Ra 1.6 µm Max")
    assert p is not None
    assert p.kind == "SURFACE_ROUGHNESS"
    assert p.plus_tol == 1.6


def test_parse_chamfer():
    p = parse_dimension_callout("0.5 x 45°")
    assert p is not None
    assert p.kind == "CHAMFER"
    assert p.nominal == 0.5
    assert p.chamfer_angle_deg == 45.0


def test_parse_single_sided_tolerance():
    # Only one deviation is stated; the other side is exactly the nominal.
    p = parse_dimension_callout("3.4 -0.2")
    assert p is not None
    assert p.nominal == 3.4
    assert p.plus_tol == 0.0
    assert p.minus_tol == -0.2
    p = parse_dimension_callout("7.4 +0.2")
    assert p is not None
    assert p.nominal == 7.4
    assert p.plus_tol == 0.2
    assert p.minus_tol == 0.0
    # An en-dash reads as a minus sign.
    p = parse_dimension_callout("3.4 –0.2")
    assert p is not None
    assert p.minus_tol == -0.2


def test_parse_bare_thread_uses_coarse_pitch():
    p = parse_dimension_callout("M4")
    assert p is not None
    assert p.kind == "THREAD"
    assert p.nominal == 4.0
    assert p.thread_pitch == 0.7  # ISO 261 coarse pitch for M4
    assert p.thread_class == "6H"
    p = parse_dimension_callout("2 x M3")
    assert p is not None
    assert p.kind == "THREAD"
    assert p.quantity == 2
    assert p.nominal == 3.0
    assert p.thread_pitch == 0.5


def test_parse_thread_length_is_not_a_pitch():
    # 'M3 x 8' is a length (8 is no M3 pitch); the pitch is the coarse 0.5.
    p = parse_dimension_callout("M3 x 8 (2x)")
    assert p is not None
    assert p.kind == "THREAD"
    assert p.nominal == 3.0
    assert p.thread_pitch == 0.5
    # A real pitch still parses as a pitch.
    p = parse_dimension_callout("M12x1.75-6H")
    assert p is not None
    assert p.thread_pitch == 1.75
    # A parts-list sentence never parses as a dimension.
    assert parse_dimension_callout("lense screw M3 x 8 (2 x) DIN 7985") is None


def test_parse_inequality_limits():
    p = parse_dimension_callout("≤ 1.7")
    assert p is not None
    assert p.tolerance_kind == "MAX_LIMIT"
    assert p.nominal == 1.7
    p = parse_dimension_callout("≥ 7.3")
    assert p is not None
    assert p.tolerance_kind == "MIN_LIMIT"
    assert p.nominal == 7.3
    # The same glyphs arrive as private-use chars from HEIDENHAIN fonts.
    p = parse_dimension_callout(chr(0xF086) + " 1.7")
    assert p is not None and p.tolerance_kind == "MAX_LIMIT"
    p = parse_dimension_callout(chr(0xF087) + " 7.3")
    assert p is not None and p.tolerance_kind == "MIN_LIMIT"


def test_parse_fraction_nominal():
    # Inch fraction: '3/4 H7' is a 0.75 mm ISO fit; the display text is kept.
    p = parse_dimension_callout("3/4 H7")
    assert p is not None
    assert p.kind == "ISO_FIT"
    assert p.nominal == 0.75
    assert p.fit_class == "H7"
    assert p.raw_callout == "3/4 H7"
    # A limit stack '30.05 / 29.95' is NOT a fraction.
    p = parse_dimension_callout("30.05 / 29.95")
    assert p is not None
    assert p.nominal == 30.0
    assert p.tolerance_kind == "LIMIT_STACK"


def test_grammar_and_gdt_upgrades() -> None:
    # 1. Roughness range 'Rz 6.3…16' -> [6.3, 16.0]
    rz = parse_special_dimension_cases("Rz 6.3…16")
    assert rz and rz.lsl_override == 6.3 and rz.usl_override == 16.0
    # 2. Explicit single-sided '1 +0.2' beats fit 'h9' -> [1.0, 1.2], fit_class None
    d_exp = parse_special_dimension_cases("1 +0.2")
    assert d_exp and d_exp.lsl_override == 1.0 and d_exp.usl_override == 1.2 and d_exp.fit_class is None
    # 3. 'Ø 59 H6 Ⓔ' -> ISO_FIT H6 with envelope_req=True
    d_fit = parse_special_dimension_cases("Ø 59 H6 Ⓔ")
    assert d_fit and d_fit.kind == "ISO_FIT" and d_fit.fit_class == "H6" and d_fit.envelope_req is True
    # 4. Stray leading integer glued onto a decimal tolerance callout: '2 0.35 ±0.5' -> '0.35 ±0.5'
    d_stray = parse_special_dimension_cases("2 0.35 ±0.5")
    assert d_stray and d_stray.nominal == 0.35 and d_stray.plus_tol == 0.5
    # 5. Parenthesized '(0.26)' rejected
    assert parse_special_dimension_cases("(0.26)") is None
    # 6. Repeated GD&T frames with (Nx) parsed cleanly (pipe form, as the assembler produces)
    fr, q = parse_gdt_frame_with_quantity("|◎|Ø 0.1|B| (4x)")
    assert fr is not None and q == 4
    fr2, q2 = parse_gdt_frame_with_quantity("|⌖|Ø 0.1|A| (3x)")
    assert fr2 is not None and q2 == 3
    # 7. MIN_LIMIT '≥ 2' -> lsl = usl = 2.0, never deduplicated against '2 ±0.2'
    d_min = parse_special_dimension_cases("≥ 2")
    assert d_min and d_min.tolerance_kind == "MIN_LIMIT" and d_min.lsl_override == 2.0 and d_min.usl_override == 2.0
    # 8. MAX_LIMIT '≤ 1.7' -> [0.0, 1.7] (repo rule, main.py:386)
    d_max = parse_special_dimension_cases("≤ 1.7")
    assert d_max and d_max.tolerance_kind == "MAX_LIMIT" and d_max.lsl_override == 0.0 and d_max.usl_override == 1.7


def test_asymmetric_tolerance_regressions() -> None:
    p_neg = parse_dimension_callout("Ø 6 -0.02/-0.05")
    assert p_neg is not None
    assert p_neg.nominal == 6.0
    assert p_neg.plus_tol == -0.02
    assert p_neg.minus_tol == -0.05

    p_std = parse_dimension_callout("6 +0.1/-0.05")
    assert p_std is not None
    assert p_std.nominal == 6.0
    assert p_std.plus_tol == 0.1
    assert p_std.minus_tol == -0.05

    p_single = parse_dimension_callout("3.4 -0.2")
    assert p_single is not None
    assert p_single.nominal == 3.4
    assert p_single.plus_tol == 0.0
    assert p_single.minus_tol == -0.2





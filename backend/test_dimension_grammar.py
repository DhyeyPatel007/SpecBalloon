# backend/test_dimension_grammar.py
from dimension_grammar import parse_dimension_callout


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



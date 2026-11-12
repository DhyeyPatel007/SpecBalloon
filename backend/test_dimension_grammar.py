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


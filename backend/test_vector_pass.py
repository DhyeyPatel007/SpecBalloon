# backend/test_vector_pass.py
"""Pytest-collectable tests for the tolerance-span clusterer (v2).

Spans are built directly with the bboxes measured from the real
drawings on 12 Nov 2026 (real01–real03), so the tests pin the exact
failure modes without depending on font rendering: en-dash
tolerances, rotated stacked tolerances, sign+number stacks, the
R+Z roughness merge, decimal continuations, left-prefix glyphs,
the tolerance-column post-pass, and the two over-merge guards
(paren fragments claim nothing; a tolerance in the next column
belongs to that column's dimension). The in-module test_vector_pass
is kept as the v1 regression (arrowheads + slash formatting).
"""
from vector_pass import (
    BBox,
    Point2D,
    TextSpan,
    assemble_boxed_gdt_frames,
    classify_span_token,
    cluster_split_tolerance_spans,
    resolve_cluster_v2_claims,
    test_vector_pass,
)

_counter = [0]


def _span(text, x0, y0, x1, y1, size=10.0, rot=0.0):
    _counter[0] += 1
    return TextSpan(
        span_id=f"s{_counter[0]}",
        text=text,
        bbox=BBox(x0, y0, x1, y1),
        origin=Point2D(x0, y1),
        font_name="Test",
        font_size=size,
        rotation_deg=rot,
    )


def _texts(spans):
    return [s.text for s in cluster_split_tolerance_spans(spans)]


def test_v1_slash_format_and_arrowheads():
    test_vector_pass()


def test_en_dash_tolerance_merges():
    # real02: '3.4' + en-dash '–0.2', right-adjacent (dx = 0).
    texts = _texts([
        _span("3.4", 221.5, 391.9, 228.9, 398.5, 5.15),
        _span("–0.2", 228.9, 393.1, 236.6, 398.0, 3.86),
    ])
    assert "3.4 -0.2" in texts


def test_plus_only_tolerance_merges():
    # real02: '7.4' + '+0.2' (the tolerance sorts a tenth of a point
    # earlier than its dimension, so the dimension must claim first).
    texts = _texts([
        _span("7.4", 195.6, 521.8, 202.9, 528.3, 10.0),
        _span("+0.2", 202.9, 521.7, 210.7, 526.6, 7.0),
    ])
    assert "7.4 +0.2" in texts


def test_rotated_stacked_tolerance_merges():
    # real02, -90 deg: the tolerance sits above its dimension in the
    # stack (reading order bottom-to-top).
    texts = _texts([
        _span("Ø 38", 100.0, 444.0, 110.0, 454.5, 10.0, -90.0),
        _span("±0.1", 100.0, 436.2, 110.0, 444.0, 7.0, -90.0),
        _span("180°", 100.0, 424.5, 110.0, 436.2, 10.0, -90.0),
        _span("±1°", 100.0, 417.7, 110.0, 424.5, 7.0, -90.0),
    ])
    assert "Ø 38 ±0.1" in texts
    assert "180° ±1°" in texts


def test_stacked_sign_then_number_merges():
    # real03, -90 deg: '2.4' with '±' above it and '0.1' above that.
    texts = _texts([
        _span("0.1", 1084.8, 367.2, 1094.5, 378.3, 7.0, -90.0),
        _span("±", 1084.8, 379.4, 1094.5, 384.7, 7.0, -90.0),
        _span("2.4", 1084.8, 385.8, 1094.5, 397.0, 10.0, -90.0),
    ])
    assert "2.4 ± 0.1" in texts


def test_roughness_rz_merges():
    # real02: 'R' + 'Z' + '6.3' are three adjacent spans.
    texts = _texts([
        _span("R", 296.7, 435.3, 299.8, 441.8, 7.0),
        _span("Z", 299.8, 436.5, 301.9, 441.4, 7.0),
        _span("6.3", 301.9, 435.3, 310.5, 441.8, 10.0),
    ])
    assert "RZ 6.3" in texts


def test_decimal_continuation_merges():
    # real01: '0' + '.625' (the hub projection).
    texts = _texts([
        _span("0", 439.9, 461.1, 445.9, 473.3, 10.0),
        _span(".625", 445.9, 460.1, 467.3, 473.7, 10.0),
    ])
    assert "0.625" in texts


def test_left_prefix_glyph_merges():
    # real03: a lone private-use glyph immediately left of a number.
    glyph = chr(0xF086)
    texts = _texts([
        _span(glyph, 1036.2, 404.7, 1043.4, 412.7, 10.0),
        _span("1.7", 1043.4, 403.4, 1053.4, 413.0, 10.0),
    ])
    assert glyph + " 1.7" in texts


def test_tolerance_column_pairs_nearest_row():
    # real03: a tolerance in its own column joins the nearest dimension
    # on its row; each row gets its own tolerance.
    texts = _texts([
        _span("9.8", 438.7, 658.2, 449.8, 667.9, 10.0),
        _span("14.6", 435.7, 677.9, 450.8, 687.6, 10.0),
        _span("±", 483.3, 667.0, 488.6, 676.7, 8.0),
        _span("1.2", 488.6, 667.0, 496.0, 676.7, 8.0),
        _span("±1.2", 484.8, 668.4, 499.6, 678.0, 8.0),
    ])
    assert any(t.startswith("9.8 ±") for t in texts)
    assert any(t.startswith("14.6 ±") for t in texts)
    # Each row got exactly one tolerance (no double-pairing, no orphan).
    assert sum(1 for t in texts if "±" in t) == 2


def test_paren_span_claims_nothing():
    # real02: '(0.31)' must not swallow the neighbouring 'M4' callout.
    texts = _texts([
        _span("(0.31)", 64.7, 182.7, 73.6, 200.8, 7.0, -90.0),
        _span("M4", 82.6, 185.7, 92.7, 196.9, 10.0, -90.0),
    ])
    assert "M4" in texts
    assert not any("M4 (0.31)" in t or "(0.31) M4" in t for t in texts)


def test_neighbor_column_tolerance_is_not_claimed():
    # real03: the '±0.3' in the next column belongs to '39'/'35',
    # not to the '43.3' in this column.
    texts = _texts([
        _span("43.3", 728.9, 518.2, 738.6, 536.0, 10.0, -90.0),
        _span("±0.5", 728.9, 501.8, 738.6, 518.2, 7.0, -90.0),
        _span("39", 739.3, 522.2, 748.9, 533.3, 10.0, -90.0),
        _span("±0.3", 739.3, 505.8, 748.9, 522.2, 7.0, -90.0),
    ])
    assert "43.3 ±0.5" in texts
    assert "39 ±0.3" in texts
    assert not any("±0.3" in t and "43.3" in t for t in texts)


def test_cluster_v2_pua_and_precedence() -> None:
    # 1. PUA ±0.5 (\uf0b1\uf030\uf02e\uf035) is classified as TOLNUM and merges onto 6.8
    pua_pm_05 = "\uf0b1\uf030\uf02e\uf035"
    assert classify_span_token(pua_pm_05) == "TOLNUM"
    merged, ids = resolve_cluster_v2_claims("6.8", [("s2", pua_pm_05, 3.0)], [])
    assert merged == "6.8 ±0.5" and ids == ["s2"]

    # 2. Stray bare integer '2' on the left of '0.35 ±0.5' is NOT claimed
    merged_stray, ids_stray = resolve_cluster_v2_claims("0.35", [("s3", "±0.5", 2.5)], [("s1", "2", 4.0)])
    assert merged_stray == "0.35 ±0.5" and "s1" not in ids_stray

    # 3. '1 +0.2' vs 'h9': explicit '+0.2' wins over 'h9'
    merged_fit_vs_tol, ids_fvt = resolve_cluster_v2_claims(
        "1", [("s_tol", "+0.2", 3.0), ("s_fit", "h9", 5.0)], []
    )
    assert merged_fit_vs_tol == "1 +0.2" and "s_fit" not in ids_fvt

    # 4. 'Ø 59 H6 Ⓔ' claims both H6 and Ⓔ
    merged_h6e, _ = resolve_cluster_v2_claims("\uf032 59", [("s_h6", "H6", 3.0), ("s_env", "Ⓔ", 6.0)], [])
    assert merged_h6e == "Ø 59 H6 Ⓔ"

    # 5. Boxed GD&T cells [◎] [\uf032 0.1] [B] [(4x)] assemble into '|◎|Ø 0.1|B| (4x)'
    s1 = TextSpan("g1", "◎", BBox(100, 200, 112, 212), Point2D(100, 210), "CAD", 9.0, 0.0)
    s2 = TextSpan("g2", "\uf032 0.1", BBox(112, 200, 138, 212), Point2D(114, 210), "CAD", 9.0, 0.0)
    s3 = TextSpan("g3", "B", BBox(138, 200, 150, 212), Point2D(140, 210), "CAD", 9.0, 0.0)
    s4 = TextSpan("g4", "(4x)", BBox(152, 200, 170, 212), Point2D(153, 210), "CAD", 9.0, 0.0)
    assembled_spans = assemble_boxed_gdt_frames([s1, s2, s3, s4])
    assert len(assembled_spans) == 1
    assert assembled_spans[0].text == "|◎|Ø 0.1|B| (4x)"


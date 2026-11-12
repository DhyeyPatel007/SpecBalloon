# backend/test_gemini_vision.py
import pytest
from gemini_vision import (
    VisionPatchExtraction,
    analyze_cropped_patch_with_gemini,
    analyze_symbol_compartment_strokes,
    reconcile_vision_with_vector,
    test_gemini_vision,
    verify_vision_symbol_second_check,
)
from vector_pass import BBox, LineSegment, Point2D


def test_gemini_vision_embedded():
    test_gemini_vision()


@pytest.mark.anyio
async def test_gemini_vision_deterministic_guardrail():
    # When api_key is None or not configured, analyze_cropped_patch_with_gemini safely returns UNAVAILABLE
    res = await analyze_cropped_patch_with_gemini("mock_base64_patch", None)
    assert res.status == "UNAVAILABLE"
    assert "GEMINI_API_KEY is not configured" in res.conflict_notes[0]


def test_error_notes_never_carry_the_api_key():
    # httpx HTTPStatusError str() includes the request URL (?key=...).
    # The scrub must strip it before the note is stored or logged.
    from gemini_vision import _scrub_key

    dirty = (
        "Client error '403 Forbidden' for url "
        "'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash"
        ":generateContent?key=AIzaSyDUMMYKEY1234567890'"
    )
    clean = _scrub_key(dirty)
    assert "AIzaSyDUMMYKEY1234567890" not in clean
    assert "key=[REDACTED]" in clean
    assert "403 Forbidden" in clean


def test_vision_model_defaults_to_current_flash_lite(monkeypatch):
    from gemini_vision import _vision_model

    monkeypatch.delenv("GEMINI_VISION_MODEL", raising=False)
    assert _vision_model() == "gemini-3.5-flash-lite"
    monkeypatch.setenv("GEMINI_VISION_MODEL", "gemini-3.8-flash")
    assert _vision_model() == "gemini-3.8-flash"


def test_vision_second_check() -> None:
    # Simulate real03: Vision claims GDT_PERPENDICULARITY at 0.95 confidence on a Runout frame
    frame_box = BBox(200, 300, 260, 314)
    # Diagonal shaft of '↗' from (202, 312) to (211, 302) -> angle = -48° (48° diagonal)
    runout_segments = [
        LineSegment(Point2D(202, 312), Point2D(211, 302), 0.7),
        LineSegment(Point2D(211, 302), Point2D(207, 303), 0.7),
    ]
    topo = analyze_symbol_compartment_strokes(frame_box, runout_segments, [])
    assert topo.has_diagonal_stroke is True
    resolved_type, glyph, conf, notes = verify_vision_symbol_second_check(
        "GDT_PERPENDICULARITY",
        0.95,
        topo,
        sheet_verified_gdt_types={"GDT_POSITION", "GDT_CONCENTRICITY", "GDT_CIRCULAR_RUNOUT"},
        has_diameter_prefix_in_zone=False,
    )
    assert resolved_type == "GDT_CIRCULAR_RUNOUT"
    assert glyph == "↗"
    assert conf <= 0.70
    assert any("diagonal stroke" in n for n in notes)


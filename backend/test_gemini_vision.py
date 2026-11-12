# backend/test_gemini_vision.py
import pytest
from gemini_vision import (
    VisionPatchExtraction,
    analyze_cropped_patch_with_gemini,
    reconcile_vision_with_vector,
    test_gemini_vision,
)


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

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

# backend/test_api_endpoints.py
from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient

from main import (
    app,
    find_table_cell_span_ids,
    preserve_full_raw_callout_on_threads,
    split_compound_dim_and_gdt_text,
    suppress_fragments_and_resolve_multiview,
)
from vector_pass import BBox, Point2D, TextSpan
from test_pipeline_e2e import generate_synthetic_as4092_pdf

client = TestClient(app)


def test_health_check():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "specballoon-backend"


def test_demo_extraction():
    res = client.post("/api/v1/drawings/demo-as4092c/extract?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["drawing_id"] == "demo-as4092c"
    assert data["count"] == 17
    assert data["is_sample_data"] is True


def test_pdf_upload_and_extraction():
    pdf_bytes = generate_synthetic_as4092_pdf()
    upload_res = client.post(
        "/api/v1/drawings",
        files={"file": ("as4092_rev_c.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 200
    dwg = upload_res.json()
    dwg_id = dwg["id"]
    assert dwg["part_number"] == "AS4092_REV_C"
    assert dwg["page_count"] == 1

    # Extract
    extract_res = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert extract_res.status_code == 200
    ext = extract_res.json()
    assert ext["count"] == 17
    assert ext["is_sample_data"] is False
    assert len(ext["characteristics"]) == 17

    # Get Balloons
    get_res = client.get(f"/api/v1/drawings/{dwg_id}/balloons")
    assert get_res.status_code == 200
    assert get_res.json()["count"] == 17

    # Patch characteristic
    char0 = ext["characteristics"][0]
    patch_res = client.patch(
        f"/api/v1/drawings/{dwg_id}/balloons/{char0['id']}",
        json={"measuredValue": 30.018, "status": "in_spec"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["measuredValue"] == 30.018

    # Export Excel
    excel_res = client.post(
        "/api/v1/exports/excel",
        json={"drawing": dwg, "characteristics": ext["characteristics"]},
    )
    assert excel_res.status_code == 200
    assert (
        excel_res.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert len(excel_res.content) > 2000


def test_invalid_file_upload():
    res = client.post(
        "/api/v1/drawings",
        files={"file": ("drawing.txt", io.BytesIO(b"not a pdf"), "text/plain")},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_PDF"



def _leader_pdf(callouts: list[tuple[str, float, float, float, float]]) -> bytes:
    """Minimal drawing: a small circle per feature + leader + text."""
    import fitz

    doc = fitz.open()
    page = doc.new_page(width=842, height=595)
    shape = page.new_shape()
    for text, fx, fy, tx, ty in callouts:
        shape.draw_circle(fitz.Point(fx, fy), 9)
        shoulder_x = tx - 4.0 if tx >= fx else tx + 65.0
        elbow_x = shoulder_x - 14.0 if tx >= fx else shoulder_x + 14.0
        shape.draw_line(fitz.Point(fx, fy), fitz.Point(elbow_x, ty - 3.0))
        shape.draw_line(fitz.Point(elbow_x, ty - 3.0), fitz.Point(shoulder_x, ty - 3.0))
    shape.finish(width=0.7, color=(0, 0, 0))
    shape.commit()
    for text, fx, fy, tx, ty in callouts:
        page.insert_text(fitz.Point(tx, ty), text, fontsize=9.0)
    out = doc.tobytes()
    doc.close()
    return out


def test_external_thread_does_not_crash_extraction():
    # Regression: an external thread (6g) used to KeyError on
    # t_lims["minor_diameter"] and 500 the whole extraction, because
    # ISO 965 returns only major-diameter limits for external classes.
    pdf = _leader_pdf([
        ("M8x1.25 - 6g", 300, 200, 450, 180),
        ("Ø20.00 ±0.05", 300, 400, 450, 380),
    ])
    up = client.post("/api/v1/drawings", files={"file": ("ext-thread.pdf", pdf, "application/pdf")})
    assert up.status_code == 200
    dwg_id = up.json()["id"]
    ex = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert ex.status_code == 200
    ext = ex.json()
    assert ext["count"] == 2, ext
    thread = next(c for c in ext["characteristics"] if "M8" in c["raw_callout"])
    # 6g external: major diameter limits (ISO 965-1) 7.765 / 7.971
    assert abs(thread["lsl"] - 7.765) < 1e-3 and abs(thread["usl"] - 7.971) < 1e-3


# ---- Vision symbol-resolution wiring -------------------------------------

import os
import gemini_vision


def _extract_as4092_chars():
    """Upload + extract the synthetic AS-4092-C drawing (17 chars, incl.
    two unknown-symbol GD&T frames: |⌖|Ø0.08(M)|A|B| and |⟂|0.03|A|)."""
    pdf_bytes = generate_synthetic_as4092_pdf()
    up = client.post(
        "/api/v1/drawings",
        files={"file": ("as4092_rev_c.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert up.status_code == 200
    dwg_id = up.json()["id"]
    ex = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert ex.status_code == 200, ex.text
    return ex.json()["characteristics"]


def _find_char(chars, needle):
    for c in chars:
        if needle in c.get("raw_callout", ""):
            return c
    raise AssertionError(f"no characteristic containing {needle!r}")


async def _fake_vision_correct(crop_b64, vector_text_in_bbox=None, api_key=None):
    # A correct vision read: resolves each unknown frame to its true symbol.
    # (The synthetic AS-4092 frames are |⌖|Ø0.05(M)|A|B| and |⟂|0.02|A|.)
    text = vector_text_in_bbox or ""
    if "Ø0.05" in text:
        return gemini_vision.VisionPatchExtraction(
            status="OK", raw_callout=text, characteristic_type="GDT_POSITION",
            nominal=0.0, plus_tol=0.05, minus_tol=0.0, gdt_symbol="⌖",
            material_modifier="MMC", datums=["A", "B"], vision_confidence=0.91,
        )
    if "0.02" in text:
        return gemini_vision.VisionPatchExtraction(
            status="OK", raw_callout=text, characteristic_type="GDT_PERPENDICULARITY",
            nominal=0.0, plus_tol=0.02, minus_tol=0.0, gdt_symbol="⟂",
            material_modifier="RFS", datums=["A"], vision_confidence=0.88,
        )
    return gemini_vision.VisionPatchExtraction(status="ERROR", conflict_notes=["unexpected patch"])


async def _fake_vision_unavailable(crop_b64, vector_text_in_bbox=None, api_key=None):
    return gemini_vision.VisionPatchExtraction(
        status="UNAVAILABLE",
        conflict_notes=["GEMINI_API_KEY is not configured; skipped Vision patch OCR."],
    )


async def _fake_vision_error(crop_b64, vector_text_in_bbox=None, api_key=None):
    raise RuntimeError("boom")


async def _fake_vision_conflict(crop_b64, vector_text_in_bbox=None, api_key=None):
    return gemini_vision.VisionPatchExtraction(
        status="REJECTED_CONFLICT",
        raw_callout=vector_text_in_bbox,
        characteristic_type="GDT_POSITION",
        nominal=0.0, plus_tol=0.08, minus_tol=0.0, gdt_symbol="⌖",
        material_modifier="MMC", datums=["A", "B"], vision_confidence=0.91,
        vector_conflict_detected=True,
        conflict_notes=["Rejected Gemini zone 0.080 in favor of vector text 0.050"],
    )


async def _fake_vision_low_confidence(crop_b64, vector_text_in_bbox=None, api_key=None):
    v = await _fake_vision_correct(crop_b64, vector_text_in_bbox, api_key)
    if v.status == "OK":
        v.vision_confidence = 0.50
    return v


def test_health_reports_vision_configured():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["vision_configured"], bool)
    assert data["vision_configured"] == bool(os.environ.get("GEMINI_API_KEY"))


def test_vision_resolves_unknown_gdt_symbols(monkeypatch):
    monkeypatch.setattr(
        "main.gemini_vision.analyze_cropped_patch_with_gemini", _fake_vision_correct
    )
    chars = _extract_as4092_chars()
    pos = _find_char(chars, "Ø0.05")
    assert pos["featureDescription"] == "Position GD&T Control"
    assert pos["designator"] == "Critical"
    assert pos["vision_used"] is True
    assert pos["visionGdtSymbol"] == "⌖"
    assert pos["visionConfidence"] == 0.91
    assert "unreadable" not in " ".join(pos["review_reasons"]).lower()
    # Guardrail (12 Nov 2026): a resolved symbol stays in review — vision
    # confidently misread a real runout frame as perpendicularity at 0.95,
    # so a human confirms the symbol before sign-off.
    assert pos["needs_review"] is True
    assert "verify before sign-off" in " ".join(pos["review_reasons"])
    # Limits stay vector: zone 0.05 -> LSL 0 / USL 0.05
    assert abs(pos["lsl"] - 0.0) < 1e-3 and abs(pos["usl"] - 0.05) < 1e-3
    perp = _find_char(chars, "0.02")
    assert perp["featureDescription"] == "Perpendicularity GD&T Control"
    assert perp["visionGdtSymbol"] == "⟂"
    assert perp["vision_used"] is True


def test_vision_unavailable_keeps_vector_result(monkeypatch):
    monkeypatch.setattr(
        "main.gemini_vision.analyze_cropped_patch_with_gemini", _fake_vision_unavailable
    )
    chars = _extract_as4092_chars()
    pos = _find_char(chars, "Ø0.05")
    assert pos["featureDescription"] == "GD&T Control"
    assert pos["needs_review"] is True
    assert pos["vision_used"] is False
    assert "unreadable" in " ".join(pos["review_reasons"]).lower()


def test_vision_error_keeps_vector_result(monkeypatch):
    monkeypatch.setattr(
        "main.gemini_vision.analyze_cropped_patch_with_gemini", _fake_vision_error
    )
    chars = _extract_as4092_chars()
    pos = _find_char(chars, "Ø0.05")
    assert pos["needs_review"] is True
    assert pos["vision_used"] is False
    assert "unreadable" in " ".join(pos["review_reasons"]).lower()


def test_vision_conflict_keeps_vector_result_and_records_it(monkeypatch):
    monkeypatch.setattr(
        "main.gemini_vision.analyze_cropped_patch_with_gemini", _fake_vision_conflict
    )
    chars = _extract_as4092_chars()
    pos = _find_char(chars, "Ø0.05")
    # Symbol is NOT trusted when vision's numbers disagreed with vector text.
    assert pos["featureDescription"] == "GD&T Control"
    assert pos["needs_review"] is True
    assert pos["vision_used"] is True
    reasons = " ".join(pos["review_reasons"])
    assert "Rejected Gemini zone" in reasons


def test_vision_low_confidence_keeps_vector_result(monkeypatch):
    monkeypatch.setattr(
        "main.gemini_vision.analyze_cropped_patch_with_gemini", _fake_vision_low_confidence
    )
    chars = _extract_as4092_chars()
    pos = _find_char(chars, "Ø0.05")
    assert pos["featureDescription"] == "GD&T Control"
    assert pos["needs_review"] is True
    assert pos["vision_used"] is False


def test_fragment_suppression_and_multiview() -> None:
    # 1. Compound 'Ø 2.9 ±0.1, ⌖ Ø 0.2 | C' splits into two records
    parts = split_compound_dim_and_gdt_text("Ø 2.9 ±0.1, ⌖ Ø 0.2 | C")
    assert len(parts) == 2 and parts[0].strip() == "Ø 2.9 ±0.1" and parts[1].strip() == "⌖ Ø 0.2 | C"
    # 2. Fragment suppression & multi-view explicit-over-general resolution
    mock_recs = [
        {"raw_callout": "12.35 ±0.3", "kind": "LINEAR", "nominal": 12.35, "tolerance_kind": "BILATERAL_SYM", "lsl": 12.05, "usl": 12.65, "bbox": {"x0": 100, "y0": 100, "x1": 150, "y1": 112}},
        {"raw_callout": "12.35", "kind": "LINEAR", "nominal": 12.35, "tolerance_kind": "GENERAL_TOL", "lsl": 12.15, "usl": 12.55, "bbox": {"x0": 300, "y0": 100, "x1": 320, "y1": 112}},
        {"raw_callout": "2 x M3", "kind": "THREAD", "tolerance_kind": "THREAD_CLASS", "bbox": {"x0": 100, "y0": 200, "x1": 130, "y1": 212}},
    ]
    cleaned = suppress_fragments_and_resolve_multiview(mock_recs)
    assert len(cleaned) == 3  # 1x (12.35 ±0.3) + 2x (2 x M3 instances)
    assert cleaned[0]["lsl"] == 12.05 and cleaned[0]["usl"] == 12.65


def test_table_cell_detection_and_thread_raw_callout():
    # 1. preserve_full_raw_callout_on_threads preserves full callout with prefix
    assert preserve_full_raw_callout_on_threads("4X M10x1.5 - 6H", None) == "4X M10x1.5 - 6H"
    assert preserve_full_raw_callout_on_threads("  2 x  M3  ", None) == "2 x M3"

    # 2. find_table_cell_span_ids flags 3x3 table grid and protects leader-matched span
    # 3x3 grid: x at 100, 150, 200; y at 100, 120, 140
    spans = []
    for r_idx, y in enumerate([100.0, 120.0, 140.0]):
        for c_idx, x in enumerate([100.0, 150.0, 200.0]):
            spans.append(
                TextSpan(f"cell_{r_idx}_{c_idx}", f"val_{r_idx}_{c_idx}", BBox(x, y, x + 20, y + 10), Point2D(x, y + 8), "CAD", 9.0, 0.0)
            )
    # Add a leader-matched dimension span inside the grid area
    ldr_span = TextSpan("ldr_dim", "Ø15 ±0.1", BBox(100.0, 120.0, 125.0, 130.0), Point2D(100, 128), "CAD", 9.0, 0.0)
    spans.append(ldr_span)
    table_ids = find_table_cell_span_ids(spans, None, leader_matched_ids={"ldr_dim"})
    # All 9 table cells must be flagged
    for r_idx in range(3):
        for c_idx in range(3):
            assert f"cell_{r_idx}_{c_idx}" in table_ids
    # The leader-matched dimension MUST be protected
    assert "ldr_dim" not in table_ids


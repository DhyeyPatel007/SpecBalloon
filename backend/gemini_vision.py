# backend/gemini_vision.py
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

from gdt_parser import parse_gdt_frame
from limits_math import (
    ComputedLimits,
    calculate_iso_2768_limits,
    calculate_iso_286_limits,
    calculate_iso_965_thread_limits,
)


@dataclass
class VisionPatchExtraction:
    status: Literal["OK", "UNAVAILABLE", "REJECTED_CONFLICT", "ERROR"]
    raw_callout: str | None = None
    characteristic_type: str | None = None
    nominal: float | None = None
    plus_tol: float | None = None
    minus_tol: float | None = None
    fit_class: str | None = None
    gdt_symbol: str | None = None
    material_modifier: Literal["MMC", "LMC", "RFS"] = "RFS"
    datums: list[str] = field(default_factory=list)
    vision_confidence: float = 0.0
    computed_limits: ComputedLimits | None = None
    vector_conflict_detected: bool = False
    conflict_notes: list[str] = field(default_factory=list)


GEMINI_PATCH_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "raw_callout": {"type": "STRING"},
        "characteristic_type": {
            "type": "STRING",
            "enum": [
                "GDT_POSITION", "GDT_FLATNESS", "GDT_PERPENDICULARITY",
                "GDT_SURFACE_PROFILE", "GDT_RUNOUT", "ISO_FIT",
                "DIAMETER", "LINEAR", "THREAD", "SURFACE_ROUGHNESS",
            ],
        },
        "gdt_symbol": {"type": "STRING"},
        "nominal": {"type": "NUMBER"},
        "plus_tol": {"type": "NUMBER"},
        "minus_tol": {"type": "NUMBER"},
        "fit_class": {"type": "STRING"},
        "material_modifier": {"type": "STRING", "enum": ["MMC", "LMC", "RFS"]},
        "datums": {"type": "ARRAY", "items": {"type": "STRING"}},
        "confidence": {"type": "NUMBER"},
    },
    "required": [
        "raw_callout", "characteristic_type", "nominal",
        "plus_tol", "minus_tol", "material_modifier", "datums", "confidence",
    ],
}


def reconcile_vision_with_vector(
    vision_data: dict[str, Any],
    vector_text_in_bbox: str | None,
    general_tol_class: Literal["f", "m", "c"] = "m",
) -> VisionPatchExtraction:
    """
    STAGE B DETERMINISTIC GUARDRAIL:
    1. Checks if native PDF vector numbers inside the same bounding box disagree with Gemini's numbers.
       If they disagree, Gemini's number is REJECTED (never averaged) and vector text wins.
    2. Recomputes LSL and USL deterministically from the reconciled parameters.
    """
    conflict_notes: list[str] = []
    conflict = False

    v_raw = str(vision_data.get("raw_callout", "")).strip()
    c_type = str(vision_data.get("characteristic_type", "LINEAR"))
    nom = float(vision_data.get("nominal", 0.0))
    p_tol = float(vision_data.get("plus_tol", 0.0))
    m_tol = float(vision_data.get("minus_tol", 0.0))
    fit_cls = str(vision_data.get("fit_class") or "").strip() or None
    v_conf = float(vision_data.get("confidence", 0.75))

    # 1. Cross-check against vector numbers if vector text was present in the patch
    if vector_text_in_bbox:
        vec_nums = [float(x) for x in re.findall(r"\d+\.\d+|\d+", vector_text_in_bbox)]
        if vec_nums:
            # For GD&T frames, the primary number in vector text is the tolerance zone (plus_tol)
            if c_type.startswith("GDT_"):
                vec_zone = vec_nums[0]
                if abs(vec_zone - p_tol) > 1e-4:
                    conflict = True
                    conflict_notes.append(
                        f"Rejected Gemini zone {p_tol:.3f} in favor of vector text {vec_zone:.3f}"
                    )
                    p_tol = vec_zone
            else:
                vec_nom = vec_nums[0]
                if abs(vec_nom - nom) > 1e-4:
                    conflict = True
                    conflict_notes.append(
                        f"Rejected Gemini nominal {nom:.3f} in favor of vector text {vec_nom:.3f}"
                    )
                    nom = vec_nom

    # 2. Deterministic Re-Computation of LSL and USL (never trust LLM limit arithmetic)
    if c_type.startswith("GDT_") or c_type == "SURFACE_ROUGHNESS":
        nom = 0.0
        m_tol = 0.0
        p_tol = abs(p_tol)
        limits = ComputedLimits(
            nominal=0.0,
            plus_tol=p_tol,
            minus_tol=0.0,
            lsl=0.0,
            usl=round(p_tol, 4),
            units="um" if c_type == "SURFACE_ROUGHNESS" else "mm",
            source_standard="ASME Y14.5 Unilateral Zone",
        )
    elif fit_cls:
        limits = calculate_iso_286_limits(nom, fit_cls)
        p_tol, m_tol = limits.plus_tol, limits.minus_tol
    elif p_tol == 0.0 and m_tol == 0.0:
        limits = calculate_iso_2768_limits(nom, general_tol_class)
        p_tol, m_tol = limits.plus_tol, limits.minus_tol
    else:
        m_signed = -abs(m_tol) if m_tol <= 0 else m_tol
        limits = ComputedLimits(
            nominal=round(nom, 4),
            plus_tol=round(p_tol, 4),
            minus_tol=round(m_signed, 4),
            lsl=round(nom + m_signed, 4),
            usl=round(nom + p_tol, 4),
            units="mm",
            source_standard="Explicit Callout",
        )

    return VisionPatchExtraction(
        status="REJECTED_CONFLICT" if conflict else "OK",
        raw_callout=v_raw,
        characteristic_type=c_type,
        nominal=limits.nominal,
        plus_tol=limits.plus_tol,
        minus_tol=limits.minus_tol,
        fit_class=fit_cls,
        gdt_symbol=vision_data.get("gdt_symbol"),
        material_modifier=vision_data.get("material_modifier", "RFS"),
        datums=list(vision_data.get("datums", [])),
        vision_confidence=min(0.95, max(0.10, v_conf)),
        computed_limits=limits,
        vector_conflict_detected=conflict,
        conflict_notes=conflict_notes,
    )


def _scrub_key(text: str) -> str:
    """Strip any API-key query param from an error message before it is
    logged or stored. httpx HTTPStatusError str() includes the full
    request URL, which carries ?key=... — that must never reach logs."""
    return re.sub(r"key=[^&\s\"']+", "key=[REDACTED]", text)


def _vision_model() -> str:
    """Vision model, overridable via GEMINI_VISION_MODEL without a deploy.

    Default is gemini-3.5-flash-lite: Google deprecated gemini-2.5-flash
    for new projects (Nov 2026) — its generateContent endpoint 404s for
    projects that never used 2.5, and Google routes 2.5 Flash to
    3.5 Flash-Lite. The old hardcoded 2.5-flash string is what made every
    vision call error after the wiring went live.
    """
    return os.getenv("GEMINI_VISION_MODEL", "gemini-3.5-flash-lite").strip() or "gemini-3.5-flash-lite"


async def analyze_cropped_patch_with_gemini(
    crop_base64_png: str,
    vector_text_in_bbox: str | None = None,
    api_key: str | None = None,
) -> VisionPatchExtraction:
    resolved_key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
    if not resolved_key:
        # Honest response: NEVER return a fake Ø30.00 H7 at 99.5% confidence!
        return VisionPatchExtraction(
            status="UNAVAILABLE",
            conflict_notes=["GEMINI_API_KEY is not configured; skipped Vision patch OCR."],
        )

    b64_clean = crop_base64_png.split(",", 1)[-1]
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_vision_model()}:generateContent?key={resolved_key}"
    )
    prompt = (
        "You are an ASME Y14.5 / ISO 1101 engineering blueprint OCR parser. "
        "Read ONLY the cropped callout or GD&T Feature Control Frame in this image patch. "
        "For GD&T frames or surface roughness (Ra), set nominal=0, minus_tol=0, and plus_tol=tolerance zone."
    )
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/png", "data": b64_clean}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json",
            "responseSchema": GEMINI_PATCH_RESPONSE_SCHEMA,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            body = resp.json()
            raw_json = body["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_json)
            return reconcile_vision_with_vector(parsed, vector_text_in_bbox)
    except Exception as exc:
        # The exception text can embed the request URL (with ?key=...),
        # so scrub it before storing — the note is logged downstream.
        return VisionPatchExtraction(
            status="ERROR",
            conflict_notes=[f"Gemini Vision API error: {_scrub_key(str(exc))}"],
        )


def test_gemini_vision() -> None:
    import asyncio

    # 1. Verify no-key path returns UNAVAILABLE (never fake data!)
    os.environ.pop("GEMINI_API_KEY", None)
    res_no_key = asyncio.run(analyze_cropped_patch_with_gemini("data:image/png;base64,iVBORw0KGgo="))
    assert res_no_key.status == "UNAVAILABLE"
    assert res_no_key.nominal is None

    # 2. Verify Stage B Guardrail rejects LLM number when it conflicts with native vector text
    mock_llm_output = {
        "raw_callout": "|⌖|Ø0.08(M)|A|B|",
        "characteristic_type": "GDT_POSITION",
        "gdt_symbol": "⌖",
        "nominal": -0.04,  # Hallucinated negative nominal from LLM
        "plus_tol": 0.08,  # LLM misread 0.05 as 0.08
        "minus_tol": -0.04,
        "material_modifier": "MMC",
        "datums": ["A", "B"],
        "confidence": 0.91,
    }
    reconciled = reconcile_vision_with_vector(mock_llm_output, vector_text_in_bbox="|⌖|Ø0.05(M)|A|B|")
    assert reconciled.status == "REJECTED_CONFLICT"
    assert reconciled.vector_conflict_detected is True
    assert reconciled.computed_limits is not None
    assert reconciled.computed_limits.lsl == 0.000
    assert reconciled.computed_limits.usl == 0.050, "Vector number 0.050 must win over LLM 0.080"


if __name__ == "__main__":
    test_gemini_vision()
    print("test_gemini_vision PASSED")


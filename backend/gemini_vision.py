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
from vector_pass import BBox, LineSegment, Point2D


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
    prompt: str | None = None,
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
    active_prompt = prompt or (
        "You are an ASME Y14.5 / ISO 1101 engineering blueprint OCR parser. "
        "Read ONLY the cropped callout or GD&T Feature Control Frame in this image patch. "
        "For GD&T frames or surface roughness (Ra), set nominal=0, minus_tol=0, and plus_tol=tolerance zone."
    )
    if prompt is not None:
        schema = {
            "type": "OBJECT",
            "properties": {
                "raw_callout": {"type": "STRING"},
                "confidence": {"type": "NUMBER"},
            },
            "required": ["raw_callout", "confidence"],
        }
    else:
        schema = GEMINI_PATCH_RESPONSE_SCHEMA

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": active_prompt},
                    {"inline_data": {"mime_type": "image/png", "data": b64_clean}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json",
            "responseSchema": schema,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            body = resp.json()
            raw_json = body["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_json)
            if prompt is not None:
                raw_call = str(parsed.get("raw_callout", "")).strip()
                conf = float(parsed.get("confidence", 0.75))
                return VisionPatchExtraction(
                    status="OK",
                    raw_callout=raw_call,
                    vision_confidence=min(0.95, max(0.10, conf)),
                )
            return reconcile_vision_with_vector(parsed, vector_text_in_bbox)
    except Exception as exc:
        # The exception text can embed the request URL (with ?key=...),
        # so scrub it before storing — the note is logged downstream.
        return VisionPatchExtraction(
            status="ERROR",
            conflict_notes=[f"Gemini Vision API error: {_scrub_key(str(exc))}"],
        )


NAME_TO_GLYPH = {
    "GDT_POSITION": "⌖",
    "GDT_PERPENDICULARITY": "⟂",
    "GDT_PARALLELISM": "//",
    "GDT_FLATNESS": "⏥",
    "GDT_SURFACE_PROFILE": "⌒",
    "GDT_CIRCULAR_RUNOUT": "↗",
    "GDT_CONCENTRICITY": "◎",
    "GDT_CYLINDRICITY": "⌭",
    "GDT_STRAIGHTNESS": "⏤",
    "GDT_ANGULARITY": "∠",
    "GDT_SYMMETRY": "⌯",
    "GDT_TOTAL_RUNOUT": "↗",
    "GDT_ROUNDNESS": "◯",
}


@dataclass(frozen=True)
class SymbolCellTopology:
    has_diagonal_stroke: bool    # 22° <= |angle| <= 68° (characteristic of Runout ↗, Angularity ∠, Parallelism //)
    has_horizontal_stroke: bool  # |angle| <= 8° or >= 172°
    has_vertical_stroke: bool    # 82° <= |angle| <= 98°
    circle_count: int            # 2 concentric circles -> ◎; 1 circle + crosshairs -> ⌖


def analyze_symbol_compartment_strokes(
    frame_bbox: BBox,
    page_segments: list[LineSegment],
    page_circles: list[tuple[object, float]],
) -> SymbolCellTopology:
    """Analyzes vector strokes inside a GD&T symbol compartment (the left-most cell of a frame):

    - Takes the frame's bounding box (the symbol cell is the left-most ~1.35 × height region).
    - Classifies every vector segment in that cell by angle: diagonal (22°–68°), horizontal (≤10° or ≥170°), vertical (≥80°).
    - Counts circles whose centre lies inside the symbol cell and whose radius is ≤ 65% of the frame height.
    """
    sym_cell = BBox(
        frame_bbox.x0 - 2.0,
        frame_bbox.y0 - 2.0,
        frame_bbox.x0 + max(12.0, frame_bbox.height * 1.35),
        frame_bbox.y1 + 2.0,
    )
    cell_len_limit = max(18.0, frame_bbox.height * 1.5)

    has_diag = False
    has_horiz = False
    has_vert = False

    for seg in page_segments:
        if seg.length > cell_len_limit or seg.length < 1.2:
            continue
        if sym_cell.contains_point(seg.midpoint, tol=1.5):
            ang = abs(seg.angle_deg) % 180.0
            if (22.0 <= ang <= 68.0) or (112.0 <= ang <= 158.0):
                has_diag = True
            elif ang <= 10.0:
                has_horiz = True
            elif ang >= 80.0:
                has_vert = True

    c_count = 0
    for center_pt, rad in page_circles:
        if rad <= frame_bbox.height * 0.65 and sym_cell.contains_point(center_pt, tol=frame_bbox.height * 0.05):
            c_count += 1

    return SymbolCellTopology(
        has_diagonal_stroke=has_diag,
        has_horizontal_stroke=has_horiz,
        has_vertical_stroke=has_vert,
        circle_count=c_count,
    )


def verify_vision_symbol_second_check(
    vision_gdt_type: str,
    vision_confidence: float,
    topology: SymbolCellTopology,
    sheet_verified_gdt_types: set[str],
    has_diameter_prefix_in_zone: bool,
) -> tuple[str, str, float, list[str]]:
    """Deterministic Second Check for Vision GD&T Symbol Resolution (Fixes Part A #4 / Issue F):

    1. Vector Topology Check:
       - If Vision claims GDT_PERPENDICULARITY ('⟂') at 0.95 confidence, but the symbol cell contains a diagonal vector stroke (22°–68°, e.g. Runout arrow '↗') and no Ø (or has a diagonal arrow), override 'GDT_PERPENDICULARITY' -> 'GDT_CIRCULAR_RUNOUT'.
       - If topology has 2 concentric circles and 0 straight strokes, enforce 'GDT_CONCENTRICITY'.
       - If topology has 1 circle + orthogonal crosshairs, enforce 'GDT_POSITION' ('⌖').
    2. Sheet Symbol Inventory Cross-Check:
       - Circular Runout ('↗') NEVER has a 'Ø' cylindrical tolerance zone symbol, whereas Position ('⌖') and Concentricity ('◎') on turned shafts do. If Vision claims 'GDT_PERPENDICULARITY' without 'Ø' on a sheet whose verified inventory is {GDT_POSITION, GDT_CONCENTRICITY, GDT_CIRCULAR_RUNOUT}, reclassify to 'GDT_CIRCULAR_RUNOUT'.
    3. Non-Negotiable Guardrail:
       - Record ALWAYS stays in review (confidence capped at <= 0.70) with explicit audit note.
    """
    notes: list[str] = []
    resolved_type = vision_gdt_type
    # 1. Vector Topology Check
    if vision_gdt_type == "GDT_PERPENDICULARITY" and topology.has_diagonal_stroke:
        resolved_type = "GDT_CIRCULAR_RUNOUT"
        notes.append("Second-check override: diagonal stroke detected (22°–68°) -> CIRCULAR_RUNOUT (↗)")
    elif topology.circle_count >= 2 and not (topology.has_horizontal_stroke or topology.has_vertical_stroke or topology.has_diagonal_stroke):
        if resolved_type != "GDT_CONCENTRICITY":
            resolved_type = "GDT_CONCENTRICITY"
            notes.append("Second-check override: 2 concentric circle paths detected -> CONCENTRICITY (◎)")
    elif topology.circle_count == 1 and topology.has_horizontal_stroke and topology.has_vertical_stroke:
        if resolved_type != "GDT_POSITION":
            resolved_type = "GDT_POSITION"
            notes.append("Second-check override: 1 circle + orthogonal crosshairs detected -> POSITION (⌖)")
    # 2. Sheet Symbol Inventory Cross-Check
    if (
        resolved_type == "GDT_PERPENDICULARITY"
        and "GDT_CIRCULAR_RUNOUT" in sheet_verified_gdt_types
        and "GDT_PERPENDICULARITY" not in sheet_verified_gdt_types
        and not has_diameter_prefix_in_zone
    ):
        resolved_type = "GDT_CIRCULAR_RUNOUT"
        notes.append(
            "Second-check override: GDT_PERPENDICULARITY absent from sheet inventory "
            "{GDT_POSITION, GDT_CONCENTRICITY, GDT_CIRCULAR_RUNOUT} -> CIRCULAR_RUNOUT (↗)"
        )
    glyph = NAME_TO_GLYPH.get(resolved_type, "⌖")
    capped_confidence = round(min(0.70, max(0.45, vision_confidence * 0.72)), 3)
    return resolved_type, glyph, capped_confidence, notes


async def rescue_stroked_dimension_callouts(
    page: Any,
    unmatched_dim_entities: Sequence[Any],
    unclaimed_short_stroke_clusters: Sequence[Any],
    page_index: int = 0,
    general_tol_class: str = "m",
    api_key: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Rescues callouts printed as vector outlines with zero text spans (e.g. real03 'Ø 59', '(20.7)').
    For each cluster (<= 4 per page), if its center is within 18 pt of an unmatched dimension-line midpoint,
    crop + call vision with prompt.
    """
    if not unmatched_dim_entities or not unclaimed_short_stroke_clusters:
        return []

    try:
        from vector_pass import BBox, Point2D, crop_callout_patch_base64
    except ImportError:
        from backend.vector_pass import BBox, Point2D, crop_callout_patch_base64

    try:
        from dimension_grammar import parse_dimension_callout, parse_special_dimension_cases
        from limits_math import calculate_iso_2768_limits, calculate_iso_286_limits
    except ImportError:
        from backend.dimension_grammar import parse_dimension_callout, parse_special_dimension_cases
        from backend.limits_math import calculate_iso_2768_limits, calculate_iso_286_limits

    prompt = (
        "Read the exact engineering dimension callout rendered as vector strokes in this patch. "
        "Preserve any diameter symbol (Ø), radius (R), or reference parentheses like (20.7) or (Ø 27). "
        'Return strict JSON: {"raw_callout": "<string>", "confidence": <0.0-1.0>}.'
    )

    rescued: list[dict[str, Any]] = []
    calls = 0

    for cluster in unclaimed_short_stroke_clusters:
        if calls >= 4:
            break

        # Extract cluster bbox
        if isinstance(cluster, dict) and "bbox" in cluster:
            b = cluster["bbox"]
            cb = BBox(float(b[0]), float(b[1]), float(b[2]), float(b[3]))
        elif hasattr(cluster, "bbox"):
            cb = cluster.bbox
        elif hasattr(cluster, "x0"):
            cb = cluster
        elif isinstance(cluster, (list, tuple)) and len(cluster) > 0 and hasattr(cluster[0], "p1"):
            min_x = min(min(s.p1.x, s.p2.x) for s in cluster)
            min_y = min(min(s.p1.y, s.p2.y) for s in cluster)
            max_x = max(max(s.p1.x, s.p2.x) for s in cluster)
            max_y = max(max(s.p1.y, s.p2.y) for s in cluster)
            cb = BBox(min_x, min_y, max_x, max_y)
        elif isinstance(cluster, (list, tuple)) and len(cluster) >= 4 and isinstance(cluster[0], (int, float)):
            cb = BBox(float(cluster[0]), float(cluster[1]), float(cluster[2]), float(cluster[3]))
        else:
            continue

        cx, cy = (cb.x0 + cb.x1) * 0.5, (cb.y0 + cb.y1) * 0.5

        # Check if center is within 18 pt of an unmatched dimension-line midpoint
        matched_dl = None
        for dl in unmatched_dim_entities:
            mid = dl.midpoint if hasattr(dl, "midpoint") else Point2D(dl[0], dl[1])
            if math.hypot(cx - mid.x, cy - mid.y) <= 18.0:
                matched_dl = dl
                break

        if not matched_dl:
            continue

        calls += 1
        try:
            crop_b64 = crop_callout_patch_base64(page, cb, dpi=300, pad_pt=8.0)
        except Exception:
            continue

        vis = await analyze_cropped_patch_with_gemini(
            crop_base64_png=crop_b64,
            prompt=prompt,
            api_key=api_key,
        )

        if vis.status != "OK" or not vis.raw_callout:
            continue

        raw = vis.raw_callout.strip()
        vision_conf = vis.vision_confidence or 0.70

        if raw.startswith("(") and raw.endswith(")"):
            inner = raw[1:-1].strip()
            num_match = re.search(r"(\d+(?:\.\d+)?)", inner)
            nom = float(num_match.group(1)) if num_match else 0.0
            kind = "REFERENCE"
            tol_kind = "BASIC_REF"
            lsl, usl = None, None
            plus_tol, minus_tol = 0.0, 0.0
        else:
            pd = parse_special_dimension_cases(raw)
            if pd is None:
                pd = parse_dimension_callout(raw)
            if pd is None:
                continue

            nom = float(pd.nominal) if pd.nominal is not None else 0.0
            kind = pd.kind
            tol_kind = pd.tolerance_kind
            lsl, usl = None, None
            plus_tol = float(pd.plus_tol) if pd.plus_tol is not None else 0.0
            minus_tol = float(pd.minus_tol) if pd.minus_tol is not None else 0.0

            if pd.tolerance_kind == "ISO_FIT" and pd.fit_class:
                lim = calculate_iso_286_limits(nom, pd.fit_class)
                if lim:
                    lsl, usl = float(lim.lsl), float(lim.usl)
            elif pd.tolerance_kind == "MAX_LIMIT":
                lsl, usl = 0.0, nom
            elif pd.tolerance_kind == "MIN_LIMIT":
                lsl, usl = nom, None
            elif pd.plus_tol is not None and pd.minus_tol is not None:
                lsl = round(nom + float(pd.minus_tol), 4)
                usl = round(nom + float(pd.plus_tol), 4)
            elif pd.tolerance_kind == "GENERAL_TOL" and pd.kind in ("LINEAR", "DIAMETER", "RADIUS"):
                lim = calculate_iso_2768_limits(nom, general_tol_class)
                if lim:
                    lsl, usl = float(lim.lsl), float(lim.usl)

        rec = {
            "raw_callout": raw,
            "rawCallout": raw,
            "kind": kind,
            "tolerance_kind": tol_kind,
            "nominal": nom,
            "nominal_value": nom,
            "nominal_text": str(nom),
            "plus_tol": plus_tol,
            "plusTolerance": plus_tol,
            "minus_tol": minus_tol,
            "minusTolerance": minus_tol,
            "lsl": lsl,
            "usl": usl,
            "units": "mm",
            "bbox": {
                "x": float(cb.x0),
                "y": float(cb.y0),
                "width": float(cb.width),
                "height": float(cb.height),
            },
            "extraction_source": "vision_stroked_rescue",
            "confidence": round(min(vision_conf, 0.72) * 100.0, 1),
            "needs_review": True,
            "review_reason": "Stroked vector-outline callout rescued via Vision OCR — verify before sign-off",
            "review_reasons": ["Stroked vector-outline callout rescued via Vision OCR — verify before sign-off"],
            "page_index": page_index,
            "sheet": page_index + 1,
            "is_sample_data": False,
            "isDemo": False,
            "geometry_matched": True,
        }
        rescued.append(rec)

    return rescued



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


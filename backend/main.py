# backend/main.py
from __future__ import annotations

import os
import re
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

import balloon_layout
import confidence
import db
import dimension_grammar
import excel_export
import gdt_parser
import gemini_vision
import leader_association
import limits_math
import sample_data
import vector_pass

UPLOAD_TMP_DIR = os.getenv("UPLOAD_TMP_DIR", "/tmp/specballoon_uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_TMP_DIR, exist_ok=True)
    db.init_db()
    yield


app = FastAPI(
    title="SpecBalloon Metrology API",
    version="1.0.0",
    description="Vector & Metrology Extraction Engine for AS9102 FAI Inspection",
    lifespan=lifespan,
)

# CORS Middleware
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    code = "REQUEST_ERROR"
    if exc.status_code == 404:
        code = "DRAWING_NOT_FOUND"
    elif exc.status_code == 413:
        code = "FILE_TOO_LARGE"
    elif exc.status_code == 400:
        code = "INVALID_PDF"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": str(detail) if detail else "An HTTP error occurred",
                "details": {"status_code": exc.status_code},
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "EXTRACTION_ERROR",
                "message": f"Internal server error: {str(exc)}",
                "details": {"exception": type(exc).__name__},
            }
        },
    )


class CharacteristicUpdateRequest(BaseModel):
    balloonNumber: int | None = None
    char_no: int | None = None
    zone: str | None = None
    designator: str | None = None
    rawCallout: str | None = None
    raw_callout: str | None = None
    nominal: float | None = None
    plusTolerance: float | None = None
    plus_tol: float | None = None
    minusTolerance: float | None = None
    minus_tol: float | None = None
    lsl: float | None = None
    usl: float | None = None
    units: str | None = None
    gauge: str | None = None
    instrument: str | None = None
    status: str | None = None
    confidence: float | None = None
    needs_review: bool | None = None
    measuredValue: float | None = None
    measured_value: float | None = None
    review_reasons: list[str] | None = None
    bbox: dict[str, Any] | None = None
    balloonPosition: dict[str, Any] | None = None


class ExcelExportRequest(BaseModel):
    drawing: dict[str, Any] = Field(default_factory=dict)
    characteristics: list[dict[str, Any]] = Field(default_factory=list)


@app.get("/")
@app.get("/health")
@app.get("/api/v1/health")
async def health():
    return {
        "status": "healthy",
        "service": "specballoon-backend",
        "engine": "vector-metrology-v1",
        # True when a Gemini key is configured, so the studio can tell
        # the user whether Vision symbol resolution is available.
        # The key value itself is never exposed.
        "vision_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


# Vision symbol resolution: only for GD&T frames whose symbol the vector
# pass could not read (missing font glyph -> GDT_UNKNOWN). Vision reads
# ONLY the symbol glyph from the cropped raster patch; all numbers and
# limits stay vector — the reconciler inside gemini_vision rejects any
# LLM number that disagrees with native PDF text.
VISION_MIN_CONFIDENCE = 0.75
MAX_VISION_CALLS_PER_EXTRACTION = 5


async def _vision_resolve_symbol(
    crop_b64: str, vector_text: str
) -> gemini_vision.VisionPatchExtraction | None:
    """Ask Gemini Vision to read an unknown GD&T symbol from a patch crop.

    Returns the reconciled extraction when vision has usable evidence
    (status OK with a confident GD&T symbol, or REJECTED_CONFLICT where
    the numbers disagreed with vector text). Returns None when vision
    cannot help — no key, API error, non-GD&T read, or low confidence —
    and the caller keeps the vector result unchanged in all those cases.
    """
    if not crop_b64:
        return None
    try:
        vis = await gemini_vision.analyze_cropped_patch_with_gemini(
            crop_b64, vector_text_in_bbox=vector_text
        )
    except Exception as exc:  # Vision must never fail an extraction
        print(f"[vision] call failed ({type(exc).__name__}: {exc}) — keeping vector result")
        return None
    # Log the outcome for the Render logs: silent swallowing hides
    # real misconfiguration (bad key, model error) as "vision declined".
    print(
        f"[vision] status={vis.status} "
        f"confidence={vis.vision_confidence:.2f} "
        f"type={vis.characteristic_type} symbol={vis.gdt_symbol!r} "
        f"notes={vis.conflict_notes} "
        f"vector_text={vector_text!r}"
    )
    if vis.status == "REJECTED_CONFLICT":
        return vis
    if vis.status != "OK":
        return None
    if not vis.characteristic_type or not vis.characteristic_type.startswith("GDT_"):
        return None
    if not vis.gdt_symbol:
        return None
    if vis.vision_confidence < VISION_MIN_CONFIDENCE:
        return None
    return vis


@app.post("/api/v1/drawings")
async def upload_drawing(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PDF",
                    "message": "Only PDF files are supported. Please upload a vector 2D CAD drawing in PDF format.",
                    "details": {"filename": file.filename},
                }
            },
        )

    drawing_id = f"dwg_{uuid.uuid4().hex[:12]}"
    os.makedirs(UPLOAD_TMP_DIR, exist_ok=True)
    temp_path = os.path.join(UPLOAD_TMP_DIR, f"{drawing_id}.pdf")

    size = 0
    try:
        with open(temp_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail={
                            "error": {
                                "code": "FILE_TOO_LARGE",
                                "message": f"Drawing exceeds the 10 MB limit ({size / (1024*1024):.1f} MB uploaded).",
                                "details": {"max_bytes": MAX_FILE_SIZE, "uploaded_bytes": size},
                            }
                        },
                    )
                buffer.write(chunk)
    except Exception:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise

    try:
        doc = fitz.open(temp_path)
        page_count = len(doc)
        if page_count < 1:
            raise ValueError("PDF contains no pages")
        page0 = doc[0]
        width = float(page0.rect.width)
        height = float(page0.rect.height)
        doc.close()
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PDF",
                    "message": f"Could not open or parse PDF: {str(e)}",
                    "details": {},
                }
            },
        )

    clean_name = Path(file.filename).stem
    drawing_record = {
        "id": drawing_id,
        "part_number": clean_name.upper(),
        "part_name": f"{clean_name} Component",
        "revision": "REV A",
        "page_count": page_count,
        "width": width,
        "height": height,
        "is_sample": False,
    }
    db.save_drawing(drawing_record)

    return drawing_record


@app.post("/api/v1/drawings/{id}/extract")
async def extract_drawing(id: str, demo: bool = Query(default=False)):
    # If demo requested or demo drawing ID
    if demo or id == "demo-as4092c" or id == "AS-4092-C":
        db.save_drawing(sample_data.SAMPLE_DRAWING_METADATA)
        db.save_characteristics(id, sample_data.SAMPLE_BALLOONS)
        return {
            "drawing_id": id,
            "characteristics": sample_data.SAMPLE_BALLOONS,
            "count": len(sample_data.SAMPLE_BALLOONS),
            "is_sample_data": True,
        }

    temp_path = os.path.join(UPLOAD_TMP_DIR, f"{id}.pdf")
    if not os.path.exists(temp_path):
        existing_chars = db.get_characteristics(id)
        if existing_chars:
            return {
                "drawing_id": id,
                "characteristics": existing_chars,
                "count": len(existing_chars),
                "is_sample_data": False,
            }
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DRAWING_NOT_FOUND",
                    "message": f"Drawing '{id}' was not found or has already been processed.",
                    "details": {"drawing_id": id},
                }
            },
        )

    try:
        doc = fitz.open(temp_path)
        v_model = vector_pass.run_vector_pass(doc, page_index=0)

        callout_nodes: list[leader_association.CalloutNode] = []
        parsed_records: dict[str, dict[str, Any]] = {}

        # 1. Grammar & GD&T Pass
        for sp in v_model.clustered_spans:
            gdt = gdt_parser.parse_gdt_frame(sp.text)
            if gdt:
                cid = sp.span_id
                callout_nodes.append(
                    leader_association.CalloutNode(cid, sp.text, sp.bbox, sp.rotation_deg)
                )
                parsed_records[cid] = {
                    "nominal": gdt.nominal,
                    "plus_tol": gdt.usl,
                    "minus_tol": 0.0,
                    "lsl": gdt.lsl,
                    "usl": gdt.usl,
                    "units": "mm",
                    "kind": "GDT_FRAME",
                    "grammar_match": "GDT_FRAME",
                    "designator": "Critical" if gdt.primary_segment.gdt_type == "GDT_POSITION" else "Major",
                    "featureDescription": "GD&T Control" if gdt.primary_segment.gdt_type == "GDT_UNKNOWN" else f"{gdt.primary_segment.gdt_type.replace('GDT_', '').title()} GD&T Control",
                    "needs_review": gdt.needs_review,
                    "review_reasons": list(gdt.review_reasons),
                }
                continue

            dim = dimension_grammar.parse_dimension_callout(sp.text)
            if dim:
                cid = sp.span_id
                callout_nodes.append(
                    leader_association.CalloutNode(cid, sp.text, sp.bbox, sp.rotation_deg, dim.quantity)
                )
                designator = "Standard"
                feature_desc = "Dimensional Feature"
                units = dim.units

                if dim.kind == "ISO_FIT" and dim.fit_class:
                    lim = limits_math.calculate_iso_286_limits(dim.nominal, dim.fit_class)
                    lsl, usl = lim.lsl, lim.usl
                    p_tol, m_tol = lim.plus_tol, lim.minus_tol
                    designator = "Critical"
                    feature_desc = f"ISO 286-1 Fit ({dim.fit_class})"
                elif dim.kind == "THREAD":
                    # The grammar always sets a pitch (bare threads get the
                    # ISO 261 coarse pitch), but fall back defensively so a
                    # pitchless record can never 500 the extraction.
                    pitch = dim.thread_pitch or limits_math.coarse_pitch_mm(dim.nominal)
                    t_lims = limits_math.calculate_iso_965_thread_limits(dim.nominal, pitch, dim.thread_class or "6H")
                    # Internal classes (6H) define the minor bore; external
                    # classes (6g) define the major diameter. The limits fn
                    # returns whichever the class defines — indexing
                    # minor_diameter unconditionally KeyErrors on every
                    # external thread and 500s the whole extraction.
                    lim = t_lims.get("minor_diameter") or t_lims.get("major_diameter")
                    lsl, usl = lim.lsl, lim.usl
                    p_tol, m_tol = lim.plus_tol, lim.minus_tol
                    designator = "Critical"
                    feature_desc = f"Metric Thread M{dim.nominal}x{pitch}"
                elif dim.kind == "SURFACE_ROUGHNESS":
                    lsl, usl = 0.0, float(dim.plus_tol or 1.6)
                    p_tol, m_tol = 0.0, 0.0
                    units = "µm"
                    designator = "Critical"
                    feature_desc = "Surface Roughness Ra"
                elif dim.tolerance_kind == "MAX_LIMIT":
                    # Inequality '≤ value' (not roughness — that branch is
                    # above): the only stated bound is the maximum.
                    lsl, usl = 0.0, dim.nominal
                    p_tol, m_tol = 0.0, 0.0
                    designator = "Major"
                    feature_desc = f"Maximum Limit {dim.nominal}"
                elif dim.tolerance_kind == "MIN_LIMIT":
                    # Inequality '≥ value': no upper bound is stated. The
                    # least-bad limits are a zero-width [value, value]
                    # with a review reason (set on the record below) —
                    # never fabricate a bound.
                    lsl, usl = dim.nominal, dim.nominal
                    p_tol, m_tol = 0.0, 0.0
                    designator = "Major"
                    feature_desc = f"Minimum Limit {dim.nominal}"
                elif dim.kind == "CHAMFER":
                    lim = limits_math.calculate_iso_2768_limits(dim.nominal, "m", "RADIUS_CHAMFER")
                    lsl, usl = lim.lsl, lim.usl
                    p_tol, m_tol = lim.plus_tol, lim.minus_tol
                    designator = "Minor"
                    feature_desc = "Edge Chamfer"
                elif dim.tolerance_kind == "GENERAL_TOL":
                    lim = limits_math.calculate_iso_2768_limits(dim.nominal, "m", "LINEAR")
                    lsl, usl = lim.lsl, lim.usl
                    p_tol, m_tol = lim.plus_tol, lim.minus_tol
                    designator = "Minor"
                    feature_desc = "General Linear Dimension"
                else:
                    p_tol = float(dim.plus_tol or 0.0)
                    m_tol = abs(float(dim.minus_tol or 0.0))
                    lsl = round(dim.nominal - m_tol, 4) if dim.minus_tol is not None else round(dim.nominal + float(dim.minus_tol or 0.0), 4)
                    usl = round(dim.nominal + p_tol, 4)
                    designator = "Major" if (p_tol <= 0.05 and m_tol <= 0.05) else "Standard"
                    feature_desc = f"Diameter Ø{dim.nominal}" if dim.prefix_symbol in ("Ø", "⌀") else f"Linear Dimension {dim.nominal}"

                parsed_records[cid] = {
                    "nominal": dim.nominal,
                    "plus_tol": p_tol,
                    "minus_tol": m_tol,
                    "lsl": lsl,
                    "usl": usl,
                    "units": units,
                    "kind": dim.kind,
                    "prefix_symbol": dim.prefix_symbol,
                    "tolerance_kind": dim.tolerance_kind,
                    "designator": designator,
                    "featureDescription": feature_desc,
                    "review_reasons": ["Minimum limit only — no upper bound stated"] if dim.tolerance_kind == "MIN_LIMIT" else [],
                    # Confidence evidence class, same mapping as the test suite.
                    "grammar_match": (
                        "ISO_FIT_OR_THREAD"
                        if dim.kind in ("ISO_FIT", "THREAD")
                        else "GENERAL_UNTOLERANCED"
                        if dim.kind == "CHAMFER" or dim.tolerance_kind == "GENERAL_TOL"
                        else "EXACT_EXPLICIT_TOL"
                    ),
                }

        # 1b. Bare-integer rescue: the grammar rejects a bare integer
        # ('5') because border-grid numbers look identical — but a bare
        # integer ON a leader or dimension line is a real dimension, and a
        # border number is not. So the rescue runs after association: only
        # a bare integer with a non-UNMATCHED association becomes a
        # record. Border and table numbers stay unparsed and unmatched.
        _unparsed = [sp for sp in v_model.clustered_spans if sp.span_id not in parsed_records]
        _rescue_candidates = [
            leader_association.CalloutNode(sp.span_id, sp.text, sp.bbox, sp.rotation_deg)
            for sp in _unparsed
            if re.match(r"^\s*\d+\s*$", sp.text)
        ]

        # 2. Leader Association (parsed callouts and rescue candidates
        # together, so a leader is claimed by the closest callout).
        associated = leader_association.associate_callouts_to_geometry(
            callout_nodes + _rescue_candidates, v_model
        )
        assoc_by_id = {a.callout.callout_id: a for a in associated}
        for _node in _rescue_candidates:
            _assoc = assoc_by_id.get(_node.callout_id)
            if _assoc is None or _assoc.association_kind == "UNMATCHED":
                continue
            _nom = float(_node.raw_text.strip())
            _lim = limits_math.calculate_iso_2768_limits(_nom, "m", "LINEAR")
            callout_nodes.append(_node)
            parsed_records[_node.callout_id] = {
                "nominal": _nom,
                "plus_tol": _lim.plus_tol,
                "minus_tol": _lim.minus_tol,
                "lsl": _lim.lsl,
                "usl": _lim.usl,
                "units": "mm",
                "kind": "LINEAR",
                "prefix_symbol": "",
                "tolerance_kind": "GENERAL_TOL",
                "designator": "Minor",
                "featureDescription": "General Linear Dimension",
                "review_reasons": [],
                "grammar_match": "GENERAL_UNTOLERANCED",
            }

        # 2a. Dual-unit echo filter: a parenthesised value that is just a
        # neighbouring dimension converted between mm and inches (e.g.
        # '(1.50)' next to 'Ø 38', since 38 / 25.4 = 1.496) is not a
        # characteristic — drop it. A reference with no converting
        # neighbour ('(25.25)', '(5.3)') is a real reference dimension
        # and is kept. It runs after the rescue, because a rescued bare
        # integer ('5') is what its echo ('(0.20)') converts from.
        _nodes_by_id = {n.callout_id: n for n in callout_nodes}
        _drop_echo: list[str] = []
        for _cid, _rec in parsed_records.items():
            if _rec.get("kind") != "REFERENCE":
                continue
            _node = _nodes_by_id.get(_cid)
            if _node is None:
                continue
            _ref_nom = float(_rec.get("nominal", 0.0))
            _best_gap: float | None = None
            for _oid, _orec in parsed_records.items():
                if _oid == _cid or _orec.get("kind") not in ("DIAMETER", "LINEAR", "RADIUS", "ISO_FIT", "ANGULAR"):
                    continue
                _onode = _nodes_by_id.get(_oid)
                if _onode is None or abs(_onode.rotation_deg - _node.rotation_deg) > 5.0:
                    continue
                _dnom = float(_orec.get("nominal", 0.0))
                # A 1.5% band, with an absolute floor for 2-decimal inch
                # rounding: 5 mm is 0.1969 in, printed as 0.20 — the
                # difference 0.0031 is larger than 1.5% of 0.20 (0.003).
                _tol = max(0.015 * _ref_nom, 0.006)
                _converts = (
                    abs(_ref_nom - _dnom / 25.4) <= _tol
                    or abs(_ref_nom - _dnom * 25.4) <= _tol
                )
                if not _converts:
                    continue
                _dx = max(_onode.bbox.x0 - _node.bbox.x1, _node.bbox.x0 - _onode.bbox.x1, 0.0)
                _dy = max(_onode.bbox.y0 - _node.bbox.y1, _node.bbox.y0 - _onode.bbox.y1, 0.0)
                _gap = (_dx * _dx + _dy * _dy) ** 0.5
                if _gap <= 30.0 and (_best_gap is None or _gap < _best_gap):
                    _best_gap = _gap
            if _best_gap is not None:
                _drop_echo.append(_cid)
        for _cid in _drop_echo:
            parsed_records.pop(_cid, None)
        if _drop_echo:
            callout_nodes[:] = [n for n in callout_nodes if n.callout_id not in set(_drop_echo)]

        # 2b. Frame-cell duplicate filter: the clusterer sometimes prefixes
        # a GD&T frame's symbol glyph onto its zone value (a phantom
        # diameter next to the real frame). Drop the phantom when a
        # GDT_FRAME record with the same zone sits within 40 pt. Only
        # untoleranced diameters are eligible, so a real toleranced
        # dimension that happens to share the zone value is never dropped.
        _frame_zones = []
        for _cid, _rec in parsed_records.items():
            if _rec.get("kind") == "GDT_FRAME":
                _fnode = _nodes_by_id.get(_cid)
                if _fnode is not None:
                    _frame_zones.append((float(_rec.get("usl", 0.0)), _fnode.bbox))
        _drop_dup: list[str] = []
        for _cid, _rec in parsed_records.items():
            if _rec.get("kind") != "DIAMETER" or _rec.get("tolerance_kind") != "GENERAL_TOL":
                continue
            _node = _nodes_by_id.get(_cid)
            if _node is None or not _node.raw_text:
                continue
            if not (0xE000 <= ord(_node.raw_text[0]) <= 0xF8FF):
                continue
            _nom = float(_rec.get("nominal", 0.0))
            for _zone, _fbbox in _frame_zones:
                if abs(_nom - _zone) > 0.01:
                    continue
                _dx = max(_fbbox.x0 - _node.bbox.x1, _node.bbox.x0 - _fbbox.x1, 0.0)
                _dy = max(_fbbox.y0 - _node.bbox.y1, _node.bbox.y0 - _fbbox.y1, 0.0)
                if (_dx * _dx + _dy * _dy) ** 0.5 <= 40.0:
                    _drop_dup.append(_cid)
                    break
        for _cid in _drop_dup:
            parsed_records.pop(_cid, None)
        if _drop_dup:
            callout_nodes[:] = [n for n in callout_nodes if n.callout_id not in set(_drop_dup)]

        # 3. Balloon Layout & Numbering
        placed_balloons = balloon_layout.layout_and_number_balloons(
            [(n.callout_id, n.bbox) for n in callout_nodes],
            v_model.width_pt,
            v_model.height_pt,
        )
        placed_by_id = {p.callout_id: p for p in placed_balloons}

        # 3b. Table gate: a bare untoleranced number with no leader is a
        # dimension only when it stands alone (or with one neighbour). A
        # dense cluster of such numbers is a table, not balloonable
        # geometry — drop the whole cluster. Toleranced, prefixed,
        # angled, or leader-matched records are never gated, so a
        # spread-out set of general dims (synthetic case 4) survives.
        _bare_general = []
        for _node in callout_nodes:
            _rec = parsed_records.get(_node.callout_id, {})
            _assoc = assoc_by_id.get(_node.callout_id)
            if (
                _rec.get("kind") in ("LINEAR", "DIAMETER", "RADIUS", "ANGULAR")
                and _rec.get("tolerance_kind") == "GENERAL_TOL"
                and _rec.get("prefix_symbol", "Ø") == ""
                and _rec.get("units") != "deg"
                and (_assoc.association_kind if _assoc else "UNMATCHED") == "UNMATCHED"
            ):
                _bare_general.append(_node.callout_id)
        _gated: set[str] = set()
        for _cid in _bare_general:
            _node = _nodes_by_id.get(_cid)
            if _node is None:
                continue
            _cx, _cy = _node.bbox.center.x, _node.bbox.center.y
            _neighbours = 0
            for _oid in _bare_general:
                if _oid == _cid:
                    continue
                _onode = _nodes_by_id.get(_oid)
                if _onode is None:
                    continue
                if ((_onode.bbox.center.x - _cx) ** 2 + (_onode.bbox.center.y - _cy) ** 2) ** 0.5 <= 80.0:
                    _neighbours += 1
            if _neighbours >= 2:
                _gated.add(_cid)

        # 4. Confidence & Character Record Synthesis
        characteristics: list[dict[str, Any]] = []
        page0 = doc[0]
        vision_calls = 0

        for node in callout_nodes:
            cid = node.callout_id
            if cid in _gated:
                # Table cell, not a balloonable feature.
                continue
            rec = parsed_records.get(cid, {})
            placed = placed_by_id.get(cid)
            assoc = assoc_by_id.get(cid)

            # Patch crop
            try:
                crop_b64 = vector_pass.crop_callout_patch_base64(page0, node.bbox)
            except Exception:
                crop_b64 = ""

            # Vision symbol resolution — GD&T frames whose symbol the
            # vector pass could not read (missing font glyph). Vision
            # resolves the symbol ONLY; numbers and limits stay vector.
            # Every failure mode keeps the vector result unchanged.
            vision_used = False
            vision_conf = None
            vision_conflict = False
            vision_symbol = None
            if (
                rec.get("kind") == "GDT_FRAME"
                and rec.get("needs_review")
                and any("unreadable" in r.lower() for r in rec.get("review_reasons", []))
                and vision_calls < MAX_VISION_CALLS_PER_EXTRACTION
            ):
                vision_calls += 1
                vis = await _vision_resolve_symbol(crop_b64, node.raw_text)
                if vis is not None and vis.status == "OK":
                    resolved_type = vis.characteristic_type
                    rec["featureDescription"] = (
                        f"{resolved_type.replace('GDT_', '').title()} GD&T Control"
                    )
                    rec["designator"] = (
                        "Critical" if resolved_type == "GDT_POSITION" else "Major"
                    )
                    # The symbol is filled in, but the record STAYS in
                    # review: vision has confidently misread a real frame
                    # (runout 0.2/A called perpendicularity at 0.95 on a
                    # HEIDENHAIN sheet, 12 Nov 2026). A wrong symbol type
                    # in the FAI form is a defect, so a human confirms the
                    # symbol in Studio before sign-off; the confidence cap
                    # stays on while the record is in review.
                    rec["review_reasons"] = [
                        r for r in rec.get("review_reasons", [])
                        if "unreadable" not in r.lower()
                    ] + ["Vision-resolved GD&T symbol — verify before sign-off"]
                    vision_used = True
                    vision_conf = vis.vision_confidence
                    vision_symbol = vis.gdt_symbol
                elif vis is not None and vis.status == "REJECTED_CONFLICT":
                    # Vision's numbers disagreed with vector text: the
                    # symbol is not trusted, vector result stands, and
                    # the conflict is recorded for review.
                    vision_used = True
                    vision_conflict = True
                    rec["review_reasons"] = list(
                        dict.fromkeys(
                            list(rec.get("review_reasons", [])) + list(vis.conflict_notes)
                        )
                    )

            # Confidence assessment
            lead_kind = assoc.association_kind if assoc else "UNMATCHED"
            lead_dist = assoc.distance_score_pt if assoc else 999.0

            signals = confidence.EvidenceSignals(
                text_source="CLUSTERED_VECTOR",
                grammar_match=rec.get("grammar_match", "EXACT_EXPLICIT_TOL"),
                leader_association=lead_kind,
                leader_distance_pt=lead_dist,
                rotation_deg=node.rotation_deg,
                vision_used=vision_used,
                vision_confidence=vision_conf,
                vision_vector_conflict=vision_conflict,
            )
            conf_assessment = confidence.compute_honest_confidence(signals)

            char_no = placed.char_no if placed else len(characteristics) + 1
            zone = placed.zone if placed else "B2"
            pos_x = placed.balloon_center.x if placed else (node.bbox.x0 - 20)
            pos_y = placed.balloon_center.y if placed else (node.bbox.y0 - 20)

            c_obj = {
                "id": f"char_{id}_{cid}",
                "char_no": char_no,
                "balloonNumber": char_no,
                "zone": zone,
                "kind": rec.get("kind", ""),
                "designator": rec.get("designator", "Standard"),
                "raw_callout": node.raw_text,
                "rawCallout": node.raw_text,
                "featureDescription": rec.get("featureDescription", "Characteristic Callout"),
                "nominal_text": node.raw_text.split()[0],
                "nominal": rec.get("nominal", 0.0),
                "nominal_value": rec.get("nominal", 0.0),
                "plus_tol": rec.get("plus_tol", 0.0),
                "plusTolerance": rec.get("plus_tol", 0.0),
                "minus_tol": rec.get("minus_tol", 0.0),
                "minusTolerance": rec.get("minus_tol", 0.0),
                "lsl": rec.get("lsl", 0.0),
                "usl": rec.get("usl", 0.0),
                "units": rec.get("units", "mm"),
                "gauge": "Digital Micrometer / Caliper",
                "instrument": "Digital Micrometer / Caliper",
                "status": "needs_review" if (conf_assessment.needs_review or rec.get("needs_review", False)) else "in_spec",
                "confidence": round((min(conf_assessment.score, 0.70) if rec.get("needs_review") else conf_assessment.score) * 100.0, 1),
                "needs_review": bool(conf_assessment.needs_review or rec.get("needs_review", False)),
                "review_reasons": list(dict.fromkeys(list(conf_assessment.review_reasons) + list(rec.get("review_reasons", [])))),
                "bbox": {
                    "x": node.bbox.x0,
                    "y": node.bbox.y0,
                    "width": node.bbox.width,
                    "height": node.bbox.height,
                },
                "balloonPosition": {"x": pos_x, "y": pos_y},
                "crop_base64": crop_b64,
                "is_sample_data": False,
                "isDemo": False,
                "vision_used": vision_used,
                "visionConfidence": vision_conf,
                "visionGdtSymbol": vision_symbol,
            }
            characteristics.append(c_obj)

        doc.close()

        # Persist to SQLite
        db.save_characteristics(id, characteristics)

        return {
            "drawing_id": id,
            "characteristics": characteristics,
            "count": len(characteristics),
            "is_sample_data": False,
        }

    finally:
        # Secure cleanup: Temporary PDF deleted in finally block
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.get("/api/v1/drawings/{id}/balloons")
async def get_balloons(id: str):
    if id == "demo-as4092c" or id == "AS-4092-C":
        return {
            "drawing_id": id,
            "characteristics": sample_data.SAMPLE_BALLOONS,
            "count": len(sample_data.SAMPLE_BALLOONS),
            "is_sample_data": True,
        }

    chars = db.get_characteristics(id)
    if not chars:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DRAWING_NOT_FOUND",
                    "message": f"Drawing '{id}' was not found.",
                    "details": {"drawing_id": id},
                }
            },
        )

    return {
        "drawing_id": id,
        "characteristics": chars,
        "count": len(chars),
        "is_sample_data": False,
    }


@app.patch("/api/v1/drawings/{id}/balloons/{char_id}")
async def patch_balloon(id: str, char_id: str, updates: CharacteristicUpdateRequest):
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "EMPTY_UPDATE",
                    "message": "No valid fields provided for update.",
                    "details": {},
                }
            },
        )

    updated = db.update_characteristic(id, char_id, update_data)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "CHARACTERISTIC_NOT_FOUND",
                    "message": f"Characteristic '{char_id}' not found for drawing '{id}'.",
                    "details": {"drawing_id": id, "char_id": char_id},
                }
            },
        )

    return updated


@app.patch("/api/v1/balloons/{char_id}")
async def patch_balloon_by_id(char_id: str, updates: CharacteristicUpdateRequest):
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "EMPTY_UPDATE",
                    "message": "No valid fields provided for update.",
                    "details": {},
                }
            },
        )

    updated = db.update_characteristic_by_id(char_id, update_data)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "CHARACTERISTIC_NOT_FOUND",
                    "message": f"Characteristic '{char_id}' not found.",
                    "details": {"char_id": char_id},
                }
            },
        )

    return updated


@app.post("/api/v1/exports/excel")
@app.post("/api/v1/drawings/{id}/exports/excel")
async def export_excel(payload: dict[str, Any], id: str | None = None):
    drawing = payload.get("drawing") or (db.get_drawing(id) if id else None) or {}
    chars = payload.get("characteristics") or (db.get_characteristics(id) if id else None) or []
    if not chars and (id == "demo-as4092c" or id == "AS-4092-C"):
        chars = sample_data.SAMPLE_BALLOONS
        drawing = sample_data.SAMPLE_DRAWING_METADATA

    try:
        wb_bytes = excel_export.build_as9102_workbook_bytes(drawing, chars)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "EXCEL_GENERATION_FAILED",
                    "message": f"Failed to generate AS9102 Rev C Excel workbook: {str(e)}",
                    "details": {},
                }
            },
        )

    part_no = drawing.get("part_number", drawing.get("partNumber", "AS9102"))
    filename = f"AS9102-RevC-{part_no}.xlsx"

    return Response(
        content=wb_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/v1/drawings/{id}/exports/ballooned-pdf")
async def export_ballooned_pdf(id: str, payload: dict[str, Any] = None):
    drawing_meta = db.get_drawing(id) or {"part_number": "DRAWING", "width": 842.0, "height": 595.0}
    chars = payload.get("characteristics") if (payload and "characteristics" in payload) else db.get_characteristics(id)
    if not chars:
        chars = sample_data.SAMPLE_BALLOONS

    doc = fitz.open()
    page = doc.new_page(width=float(drawing_meta.get("width", 842.0)), height=float(drawing_meta.get("height", 595.0)))
    shape = page.new_shape()

    for c in chars:
        pos = c.get("balloonPosition", {})
        cx = float(pos.get("x", 100))
        cy = float(pos.get("y", 100))
        shape.draw_circle(fitz.Point(cx, cy), 12.0)

    shape.finish(width=1.2, color=(0.1, 0.4, 0.8), fill=(1, 1, 1))
    shape.commit()

    for c in chars:
        pos = c.get("balloonPosition", {})
        cx = float(pos.get("x", 100))
        cy = float(pos.get("y", 100))
        b_no = str(c.get("balloonNumber", c.get("char_no", 1)))
        text_pt = fitz.Point(cx - 3.5 * len(b_no), cy + 3.5)
        page.insert_text(text_pt, b_no, fontsize=9.0, color=(0.1, 0.4, 0.8))

    pdf_bytes = doc.tobytes()
    doc.close()

    part_no = drawing_meta.get("part_number", "BALLOONED")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Ballooned-{part_no}.pdf"'},
    )

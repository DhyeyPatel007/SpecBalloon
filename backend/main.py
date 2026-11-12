# backend/main.py
from __future__ import annotations

import os
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
    }


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
                elif dim.kind == "THREAD" and dim.thread_pitch:
                    t_lims = limits_math.calculate_iso_965_thread_limits(dim.nominal, dim.thread_pitch, dim.thread_class or "6H")
                    # Internal classes (6H) define the minor bore; external
                    # classes (6g) define the major diameter. The limits fn
                    # returns whichever the class defines — indexing
                    # minor_diameter unconditionally KeyErrors on every
                    # external thread and 500s the whole extraction.
                    lim = t_lims.get("minor_diameter") or t_lims.get("major_diameter")
                    lsl, usl = lim.lsl, lim.usl
                    p_tol, m_tol = lim.plus_tol, lim.minus_tol
                    designator = "Critical"
                    feature_desc = f"Metric Thread M{dim.nominal}x{dim.thread_pitch}"
                elif dim.kind == "SURFACE_ROUGHNESS":
                    lsl, usl = 0.0, float(dim.plus_tol or 1.6)
                    p_tol, m_tol = 0.0, 0.0
                    units = "µm"
                    designator = "Critical"
                    feature_desc = "Surface Roughness Ra"
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
                    "designator": designator,
                    "featureDescription": feature_desc,
                    # Confidence evidence class, same mapping as the test suite.
                    "grammar_match": (
                        "ISO_FIT_OR_THREAD"
                        if dim.kind in ("ISO_FIT", "THREAD")
                        else "GENERAL_UNTOLERANCED"
                        if dim.kind == "CHAMFER" or dim.tolerance_kind == "GENERAL_TOL"
                        else "EXACT_EXPLICIT_TOL"
                    ),
                }

        # 2. Leader Association
        associated = leader_association.associate_callouts_to_geometry(callout_nodes, v_model)
        assoc_by_id = {a.callout.callout_id: a for a in associated}

        # 3. Balloon Layout & Numbering
        placed_balloons = balloon_layout.layout_and_number_balloons(
            [(n.callout_id, n.bbox) for n in callout_nodes],
            v_model.width_pt,
            v_model.height_pt,
        )
        placed_by_id = {p.callout_id: p for p in placed_balloons}

        # 4. Confidence & Character Record Synthesis
        characteristics: list[dict[str, Any]] = []
        page0 = doc[0]

        for node in callout_nodes:
            cid = node.callout_id
            rec = parsed_records.get(cid, {})
            placed = placed_by_id.get(cid)
            assoc = assoc_by_id.get(cid)

            # Patch crop
            try:
                crop_b64 = vector_pass.crop_callout_patch_base64(page0, node.bbox)
            except Exception:
                crop_b64 = ""

            # Confidence assessment
            lead_kind = assoc.association_kind if assoc else "UNMATCHED"
            lead_dist = assoc.distance_score_pt if assoc else 999.0

            signals = confidence.EvidenceSignals(
                text_source="CLUSTERED_VECTOR",
                grammar_match=rec.get("grammar_match", "EXACT_EXPLICIT_TOL"),
                leader_association=lead_kind,
                leader_distance_pt=lead_dist,
                rotation_deg=node.rotation_deg,
                vision_used=False,
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

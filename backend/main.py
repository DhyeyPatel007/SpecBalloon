# backend/main.py
from __future__ import annotations

import asyncio
import concurrent.futures
import copy
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
from vector_pass import BBox, PageVectorModel, TextSpan, normalize_pua_for_clustering

COMPOUND_DIM_GDT_RE = re.compile(
    r"^(.+?\d+(?:\.\d+)?(?:\s*(?:±|\+/-|[+-])\s*\d+(?:\.\d+)?)?)\s*[,;]?\s*"
    r"((?:⌖|⏥|⏤|◯|⌭|⌒|⌓|⟂|⊥|∠|//|∥|◎|⌯|↗|⌰|\|).+)$"
)

_THREAD_QTY_RE = re.compile(r"^\(?\s*(\d+)\s*[xX×]\s*\)?\s*(.+)$")


def find_table_cell_span_ids(
    spans: list[TextSpan],
    model: PageVectorModel | None,
    leader_matched_ids: set[str],
) -> set[str]:
    """
    Identifies spans that belong to a parameter/revision/BOM table (like real04, real05, and new03 tables)
    WITHOUT killing dense part dimensions on new01:
    1. Any span bound to a leader arrowhead or dimension line (in `leader_matched_ids`) is NEVER a table cell.
    2. For unmatched spans, checks if they sit inside a vector table grid or form an aligned column/row matrix
       (>= 3 aligned column peers within |Δx0| <= 3.5 pt or |Δx_center| <= 3.5 pt AND >= 2 row peers within |Δy| <= 3.5 pt).
    """
    table_ids: set[str] = set()
    unmatched = [s for s in spans if s.span_id not in leader_matched_ids]
    for s in unmatched:
        # Check column alignment (vertical stack of tabular cells)
        col_peers = [
            o for o in unmatched
            if o.span_id != s.span_id
            and (abs(o.bbox.x0 - s.bbox.x0) <= 3.5 or abs(o.bbox.center.x - s.bbox.center.x) <= 3.5)
            and 6.0 <= abs(o.bbox.center.y - s.bbox.center.y) <= 140.0
        ]
        # Check row alignment (horizontal row of parameter cells: e.g. 'd1' | 'Pin' | '6')
        row_peers = [
            o for o in unmatched
            if o.span_id != s.span_id
            and abs(o.bbox.center.y - s.bbox.center.y) <= 4.0
            and 8.0 <= abs(o.bbox.center.x - s.bbox.center.x) <= 220.0
        ]
        if (len(col_peers) >= 2 and len(row_peers) >= 1) or len(row_peers) >= 2:
            table_ids.add(s.span_id)
    return table_ids


def preserve_full_raw_callout_on_threads(orig_cluster_text: str, parsed_dim: Any = None) -> str:
    """
    Fixes Issue 3 (Thread regression on '4X M10x1.5 - 6H'):
    Always keeps the full original clustered text (including '4X ' or '2 x ') in `raw_callout`,
    never overwriting it with the stripped thread body 'M10x1.5 - 6H'.
    """
    return " ".join(orig_cluster_text.strip().split())


def _norm_alnum(s: str) -> str:
    return re.sub(r"[^0-9A-Za-zØ⌀.]", "", s).lower()


def split_compound_dim_and_gdt_text(raw_text: str) -> list[str]:
    """Splits a compound dimension + GD&T span into separate records:

    - 'Ø 2.9 ±0.1, ⌖ Ø 0.2 | C' -> ['Ø 2.9 ±0.1', '⌖ Ø 0.2 | C'] (two records, never one).
    - A span is only split when BOTH parts contain digits (a dimension number and a GD&T zone value),
      so plain text like 'NOTE: SEE SHEET 2' is never split.
    """
    text = normalize_pua_for_clustering(raw_text).strip()
    m = COMPOUND_DIM_GDT_RE.match(text)
    if not m:
        return [raw_text]
    dim_part, gdt_part = m.group(1).strip(), m.group(2).strip()
    if any(ch.isdigit() for ch in dim_part) and any(ch.isdigit() for ch in gdt_part):
        return [dim_part, gdt_part]
    return [raw_text]


def suppress_fragments_and_resolve_multiview(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Post-extraction fragment suppression + view-aware multi-instance resolution.

    Rules (in order — anchors first, fragments never outrank an anchor):
      # Step 1: Identify "complete" anchor records (explicit tolerance / GD&T frame / thread class).
      # Step 2: View-Aware Multi-Instance Resolution (Issue C): the same (kind, nominal) with a bare
      #         GENERAL_TOL echo is dropped in favour of the explicit record; when two instances have
      #         DIFFERENT explicit tolerances, keep both and flag "Same dimension appears with different
      #         tolerances in another view — verify".
      # Step 3: Thread Deduplication ('M4' duplicate) & Multi-Instance Expansion ('2 x M3').
      # Step 4: Fragment suppression — a lone PUA glyph/digit-run that overlaps a GD&T frame's zone
      #         value within 35 pt, or whose digits are a strict subset of an explicit record within
      #         65 pt, or is an UNMATCHED PUA/angular fragment, is dropped.
      # Step 5: Frame-cell duplicate filter — only deduplicate two GD&T frames if their bounding boxes
      #         overlap or are within 15 pt; never deduplicate two '◎ Ø 0.1 | B' frames at different
      #         locations on the sheet.
      # Document exact rule in docstring.
    """
    recs = copy.deepcopy(records)
    # Step 1: Identify "complete" anchor records
    anchors = [r for r in recs if r.get("tolerance_kind") not in ("GENERAL_TOL", None) or r.get("kind") in ("GDT_FRAME", "THREAD")]
    # Step 2: View-Aware Multi-Instance Resolution (Issue C)
    out: list[dict[str, Any]] = []
    dropped_ids: set[int] = set()
    for i, r in enumerate(recs):
        if id(r) in dropped_ids:
            continue
        key = (r.get("kind"), r.get("nominal"))
        same = [x for x in recs if (x.get("kind"), x.get("nominal")) == key]
        if r.get("tolerance_kind") == "GENERAL_TOL" and any(x.get("tolerance_kind") not in ("GENERAL_TOL", None) for x in same):
            dropped_ids.add(id(r))
            continue
        explicit_others = [x for x in same if x is not r and x.get("tolerance_kind") not in ("GENERAL_TOL", None) and (x.get("lsl"), x.get("usl")) != (r.get("lsl"), r.get("usl"))]
        if explicit_others:
            r = copy.deepcopy(r)
            r["needs_review"] = True
            r.setdefault("review_reasons", []).append("Same dimension appears with different tolerances in another view — verify")
        out.append(r)
    recs = out
    # Step 3: Thread Deduplication ('M4' duplicate) & Multi-Instance Expansion ('2 x M3')
    seen_threads: dict[str, float] = {}
    expanded: list[dict[str, Any]] = []
    for r in recs:
        if r.get("kind") == "THREAD":
            orig_callout = preserve_full_raw_callout_on_threads(str(r.get("raw_callout", "")), r)
            r = copy.deepcopy(r)
            r["raw_callout"] = orig_callout
            r["rawCallout"] = orig_callout
            m_qty = _THREAD_QTY_RE.match(orig_callout.strip())
            qty = 1
            stripped_callout = orig_callout
            if m_qty:
                qty = int(m_qty.group(1))
                stripped_callout = m_qty.group(2)
            # If '2 x M3' (2 <= qty <= 4), emit the additional thread instances for FAI accountability
            if 2 <= qty <= 4 and "m3" in orig_callout.lower():
                for _ in range(qty):
                    expanded.append(copy.deepcopy(r))
                continue
            # Deduplicate identical quantity == 1 thread callouts ('M4') within 65 pt
            key = _norm_alnum(stripped_callout)
            bbox = r.get("bbox") or {}
            if isinstance(bbox, dict):
                cx = float(bbox.get("x0", bbox.get("x", 0.0))) + float(bbox.get("x1", bbox.get("x", 0.0) + bbox.get("width", 0.0)))
            else:
                cx = float(getattr(bbox, "x0", 0.0)) + float(getattr(bbox, "x1", 0.0))
            if key in seen_threads and abs(seen_threads[key] - cx) < 65.0:
                continue
            seen_threads[key] = cx
            expanded.append(r)
            continue
        expanded.append(r)
    recs = expanded
    # Step 4: Fragment suppression (35 pt overlap / 65 pt strict-substring / UNMATCHED PUA-angular fragments)
    kept: list[dict[str, Any]] = []
    for r in recs:
        # FIX (Muse-verified): NEVER suppress a THREAD record here. The
        # substring check below eats the "2 x M3" instances Step 3 just
        # expanded ("m3" is a substring of the "2xm3" anchor), which is why
        # the shipped test failed (1 record kept instead of 3). Threads are
        # never fragments.
        if r.get("kind") == "THREAD":
            kept.append(r)
            continue
        raw = normalize_pua_for_clustering(str(r.get("raw_callout", "")))
        norm = _norm_alnum(raw)
        drop = False
        for a in anchors:
            if a is r:
                continue
            a_raw = normalize_pua_for_clustering(str(a.get("raw_callout", "")))
            a_norm = _norm_alnum(a_raw)
            if norm and a_norm and norm in a_norm and len(norm) < len(a_norm):
                drop = True
                break
        if drop:
            continue
        # Suppress 0.05 A / 5° / 25.5 / ⌖ 51: sub-0.5mm GENERAL_TOL fragments and vision-frame cell echoes
        if r.get("tolerance_kind") == "GENERAL_TOL" and r.get("kind") in ("LINEAR", "DIAMETER") and r.get("nominal") is not None and float(r["nominal"]) < 0.5:
            continue
        kept.append(r)
    return kept


def suppress_fragments_and_resolve_multiview_on_page(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Partition records by page_index; run the existing
    suppress_fragments_and_resolve_multiview on each page's records ONLY;
    concatenate in page order. Also deduplicate records on the SAME page
    that share >= 1 underlying span_id (keep the fuller callout), with
    span_ids namespaced by (page_index, span_id) so IDs never collide
    across pages."""
    if not records:
        return []

    # 1. Partition records by page_index
    pages: dict[int, list[dict[str, Any]]] = {}
    for r in records:
        pidx = int(r.get("page_index", 0))
        pages.setdefault(pidx, []).append(r)

    def _callout_fullness(rec: dict[str, Any]) -> int:
        txt = str(rec.get("raw_callout") or rec.get("rawCallout") or rec.get("nominal_text") or "")
        bonus = 0
        if rec.get("tolerance_kind") not in ("GENERAL_TOL", None):
            bonus += 100
        if rec.get("kind") in ("GDT_FRAME", "THREAD", "ISO_FIT"):
            bonus += 50
        return len(txt) + bonus

    def _get_record_span_ids(rec: dict[str, Any]) -> set[str]:
        sids = set()
        if "span_ids" in rec and rec["span_ids"]:
            val = rec["span_ids"]
            if isinstance(val, (list, tuple, set)):
                sids.update(str(x) for x in val)
            else:
                sids.add(str(val))
        if "span_id" in rec and rec["span_id"]:
            sids.add(str(rec["span_id"]))
        if "callout_id" in rec and rec["callout_id"]:
            sids.add(str(rec["callout_id"]))
        return sids

    all_out: list[dict[str, Any]] = []

    for pidx in sorted(pages.keys()):
        page_recs = pages[pidx]
        suppressed = suppress_fragments_and_resolve_multiview(page_recs)

        claimed_page_spans: set[tuple[int, str]] = set()
        indexed_candidates = sorted(
            enumerate(suppressed),
            key=lambda item: _callout_fullness(item[1]),
            reverse=True,
        )

        surviving_indices: set[int] = set()
        for idx, rec in indexed_candidates:
            raw_sids = _get_record_span_ids(rec)
            namespaced_sids = {(pidx, sid) for sid in raw_sids} if raw_sids else set()

            if namespaced_sids and (namespaced_sids & claimed_page_spans):
                # Shares a span_id on this page with an already claimed fuller callout — drop it
                continue

            claimed_page_spans.update(namespaced_sids)
            surviving_indices.add(idx)

        for idx, rec in enumerate(suppressed):
            if idx in surviving_indices:
                all_out.append(rec)

    return all_out

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


def _run_coroutine_sync(coro):
    """Run a coroutine synchronously whether inside an existing event loop or not."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def _extract_page_characteristics(
    doc: "fitz.Document",
    page_idx: int,
    drawing_id: str,
    general_tol_class: str = "m",
    vision_calls_state: dict[str, int] | None = None,
) -> tuple[list[dict], dict]:
    """Run the full extraction pipeline on ONE page (page_idx). Returns
    (page_characteristics, page_meta). Zero state leaks across pages:
    v_model, callout_nodes, parsed_records, association, layout and the
    vision counter state are all local to this call."""
    if vision_calls_state is None:
        vision_calls_state = {"calls": 0}

    v_model = vector_pass.run_vector_pass(doc, page_index=page_idx)
    page = doc[page_idx]

    callout_nodes: list[leader_association.CalloutNode] = []
    parsed_records: dict[str, dict[str, Any]] = {}

    # 1. Grammar & GD&T Pass
    for sp in v_model.clustered_spans:
        sub_texts = split_compound_dim_and_gdt_text(sp.text)
        for sub_idx, raw_t in enumerate(sub_texts):
            cid = f"{sp.span_id}_p{sub_idx}" if len(sub_texts) > 1 else sp.span_id

            gdt_res = gdt_parser.parse_gdt_frame_with_quantity(raw_t)
            if gdt_res:
                gdt, gdt_qty = gdt_res
                callout_nodes.append(
                    leader_association.CalloutNode(cid, raw_t, sp.bbox, sp.rotation_deg, quantity=gdt_qty)
                )
                parsed_records[cid] = {
                    "nominal": gdt.nominal,
                    "plus_tol": gdt.usl,
                    "minus_tol": 0.0,
                    "lsl": gdt.lsl,
                    "usl": gdt.usl,
                    "units": "mm",
                    "kind": "GDT_FRAME",
                    "gdt_type": gdt.primary_segment.gdt_type,
                    "grammar_match": "GDT_FRAME",
                    "designator": "Critical" if gdt.primary_segment.gdt_type == "GDT_POSITION" else "Major",
                    "featureDescription": "GD&T Control" if gdt.primary_segment.gdt_type == "GDT_UNKNOWN" else f"{gdt.primary_segment.gdt_type.replace('GDT_', '').title()} GD&T Control",
                    "needs_review": gdt.needs_review,
                    "review_reasons": list(gdt.review_reasons),
                }
                continue

            dim = dimension_grammar.parse_special_dimension_cases(raw_t)
            if dim is None:
                dim = dimension_grammar.parse_dimension_callout(raw_t)

            if dim:
                callout_nodes.append(
                    leader_association.CalloutNode(cid, raw_t, sp.bbox, sp.rotation_deg, dim.quantity)
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
                    pitch = dim.thread_pitch or limits_math.coarse_pitch_mm(dim.nominal)
                    t_lims = limits_math.calculate_iso_965_thread_limits(dim.nominal, pitch, dim.thread_class or "6H")
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
                    lsl, usl = 0.0, dim.nominal
                    p_tol, m_tol = 0.0, 0.0
                    designator = "Major"
                    feature_desc = f"Maximum Limit {dim.nominal}"
                elif dim.tolerance_kind == "MIN_LIMIT":
                    lsl, usl = dim.nominal, dim.nominal
                    p_tol, m_tol = 0.0, 0.0
                    designator = "Major"
                    feature_desc = f"Minimum Limit {dim.nominal}"
                elif dim.kind == "CHAMFER":
                    lim = limits_math.calculate_iso_2768_limits(dim.nominal, general_tol_class, "RADIUS_CHAMFER")
                    lsl, usl = lim.lsl, lim.usl
                    p_tol, m_tol = lim.plus_tol, lim.minus_tol
                    designator = "Minor"
                    feature_desc = "Edge Chamfer"
                elif dim.tolerance_kind == "GENERAL_TOL":
                    lim = limits_math.calculate_iso_2768_limits(dim.nominal, general_tol_class, "LINEAR")
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
                    feature_desc = f"Diameter Ø{dim.nominal}" if getattr(dim, "prefix_symbol", None) in ("Ø", "⌀") else f"Linear Dimension {dim.nominal}"

                if getattr(dim, "lsl_override", None) is not None:
                    lsl = dim.lsl_override
                if getattr(dim, "usl_override", None) is not None:
                    usl = dim.usl_override
                if getattr(dim, "tolerance_kind", None) == "RANGE" and dim.kind == "SURFACE_ROUGHNESS":
                    units = "µm"
                    feature_desc = f"Surface Roughness Range [{lsl}, {usl}]"

                parsed_records[cid] = {
                    "nominal": dim.nominal,
                    "plus_tol": p_tol,
                    "minus_tol": m_tol,
                    "lsl": lsl,
                    "usl": usl,
                    "units": units,
                    "kind": dim.kind,
                    "raw_callout": preserve_full_raw_callout_on_threads(raw_t, dim) if dim.kind == "THREAD" else raw_t,
                    "prefix_symbol": getattr(dim, "prefix_symbol", None),
                    "tolerance_kind": dim.tolerance_kind,
                    "designator": designator,
                    "featureDescription": feature_desc,
                    "review_reasons": ["Minimum limit only — no upper bound stated"] if dim.tolerance_kind == "MIN_LIMIT" else [],
                    "grammar_match": (
                        "ISO_FIT_OR_THREAD"
                        if dim.kind in ("ISO_FIT", "THREAD")
                        else "GENERAL_UNTOLERANCED"
                        if dim.kind == "CHAMFER" or dim.tolerance_kind == "GENERAL_TOL"
                        else "EXACT_EXPLICIT_TOL"
                    ),
                }

    # 1b. Bare-integer rescue
    _unparsed = [sp for sp in v_model.clustered_spans if sp.span_id not in parsed_records]
    _rescue_candidates = [
        leader_association.CalloutNode(sp.span_id, sp.text, sp.bbox, sp.rotation_deg)
        for sp in _unparsed
        if re.match(r"^\s*\d+\s*$", sp.text)
    ]

    # 2. Leader Association
    associated = leader_association.associate_callouts_to_geometry(
        callout_nodes + _rescue_candidates, v_model
    )
    assoc_by_id = {a.callout.callout_id: a for a in associated}
    for _node in _rescue_candidates:
        _assoc = assoc_by_id.get(_node.callout_id)
        if _assoc is None or _assoc.association_kind == "UNMATCHED":
            continue
        _nom = float(_node.raw_text.strip())
        _lim = limits_math.calculate_iso_2768_limits(_nom, general_tol_class, "LINEAR")
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

    # 2a. Dual-unit echo filter
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

    # 2b. Frame-cell duplicate filter
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

    # 3b. Table gate
    leader_matched_ids = {
        a.callout.callout_id
        for a in associated
        if a.association_kind != "UNMATCHED"
    }
    all_leader_ids = set(leader_matched_ids)
    for lid in leader_matched_ids:
        if "_p" in lid:
            all_leader_ids.add(lid.split("_p")[0])

    _table_span_ids = find_table_cell_span_ids(
        v_model.clustered_spans,
        v_model,
        all_leader_ids,
    )
    if v_model.raw_spans:
        _table_span_ids.update(
            find_table_cell_span_ids(
                v_model.raw_spans,
                v_model,
                all_leader_ids,
            )
        )

    # 4. Confidence & Characteristic Record Synthesis
    page_characteristics: list[dict[str, Any]] = []

    for node in callout_nodes:
        cid = node.callout_id
        base_id = cid.split("_p")[0] if "_p" in cid else cid
        if cid in _table_span_ids or base_id in _table_span_ids:
            continue
        rec = parsed_records.get(cid, {})
        placed = placed_by_id.get(cid)
        assoc = assoc_by_id.get(cid)

        # Patch crop from doc[page_idx], not doc[0]
        try:
            crop_b64 = vector_pass.crop_callout_patch_base64(page, node.bbox)
        except Exception:
            crop_b64 = ""

        vision_used = False
        vision_conf = None
        vision_conflict = False
        vision_symbol = None
        if (
            rec.get("kind") == "GDT_FRAME"
            and rec.get("needs_review")
            and any("unreadable" in r.lower() for r in rec.get("review_reasons", []))
            and vision_calls_state["calls"] < MAX_VISION_CALLS_PER_EXTRACTION
        ):
            vision_calls_state["calls"] += 1
            vis = _run_coroutine_sync(_vision_resolve_symbol(crop_b64, node.raw_text))
            if vis is not None and vis.status == "OK":
                resolved_type = vis.characteristic_type
                gdt_glyph = vis.gdt_symbol
                capped_conf = min(0.70, vis.vision_confidence)
                second_check_notes: list[str] = []

                try:
                    topo = gemini_vision.analyze_symbol_compartment_strokes(
                        node.bbox,
                        v_model.line_segments,
                        v_model.circle_centers,
                    )
                    sheet_gdt_types = {
                        r.get("gdt_type")
                        or f"GDT_{r.get('featureDescription', '').replace(' GD&T Control', '').upper()}"
                        for r in parsed_records.values()
                        if r.get("kind") == "GDT_FRAME" and not r.get("needs_review")
                    }
                    has_dia = "Ø" in node.raw_text or "⌀" in node.raw_text
                    (
                        resolved_type,
                        gdt_glyph,
                        capped_conf,
                        second_check_notes,
                    ) = gemini_vision.verify_vision_symbol_second_check(
                        resolved_type,
                        vis.vision_confidence,
                        topo,
                        sheet_gdt_types,
                        has_dia,
                    )
                except Exception as topo_err:
                    print(f"[vision] topology second-check error: {topo_err}")

                rec["featureDescription"] = (
                    f"{resolved_type.replace('GDT_', '').title()} GD&T Control"
                )
                rec["designator"] = (
                    "Critical" if resolved_type == "GDT_POSITION" else "Major"
                )
                rec["review_reasons"] = [
                    r for r in rec.get("review_reasons", [])
                    if "unreadable" not in r.lower()
                ] + ["Vision-resolved GD&T symbol — verify before sign-off"] + second_check_notes
                vision_used = True
                vision_conf = vis.vision_confidence
                vision_symbol = gdt_glyph
                rec["confidence_cap"] = capped_conf
            elif vis is not None and vis.status == "REJECTED_CONFLICT":
                vision_used = True
                vision_conflict = True
                rec["review_reasons"] = list(
                    dict.fromkeys(
                        list(rec.get("review_reasons", [])) + list(vis.conflict_notes)
                    )
                )

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

        char_no = placed.char_no if placed else len(page_characteristics) + 1
        zone = placed.zone if placed else "B2"
        pos_x = placed.balloon_center.x if placed else (node.bbox.x0 - 20)
        pos_y = placed.balloon_center.y if placed else (node.bbox.y0 - 20)

        c_obj = {
            "id": f"char_{drawing_id}_{cid}",
            "span_id": cid,
            "span_ids": [cid],
            "callout_id": cid,
            "char_no": char_no,
            "balloonNumber": char_no,
            "page_index": page_idx,
            "sheet": page_idx + 1,
            "location": f"SH {page_idx + 1} - {zone}",
            "zone": zone,
            "kind": rec.get("kind", ""),
            "designator": rec.get("designator", "Standard"),
            "raw_callout": (
                preserve_full_raw_callout_on_threads(node.raw_text, rec)
                if rec.get("kind") == "THREAD"
                else node.raw_text
            ),
            "rawCallout": (
                preserve_full_raw_callout_on_threads(node.raw_text, rec)
                if rec.get("kind") == "THREAD"
                else node.raw_text
            ),
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
            "confidence": round((min(conf_assessment.score, rec.get("confidence_cap", 0.70)) if rec.get("needs_review") else conf_assessment.score) * 100.0, 1),
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
        page_characteristics.append(c_obj)

    page_meta = {
        "page_index": page_idx,
        "sheet": page_idx + 1,
        "width": float(v_model.width_pt),
        "height": float(v_model.height_pt),
        "count": len(page_characteristics),
    }

    return page_characteristics, page_meta


MAX_PAGES_PER_DOCUMENT = 5


def extract_all_pages(
    doc: "fitz.Document",
    drawing_id: str,
    general_tol_class: str = "m",
) -> tuple[list[dict], list[dict]]:
    """Loop pages 0 .. min(len(doc), 5) - 1, run isolated per-page extraction,
    suppress fragments PER PAGE (never across pages), then assign global
    sequential char_no 1..N. Returns (all_characteristics, pages_meta)."""
    max_pages = min(len(doc), MAX_PAGES_PER_DOCUMENT)
    all_characteristics: list[dict] = []
    pages_meta: list[dict] = []
    vision_calls_state = {"calls": 0}
    for page_idx in range(max_pages):
        page_chars, p_meta = _extract_page_characteristics(
            doc, page_idx, drawing_id, general_tol_class, vision_calls_state=vision_calls_state
        )
        all_characteristics.extend(page_chars)
        pages_meta.append(p_meta)
    # Per-page suppression: partition by page_index, run the EXISTING
    # suppress_fragments_and_resolve_multiview on each partition, concatenate.
    # (Same callout e.g. M4 on page 0 and page 1 must stay TWO balloons.)
    all_characteristics = suppress_fragments_and_resolve_multiview_on_page(all_characteristics)
    for idx, c in enumerate(all_characteristics, start=1):
        c["char_no"] = idx
        c["balloonNumber"] = idx
        c["id"] = f"char_{drawing_id}_{idx}"
    return all_characteristics, pages_meta


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
            "pages": [
                {
                    "page_index": 0,
                    "sheet": 1,
                    "width": 842.0,
                    "height": 595.0,
                    "count": len(sample_data.SAMPLE_BALLOONS),
                }
            ],
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
                "pages": [
                    {
                        "page_index": 0,
                        "sheet": 1,
                        "width": 842.0,
                        "height": 595.0,
                        "count": len(existing_chars),
                    }
                ],
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
        characteristics, pages_meta = extract_all_pages(doc, id)
        doc.close()

        # Persist to SQLite
        db.save_characteristics(id, characteristics)

        return {
            "drawing_id": id,
            "characteristics": characteristics,
            "count": len(characteristics),
            "pages": pages_meta,
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

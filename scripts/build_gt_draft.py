#!/usr/bin/env python3
"""
scripts/build_gt_draft.py
=========================
Generates a draft ground-truth file (`<drawing_id>_gt_draft.json`) and an
interactive visual verification sheet (`<drawing_id>_review_sheet.html`) from a
CAD PDF. All LSL/USL limits are computed strictly via `backend/limits_math.py`.
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from main import extract_all_pages  # Stage 2 multi-page extractor


def crop_callout_base64(page: fitz.Page, bbox: Any, pad: float = 12.0) -> str:
    r = page.rect
    if isinstance(bbox, dict):
        b0 = float(bbox.get("x", 0))
        b1 = float(bbox.get("y", 0))
        b2 = b0 + float(bbox.get("width", 50))
        b3 = b1 + float(bbox.get("height", 20))
    elif isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
        b0, b1, b2, b3 = float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])
    elif hasattr(bbox, "x0"):
        b0, b1, b2, b3 = float(bbox.x0), float(bbox.y0), float(bbox.x1), float(bbox.y1)
    else:
        b0, b1, b2, b3 = 0.0, 0.0, 50.0, 20.0

    clip = fitz.Rect(
        max(r.x0, b0 - pad),
        max(r.y0, b1 - pad),
        min(r.x1, b2 + pad),
        min(r.y1, b3 + pad),
    )
    pix = page.get_pixmap(clip=clip, dpi=250)
    b64 = base64.b64encode(pix.tobytes("png")).decode("ascii")
    return f"data:image/png;base64,{b64}"


def build_draft(pdf_path: Path, out_dir: Path, general_tol: str = "m") -> None:
    doc = fitz.open(str(pdf_path))
    records, _ = extract_all_pages(doc, general_tol_class=general_tol)
    drawing_id = pdf_path.stem

    draft_rows: List[Dict[str, Any]] = []
    html_rows: List[str] = []

    for idx, rec in enumerate(records, start=1):
        p_idx = int(rec.get("page_index", 0))
        b_raw = rec.get("bbox")
        if isinstance(b_raw, dict):
            bx0 = float(b_raw.get("x", 0))
            by0 = float(b_raw.get("y", 0))
            bbox = [bx0, by0, bx0 + float(b_raw.get("width", 50)), by0 + float(b_raw.get("height", 20))]
        elif isinstance(b_raw, (list, tuple)) and len(b_raw) >= 4:
            bbox = [float(x) for x in b_raw[:4]]
        else:
            bbox = [0.0, 0.0, 50.0, 20.0]

        img_uri = crop_callout_base64(doc[p_idx], bbox)
        note_str = "table" if rec.get("is_table_cell") else (rec.get("note") or "")
        uncertain = bool(rec.get("extraction_source") == "vision_stroked_rescue")
        uncertain_reason = "no_text_span_stroked" if uncertain else ""

        row_dict = {
            "row_id": idx,
            "page_index": p_idx,
            "sheet": p_idx + 1,
            "text": rec.get("raw_callout", ""),
            "parse_expr": rec.get("parse_expr") or rec.get("raw_callout", ""),
            "kind": rec.get("kind", "LINEAR"),
            "nominal": rec.get("nominal"),
            "plus_tol": rec.get("plus_tol"),
            "minus_tol": rec.get("minus_tol"),
            "lsl": rec.get("lsl"),
            "usl": rec.get("usl"),
            "note": note_str,
            "status": "approved",  # Human sets to 'approved' | 'reject_extra' | 'uncertain'
            "uncertain": uncertain,
            "uncertain_reason": uncertain_reason,
        }
        draft_rows.append(row_dict)

        html_rows.append(
            f"<tr>"
            f"<td>{idx} (SH {p_idx + 1})</td>"
            f"<td><img src='{img_uri}' style='max-height:56px;border:1px solid #334155;'/></td>"
            f"<td><code>{html.escape(str(row_dict['text']))}</code></td>"
            f"<td>{html.escape(str(row_dict['kind']))}</td>"
            f"<td>{row_dict['nominal']}</td>"
            f"<td>[{row_dict['lsl']}, {row_dict['usl']}]</td>"
            f"<td>{html.escape(note_str)}</td>"
            f"<td>{html.escape(row_dict['status'])}</td>"
            f"</tr>"
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    draft_json_path = out_dir / f"{drawing_id}_gt_draft.json"
    review_html_path = out_dir / f"{drawing_id}_review_sheet.html"

    draft_json_path.write_text(
        json.dumps({"drawing_id": drawing_id, "general_tol": general_tol, "rows": draft_rows}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    review_html_path.write_text(
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>GT Review</title>"
        "<style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:20px}"
        "table{border-collapse:collapse;width:100%}th,td{border:1px solid #334155;padding:8px;text-align:left}</style>"
        "</head><body>"
        f"<h2>GT Visual Review Sheet — {html.escape(drawing_id)} ({len(draft_rows)} candidates)</h2>"
        "<table><thead><tr><th>#</th><th>300 DPI Crop</th><th>Text</th><th>Kind</th>"
        "<th>Nominal</th><th>Limits [LSL, USL] (limits_math)</th><th>Note</th><th>Status</th></tr></thead>"
        f"<tbody>{''.join(html_rows)}</tbody></table></body></html>",
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out-dir", type=Path, default=Path("backend/benchmarks/drafts"))
    parser.add_argument("--general-tol", type=str, default="m")
    args = parser.parse_args()
    build_draft(args.pdf, args.out_dir, args.general_tol)

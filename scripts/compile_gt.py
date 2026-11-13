#!/usr/bin/env python3
"""
scripts/compile_gt.py
=====================
Compiles a human-reviewed `<drawing_id>_gt_draft.json` into the canonical
benchmark ground-truth format (`text, nominal, plus_tol, minus_tol, lsl, usl,
kind, note, uncertain, uncertain_reason`), recomputing every row's LSL/USL
through `limits_math.py` so human math errors are impossible.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from table_extractor import default_limits_resolver

VALID_UNCERTAIN_REASONS = {
    "no_text_span_stroked",
    "variable_placeholder",
    "ambiguous_vendor_notation",
    "raster_table",
}


def compile_reviewed_gt(draft_path: Path, out_gt_path: Path) -> None:
    payload = json.loads(draft_path.read_text(encoding="utf-8"))
    general_tol = payload.get("general_tol", "m")
    compiled_rows: List[Dict[str, Any]] = []

    for row in payload.get("rows", []):
        status = row.get("status", "approved")
        if status == "reject_extra":
            continue

        parse_expr = row.get("parse_expr") or row.get("text") or ""
        recomputed = default_limits_resolver(parse_expr, general_tol)

        is_uncertain = bool(row.get("uncertain")) or (status == "uncertain")
        u_reason = row.get("uncertain_reason") or ""
        if is_uncertain and u_reason not in VALID_UNCERTAIN_REASONS:
            raise ValueError(
                f"Row {row.get('row_id')} ('{row.get('text')}') marked uncertain without a valid reason "
                f"in {sorted(VALID_UNCERTAIN_REASONS)}"
            )

        compiled_rows.append({
            "text": row["text"],
            "nominal": recomputed["nominal"] if recomputed else row.get("nominal"),
            "plus_tol": recomputed.get("plus_tol") if recomputed else row.get("plus_tol"),
            "minus_tol": recomputed.get("minus_tol") if recomputed else row.get("minus_tol"),
            "lsl": recomputed["lsl"] if recomputed else row.get("lsl"),
            "usl": recomputed["usl"] if recomputed else row.get("usl"),
            "kind": recomputed["kind"] if recomputed else row.get("kind"),
            "note": row.get("note", ""),
            "page_index": int(row.get("page_index", 0)),
            "uncertain": is_uncertain,
            "uncertain_reason": u_reason if is_uncertain else None,
        })

    out_gt_path.parent.mkdir(parents=True, exist_ok=True)
    out_gt_path.write_text(json.dumps(compiled_rows, indent=2, ensure_ascii=False), encoding="utf-8")


def validate_compiled_gt(gt_path: Path) -> List[str]:
    """Ensures no invalid uncertain reasons or structural issues in compiled GT."""
    errors = []
    try:
        data = json.loads(gt_path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            return [f"{gt_path}: root must be a list of dimensions"]
        for idx, row in enumerate(data):
            if row.get("uncertain"):
                reason = row.get("uncertain_reason")
                if reason not in VALID_UNCERTAIN_REASONS:
                    errors.append(f"{gt_path} row {idx}: invalid uncertain_reason '{reason}'")
    except Exception as e:
        errors.append(f"{gt_path}: {e}")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compile or validate benchmark Ground Truth JSON")
    parser.add_argument("draft_json", type=Path, nargs="?", default=None, help="Draft JSON path to compile")
    parser.add_argument("out_gt_json", type=Path, nargs="?", default=None, help="Compiled GT JSON destination")
    parser.add_argument("--validate-all", type=Path, default=None, help="Directory of compiled GT files to validate")
    args = parser.parse_args()

    if args.validate_all:
        target_dir = args.validate_all
        all_errors = []
        gt_files = sorted(target_dir.glob("*_gt.json"))
        for gt in gt_files:
            errs = validate_compiled_gt(gt)
            if errs:
                all_errors.extend(errs)
                print(f"[FAIL] {gt.name}: {errs}")
            else:
                print(f"[OK] {gt.name}")
        if all_errors:
            sys.exit(1)
        sys.exit(0)

    if not args.draft_json or not args.out_gt_json:
        parser.print_help()
        sys.exit(1)

    compile_reviewed_gt(args.draft_json, args.out_gt_json)

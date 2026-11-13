#!/usr/bin/env python3
"""
backend/benchmarks/run_real.py
==============================
Unified benchmark runner for SpecBalloon:
- Runs evaluation against synthetic5, old5, new5, or all benchmark suites.
- Supports --mode local (in-process extraction) and --mode live (remote HTTP backend).
- Emits detailed accuracy metrics, table vs non-table breakdowns, review rates,
  and failure-mode triage (MISS_CLUSTER_OR_LOCK, WRONG_LIMITS_OR_KIND, EXTRA_FRAGMENT, CORPUS_ANNOTATION_GAP).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from geometry_first_clustering import normalize_callout_text
from main import extract_all_pages


def _num_equal(a: Optional[float], b: Optional[float], tol: float = 0.005) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    try:
        return abs(float(a) - float(b)) <= tol
    except (ValueError, TypeError):
        return False


def run_local_extraction(pdf_path: Path, general_tol: str = "m") -> List[Dict[str, Any]]:
    doc = fitz.open(str(pdf_path))
    chars, _ = extract_all_pages(doc, drawing_id=pdf_path.stem, general_tol_class=general_tol)
    doc.close()
    return chars


def run_live_extraction(pdf_path: Path, live_url: str = "http://localhost:8000") -> List[Dict[str, Any]]:
    import httpx

    with open(pdf_path, "rb") as f:
        up_res = httpx.post(
            f"{live_url}/api/v1/drawings",
            files={"file": (pdf_path.name, f, "application/pdf")},
            timeout=30.0,
        )
    up_res.raise_for_status()
    drawing_id = up_res.json()["id"]

    ex_res = httpx.post(f"{live_url}/api/v1/drawings/{drawing_id}/extract", timeout=60.0)
    ex_res.raise_for_status()
    data = ex_res.json()
    return data.get("characteristics") or data.get("balloons") or []


def evaluate_drawing(
    pdf_path: Path,
    gt_path: Path,
    mode: str = "local",
    live_url: str = "http://localhost:8000",
) -> Dict[str, Any]:
    gt_data = json.loads(gt_path.read_text(encoding="utf-8"))
    gt_rows: List[Dict[str, Any]] = gt_data.get("rows", gt_data) if isinstance(gt_data, dict) else gt_data

    # Partition GT into certain and uncertain
    certain_gt = [r for r in gt_rows if not r.get("uncertain")]
    uncertain_gt = [r for r in gt_rows if r.get("uncertain")]

    # Run extraction
    if mode == "local":
        extracted = run_local_extraction(pdf_path)
    else:
        extracted = run_live_extraction(pdf_path, live_url=live_url)

    # Match GT to extracted
    matched_ext_indices: set[int] = set()
    gt_matches: List[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]] = []

    # Pass 1: Exact normalized text and page match
    for g in certain_gt:
        g_txt = normalize_callout_text(g.get("text", ""))
        g_page = g.get("page_index")
        best_idx = None
        for idx, e in enumerate(extracted):
            if idx in matched_ext_indices:
                continue
            e_txt = normalize_callout_text(e.get("raw_callout") or e.get("rawCallout") or "")
            e_page = e.get("page_index")
            if g_page is not None and e_page is not None and g_page != e_page:
                continue
            if g_txt and g_txt == e_txt:
                best_idx = idx
                break

        # Pass 2: Strict nominal match if text did not match
        if best_idx is None and g.get("nominal") is not None:
            g_nom = float(g["nominal"])
            for idx, e in enumerate(extracted):
                if idx in matched_ext_indices:
                    continue
                e_nom = e.get("nominal")
                if e_nom is None:
                    continue
                if abs(g_nom - float(e_nom)) < 0.002:
                    best_idx = idx
                    break

        if best_idx is not None:
            matched_ext_indices.add(best_idx)
            gt_matches.append((g, extracted[best_idx]))
        else:
            gt_matches.append((g, None))

    # Evaluate matches
    correct_count = 0
    wrong_limits_count = 0
    missed_count = 0

    non_table_certain = 0
    non_table_correct = 0
    non_table_wrong = 0
    non_table_missed = 0

    table_certain = 0
    table_correct = 0

    triage_records: List[Dict[str, Any]] = []

    for g, e in gt_matches:
        is_table = bool(g.get("note") == "table" or g.get("is_table_cell"))
        if is_table:
            table_certain += 1
        else:
            non_table_certain += 1

        if e is None:
            missed_count += 1
            if not is_table:
                non_table_missed += 1
            triage_records.append({
                "type": "MISS_CLUSTER_OR_LOCK",
                "gt_text": g.get("text"),
                "page": g.get("page_index", 0),
            })
        else:
            lsl_ok = _num_equal(g.get("lsl"), e.get("lsl"))
            usl_ok = _num_equal(g.get("usl"), e.get("usl"))
            if lsl_ok and usl_ok:
                correct_count += 1
                if is_table:
                    table_correct += 1
                else:
                    non_table_correct += 1
            else:
                wrong_limits_count += 1
                if not is_table:
                    non_table_wrong += 1
                triage_records.append({
                    "type": "WRONG_LIMITS_OR_KIND",
                    "gt_text": g.get("text"),
                    "expected_limits": [g.get("lsl"), g.get("usl")],
                    "actual_limits": [e.get("lsl"), e.get("usl")],
                })

    # Triage extra extractions
    extra_count = len(extracted) - len(matched_ext_indices)
    for idx, e in enumerate(extracted):
        if idx not in matched_ext_indices:
            raw = e.get("raw_callout") or e.get("rawCallout") or ""
            nom = e.get("nominal")
            if e.get("kind") in ("LINEAR", "DIAMETER", "RADIUS", "THREAD", "ISO_FIT") and nom and float(nom) > 0:
                triage_records.append({"type": "CORPUS_ANNOTATION_GAP", "extracted_text": raw})
            else:
                triage_records.append({"type": "EXTRA_FRAGMENT", "extracted_text": raw})

    # Review counts
    review_needed = sum(1 for e in extracted if e.get("needs_review"))
    review_rate = (review_needed / len(extracted)) if extracted else 0.0

    return {
        "drawing_id": pdf_path.stem,
        "certain_gt_count": len(certain_gt),
        "uncertain_gt_count": len(uncertain_gt),
        "total_extracted": len(extracted),
        "correct": correct_count,
        "wrong_limits": wrong_limits_count,
        "missed": missed_count,
        "extra": extra_count,
        "non_table": {
            "certain": non_table_certain,
            "correct": non_table_correct,
            "wrong_limits": non_table_wrong,
            "missed": non_table_missed,
            "recall": (non_table_correct / non_table_certain) if non_table_certain else 1.0,
        },
        "table": {
            "certain": table_certain,
            "correct": table_correct,
            "recall": (table_correct / table_certain) if table_certain else 1.0,
        },
        "review_needed": review_needed,
        "review_rate": review_rate,
        "triage": triage_records,
    }


def run_battery(
    battery_dir: Path,
    battery_name: str,
    mode: str = "local",
    live_url: str = "http://localhost:8000",
) -> List[Dict[str, Any]]:
    results = []
    if not battery_dir.exists():
        return results

    pdf_files = sorted(battery_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"[{battery_name}] No PDF test drawings present in {battery_dir}")
        return results

    for pdf in pdf_files:
        gt_candidates = [
            battery_dir / f"{pdf.stem}_gt.json",
            battery_dir / f"{pdf.stem}.json",
        ]
        gt_path = next((p for p in gt_candidates if p.exists()), None)
        if not gt_path:
            print(f"[{battery_name}] Skipping {pdf.name} (no ground truth JSON found)")
            continue

        res = evaluate_drawing(pdf, gt_path, mode=mode, live_url=live_url)
        results.append(res)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="SpecBalloon Unified Benchmark Runner")
    parser.add_argument(
        "--battery",
        choices=["synthetic5", "old5", "new5", "all"],
        default="all",
        help="Benchmark battery to execute",
    )
    parser.add_argument(
        "--mode",
        choices=["local", "live"],
        default="local",
        help="Execution mode: local (in-process) or live (remote HTTP endpoint)",
    )
    parser.add_argument(
        "--live-url",
        default="http://localhost:8000",
        help="Base URL when --mode live is used",
    )
    parser.add_argument(
        "--out-json",
        type=Path,
        default=None,
        help="Optional path to emit benchmark results JSON scorecard",
    )
    args = parser.parse_args()

    bench_root = REPO_ROOT / "backend" / "benchmarks"
    batteries_to_run = (
        ["synthetic5", "old5", "new5"] if args.battery == "all" else [args.battery]
    )

    all_scorecards: Dict[str, Any] = {}

    print(f"\n========================================================")
    print(f"SpecBalloon Benchmark Suite — Mode: {args.mode.upper()}")
    print(f"========================================================\n")

    for b_name in batteries_to_run:
        b_dir = bench_root / b_name
        results = run_battery(b_dir, b_name, mode=args.mode, live_url=args.live_url)
        all_scorecards[b_name] = results

        if not results:
            continue

        tot_certain = sum(r["certain_gt_count"] for r in results)
        tot_correct = sum(r["correct"] for r in results)
        tot_wrong = sum(r["wrong_limits"] for r in results)
        tot_missed = sum(r["missed"] for r in results)
        tot_extra = sum(r["extra"] for r in results)

        nt_certain = sum(r["non_table"]["certain"] for r in results)
        nt_correct = sum(r["non_table"]["correct"] for r in results)

        tbl_certain = sum(r["table"]["certain"] for r in results)
        tbl_correct = sum(r["table"]["correct"] for r in results)

        tot_extracted = sum(r["total_extracted"] for r in results)
        tot_reviews = sum(r["review_needed"] for r in results)
        rev_rate = (tot_reviews / tot_extracted) if tot_extracted else 0.0

        overall_acc = (tot_correct / tot_certain * 100.0) if tot_certain else 100.0
        nt_acc = (nt_correct / nt_certain * 100.0) if nt_certain else 100.0

        print(f"--- BATTERY: {b_name} ({len(results)} drawings) ---")
        for r in results:
            print(
                f"  {r['drawing_id']:<20} | Certain: {r['certain_gt_count']:>3} | "
                f"Correct: {r['correct']:>3} | Wrong: {r['wrong_limits']:>2} | "
                f"Miss: {r['missed']:>2} | Extra: {r['extra']:>2} | "
                f"Rev: {r['review_rate']*100.0:>4.1f}%"
            )

        print(
            f"\n  Totals for {b_name}: {tot_correct}/{tot_certain} correct ({overall_acc:.1f}%) | "
            f"Non-table: {nt_correct}/{nt_certain} ({nt_acc:.1f}%) | "
            f"Table: {tbl_correct}/{tbl_certain} | "
            f"Wrong: {tot_wrong} | Missed: {tot_missed} | Extra: {tot_extra} | "
            f"Review Rate: {rev_rate*100.0:.1f}%\n"
        )

    if args.out_json:
        args.out_json.parent.mkdir(parents=True, exist_ok=True)
        args.out_json.write_text(json.dumps(all_scorecards, indent=2), encoding="utf-8")
        print(f"Emitted scorecard to {args.out_json}")


if __name__ == "__main__":
    main()

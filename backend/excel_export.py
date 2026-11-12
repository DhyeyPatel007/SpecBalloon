# backend/excel_export.py
from __future__ import annotations

import io
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


def _clean(value: Any) -> Any:
    """Replace characters the XLSX format cannot store. PDF text can carry
    NUL/control chars where a font lacked a glyph (e.g. the GD&T symbol
    cell extracted as \\x00) — openpyxl refuses those in worksheets, so
    show them as '?' rather than dropping the cell or crashing the export.
    Tab / newline / carriage return are legal in XLSX and kept."""
    if not isinstance(value, str):
        return value
    return "".join(
        "?" if (ord(ch) < 32 and ch not in "\t\n\r") else ch for ch in value
    )


def build_as9102_workbook_bytes(
    drawing_meta: dict[str, Any],
    characteristics: list[dict[str, Any]],
) -> bytes:
    wb = Workbook()

    # Styling palette
    header_fill = PatternFill("solid", fgColor="0F172A")
    sub_fill = PatternFill("solid", fgColor="F1F5F9")
    pass_fill = PatternFill("solid", fgColor="DCFCE7")
    warn_fill = PatternFill("solid", fgColor="FEF3C7")
    fail_fill = PatternFill("solid", fgColor="FEE2E2")

    font_title = Font(name="Calibri", size=13, bold=True, color="0F172A")
    font_hdr = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_bold = Font(name="Calibri", size=10, bold=True, color="0F172A")
    font_body = Font(name="Calibri", size=10, color="0F172A")
    font_mono = Font(name="Consolas", size=10, color="0F172A")

    thin = Side(border_style="thin", color="CBD5E1")
    grid_border = Border(left=thin, right=thin, top=thin, bottom=thin)

    part_no = drawing_meta.get("part_number", "AS-4092-C")
    part_name = drawing_meta.get("part_name", "CNC Machined Component")
    rev = drawing_meta.get("revision", "C")
    fair_id = drawing_meta.get("fair_id", f"FAIR-{part_no}-{rev}")
    is_sample = bool(drawing_meta.get("is_sample_data", False))

    # =========================================================================
    # SHEET 1: AS9102 Rev C Form 1 — Part Number Accountability
    # =========================================================================
    ws1 = wb.active
    ws1.title = "Form 1 - Part Accountability"
    ws1["A1"] = "AS9102 Rev C — FORM 1: PART NUMBER ACCOUNTABILITY" + (" [SAMPLE DATA]" if is_sample else "")
    ws1["A1"].font = font_title

    form1_fields = [
        ("1. Part Number", part_no, "2. Part Name", part_name),
        ("3. Serial Number", drawing_meta.get("serial_number", "SN-001"), "4. FAIR Identifier", fair_id),
        ("5. Part Revision Level", rev, "6. Drawing Number", part_no),
        ("7. Drawing Revision Level", rev, "8. Additional Changes", "N/A"),
        ("9. Manufacturing Process Ref", drawing_meta.get("router_ref", "RTR-2026-01"), "10. Organization Name", drawing_meta.get("org_name", "Precision CNC QA")),
        ("11. Supplier Code", drawing_meta.get("supplier_code", "SUP-01"), "12. P.O. Number", drawing_meta.get("po_number", "PO-10042")),
        ("13. Detail / Assembly", "Detail Part", "14. Full / Partial FAI", "Full FAI"),
    ]
    for r_idx, (k1, v1, k2, v2) in enumerate(form1_fields, start=3):
        ws1.cell(r_idx, 1, k1).font = font_bold
        ws1.cell(r_idx, 1).fill = sub_fill
        ws1.cell(r_idx, 2, v1).font = font_body
        ws1.cell(r_idx, 3, k2).font = font_bold
        ws1.cell(r_idx, 3).fill = sub_fill
        ws1.cell(r_idx, 4, v2).font = font_body
        for c in range(1, 5):
            ws1.cell(r_idx, c).border = grid_border

    for col, w in [(1, 28), (2, 32), (3, 28), (4, 32)]:
        ws1.column_dimensions[get_column_letter(col)].width = w

    # =========================================================================
    # SHEET 2: AS9102 Rev C Form 2 — Product Accountability (Materials & Gages)
    # =========================================================================
    ws2 = wb.create_sheet("Form 2 - Materials & Gages")
    ws2["A1"] = "AS9102 Rev C — FORM 2: MATERIALS, SPECIAL PROCESSES & FUNCTIONAL GAGES"
    ws2["A1"].font = font_title

    f2_headers = ["5. Material or Process Name", "6. Specification Number", "7. Code", "8. Supplier", "9. Customer Approval", "10. Certificate of Conformance #"]
    for c_idx, h in enumerate(f2_headers, start=1):
        cell = ws2.cell(3, c_idx, h)
        cell.font = font_hdr
        cell.fill = header_fill
        cell.border = grid_border
        ws2.column_dimensions[get_column_letter(c_idx)].width = 24

    materials = drawing_meta.get("materials") or [
        ("Aluminum Alloy 6061-T6", "AMS-QQ-A-250/11", "MAT-01", "Approved Mill", "Yes", "COC-AL-6061"),
        ("Sulfuric Acid Anodize", "MIL-A-8625 Type II Class 1", "PRC-01", "AeroCoat Lab", "Yes", "COC-ANO-8625"),
    ]
    for r_idx, row_vals in enumerate(materials, start=4):
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws2.cell(r_idx, c_idx, val)
            cell.font = font_body
            cell.border = grid_border

    # =========================================================================
    # SHEET 3: AS9102 Rev C Form 3 — Characteristic Accountability (BoC)
    # =========================================================================
    ws3 = wb.create_sheet("Form 3 - Characteristics")
    ws3["A1"] = f"AS9102 Rev C — FORM 3: CHARACTERISTIC ACCOUNTABILITY ({part_no} Rev {rev})"
    ws3["A1"].font = font_title

    f3_headers = [
        "5. Char No.",
        "6. Reference Location",
        "7. Characteristic Designator",
        "8. Requirement / Callout",
        "Nominal",
        "+Tol",
        "-Tol",
        "LSL",
        "USL",
        "Units",
        "9. Results (Measured)",
        "10. Designed / Qualified Tooling",
        "11. Non-Conformance / Status",
        "12. Confidence & Audit Notes",
    ]
    for c_idx, h in enumerate(f3_headers, start=1):
        cell = ws3.cell(3, c_idx, h)
        cell.font = font_hdr
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = grid_border

    for r_offset, ch in enumerate(characteristics, start=4):
        meas = ch.get("measured_value")
        lsl = float(ch.get("lsl", 0.0))
        usl = float(ch.get("usl", 0.0))
        conf = float(ch.get("confidence", 0.0))
        needs_rev = bool(ch.get("needs_review", False))

        if meas is None:
            status = "PENDING MEASUREMENT"
        elif lsl <= float(meas) <= usl:
            status = "PASS"
        else:
            status = "FAIL (OUT OF SPEC)"

        notes = "; ".join(ch.get("review_reasons", [])) or f"Confidence: {conf * 100:.1f}%"
        row_data = [
            ch.get("char_no", r_offset - 3),
            ch.get("zone", "B2"),
            ch.get("designator", "Major"),
            ch.get("raw_callout", ""),
            float(ch.get("nominal", 0.0)),
            float(ch.get("plus_tol", 0.0)),
            float(ch.get("minus_tol", 0.0)),
            lsl,
            usl,
            ch.get("units", "mm"),
            float(meas) if meas is not None else "",
            ch.get("gauge", "Calibrated Metrology Instrument"),
            status,
            notes,
        ]
        row_data = [_clean(v) for v in row_data]
        for c_idx, val in enumerate(row_data, start=1):
            cell = ws3.cell(r_offset, c_idx, val)
            cell.border = grid_border
            if c_idx in (5, 6, 7, 8, 9, 11) and isinstance(val, float):
                cell.number_format = "0.000"
                cell.font = font_mono
            else:
                cell.font = font_body

            if c_idx == 13:
                if status == "PASS":
                    cell.fill = pass_fill
                elif status.startswith("FAIL"):
                    cell.fill = fail_fill
                elif needs_rev:
                    cell.fill = warn_fill

    f3_widths = [11, 16, 18, 28, 12, 11, 11, 12, 12, 9, 18, 28, 20, 36]
    for c_idx, w in enumerate(f3_widths, start=1):
        ws3.column_dimensions[get_column_letter(c_idx)].width = w

    # =========================================================================
    # SHEET 4: 10-Sample SPC Heatmap & Capability Summary
    # =========================================================================
    ws4 = wb.create_sheet("SPC 10-Sample Heatmap")
    ws4["A1"] = f"MULTI-PIECE SPC INSPECTION LOG & CAPABILITY ({part_no})"
    ws4["A1"].font = font_title

    spc_headers = ["Char No.", "Callout", "LSL", "USL"] + [f"Sample #{i}" for i in range(1, 11)]
    for c_idx, h in enumerate(spc_headers, start=1):
        cell = ws4.cell(3, c_idx, h)
        cell.font = font_hdr
        cell.fill = header_fill
        cell.border = grid_border
        ws4.column_dimensions[get_column_letter(c_idx)].width = 14 if c_idx != 2 else 26

    for r_offset, ch in enumerate(characteristics, start=4):
        lsl = float(ch.get("lsl", 0.0))
        usl = float(ch.get("usl", 0.0))
        samples: list[float] = ch.get("lot_measurements") or []
        base_cols = [_clean(v) for v in [ch.get("char_no", r_offset - 3), ch.get("raw_callout", ""), lsl, usl]]
        for c_idx, val in enumerate(base_cols, start=1):
            cell = ws4.cell(r_offset, c_idx, val)
            cell.border = grid_border
            if isinstance(val, float):
                cell.number_format = "0.000"
                cell.font = font_mono

        for s_idx in range(10):
            cell = ws4.cell(r_offset, 5 + s_idx)
            cell.border = grid_border
            if s_idx < len(samples) and samples[s_idx] is not None:
                s_val = float(samples[s_idx])
                cell.value = s_val
                cell.number_format = "0.000"
                cell.font = font_mono
                cell.fill = pass_fill if (lsl <= s_val <= usl) else fail_fill

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_excel_export() -> None:
    excel_bytes = build_as9102_workbook_bytes(
        {"part_number": "AS-4092-C", "revision": "C", "is_sample_data": False},
        [
            {
                "char_no": 1,
                "zone": "B2",
                "designator": "Critical",
                "raw_callout": "Ø30.00 H7",
                "nominal": 30.0,
                "plus_tol": 0.021,
                "minus_tol": 0.0,
                "lsl": 30.000,
                "usl": 30.021,
                "units": "mm",
                "measured_value": None,  # Unmeasured -> must stay blank, not invented!
                "confidence": 0.94,
                "needs_review": False,
            }
        ],
    )
    assert excel_bytes[:4] == b"PK\x03\x04", "Must be a genuine binary OOXML ZIP (.xlsx)"
    from openpyxl import load_workbook

    wb_check = load_workbook(io.BytesIO(excel_bytes))
    assert len(wb_check.sheetnames) == 4
    ws_f3 = wb_check["Form 3 - Characteristics"]
    assert ws_f3.cell(4, 11).value is None, "Unmeasured cell must be empty, never fabricated"


if __name__ == "__main__":
    test_excel_export()
    print("test_excel_export PASSED")


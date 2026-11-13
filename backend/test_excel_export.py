# backend/test_excel_export.py
import io
import openpyxl
from excel_export import (
    build_as9102_workbook_bytes,
    format_excel_callout_and_confidence,
    test_excel_export,
)
from sample_data import SAMPLE_BALLOONS, SAMPLE_DRAWING_METADATA


def test_excel_export_embedded():
    test_excel_export()


def test_excel_export_structure():
    wb_bytes = build_as9102_workbook_bytes(SAMPLE_DRAWING_METADATA, SAMPLE_BALLOONS)
    assert len(wb_bytes) > 2000

    wb = openpyxl.load_workbook(io.BytesIO(wb_bytes))
    sheet_names = wb.sheetnames
    assert len(sheet_names) == 4
    assert "Form 1" in sheet_names[0]
    assert "Form 2" in sheet_names[1]
    assert "Form 3" in sheet_names[2]

    ws3 = wb[sheet_names[2]]
    # Form 3 should list characteristics
    assert ws3.max_row >= 17


def test_callout_and_confidence_formatting():
    # 1. 99.4 confidence does not format as 9940.0%
    raw, conf_str = format_excel_callout_and_confidence({"confidence": 99.4, "callout": "Ø 30.00 H7"})
    assert conf_str == "Confidence: 99.4%"
    assert raw == "Ø 30.00 H7"

    # 2. 0.994 confidence formats as 99.4%
    raw2, conf_str2 = format_excel_callout_and_confidence({"confidence": 0.994, "raw_callout": "15.00 ±0.05"})
    assert conf_str2 == "Confidence: 99.4%"
    assert raw2 == "15.00 ±0.05"

    # 3. Callout-only record fills Form 3 callout column (column 4)
    wb_bytes = build_as9102_workbook_bytes(
        SAMPLE_DRAWING_METADATA,
        [{"char_no": 1, "callout": "Special Note Callout", "nominal": 10.0, "lsl": 9.9, "usl": 10.1, "confidence": 98.5}]
    )
    wb = openpyxl.load_workbook(io.BytesIO(wb_bytes))
    ws3 = wb[wb.sheetnames[2]]
    # Row 4 is the first data row; Column 4 is "Requirement / Callout"
    assert ws3.cell(4, 4).value == "Special Note Callout"
    # Column 14 is "Inspection / Notes"
    assert ws3.cell(4, 14).value == "Confidence: 98.5%"

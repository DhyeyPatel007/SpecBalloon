# backend/test_excel_export.py
import io
import openpyxl
from excel_export import build_as9102_workbook_bytes, test_excel_export
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

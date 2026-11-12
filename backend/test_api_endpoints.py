# backend/test_api_endpoints.py
from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient

from main import app
from test_pipeline_e2e import generate_synthetic_as4092_pdf

client = TestClient(app)


def test_health_check():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "specballoon-backend"


def test_demo_extraction():
    res = client.post("/api/v1/drawings/demo-as4092c/extract?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["drawing_id"] == "demo-as4092c"
    assert data["count"] == 17
    assert data["is_sample_data"] is True


def test_pdf_upload_and_extraction():
    pdf_bytes = generate_synthetic_as4092_pdf()
    upload_res = client.post(
        "/api/v1/drawings",
        files={"file": ("as4092_rev_c.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 200
    dwg = upload_res.json()
    dwg_id = dwg["id"]
    assert dwg["part_number"] == "AS4092_REV_C"
    assert dwg["page_count"] == 1

    # Extract
    extract_res = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert extract_res.status_code == 200
    ext = extract_res.json()
    assert ext["count"] == 17
    assert ext["is_sample_data"] is False
    assert len(ext["characteristics"]) == 17

    # Get Balloons
    get_res = client.get(f"/api/v1/drawings/{dwg_id}/balloons")
    assert get_res.status_code == 200
    assert get_res.json()["count"] == 17

    # Patch characteristic
    char0 = ext["characteristics"][0]
    patch_res = client.patch(
        f"/api/v1/drawings/{dwg_id}/balloons/{char0['id']}",
        json={"measuredValue": 30.018, "status": "in_spec"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["measuredValue"] == 30.018

    # Export Excel
    excel_res = client.post(
        "/api/v1/exports/excel",
        json={"drawing": dwg, "characteristics": ext["characteristics"]},
    )
    assert excel_res.status_code == 200
    assert (
        excel_res.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert len(excel_res.content) > 2000


def test_invalid_file_upload():
    res = client.post(
        "/api/v1/drawings",
        files={"file": ("drawing.txt", io.BytesIO(b"not a pdf"), "text/plain")},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_PDF"


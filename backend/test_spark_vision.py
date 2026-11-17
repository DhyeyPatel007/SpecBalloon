# backend/test_spark_vision.py
"""Tests for the Muse Spark Open (Token Factory) invisible fallback.

No API key, no network in any test: the live call is stubbed with a
fake httpx client, and the end-to-end fallback test monkeypatches both
extractors. The fallback must be invisible: a Spark success returns
hydrogen_status "OK" and the response must not contain the provider
name anywhere (no "Spark", "Muse", "Token Factory", "Nebius").
"""
from __future__ import annotations

import asyncio
import io
import json

import pytest
from fastapi.testclient import TestClient

import hydrogen_vision
import main
import spark_vision
from main import app
from test_pipeline_e2e import generate_synthetic_as4092_pdf

client = TestClient(app)

ENVELOPE = {"choices": [{"message": {"content": json.dumps({
    "drawing_metadata": {"units": "mm"},
    "balloons": [{"raw_callout": "Ø 30.00 ±0.05", "characteristic_type": "diameter",
                  "nominal_value": 30.0, "upper_tolerance": 0.05,
                  "lower_tolerance": 0.05, "confidence": "high"}],
})}}]}


class _FakeResp:
    def __init__(self, status_code=200, payload=None, reason_phrase=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.reason_phrase = reason_phrase or {200: "OK", 400: "Bad Request",
                                                429: "Too Many Requests",
                                                503: "Service Unavailable"}.get(status_code, "Error")

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise spark_vision.httpx.HTTPStatusError(
                f"{self.status_code}", request=None, response=self)


class _FakeAsyncClient:
    def __init__(self, resp):
        self._resp = resp

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, *args, **kwargs):
        return self._resp


class _SequencedFakeAsyncClient:
    def __init__(self, resps):
        self._resps = list(resps)
        self.calls = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, *args, **kwargs):
        self.calls += 1
        return self._resps[min(self.calls - 1, len(self._resps) - 1)]


def test_call_spark_page_ok(monkeypatch):
    monkeypatch.setattr(
        spark_vision.httpx, "AsyncClient",
        lambda **kw: _FakeAsyncClient(_FakeResp(200, ENVELOPE)))
    res = asyncio.run(spark_vision.call_spark_page("iVBORw0", "fake-key", 1))
    assert res.status == "OK"
    assert len(res.records) == 1
    assert res.records[0]["nominal"] == 30.0
    assert res.records[0]["usl"] == 30.05
    assert res.records[0]["source"] == "SPARK"


def test_call_spark_page_400_retries_without_response_format(monkeypatch):
    # Some models reject response_format — one retry without it, as the
    # Nov 13 A/B runner did.
    seq = _SequencedFakeAsyncClient([_FakeResp(400, {}), _FakeResp(200, ENVELOPE)])
    monkeypatch.setattr(spark_vision.httpx, "AsyncClient", lambda **kw: seq)
    res = asyncio.run(spark_vision.call_spark_page("iVBORw0", "fake-key", 1))
    assert res.status == "OK"
    assert len(res.records) == 1
    assert seq.calls == 2


def test_call_spark_page_429_is_rate_limited(monkeypatch):
    monkeypatch.setattr(
        spark_vision.httpx, "AsyncClient",
        lambda **kw: _FakeAsyncClient(_FakeResp(429, {})))
    res = asyncio.run(spark_vision.call_spark_page("iVBORw0", "fake-key", 1))
    assert res.status == "RATE_LIMITED"


def test_call_spark_page_no_key_is_unavailable():
    res = asyncio.run(spark_vision.call_spark_page("iVBORw0", "", 1))
    assert res.status == "UNAVAILABLE"


def test_fallback_is_invisible_to_frontend(monkeypatch):
    """Hydrogen rate-limited -> Spark succeeds -> response looks exactly
    like a Hydrogen success: hydrogen_status OK, no provider name, no
    error anywhere in the response body."""
    async def _fake_hydrogen(doc):
        return ([], "RATE_LIMITED", ["Hydrogen rate-limit latch active."])

    async def _fake_spark(doc):
        return ([{
            "raw_callout": "Ø30.00 H7", "nominal": 30.0, "lsl": 30.0, "usl": 30.021,
            "kind": "ISO_FIT", "featureDescription": "", "page": 1, "fit_class": "H7",
            "units": "mm", "quantity": 1, "confidence": 0.9, "source": "SPARK",
        }], "OK", [])

    monkeypatch.setattr(hydrogen_vision, "extract_drawing_with_hydrogen", _fake_hydrogen)
    monkeypatch.setattr(spark_vision, "extract_drawing_with_spark", _fake_spark)

    pdf_bytes = generate_synthetic_as4092_pdf()
    upload = client.post(
        "/api/v1/drawings",
        files={"file": ("as4092_rev_c.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert upload.status_code == 200
    dwg_id = upload.json()["id"]
    res = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["hydrogen_status"] == "OK"
    assert data["hydrogen_notes"] == []
    body = json.dumps(data)
    for forbidden in ("Spark", "Muse", "Token Factory", "Nebius", "RATE_LIMITED", "rate limit"):
        assert forbidden not in body, f"fallback leaked into response: {forbidden}"
    assert any(c["nominal"] == 30.0 for c in data["characteristics"])


def test_both_providers_fail_is_vector_only(monkeypatch):
    """Hydrogen AND Spark both fail -> vector-only, Hydrogen status kept,
    no Spark name in the response."""
    async def _fake_hydrogen(doc):
        return ([], "RATE_LIMITED", ["Hydrogen rate-limit latch active."])

    async def _fake_spark(doc):
        return ([], "ERROR", ["Token Factory API error."])

    monkeypatch.setattr(hydrogen_vision, "extract_drawing_with_hydrogen", _fake_hydrogen)
    monkeypatch.setattr(spark_vision, "extract_drawing_with_spark", _fake_spark)

    pdf_bytes = generate_synthetic_as4092_pdf()
    upload = client.post(
        "/api/v1/drawings",
        files={"file": ("as4092_rev_c.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert upload.status_code == 200
    dwg_id = upload.json()["id"]
    res = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["hydrogen_status"] == "RATE_LIMITED"
    body = json.dumps(data)
    for forbidden in ("Spark", "Muse", "Token Factory", "Nebius"):
        assert forbidden not in body

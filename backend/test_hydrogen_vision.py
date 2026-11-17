# backend/test_hydrogen_vision.py
"""Tests for the Gemini 4 Hydrogen primary extractor (Stage 1 wiring).

No API key, no network in any test: the live call is stubbed with a fake
httpx client, and the end-to-end fusion test monkeypatches
extract_drawing_with_hydrogen with canned adapted records.
"""
from __future__ import annotations

import asyncio
import io
import json

import pytest
from fastapi.testclient import TestClient

import hydrogen_vision
from hydrogen_vision import (
    adapt_hydrogen_balloon,
    dedup_hydrogen_records,
    extract_drawing_with_hydrogen,
    iso_286_limits,
    match_hydrogen_to_vector,
    parse_hydrogen_envelope,
    parse_number,
)
from main import app
from test_api_endpoints import _leader_pdf
from test_pipeline_e2e import generate_synthetic_as4092_pdf

client = TestClient(app)


# ---------------------------------------------------------------------------
# Adapter (ported from the A/B scorer — same rules, same numbers)
# ---------------------------------------------------------------------------

def test_adapt_linear_explicit_tolerance():
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "Ø 30.00 ±0.05", "characteristic_type": "diameter",
         "nominal_value": 30.0, "upper_tolerance": 0.05, "lower_tolerance": 0.05,
         "confidence": "high"},
        "mm", 1)
    assert rec["nominal"] == 30.0
    assert rec["lsl"] == 29.95 and rec["usl"] == 30.05
    assert rec["kind"] == "DIAMETER"
    assert rec["confidence"] == 0.90


def test_adapt_iso_fit_recomputed_deterministically():
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "Ø 30.00 H7", "characteristic_type": "diameter",
         "nominal_value": 30.0, "fit_class": "H7", "confidence": "high"},
        "mm", 1)
    assert rec["kind"] == "ISO_FIT"
    assert rec["lsl"] == 30.0 and rec["usl"] == 30.021


def test_adapt_gdt_frame_zone_in_usl():
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "|⌖|Ø0.05(M)|A|B|", "characteristic_type": "gdt",
         "nominal_value": None,
         "gdt_details": {"symbol": "position", "tolerance_zone": 0.05,
                         "material_condition": "MMC", "datums": ["A", "B"]},
         "confidence": "high"},
        "mm", 1)
    assert rec["kind"] == "GDT_FRAME"
    assert rec["usl"] == 0.05 and rec["lsl"] == 0.0
    assert rec["featureDescription"] == "Position"


def test_adapt_surface_finish_value_in_usl():
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "Ra 0.8", "characteristic_type": "surface_finish",
         "nominal_value": None, "confidence": "medium"},
        "mm", 1)
    assert rec["kind"] == "SURFACE_ROUGHNESS"
    assert rec["lsl"] == 0.0 and rec["usl"] == 0.8


def test_adapt_limit_callout():
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "≥ 5.5", "characteristic_type": "dimension",
         "nominal_value": 5.5, "min_limit": 5.5, "tolerance_type": "limit",
         "confidence": "high"},
        "mm", 1)
    assert rec["lsl"] == 5.5 and rec["usl"] is None


def test_adapt_unilateral_tolerance_completed():
    # '+0.2' means [nominal, nominal+0.2]; '-0.2' means [nominal-0.2, nominal].
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "1 +0.2", "characteristic_type": "dimension",
         "nominal_value": 1, "upper_tolerance": 0.2, "lower_tolerance": None,
         "tolerance_type": "unilateral", "confidence": "high"},
        "mm", 1)
    assert rec["lsl"] == 1.0 and rec["usl"] == 1.2
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "40-2", "characteristic_type": "dimension",
         "nominal_value": 40, "upper_tolerance": None, "lower_tolerance": 2,
         "tolerance_type": "unilateral", "confidence": "high"},
        "mm", 1)
    assert rec["lsl"] == 38.0 and rec["usl"] == 40.0
    assert rec["tolerance_type"] == "unilateral"


def test_adapt_no_tolerance_never_invents_limits():
    rec = adapt_hydrogen_balloon(
        {"raw_callout": "64.0", "characteristic_type": "dimension",
         "nominal_value": 64.0, "confidence": "high"},
        "mm", 1)
    assert rec["lsl"] is None and rec["usl"] is None


def test_iso_286_unsupported_fit_letter_returns_unknown_not_raise():
    # new03 crash: deviation letter 'R' is not in the ISO 286 tables.
    lsl, usl = iso_286_limits(12.0, "R7", "mm")
    assert lsl is None and usl is None
    lsl, usl = iso_286_limits(12.0, "H7", "mm")
    assert lsl == 12.0 and usl == 12.018


def test_parse_envelope_strips_fences():
    envelope = {"candidates": [{"content": {"parts": [
        {"text": "```json\n{\"balloons\": [], \"drawing_metadata\": {\"units\": \"mm\"}}\n```"}
    ]}}]}
    parsed, err = parse_hydrogen_envelope(envelope)
    assert err is None
    assert parsed["balloons"] == []


# ---------------------------------------------------------------------------
# Dedup: exact duplicates only — distinct callouts sharing a nominal stay
# ---------------------------------------------------------------------------

def _h(raw, nominal, lsl=None, usl=None, kind="LINEAR", page=1):
    return {"raw_callout": raw, "nominal": nominal, "lsl": lsl, "usl": usl,
            "kind": kind, "page": page, "confidence": 0.9, "source": "HYDROGEN"}


def test_dedup_removes_exact_duplicate_only():
    records = [
        _h("2 ±0.2", 2.0, 1.8, 2.2),
        _h("2 ±0.2", 2.0, 1.8, 2.2),  # exact duplicate -> removed
        _h("M2 (3x)", 2.0, None, None, kind="THREAD"),  # same nominal, distinct -> kept
        _h("R2 (6x)", 2.0, None, None, kind="RADIUS"),  # same nominal, distinct -> kept
        _h("2 ±0.2", 2.0, 1.8, 2.2, page=2),  # same text, different page -> kept
    ]
    out = dedup_hydrogen_records(records)
    assert len(out) == 4
    assert [r["raw_callout"] for r in out] == ["2 ±0.2", "M2 (3x)", "R2 (6x)", "2 ±0.2"]


# ---------------------------------------------------------------------------
# Matcher: nominal + limits + GD&T signature; many-to-one allowed
# ---------------------------------------------------------------------------

def test_match_by_nominal_and_limits():
    vec = [{"cid": "sp_0001", "raw_text": "Ø 30.00 H7", "nominal": 30.0,
            "lsl": 30.0, "usl": 30.021, "kind": "ISO_FIT", "featureDescription": ""}]
    h = _h("Ø 30.00 H7", 30.0, 30.0, 30.021, kind="ISO_FIT")
    assert match_hydrogen_to_vector(h, vec)["cid"] == "sp_0001"


def test_match_gdt_by_zone_and_symbol():
    vec = [{"cid": "sp_0002", "raw_text": "|⌖|Ø0.05|A|B|", "nominal": 0.0,
            "lsl": 0.0, "usl": 0.05, "kind": "GDT_FRAME",
            "featureDescription": "Position GD&T Control"}]
    h = _h("|⌖|Ø0.05|A|B|", 0.0, 0.0, 0.05, kind="GDT_FRAME")
    h["featureDescription"] = "Position"
    assert match_hydrogen_to_vector(h, vec)["cid"] == "sp_0002"


def test_match_many_to_one_is_allowed_for_placement():
    # Two distinct Hydrogen callouts sharing one vector cluster: the matcher
    # returns the same vector record for both (the fusion layer stacks
    # them instead of deduping — see main.py 2c).
    vec = [{"cid": "sp_0003", "raw_text": "M2", "nominal": 2.0,
            "lsl": None, "usl": None, "kind": "THREAD", "featureDescription": ""}]
    assert match_hydrogen_to_vector(_h("M2 (3x)", 2.0, kind="THREAD"), vec)["cid"] == "sp_0003"
    assert match_hydrogen_to_vector(_h("R2 (6x)", 2.0, kind="RADIUS"), vec)["cid"] == "sp_0003"


def test_match_rejects_wrong_nominal():
    vec = [{"cid": "sp_0004", "raw_text": "Ø 30.00", "nominal": 30.0,
            "lsl": 29.95, "usl": 30.05, "kind": "DIAMETER", "featureDescription": ""}]
    assert match_hydrogen_to_vector(_h("Ø 31.00 ±0.05", 31.0, 30.95, 31.05, kind="DIAMETER"), vec) is None


def test_match_ignores_zero_nominal():
    # Regression (new03): an angle range with no nominal must not steal a
    # surface record's vector cluster just because both carry nominal 0.0.
    vec = [{"cid": "sp_rz", "raw_text": "Rz 6.3", "nominal": 0.0,
            "lsl": 0.0, "usl": 6.3, "kind": "SURFACE_ROUGHNESS", "featureDescription": ""}]
    assert match_hydrogen_to_vector(_h("90°...120°", 0.0, 90.0, 120.0, kind="ANGULAR"), vec) is None
    # ...while the comma-decimal surface record text-matches the same cluster.
    assert match_hydrogen_to_vector(_h("Rz 6,3", 0.0, 0.0, 6.3, kind="SURFACE_ROUGHNESS"), vec)["cid"] == "sp_rz"


def test_parse_number_european_decimal_comma():
    assert parse_number("6,3") == 6.3
    assert parse_number("1,000") == 1000.0
    assert parse_number(6.3) == 6.3


# ---------------------------------------------------------------------------
# Live call: no key -> UNAVAILABLE; 429 -> RATE_LIMITED latch, no retry
# ---------------------------------------------------------------------------

class _FakeResp:
    def __init__(self, status_code=200, payload=None, reason_phrase=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.reason_phrase = reason_phrase or {200: "OK", 429: "Too Many Requests",
                                                503: "Service Unavailable"}.get(status_code, "Error")

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise hydrogen_vision.httpx.HTTPStatusError(
                f"{self.status_code}", request=None, response=self)


class _SequencedFakeAsyncClient:
    """Returns canned responses in order (for retry tests)."""

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


class _FakeAsyncClient:
    calls = 0

    def __init__(self, resp):
        self._resp = resp

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, *args, **kwargs):
        _FakeAsyncClient.calls += 1
        return self._resp


def test_call_page_ok(monkeypatch):
    envelope = {"candidates": [{"content": {"parts": [{"text": json.dumps({
        "drawing_metadata": {"units": "mm"},
        "balloons": [{"raw_callout": "Ø 30.00 ±0.05", "characteristic_type": "diameter",
                      "nominal_value": 30.0, "upper_tolerance": 0.05,
                      "lower_tolerance": 0.05, "confidence": "high"}],
    })}]}}]}
    monkeypatch.setattr(
        hydrogen_vision.httpx, "AsyncClient",
        lambda **kw: _FakeAsyncClient(_FakeResp(200, envelope)))
    res = asyncio.run(hydrogen_vision.call_hydrogen_page("iVBORw0", "fake-key", 1))
    assert res.status == "OK"
    assert len(res.records) == 1
    assert res.records[0]["nominal"] == 30.0
    assert res.records[0]["usl"] == 30.05


def test_call_page_503_retries_then_succeeds(monkeypatch):
    # Live Render 503'd twice on 2026-11-17 before succeeding: a 503 is
    # transient overload, so the call retries (unlike a 429, which latches).
    envelope = {"candidates": [{"content": {"parts": [{"text": json.dumps({
        "drawing_metadata": {"units": "mm"},
        "balloons": [{"raw_callout": "Ø 30.00 ±0.05", "characteristic_type": "diameter",
                      "nominal_value": 30.0, "upper_tolerance": 0.05,
                      "lower_tolerance": 0.05, "confidence": "high"}],
    })}]}}]}
    seq = _SequencedFakeAsyncClient([_FakeResp(503, {}), _FakeResp(200, envelope)])
    monkeypatch.setattr(hydrogen_vision.httpx, "AsyncClient", lambda **kw: seq)
    res = asyncio.run(hydrogen_vision.call_hydrogen_page("iVBORw0", "fake-key", 1))
    assert res.status == "OK"
    assert len(res.records) == 1
    assert seq.calls == 2


def test_call_page_429_latches_and_stops(monkeypatch):
    hydrogen_vision._clear_rate_limit_latch()
    _FakeAsyncClient.calls = 0
    monkeypatch.setattr(
        hydrogen_vision.httpx, "AsyncClient",
        lambda **kw: _FakeAsyncClient(_FakeResp(429, {})))
    try:
        res1 = asyncio.run(hydrogen_vision.call_hydrogen_page("iVBORw0", "fake-key", 1))
        assert res1.status == "RATE_LIMITED"
        assert hydrogen_vision.is_rate_limited() is True
        # Second call must not hit the API again (latch, no retries).
        res2 = asyncio.run(hydrogen_vision.call_hydrogen_page("iVBORw0", "fake-key", 1))
        assert res2.status == "RATE_LIMITED"
        assert _FakeAsyncClient.calls == 1
    finally:
        hydrogen_vision._clear_rate_limit_latch()


def test_call_page_429_falls_back_to_second_key(monkeypatch):
    # Key 1 429s, key 2 (GEMINI_API_KEY_2) succeeds — automatic fallback.
    hydrogen_vision._clear_rate_limit_latch()
    envelope = {"candidates": [{"content": {"parts": [{"text": json.dumps({
        "drawing_metadata": {"units": "mm"},
        "balloons": [{"raw_callout": "Ø 30.00 ±0.05", "characteristic_type": "diameter",
                      "nominal_value": 30.0, "upper_tolerance": 0.05,
                      "lower_tolerance": 0.05, "confidence": "high"}],
    })}]}}]}
    calls: list[str] = []

    class _KeyAwareClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, headers=None, **kw):
            calls.append(headers.get("x-goog-api-key"))
            if headers.get("x-goog-api-key") == "key-one":
                return _FakeResp(429, {})
            return _FakeResp(200, envelope)

    monkeypatch.setattr(hydrogen_vision.httpx, "AsyncClient", _KeyAwareClient)
    monkeypatch.setenv("GEMINI_API_KEY", "key-one")
    monkeypatch.setenv("GEMINI_API_KEY_2", "key-two")
    try:
        res = asyncio.run(hydrogen_vision.call_hydrogen_page("iVBORw0", None, 1))
        assert res.status == "OK"
        assert len(res.records) == 1
        assert calls == ["key-one", "key-two"]
        # Key 1 is latched, key 2 is not — overall not rate-limited.
        assert hydrogen_vision.is_rate_limited() is False
    finally:
        hydrogen_vision._clear_rate_limit_latch()


def test_rate_limit_latch_expires_after_ttl(monkeypatch):
    # A latched key is tried again automatically once its TTL expires.
    hydrogen_vision._clear_rate_limit_latch()
    monkeypatch.setenv("GEMINI_HYDROGEN_LATCH_TTL_HOURS", "0.0001")  # ~0.36s
    monkeypatch.setattr(
        hydrogen_vision.httpx, "AsyncClient",
        lambda **kw: _FakeAsyncClient(_FakeResp(429, {})))
    try:
        res1 = asyncio.run(hydrogen_vision.call_hydrogen_page("iVBORw0", "fake-key", 1))
        assert res1.status == "RATE_LIMITED"
        assert hydrogen_vision.is_rate_limited() is True
        import time as _t
        _t.sleep(0.5)
        assert hydrogen_vision.is_rate_limited() is False
    finally:
        hydrogen_vision._clear_rate_limit_latch()


def test_extract_no_key_is_unavailable(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    records, status, notes = asyncio.run(
        extract_drawing_with_hydrogen(__import__("fitz").open()))
    assert status == "UNAVAILABLE"
    assert records == []


# ---------------------------------------------------------------------------
# API: R-fit never 500s; stubbed-Hydrogen fusion end-to-end
# ---------------------------------------------------------------------------

def test_r_fit_does_not_crash_extraction():
    pdf_bytes = _leader_pdf([("Ø 12 R7", 420, 260, 470, 220)])
    upload = client.post(
        "/api/v1/drawings",
        files={"file": ("rfit.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert upload.status_code == 200
    dwg_id = upload.json()["id"]
    res = client.post(f"/api/v1/drawings/{dwg_id}/extract")
    assert res.status_code == 200, res.text
    chars = res.json()["characteristics"]
    assert any(c["nominal"] == 12.0 for c in chars)
    assert any("Unsupported ISO 286" in r for c in chars for r in c.get("review_reasons", []))


def test_fusion_with_stubbed_hydrogen(monkeypatch):
    async def _fake_hydrogen(doc):
        return ([
            {"raw_callout": "Ø30.00 H7", "nominal": 30.0, "lsl": 30.0, "usl": 30.021,
             "kind": "ISO_FIT", "featureDescription": "", "page": 1, "fit_class": "H7",
             "units": "mm", "quantity": 1, "confidence": 0.9, "source": "HYDROGEN"},
            {"raw_callout": "Ø 99.9 ±0.1", "nominal": 99.9, "lsl": 99.8, "usl": 100.0,
             "kind": "DIAMETER", "featureDescription": "", "page": 1, "fit_class": None,
             "units": "mm", "quantity": 1, "confidence": 0.9, "source": "HYDROGEN"},
        ], "OK", [])
    monkeypatch.setattr(hydrogen_vision, "extract_drawing_with_hydrogen", _fake_hydrogen)

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
    chars = data["characteristics"]
    # 17 vector + 1 Hydrogen-only (Ø 99.9); the Ø30 H7 record is overridden, not duplicated.
    assert len(chars) == 18, [c["raw_callout"] for c in chars]
    h30 = next(c for c in chars if c["nominal"] == 30.0 and c["kind"] == "ISO_FIT")
    assert h30["source"] == "HYDROGEN"
    assert h30["usl"] == 30.021
    h99 = next(c for c in chars if c["nominal"] == 99.9)
    assert h99["source"] == "HYDROGEN"
    assert h99["needs_review"] is True
    assert h99["lsl"] == 99.8 and h99["usl"] == 100.0

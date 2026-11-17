# backend/spark_vision.py
"""Muse Spark Open via Token Factory as the INVISIBLE vision fallback.

Order (decided by Dhyey 2026-11-17): Hydrogen (Gemini) is the primary
extractor. If Hydrogen cannot be used for an extraction — no key,
rate-limited on every key, or error — the backend automatically tries
Muse Spark Open (`meta-models/muse-spark-open`, scored 320/331 = 96.7%
in the Nov 13 A/B test, same prompt / ground truth / matcher as
Hydrogen's 321/331) through the Token Factory API.

INVISIBLE BY DESIGN: the frontend must never know a fallback happened
and no error is shown for the switch. So:
  - The API response keeps `hydrogen_status: "OK"` and generic
    provider-free notes when Spark succeeds. The provider is recorded
    ONLY in server logs (print), never in a response field.
  - Records carry internal source "SPARK" here, but main.py's
    `_hydrogen_record_fields` normalises the outward `source` to the
    generic vision label, and review reasons are provider-free
    ("Primary extraction by full-page vision").
  - If Spark also fails, the extraction falls back to vector-only
    exactly as before (Hydrogen status/notes unchanged).

Key: env NEBIUS_API_KEY (primary name, same as the A/B runner) or
TOKEN_FACTORY_API_KEY. Model: env TOKEN_FACTORY_MODEL /
NEBIUS_MODEL, default `meta-models/muse-spark-open`. Base URL: env
NEBIUS_BASE_URL, default https://api.tokenfactory.nebius.com/v1.
Never log or return the key value. Vision must never fail an
extraction.
"""
from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

from hydrogen_vision import (
    HYDROGEN_PROMPT,
    _strip_fences,
    adapt_hydrogen_balloon,
    render_page_png_base64,
)

DEFAULT_SPARK_MODEL = "meta-models/muse-spark-open"
DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1"


def spark_model() -> str:
    return (
        os.getenv("TOKEN_FACTORY_MODEL")
        or os.getenv("NEBIUS_MODEL")
        or DEFAULT_SPARK_MODEL
    ).strip() or DEFAULT_SPARK_MODEL


def spark_base_url() -> str:
    return (os.getenv("NEBIUS_BASE_URL") or DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL


def spark_api_key(explicit_key: str | None = None) -> str:
    for candidate in [
        explicit_key,
        os.getenv("NEBIUS_API_KEY"),
        os.getenv("TOKEN_FACTORY_API_KEY"),
    ]:
        if candidate and candidate.strip():
            return candidate.strip()
    return ""


@dataclass
class SparkPageResult:
    status: Literal["OK", "UNAVAILABLE", "RATE_LIMITED", "ERROR"]
    page: int
    records: list[dict[str, Any]] = field(default_factory=list)
    units: str = "mm"
    notes: list[str] = field(default_factory=list)


def parse_spark_envelope(envelope: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    """OpenAI-compatible chat envelope -> parsed JSON, or an error note."""
    try:
        text = (
            envelope.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        )
        if not isinstance(text, str):
            text = json.dumps(text)
        return json.loads(_strip_fences(text)), None
    except Exception as exc:  # noqa: BLE001 - report, don't crash the run
        return None, f"JSON parse failed: {exc}"


async def call_spark_page(
    image_b64: str,
    api_key: str,
    page: int,
    model: str | None = None,
) -> SparkPageResult:
    """One full-page Spark call. 429 -> RATE_LIMITED, no retry. 5xx and
    transient network errors -> up to 3 attempts with 10s/20s backoff.
    A 400 -> one retry without response_format (some models reject it),
    exactly as the Nov 13 A/B runner did. Any other error -> ERROR."""
    resolved_key = (api_key or "").strip()
    if not resolved_key:
        return SparkPageResult(status="UNAVAILABLE", page=page,
                               notes=["Token Factory key is not configured."])
    model = (model or spark_model()).strip()
    url = f"{spark_base_url()}/chat/completions"
    body: dict[str, Any] = {
        "model": model,
        "temperature": 0,
        "max_tokens": 32768,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": HYDROGEN_PROMPT},
            {"type": "image_url", "image_url": {
                "url": f"data:image/png;base64,{image_b64}"}},
        ]}],
        "response_format": {"type": "json_object"},
    }
    last_note = "Token Factory API error: unknown failure"
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {resolved_key}",
                             "Content-Type": "application/json"},
                    json=body)
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_note = f"Token Factory API error: {exc}"
            if attempt < 2:
                await asyncio.sleep(10 * (attempt + 1))
                continue
            return SparkPageResult(status="ERROR", page=page, notes=[last_note])
        except Exception as exc:  # noqa: BLE001
            return SparkPageResult(status="ERROR", page=page,
                                   notes=[f"Token Factory API error: {exc}"])
        if resp.status_code == 429:
            return SparkPageResult(status="RATE_LIMITED", page=page,
                                   notes=["Token Factory rate limit (429)."])
        if resp.status_code == 400 and "response_format" in body:
            # Some models reject response_format — retry once without it.
            body.pop("response_format", None)
            continue
        if resp.status_code in (500, 502, 503, 504):
            last_note = (f"Token Factory API error: Server error "
                         f"'{resp.status_code} {resp.reason_phrase}' for url '{url}'")
            if attempt < 2:
                await asyncio.sleep(10 * (attempt + 1))
                continue
            return SparkPageResult(status="ERROR", page=page, notes=[last_note])
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            return SparkPageResult(status="ERROR", page=page,
                                   notes=[f"Token Factory API error: {exc}"])
        parsed, err = parse_spark_envelope(resp.json())
        if err is not None or parsed is None:
            return SparkPageResult(status="ERROR", page=page,
                                   notes=[err or "Empty Spark response."])
        meta = (parsed or {}).get("drawing_metadata") or {}
        units = meta.get("units") if meta.get("units") in ("mm", "in") else "mm"
        records: list[dict[str, Any]] = []
        for balloon in (parsed or {}).get("balloons", []) or []:
            rec = adapt_hydrogen_balloon(balloon, units, page, source="SPARK")
            if rec is not None:
                records.append(rec)
        return SparkPageResult(status="OK", page=page, records=records, units=units)
    return SparkPageResult(status="ERROR", page=page, notes=[last_note])


async def extract_drawing_with_spark(doc: Any, api_key: str | None = None) -> tuple[list[dict[str, Any]], str, list[str]]:
    """Spark fallback extraction over ALL pages (calls run concurrently).
    Returns (records, status, notes) in the same shape as Hydrogen's
    extractor. Status is OK only if every page returned OK."""
    key = spark_api_key(api_key)
    if not key:
        return [], "UNAVAILABLE", ["Token Factory key is not configured."]
    page_count = len(doc)
    results = await asyncio.gather(*(
        _extract_one_page(doc, i, key) for i in range(page_count)
    ))
    records: list[dict[str, Any]] = []
    notes: list[str] = []
    statuses = set()
    for res in results:
        statuses.add(res.status)
        records.extend(res.records)
        notes.extend(res.notes)
    if statuses == {"OK"}:
        status = "OK"
    elif "RATE_LIMITED" in statuses:
        status = "RATE_LIMITED"
    elif "ERROR" in statuses:
        status = "ERROR"
    else:
        status = "OK"
    return records, status, notes


async def _extract_one_page(doc: Any, page_index: int, key: str) -> SparkPageResult:
    try:
        image_b64 = render_page_png_base64(doc, page_index)
    except Exception as exc:  # noqa: BLE001
        return SparkPageResult(status="ERROR", page=page_index + 1,
                               notes=[f"Page render failed: {exc}"])
    return await call_spark_page(image_b64, key, page_index + 1)

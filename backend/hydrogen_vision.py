# backend/hydrogen_vision.py
"""Gemini 4 Hydrogen as SpecBalloon's PRIMARY extractor.

Design (committed): vision reads, vector places.
  - Hydrogen reads each full drawing page (rendered PNG, 200 dpi) and extracts
    EVERY dimensional characteristic as structured JSON, using the exact
    prompt that scored 321/331 = 97.0% in the Nov 13 A/B test
    (~/workspace/tmp/specballoon-vision-ab/prompt.md — copied verbatim below
    as HYDROGEN_PROMPT, and results in vision-ab/results/gemini/).
  - The caller (main.py) fuses those records with the vector pass:
    each Hydrogen record is matched to a vector callout cluster by nominal +
    limits + GD&T signature; the VECTOR bbox/balloon position is kept.
    Hydrogen supplies WHAT, vector supplies WHERE.
  - Dedup rule (corrected after the offline fusion prototype measured it):
    dedup ONLY exact-duplicate Hydrogen records (same normalized raw_callout
    + nominal + lsl + usl + kind + page). NEVER dedup two distinct Hydrogen
    callouts because they share one vector placement — distinct GT rows
    legitimately share a nominal (e.g. new01 nominal 2.0 is three rows:
    `2 ±0.2` / `M2 (3x)` / `R2 (6x)`). The prototype measured dedup-on-shared-
    vector-record at 303/331 (fails Stage 1) vs 323/331 with this rule.
  - Safety: no key -> UNAVAILABLE (vector-only path unchanged, never fake
    data). HTTP 429 -> RATE_LIMITED latch: all further Hydrogen calls in
    this process stop, no retries. 5xx (500/502/503/504) -> up to 3
    attempts with 10s/20s backoff (same policy as the A/B runner; a 503
    is usually transient overload). Any other error -> ERROR, vector stands.
    Vision must never fail an extraction.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

from limits_math import calculate_iso_286_limits

# ---------------------------------------------------------------------------
# Model + API
# ---------------------------------------------------------------------------

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_HYDROGEN_MODEL = "gemini-4-hydrogen"

# Latch: once a rate limit (429) is seen, stop ALL Hydrogen use in this
# process. The user's rule: stop API use if a rate limit hits 100%, no
# retries after that.
_RATE_LIMITED = False


def hydrogen_model() -> str:
    return os.getenv("GEMINI_HYDROGEN_MODEL", DEFAULT_HYDROGEN_MODEL).strip() or DEFAULT_HYDROGEN_MODEL


def is_rate_limited() -> bool:
    return _RATE_LIMITED


def _set_rate_limited() -> None:
    global _RATE_LIMITED
    _RATE_LIMITED = True


def _scrub_key(text: str) -> str:
    return re.sub(r"key=[^&\s\"']+", "key=[REDACTED]", text)


# ---------------------------------------------------------------------------
# Prompt — VERBATIM copy of ~/workspace/tmp/specballoon-vision-ab/prompt.md
# (the exact prompt that scored 321/331 in the A/B test; do not edit the
# wording without re-running the A/B scorer against both providers).
# ---------------------------------------------------------------------------

HYDROGEN_PROMPT = """You are a senior Mechanical Quality Engineer and AS9102 First Article
Inspection (FAI) specialist. Extract EVERY dimensional characteristic visible
on this single drawing page.

IMPORTANT — these drawings have NO pre-numbered balloons on them. Do NOT
invent balloon numbers. The `balloon_number` field must be omitted (or null);
numbering is assigned later by the backend, never by you.

## What to extract

Every dimensional characteristic visible on the page, including dimensions in
the main views, detail views, section views, and dimension tables:

- Linear dimensions, diameters (Ø), radii (R), angles (°), chamfers
- Thread callouts (e.g. M10x1.5, 2xM3)
- GD&T feature control frames (symbol, tolerance zone, material modifier, datums)
- Surface finish marks (Ra / Rz)
- Limit callouts (≥ / ≤ / MAX / MIN), basic dimensions (boxed), reference dimensions (in parentheses)
- Fit classes (e.g. Ø 10 f7, Ø 25 H7, M10 - 6H)

## What NOT to extract

- Title-block text, part numbers, revision tables, dates, sheet numbers, scale text
- Drawing notes that are not dimensions
- The same characteristic twice: if a dimension appears once on this page, list it once

## Value rules — no invented values

- `raw_callout`: the exact text/symbols as printed (preserve Ø, ±, °, GD&T glyphs, M, ×).
- `nominal_value`: a NUMBER. For threads, the numeric size (M10 → 10, M2 → 2). For
  fractional sizes give the decimal value (3/4 → 0.75). For GD&T frames and surface
  finish marks, null (the value lives in `raw_callout` / `gdt_details`).
- `upper_tolerance`: the + side as a POSITIVE number (e.g. "±0.5" → 0.5; "+0.03/-0.01" → 0.03).
  `lower_tolerance`: the − side as a POSITIVE number (e.g. "±0.5" → 0.5; "+0.03/-0.01" → 0.01).
  If no tolerance is printed, both are null — never guess one.
- `fit_class`: the fit/tolerance class exactly as printed (e.g. "f7", "H7", "6H"), or null.
- `min_limit` / `max_limit`: for limit callouts only. "≥ 5.5" → min_limit 5.5, nominal_value 5.5.
  "≤ 0.4" → max_limit 0.4, nominal_value 0.4. Otherwise null.
- `tolerance_type`: bilateral | unilateral | limit | basic | reference | title_block_default | none.
- `characteristic_type`: dimension | diameter | radius | angle | thread | gdt | surface_finish | chamfer.
- `gdt_details.symbol`: the symbol NAME (e.g. "perpendicularity", "position", "runout") or the
  glyph exactly as printed (e.g. "↗", "⊥", "⌖"). `tolerance_zone`: the zone number, or null
  if the frame shows "*" or no number. `material_condition`: MMC | LMC | RFS | null.
  `datums`: list like ["A", "B"].
- `quantity`: the multiplier (e.g. "3x" → 3). Default 1.
- `zone`: the drawing grid zone if determinable (e.g. "B4"), else null.
- `view_name`: the view the callout sits in (e.g. "SECTION A-A", "DETAIL B"), else null.
- `confidence`: high | medium | low. Use low when a value is partially legible and say so in `notes`.
- `drawing_metadata.units`: "mm" or "in" from the title block, or "unknown".

## Output

Return ONLY valid JSON matching the schema below. No markdown fences, no commentary.

```json
{
  "drawing_metadata": {
    "part_number": "string or null",
    "revision": "string or null",
    "units": "mm | in | unknown",
    "total_pages": 0,
    "total_balloons_found": 0
  },
  "balloons": [
    {
      "page": 1,
      "zone": "string or null (e.g., B4)",
      "view_name": "string or null (e.g., SECTION A-A, DETAIL B, MAIN VIEW)",
      "quantity": 1,
      "characteristic_type": "dimension | diameter | radius | angle | thread | gdt | surface_finish | chamfer",
      "raw_callout": "exact text/symbols as shown on drawing",
      "nominal_value": "number or null",
      "upper_tolerance": "number or null",
      "lower_tolerance": "number or null",
      "tolerance_type": "bilateral | unilateral | limit | basic | reference | title_block_default | none",
      "fit_class": "string or null (e.g., f7, H7, 6H)",
      "min_limit": "number or null",
      "max_limit": "number or null",
      "gdt_details": {
        "symbol": "string or null",
        "tolerance_zone": "number or null",
        "material_condition": "MMC | LMC | RFS | null",
        "datums": ["A", "B", "C"]
      },
      "confidence": "high | medium | low",
      "notes": "string or null"
    }
  ]
}
```
"""

# ---------------------------------------------------------------------------
# Adapter: Hydrogen balloon -> backend matcher record.
# Ported from ~/workspace/tmp/specballoon-vision-ab/score_vision.py
# (adapt_balloon + iso_286_limits + gdt_display_name) — same rules, so the
# backend scores identically to the A/B scorer. Two documented deviations:
#  (a) SURFACE_ROUGHNESS: the A/B adapter leaves lsl/usl None (value lives
#      only in raw_callout); here the first number printed in raw_callout
#      (e.g. "Ra 0.8" -> usl 0.8, lsl 0.0) is used, because the backend
#      record shape has no other place to carry the roughness value and
#      the matcher checks usl for toleranced GT rows.
#  (b) nominal None -> 0.0 in the backend record (the synthesis code
#      defaults missing nominals to 0.0 anyway); GDT zone stays in usl.
#  (c) parse_number treats a European decimal comma as a decimal point
#      ("Rz 6,3" -> 6.3); the A/B adapter stripped the comma and read 63.0.
#  (d) Unilateral tolerances are completed deterministically ('+0.2' ->
#      [nominal, nominal+0.2], '-0.2' -> [nominal-0.2, nominal]); the A/B
#      adapter left the unstated side None. tolerance_type is carried so
#      the caller never mistakes a tolerance bound for a limit bound.
# ---------------------------------------------------------------------------

TYPE_TO_KIND = {
    "dimension": "LINEAR",
    "diameter": "DIAMETER",
    "radius": "RADIUS",
    "angle": "ANGULAR",
    "thread": "THREAD",
    "gdt": "GDT_FRAME",
    "surface_finish": "SURFACE_ROUGHNESS",
    "chamfer": "CHAMFER",
}

GLYPH_TO_NAME = {
    "↗": "Runout", "⊥": "Perpendicularity", "⌖": "Position",
    "⌓": "Surface Profile", "∥": "Parallelism", "∠": "Angularity",
    "○": "Circularity", "◎": "Concentricity", "⌭": "Cylindricity",
    "⏥": "Symmetry", "⏤": "Flatness",
    "flatness": "Flatness", "straightness": "Straightness",
}

_DISPLAY_NAMES = {
    "POSITION": "Position", "PERPENDICULARITY": "Perpendicularity",
    "FLATNESS": "Flatness", "CONCENTRICITY": "Concentricity",
    "RUNOUT": "Runout", "CIRCULAR_RUNOUT": "Runout", "TOTAL_RUNOUT": "Runout",
    "SURFACE_PROFILE": "Surface Profile", "PARALLELISM": "Parallelism",
    "ANGULARITY": "Angularity", "CIRCULARITY": "Circularity",
    "CYLINDRICITY": "Cylindricity", "SYMMETRY": "Symmetry",
    "STRAIGHTNESS": "Straightness",
}
_NAME_TO_DESC = {v.lower(): v for v in _DISPLAY_NAMES.values()}
_NAME_TO_DESC.update({k.lower(): v for k, v in _DISPLAY_NAMES.items()})

_NUM_RE = re.compile(r"-?\d+(?:\.\d+)?")
_CONFIDENCE_VALUE = {"high": 0.90, "medium": 0.75, "low": 0.60}


def parse_number(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    # European decimal comma ("Rz 6,3" -> 6.3). Deviation (c) from the A/B
    # adapter, which stripped the comma and read 63.0 — wrong on every
    # European drawing in the set. A thousands separator ("1,000") keeps
    # its commas stripped; a 1-2 digit decimal tail is a decimal comma.
    if re.fullmatch(r"-?\d+,\d{1,2}", s):
        s = s.replace(",", ".")
    else:
        s = s.replace(",", "")
    m = _NUM_RE.search(s)
    return float(m.group(0)) if m else None


def iso_286_limits(nominal: float | None, fit_class: str | None, units: str) -> tuple[float | None, float | None]:
    """ISO 286 limits for a fit class, in the drawing's units. Returns
    (None, None) for an unsupported fit letter instead of raising — an
    unknown fit must never 500 an extraction (see new03 'R' crash)."""
    if nominal is None or not fit_class:
        return None, None
    try:
        nominal_mm = nominal * 25.4 if (units or "mm").lower().startswith("in") else nominal
        lim = calculate_iso_286_limits(nominal_mm, str(fit_class).strip())
        if (units or "mm").lower().startswith("in"):
            return lim.lsl / 25.4, lim.usl / 25.4
        return lim.lsl, lim.usl
    except Exception:
        return None, None


def gdt_display_name(symbol: Any) -> str:
    if not symbol:
        return ""
    s = str(symbol).strip()
    if s in GLYPH_TO_NAME:
        return GLYPH_TO_NAME[s]
    if s.lower() in _NAME_TO_DESC:
        return _NAME_TO_DESC[s.lower()]
    if s.upper() in _DISPLAY_NAMES:
        return _DISPLAY_NAMES[s.upper()]
    return s


def adapt_hydrogen_balloon(b: dict[str, Any], units: str, page: int) -> dict[str, Any] | None:
    """Hydrogen balloon -> matcher/backend record. Returns None when the
    balloon carries no usable content."""
    raw = str(b.get("raw_callout") or "").strip()
    if not raw:
        return None
    btype = str(b.get("characteristic_type") or "").strip().lower()
    kind = TYPE_TO_KIND.get(btype, "LINEAR")
    nominal = parse_number(b.get("nominal_value"))
    fit_class = (b.get("fit_class") or None)
    if fit_class:
        fit_class = str(fit_class).strip() or None
    if fit_class and kind not in ("THREAD", "GDT_FRAME"):
        kind = "ISO_FIT"

    lsl = usl = None
    tol_type = str(b.get("tolerance_type") or "").strip().lower()
    min_lim = parse_number(b.get("min_limit"))
    max_lim = parse_number(b.get("max_limit"))
    if tol_type == "limit" or min_lim is not None or max_lim is not None:
        lsl, usl = min_lim, max_lim
    else:
        upper = parse_number(b.get("upper_tolerance"))
        lower = parse_number(b.get("lower_tolerance"))
        if upper is not None or lower is not None:
            if nominal is not None:
                # Unilateral completion (deviation (d) from the A/B
                # adapter, which left the unstated side None): '+0.2'
                # means the value cannot go below nominal, '-0.2' means
                # it cannot go above it. Deterministic reading of the
                # printed tolerance, not an invented limit.
                usl = nominal + abs(upper) if upper is not None else nominal
                lsl = nominal - abs(lower) if lower is not None else nominal
        elif fit_class and nominal is not None:
            lsl, usl = iso_286_limits(nominal, fit_class, units)

    feature_desc = ""
    if kind == "GDT_FRAME":
        gdt = b.get("gdt_details") or {}
        feature_desc = gdt_display_name(gdt.get("symbol"))
        zone = parse_number(gdt.get("tolerance_zone"))
        if zone is not None:
            usl = zone  # matcher compares GT gdt_tolerance against pred usl
            lsl = 0.0
    if kind == "SURFACE_ROUGHNESS":
        # Deviation (a): carry the printed roughness value in usl.
        val = parse_number(raw)
        if val is not None:
            lsl, usl = 0.0, val

    return {
        "raw_callout": raw,
        "nominal": nominal if nominal is not None else 0.0,
        "lsl": lsl,
        "usl": usl,
        "kind": kind,
        "featureDescription": feature_desc,
        "page": page,
        "fit_class": fit_class,
        "units": units,
        "tolerance_type": tol_type,
        "quantity": int(b.get("quantity") or 1),
        "confidence": _CONFIDENCE_VALUE.get(str(b.get("confidence") or "").lower(), 0.75),
        "source": "HYDROGEN",
    }


# ---------------------------------------------------------------------------
# Full-page call
# ---------------------------------------------------------------------------

@dataclass
class HydrogenPageResult:
    status: Literal["OK", "UNAVAILABLE", "RATE_LIMITED", "ERROR"]
    page: int
    records: list[dict[str, Any]] = field(default_factory=list)
    units: str = "mm"
    notes: list[str] = field(default_factory=list)


def render_page_png_base64(doc: Any, page_index: int, dpi: int = 200) -> str:
    """Render one PDF page to a base64 PNG (no clip — full page).
    Same primitive as the crop helper (vector_pass.crop_callout_patch_base64),
    without the clip, at 200 dpi like the A/B renders."""
    import fitz

    page = doc[page_index]
    pix = page.get_pixmap(dpi=dpi, alpha=False)
    return base64.b64encode(pix.tobytes("png")).decode("ascii")


def _strip_fences(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else ""
        if t.rstrip().endswith("```"):
            t = t.rstrip()[:-3]
    return t.strip()


def parse_hydrogen_envelope(envelope: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    try:
        parts = envelope.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        return json.loads(_strip_fences(text)), None
    except Exception as exc:  # noqa: BLE001 - report, don't crash the run
        return None, f"JSON parse failed: {exc}"


async def call_hydrogen_page(
    image_b64: str,
    api_key: str,
    page: int,
    model: str | None = None,
) -> HydrogenPageResult:
    """One full-page Hydrogen call. 429 -> rate-limit latch, NO retry (the
    user's rule: stop API use if a rate limit hits 100%). 5xx (500/502/
    503/504) and transient network errors -> up to 3 attempts with 10s/20s
    backoff, the same retry policy as the A/B runner that produced the
    321/331 score: a 503 is usually transient overload, and the live
    backend 503'd twice in a row on 2026-11-17 before succeeding on the
    third attempt. Any other error -> ERROR, vector stands."""
    if _RATE_LIMITED:
        return HydrogenPageResult(status="RATE_LIMITED", page=page,
                                  notes=["Hydrogen rate-limit latch active — no further API calls."])
    resolved_key = (api_key or "").strip()
    if not resolved_key:
        return HydrogenPageResult(status="UNAVAILABLE", page=page,
                                  notes=["GEMINI_API_KEY is not configured; skipped Hydrogen page call."])
    model = (model or hydrogen_model()).strip()
    url = f"{GEMINI_BASE}/{model}:generateContent"
    body = {
        "contents": [{"parts": [
            {"text": HYDROGEN_PROMPT},
            {"inline_data": {"mime_type": "image/png", "data": image_b64}},
        ]}],
        "generationConfig": {"temperature": 0, "response_mime_type": "application/json"},
    }
    last_note = "Gemini Vision API error: unknown failure"
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                resp = await client.post(
                    url, headers={"x-goog-api-key": resolved_key, "Content-Type": "application/json"},
                    json=body)
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_note = f"Gemini Vision API error: {_scrub_key(str(exc))}"
            if attempt < 2:
                await asyncio.sleep(10 * (attempt + 1))
                continue
            return HydrogenPageResult(status="ERROR", page=page, notes=[last_note])
        except Exception as exc:  # noqa: BLE001
            return HydrogenPageResult(status="ERROR", page=page,
                                      notes=[f"Gemini Vision API error: {_scrub_key(str(exc))}"])
        if resp.status_code == 429:
            _set_rate_limited()
            return HydrogenPageResult(status="RATE_LIMITED", page=page,
                                      notes=["Gemini rate limit (429) — Hydrogen disabled for this process, no retry."])
        if resp.status_code in (500, 502, 503, 504):
            last_note = (f"Gemini Vision API error: Server error '{resp.status_code} "
                         f"{resp.reason_phrase}' for url '{url}'")
            if attempt < 2:
                await asyncio.sleep(10 * (attempt + 1))
                continue
            return HydrogenPageResult(status="ERROR", page=page, notes=[last_note])
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            return HydrogenPageResult(status="ERROR", page=page,
                                      notes=[f"Gemini Vision API error: {_scrub_key(str(exc))}"])
        parsed, err = parse_hydrogen_envelope(resp.json())
        if err is not None or parsed is None:
            return HydrogenPageResult(status="ERROR", page=page, notes=[err or "Empty Hydrogen response."])
        meta = (parsed or {}).get("drawing_metadata") or {}
        units = meta.get("units") if meta.get("units") in ("mm", "in") else "mm"
        records: list[dict[str, Any]] = []
        for balloon in (parsed or {}).get("balloons", []) or []:
            rec = adapt_hydrogen_balloon(balloon, units, page)
            if rec is not None:
                records.append(rec)
        return HydrogenPageResult(status="OK", page=page, records=records, units=units)
    return HydrogenPageResult(status="ERROR", page=page, notes=[last_note])


async def extract_drawing_with_hydrogen(doc: Any, api_key: str | None = None) -> tuple[list[dict[str, Any]], str, list[str]]:
    """Hydrogen primary extraction over ALL pages (calls run concurrently).
    Returns (records, status, notes). Status is OK only if every page
    returned OK; UNAVAILABLE when no key is configured (vector-only path
    then runs unchanged); RATE_LIMITED / ERROR otherwise (records from the
    pages that did succeed are still returned)."""
    key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
    if not key:
        return [], "UNAVAILABLE", ["GEMINI_API_KEY is not configured; Hydrogen primary extraction skipped."]
    if _RATE_LIMITED:
        return [], "RATE_LIMITED", ["Hydrogen rate-limit latch active — no further API calls."]
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


async def _extract_one_page(doc: Any, page_index: int, key: str) -> HydrogenPageResult:
    try:
        image_b64 = render_page_png_base64(doc, page_index)
    except Exception as exc:  # noqa: BLE001
        return HydrogenPageResult(status="ERROR", page=page_index + 1,
                                  notes=[f"Page render failed: {exc}"])
    return await call_hydrogen_page(image_b64, key, page_index + 1)


# ---------------------------------------------------------------------------
# Fusion matching: Hydrogen record -> vector callout node.
# Many-to-one is ALLOWED for placement (several distinct Hydrogen callouts
# may share one vector cluster's bbox); dedup is exact-duplicate only.
# ---------------------------------------------------------------------------

NOMINAL_EPS = 0.02
LIMIT_EPS = 0.01


def _normalize_text(s: str) -> str:
    s = (s or "").replace("−", "-").replace("–", "-").replace("—", "-")
    # European decimal comma, same rule as parse_number ("6,3" == "6.3").
    s = re.sub(r"(\d),(\d)", r"\1.\2", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def _gdt_symbol_name(feature_description: str) -> str:
    return (feature_description or "").replace(" GD&T Control", "").strip()


def match_hydrogen_to_vector(
    h_rec: dict[str, Any],
    vector_records: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Best vector record for a Hydrogen record, or None. vector_records are
    dicts with keys: cid, raw_text, nominal, lsl, usl, kind, featureDescription.
    GDT matches by zone (usl) + symbol name; others by nominal (eps 0.02)
    with limits (eps 0.01) when both sides state them; nominal-None rows by
    normalized text equality. Kind mismatch is only a tie-break."""
    best: dict[str, Any] | None = None
    best_score: float | None = None
    h_kind = h_rec.get("kind", "")
    h_nom = h_rec.get("nominal")
    # Nominal 0.0 means "no nominal" (the adapter coerces a null
    # nominal_value to 0.0): NEVER match on it. Unrelated records share
    # 0.0 — every GDT frame, surface mark and limit callout — and matching
    # on it lets an angle range ('90°...120°') steal a surface record's
    # vector cluster ('Rz 6.3'), which cost new03 a correct row.
    h_has_nominal = h_nom is not None and float(h_nom) != 0.0
    for v in vector_records:
        if h_kind == "GDT_FRAME":
            zone = h_rec.get("usl")
            if zone is None or v.get("usl") is None:
                continue
            if abs(float(v["usl"]) - float(zone)) > LIMIT_EPS:
                continue
            want = _gdt_symbol_name(h_rec.get("featureDescription", ""))
            desc = v.get("featureDescription", "")
            score = 0.0 if (want and want in desc) else 0.5
        elif not h_has_nominal:
            # Nominal-None record: strict text match only.
            if _normalize_text(h_rec.get("raw_callout", "")) and _normalize_text(h_rec.get("raw_callout", "")) == _normalize_text(v.get("raw_text", "")):
                score = 0.0
            else:
                continue
        else:
            v_nom = v.get("nominal")
            if v_nom is None:
                continue
            d = abs(float(v_nom) - float(h_nom))
            if d > NOMINAL_EPS:
                continue
            score = d
            if str(v.get("kind", "")) != h_kind and str(v.get("kind", "")) != "REFERENCE":
                score += 0.001
            if h_rec.get("lsl") is not None and h_rec.get("usl") is not None \
                    and v.get("lsl") is not None and v.get("usl") is not None:
                score += abs(float(v["lsl"]) - float(h_rec["lsl"]))
                score += abs(float(v["usl"]) - float(h_rec["usl"]))
        if best_score is None or score < best_score:
            best, best_score = v, score
    return best


def dedup_hydrogen_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Exact-duplicate dedup ONLY: same normalized raw_callout + nominal +
    lsl + usl + kind + page. Distinct callouts sharing a nominal or a
    vector placement are kept (see module docstring)."""
    seen: set[tuple[Any, ...]] = set()
    out: list[dict[str, Any]] = []
    for r in records:
        key = (
            _normalize_text(r.get("raw_callout", "")),
            r.get("nominal"),
            r.get("lsl"),
            r.get("usl"),
            r.get("kind"),
            r.get("page"),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out

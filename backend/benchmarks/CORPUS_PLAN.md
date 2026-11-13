# SpecBalloon Benchmark Corpus Plan & Measurement Protocol

## 1. Executive Summary & Honest Baseline Claims

> [!IMPORTANT]
> **Engineering Scope & Integrity Rule:**
> A 200-drawing verified Ground-Truth (GT) corpus cannot be authored responsibly in a single day.
> **99.1% is the Stage 4 engineering target** upon complete corpus authoring and validation, **NOT** today's achieved accuracy. Never claim 99.1% in investor decks or documentation before the 200-drawing verification completes.

### Verified Round 3 Baseline Status (Commit `baf6ad1`)
- **Synthetic CAD Benchmark (synthetic5):** 5/5 drawings (100% extraction accuracy).
- **Real-World Vendor CAD Benchmark (10 drawings, 331 certain characteristics):**
  - **old5 Battery (real01–real05):** 65/110 certain (59.1% overall; 65/90 non-table = 72.2%).
  - **new5 Battery (new01–new05):** 116/206 non-table (56.3%; 116/221 overall including tables = 52.5%).
- **Post-Stage 3 Target:** ≥ 106/110 (96.4%) on old5, ≥ 214/221 (96.8%) on new5, review rate < 15%.
*(These numbers will be updated strictly after external battery runs by Muse on merged branches).*

---

## 2. Six-Family Stratified Corpus (200 Public Vector PDFs)

All 200 drawings are native vector CAD PDF documents (zero scanned rasters, zero bitmap-only PDFs).

| Family | Category | Target Count | Primary Vendors & Source Repositories | Representative Characteristics |
|---|---|---|---|---|
| **1** | Rotary & Linear Encoders / Sensors | 40 | HEIDENHAIN, SICK, Baumer | Concentricity, runout GD&T, flange bolt circles, shaft fits (`h6`, `g6`), IP seal grooves |
| **2** | Power Transmission & Gears | 35 | KHK, Boston Gear, Martin Sprocket | Module/DP gears, keyways, backlash tolerances, bore limits, tooth profiles, pitch diameters |
| **3** | Configurable Factory Automation | 40 | Misumi, Bosch Rexroth | Multi-sheet configurable drawings, parametric dimension tables (Type A row-header & Type B col-header), extrusion T-slots |
| **4** | Bearings & Linear Motion | 30 | SKF, Schaeffler (INA/FAG), THK, HIWIN | Precision bearing fits (`P6`, `P5`, `h9`, `H7`), raceway radii, chamfer limits, rail mounting hole patterns |
| **5** | Fluid Power, Valves & Actuators | 25 | Festo, SMC | Port threads (`G1/4`, `NPT`, `M5`), cylinder stroke limits, O-ring gland dimensions, pressure relief ports |
| **6** | CNC Machined Part Benchmarks | 30 | NIST Model-Based Enterprise (MBE) PMIs, GrabCAD open benchmarks, ASME Y14.5 / ISO GPS standard test cases | Complex multi-datum GD&T feature control frames (position, flatness, profile of a surface), compound holes |

---

## 3. Ground-Truth Authoring Protocol & Tooling

To eliminate human error in tolerance limits calculation, all ground-truth authoring follows a strict deterministic workflow:

1. **Draft Extraction (`scripts/build_gt_draft.py`):**
   - Runs `extract_all_pages(doc)` through the geometry-guided clustering engine.
   - Extracts 300 DPI callout crops for every characteristic candidate.
   - Emits `<drawing_id>_gt_draft.json` and a self-contained HTML visual review sheet (`<drawing_id>_review_sheet.html`).

2. **Human Verification & Status Tagging:**
   - Reviewer visually checks each crop on the review sheet.
   - Sets status to:
     - `approved`: Valid printed dimension.
     - `reject_extra`: Stray fragment, revision mark, or title block artifact to discard.
     - `uncertain`: Special condition requiring diagnostic tagging.

3. **Strict Uncertain-Row Protocol:**
   A row may be marked `"uncertain": true` **ONLY** if it matches one of four valid technical reasons:
   - `no_text_span_stroked`: Callout rendered solely as stroke vectors with no PDF font text span.
   - `variable_placeholder`: Parametric placeholder symbol (e.g. `L`, `D1`) awaiting configuration lookup.
   - `ambiguous_vendor_notation`: Proprietary or non-standard notation conflicting with ISO/ASME specs.
   - `raster_table`: Dimensional specification contained inside an embedded raster bitmap table.
   *(Uncertain rows are excluded from the certain-accuracy denominator and tracked in a separate diagnostic bucket).*

4. **Deterministic Compilation (`scripts/compile_gt.py`):**
   - Recomputes all `lsl` and `usl` limits strictly via `limits_math.py` and `dimension_grammar.py`.
   - Humans **never** type LSL/USL numbers manually.
   - Drops `reject_extra` rows and validates uncertain reasons.
   - Emits canonical ground-truth JSON files.

---

## 4. Discrepancy & Failure-Mode Triage Protocol

During test battery execution, every mismatch between extraction and GT is systematically categorized:

- `MISS_CLUSTER_OR_LOCK`: Text span exists in PDF stream but failed to cluster into a dimension, or was erroneously locked by an adjacent frame or table. Action: tune `geometry_first_clustering.py` or `table_extractor.py`.
- `WRONG_LIMITS_OR_KIND`: Callout text was extracted correctly, but nominal, LSL, USL, or kind was computed incorrectly. Action: tune `dimension_grammar.py`, `limits_math.py`, or table qualifier synthesis.
- `EXTRA_FRAGMENT`: Non-dimensional token, orphan tolerance, or title-block fragment emitted as a characteristic. Action: refine FCF boundary locking, table locker, or per-page suppression.
- `CORPUS_ANNOTATION_GAP`: Pipeline extracted a genuine physical dimension that was omitted in the ground-truth file. Action: verify against 300 DPI crop and update GT via `compile_gt.py`.

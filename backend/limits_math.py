# backend/limits_math.py
from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class ComputedLimits:
    nominal: float
    plus_tol: float
    minus_tol: float
    lsl: float
    usl: float
    units: Literal["mm", "deg", "um"]
    source_standard: str
    notes: str = ""


# Exact ISO 286-1 Diameter Steps (mm) -> (D_min_exclusive, D_max_inclusive)
ISO_286_STEPS: list[tuple[float, float]] = [
    (0.0, 3.0), (3.0, 6.0), (6.0, 10.0), (10.0, 18.0), (18.0, 30.0),
    (30.0, 50.0), (50.0, 80.0), (80.0, 120.0), (120.0, 180.0),
    (180.0, 250.0), (250.0, 315.0), (315.0, 400.0), (400.0, 500.0),
]

# Official ISO 286-1 Standard Tolerance Grades IT5..IT11 in micrometers (um) per diameter step
ISO_286_IT_UM: dict[int, list[int]] = {
    5:  [4,  5,  6,  8,  9,  11, 13, 15, 18, 20, 23, 25, 27],
    6:  [6,  8,  9,  11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
    7:  [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
    8:  [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
    9:  [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
    10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
    11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
}

# Official ISO 286-2 Fundamental Upper Deviations 'es' in um for common shafts (g, f, e) per step
SHAFT_UPPER_DEV_ES_UM: dict[str, list[int]] = {
    "g": [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
    "f": [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
    "e": [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
    "h": [0] * 13,
}

# Official ISO 286-2 Fundamental Lower Deviations 'ei' in um for interference/transition shafts (k, m, n, p)
SHAFT_LOWER_DEV_EI_UM: dict[str, list[int]] = {
    "k": [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],
    "m": [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
    "n": [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
    "p": [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68],
}

# Official ISO 286-2 Hole Fundamental Lower Deviations 'EI' in um
HOLE_LOWER_DEV_EI_UM: dict[str, list[int]] = {
    "H": [0] * 13,
    "G": [2, 4, 5, 6, 7, 9, 10, 12, 14, 15, 17, 18, 20],
    "F": [6, 10, 13, 16, 20, 25, 30, 36, 43, 50, 56, 62, 68],
}


def _find_iso_step_index(diameter_mm: float) -> int:
    for idx, (d_min, d_max) in enumerate(ISO_286_STEPS):
        if idx == 0 and 0.0 < diameter_mm <= d_max:
            return 0
        if d_min < diameter_mm <= d_max:
            return idx
    raise ValueError(f"Diameter {diameter_mm} mm outside ISO 286 standard range (0..500 mm)")


def calculate_iso_286_limits(nominal_mm: float, fit_class: str) -> ComputedLimits:
    m = re.match(r"^([A-Za-z]{1,2})(\d{1,2})$", fit_class.strip())
    if not m:
        raise ValueError(f"Invalid ISO 286 fit class: {fit_class}")

    letter = m.group(1)
    it_grade = int(m.group(2))
    step_idx = _find_iso_step_index(nominal_mm)

    if it_grade in ISO_286_IT_UM:
        it_um = float(ISO_286_IT_UM[it_grade][step_idx])
    else:
        # Formula fallback for IT grades outside 5..11
        d_min, d_max = ISO_286_STEPS[step_idx]
        d_geom = math.sqrt(max(1.0, d_min) * d_max)
        i_unit = 0.45 * (d_geom ** (1.0 / 3.0)) + 0.001 * d_geom
        factor = 10.0 * (1.6 ** (it_grade - 6))
        it_um = round(i_unit * factor)

    it_mm = round(it_um / 1000.0, 4)

    if letter in ("JS", "js"):
        half_mm = round((it_um * 0.5) / 1000.0, 4)
        plus_tol, minus_tol = half_mm, -half_mm
    elif letter.isupper():
        # Hole basis
        if letter in HOLE_LOWER_DEV_EI_UM:
            ei_mm = round(HOLE_LOWER_DEV_EI_UM[letter][step_idx] / 1000.0, 4)
            minus_tol = ei_mm
            plus_tol = round(ei_mm + it_mm, 4)
        elif letter in ("K", "M", "N", "P"):
            # Transition/Interference holes mirror shaft upper deviations
            ref_shaft = letter.lower()
            es_mm = -round(SHAFT_LOWER_DEV_EI_UM[ref_shaft][step_idx] / 1000.0, 4)
            plus_tol = es_mm
            minus_tol = round(es_mm - it_mm, 4)
        else:
            raise ValueError(f"Unsupported ISO 286 hole deviation letter: {letter}")
    else:
        # Shaft basis
        if letter in SHAFT_UPPER_DEV_ES_UM:
            es_mm = round(SHAFT_UPPER_DEV_ES_UM[letter][step_idx] / 1000.0, 4)
            plus_tol = es_mm
            minus_tol = round(es_mm - it_mm, 4)
        elif letter in SHAFT_LOWER_DEV_EI_UM:
            ei_mm = round(SHAFT_LOWER_DEV_EI_UM[letter][step_idx] / 1000.0, 4)
            minus_tol = ei_mm
            plus_tol = round(ei_mm + it_mm, 4)
        else:
            raise ValueError(f"Unsupported ISO 286 shaft deviation letter: {letter}")

    lsl = round(nominal_mm + minus_tol, 4)
    usl = round(nominal_mm + plus_tol, 4)
    return ComputedLimits(
        nominal=round(nominal_mm, 4),
        plus_tol=plus_tol,
        minus_tol=minus_tol,
        lsl=lsl,
        usl=usl,
        units="mm",
        source_standard=f"ISO 286-2 ({fit_class})",
        notes=f"IT{it_grade} = {int(it_um)} µm",
    )


def calculate_iso_2768_limits(
    nominal: float,
    tol_class: Literal["f", "m", "c", "v"] = "m",
    kind: Literal["LINEAR", "RADIUS_CHAMFER", "ANGULAR"] = "LINEAR",
) -> ComputedLimits:
    if kind == "ANGULAR":
        tol = 0.5 if tol_class in ("f", "m") else 1.0
        return ComputedLimits(
            nominal=nominal,
            plus_tol=tol,
            minus_tol=-tol,
            lsl=round(nominal - tol, 4),
            usl=round(nominal + tol, 4),
            units="deg",
            source_standard=f"ISO 2768-{tol_class} (Angular)",
        )

    if kind == "RADIUS_CHAMFER":
        if nominal <= 3.0:
            tol = 0.2
        elif nominal <= 6.0:
            tol = 0.5 if tol_class in ("f", "m") else 1.0
        else:
            tol = 1.0 if tol_class in ("f", "m") else 2.0
    else:
        # Linear table per ISO 2768-1 Table 1
        table: list[tuple[float, float, dict[str, float]]] = [
            (0.5, 3.0,     {"f": 0.05, "m": 0.10, "c": 0.20, "v": 0.20}),
            (3.0, 6.0,     {"f": 0.05, "m": 0.10, "c": 0.30, "v": 0.50}),
            (6.0, 30.0,    {"f": 0.10, "m": 0.20, "c": 0.50, "v": 1.00}),
            (30.0, 120.0,  {"f": 0.15, "m": 0.30, "c": 0.80, "v": 1.50}),
            (120.0, 400.0, {"f": 0.20, "m": 0.50, "c": 1.20, "v": 2.50}),
            (400.0, 1000.0,{"f": 0.30, "m": 0.80, "c": 2.00, "v": 4.00}),
        ]
        tol = 0.30
        for lo, hi, mapping in table:
            if lo <= nominal <= hi:
                tol = mapping[tol_class]
                break

    return ComputedLimits(
        nominal=round(nominal, 4),
        plus_tol=tol,
        minus_tol=-tol,
        lsl=round(nominal - tol, 4),
        usl=round(nominal + tol, 4),
        units="mm",
        source_standard=f"ISO 2768-{tol_class}",
    )


# ISO 965-1 Grade 6 Internal Minor Diameter Tolerance T_D1 (in mm) by pitch P
ISO_965_TD1_6H_MM: dict[float, float] = {
    0.5: 0.140, 0.7: 0.190, 0.75: 0.190, 0.8: 0.200, 1.0: 0.236,
    1.25: 0.265, 1.5: 0.300, 1.75: 0.335, 2.0: 0.375, 2.5: 0.450, 3.0: 0.500,
}


def calculate_iso_965_thread_limits(
    major_dia_mm: float, pitch_mm: float, thread_class: str = "6H"
) -> dict[str, ComputedLimits]:
    """
    Computes ISO 68-1 / ISO 965-1 Pitch Diameter (D2/d2) and Minor/Major Diameter limits.
    """
    basic_d2 = round(major_dia_mm - 0.649519 * pitch_mm, 3)
    basic_d1 = round(major_dia_mm - 1.082532 * pitch_mm, 3)
    is_internal = thread_class[-1].isupper()

    if is_internal:
        td1 = ISO_965_TD1_6H_MM.get(pitch_mm, round(0.23 * (pitch_mm ** 0.8), 3))
        td2 = round(0.090 * (pitch_mm ** 0.4) * (major_dia_mm ** 0.1), 3)
        return {
            "minor_diameter": ComputedLimits(
                nominal=basic_d1,
                plus_tol=td1,
                minus_tol=0.0,
                lsl=basic_d1,
                usl=round(basic_d1 + td1, 3),
                units="mm",
                source_standard=f"ISO 965-1 ({thread_class} Minor Bore D1)",
                notes=f"Pitch Dia D2 = {basic_d2:.3f} (+{td2:.3f}/-0.000) via GO/NO-GO Plug Gauge",
            ),
            "pitch_diameter": ComputedLimits(
                nominal=basic_d2,
                plus_tol=td2,
                minus_tol=0.0,
                lsl=basic_d2,
                usl=round(basic_d2 + td2, 3),
                units="mm",
                source_standard=f"ISO 965-1 ({thread_class} Pitch Dia D2)",
            ),
        }
    else:
        # External shaft thread (e.g. 6g)
        es_mm = round((15.0 + 11.0 * pitch_mm) / 1000.0, 3) if thread_class.endswith("g") else 0.0
        td = round(0.18 * (pitch_mm ** (2.0 / 3.0)) - 0.00315 / math.sqrt(pitch_mm), 3)
        return {
            "major_diameter": ComputedLimits(
                nominal=major_dia_mm,
                plus_tol=-es_mm,
                minus_tol=-round(es_mm + td, 3),
                lsl=round(major_dia_mm - es_mm - td, 3),
                usl=round(major_dia_mm - es_mm, 3),
                units="mm",
                source_standard=f"ISO 965-1 ({thread_class} External Major d)",
            )
        }


def calculate_dynamic_mmc_bonus(
    stated_gdt_zone: float,
    feature_modifier: Literal["MMC", "LMC", "RFS"] = "RFS",
    is_internal_feature: bool = True,
    feature_lsl: float | None = None,
    feature_usl: float | None = None,
    feature_actual_size: float | None = None,
    datum_modifier: Literal["MMC", "LMC", "RFS"] = "RFS",
    is_internal_datum: bool = True,
    datum_lsl: float | None = None,
    datum_usl: float | None = None,
    datum_actual_size: float | None = None,
) -> dict[str, float]:
    feat_bonus = 0.0
    if (
        feature_modifier in ("MMC", "LMC")
        and feature_lsl is not None
        and feature_usl is not None
        and feature_actual_size is not None
    ):
        max_allowable = max(0.0, feature_usl - feature_lsl)
        if feature_modifier == "MMC":
            raw_b = (feature_actual_size - feature_lsl) if is_internal_feature else (feature_usl - feature_actual_size)
        else:
            raw_b = (feature_usl - feature_actual_size) if is_internal_feature else (feature_actual_size - feature_lsl)
        feat_bonus = max(0.0, min(max_allowable, raw_b))

    datum_shift = 0.0
    if (
        datum_modifier in ("MMC", "LMC")
        and datum_lsl is not None
        and datum_usl is not None
        and datum_actual_size is not None
    ):
        max_d = max(0.0, datum_usl - datum_lsl)
        if datum_modifier == "MMC":
            raw_s = (datum_actual_size - datum_lsl) if is_internal_datum else (datum_usl - datum_actual_size)
        else:
            raw_s = (datum_usl - datum_actual_size) if is_internal_datum else (datum_actual_size - datum_lsl)
        datum_shift = max(0.0, min(max_d, raw_s))

    effective_usl = round(stated_gdt_zone + feat_bonus + datum_shift, 4)
    return {
        "stated_zone": round(stated_gdt_zone, 4),
        "feature_bonus": round(feat_bonus, 4),
        "datum_shift": round(datum_shift, 4),
        "effective_usl": effective_usl,
        "lsl": 0.0,
    }


def test_limits_math() -> None:
    # 1. Verify Ø30.00 H7 -> [30.000, 30.021]
    h7 = calculate_iso_286_limits(30.0, "H7")
    assert h7.lsl == 30.000 and h7.usl == 30.021

    # 2. Verify Ø25.00 g6 -> es = -0.007, IT6 = 0.013 -> [24.980, 24.993]
    g6 = calculate_iso_286_limits(25.0, "g6")
    assert g6.usl == 24.993 and g6.lsl == 24.980

    # 3. Verify M10x1.5 - 6H Minor Bore -> [8.376, 8.676]
    thr = calculate_iso_965_thread_limits(10.0, 1.5, "6H")["minor_diameter"]
    assert thr.lsl == 8.376 and thr.usl == 8.676

    # 4. Verify MMC bonus + Datum shift
    mmc = calculate_dynamic_mmc_bonus(
        stated_gdt_zone=0.050,
        feature_modifier="MMC",
        is_internal_feature=True,
        feature_lsl=8.500,
        feature_usl=8.600,
        feature_actual_size=8.540,
        datum_modifier="MMC",
        is_internal_datum=True,
        datum_lsl=30.000,
        datum_usl=30.021,
        datum_actual_size=30.012,
    )
    assert mmc["feature_bonus"] == 0.040
    assert mmc["datum_shift"] == 0.012
    assert mmc["effective_usl"] == 0.102


if __name__ == "__main__":
    test_limits_math()
    print("test_limits_math PASSED")


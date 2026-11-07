"""
SpecBalloon Metrology Core Engine (Python mirror)
ISO 286-1 / ISO 2768-1 / ASME Y14.5 / AS9102 Rev C Computational Standards
"""

import math
from typing import List, Dict, Any, Optional, Tuple


def fmt3(val: Optional[float]) -> str:
    """Format floating point values strictly to 3 decimal places."""
    if val is None or math.isnan(val):
        return "0.000"
    return f"{round(val, 3):.3f}"


def calculate_iso_286(nominal_d: float, fit_class: str) -> Dict[str, Any]:
    """
    Computes ISO 286 limit tolerances using standard tolerance factor i = 0.45*D^(1/3) + 0.001*D (µm).
    """
    d = max(1.0, abs(nominal_d))
    # Standard tolerance factor in micrometers
    i = 0.45 * (d ** (1 / 3)) + 0.001 * d

    fit = fit_class.upper().strip()

    if "H7" in fit:
        # IT7 = 16 * i
        it7_um = 16 * i
        tol_mm = round(it7_um / 1000.0, 4)
        return {
            "plusTol": tol_mm,
            "minusTol": 0.0000,
            "fitType": "Hole (H7 Transition/Clearance)",
            "instrument": "Mahr Air Plug Gauge / Bore Micrometer",
            "itGrade": "IT7",
            "upperDeviation": tol_mm,
            "lowerDeviation": 0.0000
        }
    elif "H8" in fit:
        # IT8 = 25 * i
        it8_um = 25 * i
        tol_mm = round(it8_um / 1000.0, 4)
        return {
            "plusTol": tol_mm,
            "minusTol": 0.0000,
            "fitType": "Hole (H8 Clearance)",
            "instrument": "Three-Point Internal Micrometer",
            "itGrade": "IT8",
            "upperDeviation": tol_mm,
            "lowerDeviation": 0.0000
        }
    elif "G6" in fit:
        # IT6 = 10 * i, fundamental deviation es = -2.5 * D^0.34 µm
        it6_um = 10 * i
        es_um = 2.5 * (d ** 0.34)
        upper_mm = -round(es_um / 1000.0, 4)
        lower_mm = -round((es_um + it6_um) / 1000.0, 4)
        return {
            "plusTol": upper_mm,
            "minusTol": abs(lower_mm),
            "fitType": "Shaft (g6 Sliding Clearance)",
            "instrument": "Mitutoyo Outside Micrometer (0.001mm)",
            "itGrade": "IT6",
            "upperDeviation": upper_mm,
            "lowerDeviation": lower_mm
        }
    elif "H6" in fit:
        it6_um = 10 * i
        tol_mm = round(it6_um / 1000.0, 4)
        return {
            "plusTol": tol_mm,
            "minusTol": 0.0000,
            "fitType": "Hole (H6 Precision Bore)",
            "instrument": "Air Gauge / Precision Dial Bore Indicator",
            "itGrade": "IT6",
            "upperDeviation": tol_mm,
            "lowerDeviation": 0.0000
        }
    else:
        # Default IT7 bilateral
        it7_um = 16 * i
        tol_mm = round(it7_um / 1000.0, 4)
        return {
            "plusTol": tol_mm,
            "minusTol": tol_mm,
            "fitType": f"General Fit ({fit_class})",
            "instrument": "Digital Caliper / Micrometer",
            "itGrade": "IT7",
            "upperDeviation": tol_mm,
            "lowerDeviation": -tol_mm
        }


def get_iso_2768_tolerance(nominal: float, standard: str = "ISO 2768-m") -> Dict[str, float]:
    """
    Returns general tolerance based on ISO 2768-1.
    """
    d = abs(nominal)
    std = standard.upper()

    if "2768-F" in std:
        # Fine
        if d <= 3: tol = 0.05
        elif d <= 6: tol = 0.05
        elif d <= 30: tol = 0.10
        elif d <= 120: tol = 0.15
        elif d <= 400: tol = 0.20
        elif d <= 1000: tol = 0.30
        else: tol = 0.50
    elif "2768-C" in std:
        # Coarse
        if d <= 3: tol = 0.20
        elif d <= 6: tol = 0.30
        elif d <= 30: tol = 0.50
        elif d <= 120: tol = 0.80
        elif d <= 400: tol = 1.20
        elif d <= 1000: tol = 2.00
        else: tol = 3.00
    else:
        # Medium (ISO 2768-m default)
        if d <= 3: tol = 0.10
        elif d <= 6: tol = 0.10
        elif d <= 30: tol = 0.20
        elif d <= 120: tol = 0.30
        elif d <= 400: tol = 0.50
        elif d <= 1000: tol = 0.80
        else: tol = 1.20

    return {"plusTol": tol, "minusTol": tol}


def calculate_moving_range_spc(lsl: float, usl: float, samples: List[float]) -> Dict[str, Any]:
    """
    Calculates SPC Moving Range Control Chart statistics:
    - Mean (X_bar)
    - Moving Ranges: MR_i = |X_i - X_{i-1}|
    - Average Moving Range (MR_bar)
    - Sigma_hat = MR_bar / 1.128 (d2 factor for n=2)
    - UCL = X_bar + 2.66 * MR_bar
    - LCL = X_bar - 2.66 * MR_bar
    - Cp, Cpk
    """
    if not samples or len(samples) < 2:
        mid = (lsl + usl) / 2.0
        return {
            "mean": round(mid, 4),
            "samples": samples or [mid],
            "movingRanges": [],
            "avgMovingRange": 0.001,
            "sigma": round((usl - lsl) / 6.0, 4) if usl > lsl else 0.001,
            "ucl": round(usl, 4),
            "lcl": round(lsl, 4),
            "ucl_mr": 0.005,
            "lcl_mr": 0.000,
            "cp": 1.33,
            "cpk": 1.33,
            "inControl": True
        }

    n = len(samples)
    x_bar = sum(samples) / n

    moving_ranges = [abs(samples[i] - samples[i - 1]) for i in range(1, n)]
    mr_bar = sum(moving_ranges) / len(moving_ranges) if moving_ranges else 0.001

    d2 = 1.128  # Shewhart factor for sub-group size 2
    sigma_hat = max(0.0001, mr_bar / d2)

    ucl = x_bar + 2.66 * mr_bar
    lcl = x_bar - 2.66 * mr_bar

    # MR chart limits (D4=3.267, D3=0)
    ucl_mr = 3.267 * mr_bar
    lcl_mr = 0.000

    tol_spread = usl - lsl
    cp = tol_spread / (6.0 * sigma_hat) if tol_spread > 0 else 0.0
    cpu = (usl - x_bar) / (3.0 * sigma_hat) if sigma_hat > 0 else 0.0
    cpl = (x_bar - lsl) / (3.0 * sigma_hat) if sigma_hat > 0 else 0.0
    cpk = max(0.0, min(cpu, cpl))

    # In control check: no sample outside UCL/LCL and no MR outside UCL_MR
    in_control = all(lcl <= s <= ucl for s in samples) and all(mr <= ucl_mr for mr in moving_ranges)

    return {
        "mean": round(x_bar, 4),
        "samples": samples,
        "movingRanges": [round(mr, 4) for mr in moving_ranges],
        "avgMovingRange": round(mr_bar, 4),
        "sigma": round(sigma_hat, 4),
        "ucl": round(ucl, 4),
        "lcl": round(lcl, 4),
        "ucl_mr": round(ucl_mr, 4),
        "lcl_mr": round(lcl_mr, 4),
        "cp": round(cp, 2),
        "cpk": round(cpk, 2),
        "inControl": in_control
    }


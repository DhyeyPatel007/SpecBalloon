# backend/test_limits_math.py
from limits_math import (
    calculate_dynamic_mmc_bonus,
    calculate_iso_2768_limits,
    calculate_iso_286_limits,
    calculate_iso_965_thread_limits,
    test_limits_math,
)


def test_limits_math_embedded():
    test_limits_math()


def test_iso_286_hole():
    lim = calculate_iso_286_limits(30.0, "H7")
    assert abs(lim.lsl - 30.000) < 1e-4
    assert abs(lim.usl - 30.021) < 1e-4
    assert lim.plus_tol == 0.021
    assert lim.minus_tol == 0.000


def test_iso_286_shaft():
    lim = calculate_iso_286_limits(80.0, "g6")
    assert abs(lim.lsl - 79.971) < 1e-4
    assert abs(lim.usl - 79.990) < 1e-4


def test_iso_2768_medium():
    lim = calculate_iso_2768_limits(64.0, "m", "LINEAR")
    assert abs(lim.lsl - 63.700) < 1e-4
    assert abs(lim.usl - 64.300) < 1e-4


def test_iso_965_thread():
    t = calculate_iso_965_thread_limits(10.0, 1.5, "6H")
    minor = t["minor_diameter"]
    assert abs(minor.lsl - 8.376) < 1e-3
    assert abs(minor.usl - 8.676) < 1e-3


def test_mmc_bonus():
    b_dict = calculate_dynamic_mmc_bonus(
        stated_gdt_zone=0.05,
        feature_modifier="MMC",
        is_internal_feature=True,
        feature_lsl=30.000,
        feature_usl=30.021,
        feature_actual_size=30.012,
    )
    assert abs(b_dict["feature_bonus"] - 0.012) < 1e-4
    assert abs(b_dict["effective_usl"] - 0.062) < 1e-4

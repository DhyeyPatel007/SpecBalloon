# backend/test_gdt_parser.py
from gdt_parser import parse_gdt_frame


def test_parse_position_frame():
    f = parse_gdt_frame("|⌖|Ø0.05(M)|A|B|")
    assert f is not None
    assert f.primary_segment.gdt_type == "GDT_POSITION"
    assert f.primary_segment.diameter_zone is True
    assert f.primary_segment.tolerance_zone == 0.05
    assert f.primary_segment.modifier == "MMC"
    assert len(f.primary_segment.datums) == 2
    assert f.primary_segment.datums[0].letter == "A"
    assert f.primary_segment.datums[1].letter == "B"
    assert f.lsl == 0.0
    assert f.usl == 0.05


def test_parse_perpendicularity_frame():
    f = parse_gdt_frame("|⟂|0.02|A|")
    assert f is not None
    assert f.primary_segment.gdt_type == "GDT_PERPENDICULARITY"
    assert f.primary_segment.tolerance_zone == 0.02
    assert len(f.primary_segment.datums) == 1
    assert f.primary_segment.datums[0].letter == "A"


def test_reject_invalid_frame():
    assert parse_gdt_frame("NOT A FRAME") is None
    assert parse_gdt_frame("||||") is None


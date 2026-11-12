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


def test_parse_unreadable_symbol_frame():
    # \x00 glyph slot fallback
    f1 = parse_gdt_frame("|\x00|Ø0.05(M)|A|B|")
    assert f1 is not None
    assert f1.primary_segment.symbol == "UNKNOWN"
    assert f1.primary_segment.gdt_type == "GDT_UNKNOWN"
    assert f1.primary_segment.diameter_zone is True
    assert f1.primary_segment.tolerance_zone == 0.05
    assert f1.primary_segment.modifier == "MMC"
    assert len(f1.primary_segment.datums) == 2
    assert f1.primary_segment.datums[0].letter == "A"
    assert f1.lsl == 0.0
    assert f1.usl == 0.05
    assert f1.needs_review is True
    assert "GD&T symbol unreadable in PDF — inferred from tolerance and datums" in f1.review_reasons

    # Empty symbol compartment fallback
    f2 = parse_gdt_frame("||0.02|A|")
    assert f2 is not None
    assert f2.primary_segment.symbol == "UNKNOWN"
    assert f2.primary_segment.tolerance_zone == 0.02
    assert f2.lsl == 0.0
    assert f2.usl == 0.02
    assert f2.needs_review is True

    # Reject if tolerance or datums are invalid/missing
    assert parse_gdt_frame("|\x00|invalid|A|") is None
    assert parse_gdt_frame("|\x00|0.02|") is None



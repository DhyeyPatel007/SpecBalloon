# backend/gdt_parser.py
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

GdtSymbol = Literal[
    "⌖", "⏥", "⏤", "◯", "⌭", "⌒", "⌓", "⟂", "∠", "//", "◎", "⌯", "↗", "⌰"
]
GdtType = Literal[
    "GDT_POSITION",
    "GDT_FLATNESS",
    "GDT_STRAIGHTNESS",
    "GDT_CIRCULARITY",
    "GDT_CYLINDRICITY",
    "GDT_LINE_PROFILE",
    "GDT_SURFACE_PROFILE",
    "GDT_PERPENDICULARITY",
    "GDT_ANGULARITY",
    "GDT_PARALLELISM",
    "GDT_CONCENTRICITY",
    "GDT_SYMMETRY",
    "GDT_CIRCULAR_RUNOUT",
    "GDT_TOTAL_RUNOUT",
]
MaterialModifier = Literal["MMC", "LMC", "RFS"]


@dataclass(frozen=True)
class DatumRef:
    letter: str
    modifier: MaterialModifier = "RFS"


@dataclass(frozen=True)
class GdtSegment:
    symbol: GdtSymbol
    gdt_type: GdtType
    diameter_zone: bool
    tolerance_zone: float
    modifier: MaterialModifier
    projected_zone: bool
    free_state: bool
    datums: tuple[DatumRef, ...]


@dataclass(frozen=True)
class ParsedGdtFrame:
    raw_frame: str
    primary_segment: GdtSegment
    lower_segment: GdtSegment | None  # Present for composite GD&T frames
    nominal: float = 0.0
    lsl: float = 0.0

    @property
    def usl(self) -> float:
        return self.primary_segment.tolerance_zone


SYMBOL_MAP: dict[str, tuple[GdtSymbol, GdtType]] = {
    "⌖": ("⌖", "GDT_POSITION"),
    "POS": ("⌖", "GDT_POSITION"),
    "+": ("⌖", "GDT_POSITION"),  # Common ASCII CAD font fallback for position crosshair
    "⏥": ("⏥", "GDT_FLATNESS"),
    "FLAT": ("⏥", "GDT_FLATNESS"),
    "⏤": ("⏤", "GDT_STRAIGHTNESS"),
    "STR": ("⏤", "GDT_STRAIGHTNESS"),
    "◯": ("◯", "GDT_CIRCULARITY"),
    "CIRC": ("◯", "GDT_CIRCULARITY"),
    "⌭": ("⌭", "GDT_CYLINDRICITY"),
    "CYL": ("⌭", "GDT_CYLINDRICITY"),
    "⌒": ("⌒", "GDT_LINE_PROFILE"),
    "⌓": ("⌓", "GDT_SURFACE_PROFILE"),
    "PROF": ("⌓", "GDT_SURFACE_PROFILE"),
    "⟂": ("⟂", "GDT_PERPENDICULARITY"),
    "⊥": ("⟂", "GDT_PERPENDICULARITY"),
    "PERP": ("⟂", "GDT_PERPENDICULARITY"),
    "∠": ("∠", "GDT_ANGULARITY"),
    "ANG": ("∠", "GDT_ANGULARITY"),
    "//": ("//", "GDT_PARALLELISM"),
    "∥": ("//", "GDT_PARALLELISM"),
    "PAR": ("//", "GDT_PARALLELISM"),
    "◎": ("◎", "GDT_CONCENTRICITY"),
    "CONC": ("◎", "GDT_CONCENTRICITY"),
    "⌯": ("⌯", "GDT_SYMMETRY"),
    "SYM": ("⌯", "GDT_SYMMETRY"),
    "↗": ("↗", "GDT_CIRCULAR_RUNOUT"),
    "RUN": ("↗", "GDT_CIRCULAR_RUNOUT"),
    "⌰": ("⌰", "GDT_TOTAL_RUNOUT"),
    "TRUN": ("⌰", "GDT_TOTAL_RUNOUT"),
}

TOL_COMPARTMENT_RE = re.compile(
    r"^\s*([Ø⌀])?\s*(\d*\.\d+|\d+)\s*(.*)$"
)
DATUM_CELL_RE = re.compile(
    r"^\s*([A-Z](?:-[A-Z])?)\s*(?:\(\s*([ML])\s*\)|([ⓂⓁ]))?\s*$"
)


def _parse_modifier(mod_str: str) -> tuple[MaterialModifier, bool, bool]:
    s = mod_str.upper()
    mod: MaterialModifier = "RFS"
    if "(M)" in s or "Ⓜ" in s:
        mod = "MMC"
    elif "(L)" in s or "Ⓛ" in s:
        mod = "LMC"
    proj = "(P)" in s or "Ⓟ" in s
    free = "(F)" in s or "Ⓕ" in s
    return mod, proj, free


def _parse_single_segment(cells: list[str], inherited_symbol: tuple[GdtSymbol, GdtType] | None = None) -> GdtSegment | None:
    clean_cells = [c.strip() for c in cells if c.strip()]
    if not clean_cells:
        return None

    sym_info = SYMBOL_MAP.get(clean_cells[0].upper()) or SYMBOL_MAP.get(clean_cells[0])
    if sym_info is not None:
        tol_idx = 1
    elif inherited_symbol is not None:
        sym_info = inherited_symbol
        tol_idx = 0
    else:
        return None

    if tol_idx >= len(clean_cells):
        return None

    tol_cell = clean_cells[tol_idx]
    m = TOL_COMPARTMENT_RE.match(tol_cell)
    if not m:
        return None

    dia_zone = bool(m.group(1))
    tol_val = float(m.group(2))
    if tol_val <= 0.0 or tol_val > 10.0:
        return None

    mod, proj, free = _parse_modifier(m.group(3) or "")

    datums: list[DatumRef] = []
    for d_cell in clean_cells[tol_idx + 1 :]:
        dm = DATUM_CELL_RE.match(d_cell)
        if not dm:
            # Reject invalid trailing garbage inside frame
            return None
        letter = dm.group(1)
        d_mod_raw = (dm.group(2) or dm.group(3) or "").upper()
        d_mod: MaterialModifier = "MMC" if d_mod_raw in ("M", "Ⓜ") else ("LMC" if d_mod_raw in ("L", "Ⓛ") else "RFS")
        datums.append(DatumRef(letter=letter, modifier=d_mod))

    return GdtSegment(
        symbol=sym_info[0],
        gdt_type=sym_info[1],
        diameter_zone=dia_zone,
        tolerance_zone=tol_val,
        modifier=mod,
        projected_zone=proj,
        free_state=free,
        datums=tuple(datums),
    )


def parse_gdt_frame(raw_text: str) -> ParsedGdtFrame | None:
    """
    Parses single-line or composite multi-line GD&T frames such as:
      '|⌖|Ø0.05(M)|A|B(M)|C|'
      '[⟂|0.02|A]'
      '|⌖|Ø0.08(M)|A|B|C| / |⌖|Ø0.02(M)|A|' (composite frame)
    """
    text = raw_text.strip()
    if not text:
        return None

    # Split composite frames separated by newline or ' // ' or ' / ' between bracketed frames
    lines = [ln.strip() for ln in re.split(r"\n|(?<=\|)\s*/\s*(?=\|)|(?<=\])\s*/\s*(?=\[)", text) if ln.strip()]
    if not lines:
        return None

    def _split_compartments(line_str: str) -> list[str]:
        stripped = line_str.strip("[]| ")
        if "|" in stripped:
            return [c.strip() for c in stripped.split("|") if c.strip()]
        # Also support space-separated boxed cells if brackets/symbols are unambiguous
        return [c.strip() for c in stripped.split() if c.strip()]

    primary_cells = _split_compartments(lines[0])
    primary_seg = _parse_single_segment(primary_cells)
    if primary_seg is None:
        return None

    lower_seg: GdtSegment | None = None
    if len(lines) > 1:
        lower_cells = _split_compartments(lines[1])
        lower_seg = _parse_single_segment(
            lower_cells,
            inherited_symbol=(primary_seg.symbol, primary_seg.gdt_type),
        )

    return ParsedGdtFrame(
        raw_frame=text,
        primary_segment=primary_seg,
        lower_segment=lower_seg,
        nominal=0.0,
        lsl=0.0,
    )


def test_gdt_parser() -> None:
    # 1. Position with cylindrical zone, feature MMC, and datum B MMC
    f1 = parse_gdt_frame("|⌖|Ø0.05(M)|A|B(M)|")
    assert f1 is not None
    assert f1.primary_segment.gdt_type == "GDT_POSITION"
    assert f1.primary_segment.diameter_zone is True
    assert f1.primary_segment.tolerance_zone == 0.05
    assert f1.primary_segment.modifier == "MMC"
    assert f1.lsl == 0.0 and f1.usl == 0.05
    assert len(f1.primary_segment.datums) == 2
    assert f1.primary_segment.datums[1] == DatumRef("B", "MMC")

    # 2. Perpendicularity
    f2 = parse_gdt_frame("[⟂|0.02|A]")
    assert f2 is not None and f2.primary_segment.gdt_type == "GDT_PERPENDICULARITY"
    assert f2.usl == 0.02 and f2.lsl == 0.0

    # 3. Composite Position frame
    f3 = parse_gdt_frame("|⌖|Ø0.08(M)|A|B|C|\n|Ø0.02(M)|A|")
    assert f3 is not None and f3.lower_segment is not None
    assert f3.lower_segment.tolerance_zone == 0.02
    assert f3.lower_segment.datums == (DatumRef("A", "RFS"),)


if __name__ == "__main__":
    test_gdt_parser()
    print("test_gdt_parser PASSED")


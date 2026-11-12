# backend/vector_pass.py
from __future__ import annotations

import base64
import math
from dataclasses import dataclass, field
from typing import Literal

import fitz  # PyMuPDF


@dataclass(frozen=True)
class Point2D:
    x: float
    y: float

    def distance_to(self, other: Point2D) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


@dataclass(frozen=True)
class BBox:
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        return max(0.0, self.x1 - self.x0)

    @property
    def height(self) -> float:
        return max(0.0, self.y1 - self.y0)

    @property
    def center(self) -> Point2D:
        return Point2D((self.x0 + self.x1) * 0.5, (self.y0 + self.y1) * 0.5)

    def union(self, other: BBox) -> BBox:
        return BBox(
            min(self.x0, other.x0),
            min(self.y0, other.y0),
            max(self.x1, other.x1),
            max(self.y1, other.y1),
        )

    def expanded(self, pad: float) -> BBox:
        return BBox(self.x0 - pad, self.y0 - pad, self.x1 + pad, self.y1 + pad)

    def contains_point(self, pt: Point2D, tol: float = 0.0) -> bool:
        return (
            (self.x0 - tol) <= pt.x <= (self.x1 + tol)
            and (self.y0 - tol) <= pt.y <= (self.y1 + tol)
        )

    def min_distance_to_point(self, pt: Point2D) -> float:
        dx = max(self.x0 - pt.x, 0.0, pt.x - self.x1)
        dy = max(self.y0 - pt.y, 0.0, pt.y - self.y1)
        return math.hypot(dx, dy)


@dataclass
class TextSpan:
    span_id: str
    text: str
    bbox: BBox
    origin: Point2D
    font_name: str
    font_size: float
    rotation_deg: float
    is_clustered: bool = False
    constituent_texts: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class LineSegment:
    p1: Point2D
    p2: Point2D
    width: float
    color: tuple[float, ...] = (0.0, 0.0, 0.0)

    @property
    def length(self) -> float:
        return self.p1.distance_to(self.p2)

    @property
    def angle_deg(self) -> float:
        return math.degrees(math.atan2(self.p2.y - self.p1.y, self.p2.x - self.p1.x))

    @property
    def midpoint(self) -> Point2D:
        return Point2D((self.p1.x + self.p2.x) * 0.5, (self.p1.y + self.p2.y) * 0.5)


@dataclass(frozen=True)
class Arrowhead:
    tip: Point2D
    base_center: Point2D
    direction_deg: float  # Points toward tip
    kind: Literal["filled_polygon", "open_vee"]


@dataclass(frozen=True)
class LeaderLine:
    leader_id: str
    arrow_tip: Point2D
    tail_end: Point2D
    vertices: list[Point2D]
    has_horizontal_shoulder: bool


@dataclass(frozen=True)
class DimensionLine:
    dim_line_id: str
    tip_a: Point2D
    tip_b: Point2D
    midpoint: Point2D
    length_pt: float
    angle_deg: float


@dataclass
class PageVectorModel:
    page_number: int
    width_pt: float
    height_pt: float
    raw_spans: list[TextSpan]
    clustered_spans: list[TextSpan]
    line_segments: list[LineSegment]
    rectangles: list[BBox]
    circle_centers: list[tuple[Point2D, float]]  # (center, radius)
    arrowheads: list[Arrowhead]
    leader_lines: list[LeaderLine]
    dimension_lines: list[DimensionLine]


TITLE_BLOCK_BOILERPLATE = {
    "PROPRIETARY", "CONFIDENTIAL", "DO NOT SCALE", "THIRD ANGLE", "PROJECTION",
    "DRAWN BY", "CHECKED BY", "APPROVED BY", "SCALE", "SHEET", "WEIGHT",
    "DIMENSIONS ARE IN", "UNLESS OTHERWISE SPECIFIED", "TITLE", "DWG NO",
    "REV", "DATE", "SIZE", "CAGE CODE",
}


def _extract_rotation_deg(line_dir: tuple[float, float]) -> float:
    dx, dy = line_dir
    angle = math.degrees(math.atan2(dy, dx))
    return round(angle, 2)


def extract_text_spans(page: fitz.Page) -> list[TextSpan]:
    raw_dict = page.get_text("rawdict")
    spans: list[TextSpan] = []
    idx = 0
    for block in raw_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            line_dir = line.get("dir", (1.0, 0.0))
            rot_deg = _extract_rotation_deg(line_dir)
            for sp in line.get("spans", []):
                chars = sp.get("chars", [])
                text = "".join(c.get("c", "") for c in chars).strip() if chars else sp.get("text", "").strip()
                if not text:
                    continue
                b = sp.get("bbox", (0.0, 0.0, 0.0, 0.0))
                orig = sp.get("origin", (b[0], b[3]))
                idx += 1
                spans.append(
                    TextSpan(
                        span_id=f"sp_{idx:04d}",
                        text=text,
                        bbox=BBox(float(b[0]), float(b[1]), float(b[2]), float(b[3])),
                        origin=Point2D(float(orig[0]), float(orig[1])),
                        font_name=str(sp.get("font", "unknown")),
                        font_size=round(float(sp.get("size", 10.0)), 2),
                        rotation_deg=rot_deg,
                        constituent_texts=[text],
                    )
                )
    return spans


def cluster_split_tolerance_spans(spans: list[TextSpan]) -> list[TextSpan]:
    """
    Merges CAD split tolerance tokens: e.g. base nominal '30.00' (10pt) followed
    closely on the right by smaller superscript '+0.021' (7pt) and subscript '-0.000' (7pt),
    or a leading prefix like '4X' / 'Ø' split into an adjacent span.
    """
    if not spans:
        return []

    used: set[str] = set()
    clustered: list[TextSpan] = []
    sorted_spans = sorted(spans, key=lambda s: (round(s.bbox.y0, 1), s.bbox.x0))

    for primary in sorted_spans:
        if primary.span_id in used:
            continue

        # Only merge horizontal or near-horizontal spans in the same rotation group
        h = max(primary.font_size, primary.bbox.height, 4.0)
        group = [primary]
        used.add(primary.span_id)

        # Look for right-adjacent superscript/subscript tolerances or unit/fit suffixes
        current_bbox = primary.bbox
        for cand in sorted_spans:
            if cand.span_id in used:
                continue
            if abs(cand.rotation_deg - primary.rotation_deg) > 5.0:
                continue

            dx = cand.bbox.x0 - current_bbox.x1
            dy_center = abs(cand.bbox.center.y - primary.bbox.center.y)

            # Case 1: Stacked +/- tolerances to the right of nominal
            is_tol_token = cand.text.startswith(("+", "-", "±", "H", "h", "g", "f", "js", "JS", "/"))
            if -0.35 * h <= dx <= 1.45 * h and dy_center <= 1.15 * h and is_tol_token:
                group.append(cand)
                used.add(cand.span_id)
                current_bbox = current_bbox.union(cand.bbox)

        if len(group) == 1:
            clustered.append(primary)
        else:
            # Sort sub-tokens: base first, then top-to-bottom for stacked +/- tolerances
            base = group[0]
            rest = sorted(group[1:], key=lambda s: (s.bbox.y0, s.bbox.x0))
            merged_text_parts = [base.text]
            for r in rest:
                merged_text_parts.append(r.text)
            merged_str = " ".join(merged_text_parts)
            # Format stacked +tol -tol cleanly with slash if both are signed
            if len(rest) == 2 and rest[0].text.startswith("+") and rest[1].text.startswith("-"):
                merged_str = f"{base.text} {rest[0].text} / {rest[1].text}"

            clustered.append(
                TextSpan(
                    span_id=base.span_id,
                    text=merged_str,
                    bbox=current_bbox,
                    origin=base.origin,
                    font_name=base.font_name,
                    font_size=base.font_size,
                    rotation_deg=base.rotation_deg,
                    is_clustered=True,
                    constituent_texts=[g.text for g in group],
                )
            )
    return clustered


def _detect_filled_triangle_arrow(items: list) -> Arrowhead | None:
    pts: list[Point2D] = []
    for item in items:
        if item[0] == "l":
            p1 = Point2D(float(item[1].x), float(item[1].y))
            p2 = Point2D(float(item[2].x), float(item[2].y))
            if not pts or pts[-1].distance_to(p1) > 0.1:
                pts.append(p1)
            pts.append(p2)
    # Deduplicate closing point
    unique_pts: list[Point2D] = []
    for p in pts:
        if not any(p.distance_to(u) < 0.25 for u in unique_pts):
            unique_pts.append(p)

    if len(unique_pts) != 3:
        return None

    a, b, c = unique_pts
    d_ab = a.distance_to(b)
    d_bc = b.distance_to(c)
    d_ca = c.distance_to(a)
    sides = sorted([d_ab, d_bc, d_ca])
    # CAD arrowheads have side lengths between 1.5 pt and 15 pt, with two long sides and one shorter base
    if sides[0] < 0.8 or sides[2] > 16.0:
        return None

    # The tip is the vertex opposite the shortest side (the base)
    if d_ab == sides[0]:
        tip, b1, b2 = c, a, b
    elif d_bc == sides[0]:
        tip, b1, b2 = a, b, c
    else:
        tip, b1, b2 = b, c, a

    base_mid = Point2D((b1.x + b2.x) * 0.5, (b1.y + b2.y) * 0.5)
    direction = math.degrees(math.atan2(tip.y - base_mid.y, tip.x - base_mid.x))
    return Arrowhead(tip=tip, base_center=base_mid, direction_deg=round(direction, 2), kind="filled_polygon")


def _detect_open_vee_arrows(segments: list[LineSegment]) -> list[Arrowhead]:
    """Detects open V-shaped arrowheads formed by two short strokes (2.0–12.0 pt) meeting at 15°–60°."""
    short_segs = [s for s in segments if 1.8 <= s.length <= 12.5 and s.width <= 1.8]
    arrows: list[Arrowhead] = []
    used_pairs: set[tuple[int, int]] = set()

    for i, s1 in enumerate(short_segs):
        for j in range(i + 1, len(short_segs)):
            if (i, j) in used_pairs:
                continue
            s2 = short_segs[j]
            # Check if any endpoints coincide within 1.0 pt
            shared_tip: Point2D | None = None
            other1: Point2D | None = None
            other2: Point2D | None = None

            for p1_end, p1_other in ((s1.p1, s1.p2), (s1.p2, s1.p1)):
                for p2_end, p2_other in ((s2.p1, s2.p2), (s2.p2, s2.p1)):
                    if p1_end.distance_to(p2_end) <= 1.0:
                        shared_tip = Point2D((p1_end.x + p2_end.x) * 0.5, (p1_end.y + p2_end.y) * 0.5)
                        other1, other2 = p1_other, p2_other
                        break
                if shared_tip:
                    break

            if not shared_tip or not other1 or not other2:
                continue

            # Check angle between the two wings
            v1 = (other1.x - shared_tip.x, other1.y - shared_tip.y)
            v2 = (other2.x - shared_tip.x, other2.y - shared_tip.y)
            mag = math.hypot(*v1) * math.hypot(*v2)
            if mag < 1e-5:
                continue
            cos_theta = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / mag))
            angle_between = math.degrees(math.acos(cos_theta))
            if 15.0 <= angle_between <= 65.0:
                base_mid = Point2D((other1.x + other2.x) * 0.5, (other1.y + other2.y) * 0.5)
                dir_deg = math.degrees(math.atan2(shared_tip.y - base_mid.y, shared_tip.x - base_mid.x))
                arrows.append(
                    Arrowhead(
                        tip=shared_tip,
                        base_center=base_mid,
                        direction_deg=round(dir_deg, 2),
                        kind="open_vee",
                    )
                )
                used_pairs.add((i, j))
    return arrows


def _build_leaders_and_dimension_lines(
    segments: list[LineSegment], arrowheads: list[Arrowhead]
) -> tuple[list[LeaderLine], list[DimensionLine]]:
    leaders: list[LeaderLine] = []
    dim_lines: list[DimensionLine] = []
    thin_segs = [s for s in segments if s.width <= 1.6 and s.length >= 6.0]

    used_seg_indices: set[int] = set()

    # 1. Detect Dimension Lines: single segment with arrowheads at BOTH ends pointing outward
    for idx, seg in enumerate(thin_segs):
        arrows_at_p1 = [a for a in arrowheads if a.tip.distance_to(seg.p1) <= 3.5 or a.base_center.distance_to(seg.p1) <= 3.5]
        arrows_at_p2 = [a for a in arrowheads if a.tip.distance_to(seg.p2) <= 3.5 or a.base_center.distance_to(seg.p2) <= 3.5]
        if arrows_at_p1 and arrows_at_p2:
            used_seg_indices.add(idx)
            dim_lines.append(
                DimensionLine(
                    dim_line_id=f"dl_{len(dim_lines) + 1:03d}",
                    tip_a=arrows_at_p1[0].tip,
                    tip_b=arrows_at_p2[0].tip,
                    midpoint=seg.midpoint,
                    length_pt=round(seg.length, 2),
                    angle_deg=round(seg.angle_deg, 2),
                )
            )

    # 2. Detect Leader Lines: start from an arrowhead and trace up to 3 connected segments (shaft -> horizontal shoulder)
    for a_idx, arrow in enumerate(arrowheads):
        # Find shaft segment touching arrow tip or base_center
        best_idx: int | None = None
        touch_at_p1 = True
        for idx, seg in enumerate(thin_segs):
            if idx in used_seg_indices:
                continue
            d1 = min(seg.p1.distance_to(arrow.tip), seg.p1.distance_to(arrow.base_center))
            d2 = min(seg.p2.distance_to(arrow.tip), seg.p2.distance_to(arrow.base_center))
            if d1 <= 3.5 and seg.length > 6.5:
                best_idx = idx
                touch_at_p1 = True
                break
            if d2 <= 3.5 and seg.length > 6.5:
                best_idx = idx
                touch_at_p1 = False
                break

        if best_idx is None:
            continue

        shaft = thin_segs[best_idx]
        curr_end = shaft.p2 if touch_at_p1 else shaft.p1
        vertices = [arrow.tip, curr_end]
        has_shoulder = False

        # Follow up to 2 connected shoulder segments within 3.0 pt
        visited = {best_idx}
        for _hop in range(2):
            next_idx: int | None = None
            next_pt: Point2D | None = None
            for idx, cand in enumerate(thin_segs):
                if idx in visited or idx in used_seg_indices:
                    continue
                if cand.p1.distance_to(curr_end) <= 3.0:
                    next_idx, next_pt = idx, cand.p2
                    break
                if cand.p2.distance_to(curr_end) <= 3.0:
                    next_idx, next_pt = idx, cand.p1
                    break
            if next_idx is not None and next_pt is not None:
                visited.add(next_idx)
                seg_hop = thin_segs[next_idx]
                if abs(seg_hop.p2.y - seg_hop.p1.y) <= 1.5 and seg_hop.length >= 4.0:
                    has_shoulder = True
                curr_end = next_pt
                vertices.append(curr_end)
            else:
                break

        leaders.append(
            LeaderLine(
                leader_id=f"ldr_{a_idx + 1:03d}",
                arrow_tip=arrow.tip,
                tail_end=curr_end,
                vertices=vertices,
                has_horizontal_shoulder=has_shoulder,
            )
        )

    return leaders, dim_lines


def run_vector_pass(doc: fitz.Document, page_index: int = 0) -> PageVectorModel:
    page = doc[page_index]
    rect = page.rect
    raw_spans = extract_text_spans(page)
    clustered_spans = cluster_split_tolerance_spans(raw_spans)

    segments: list[LineSegment] = []
    rectangles: list[BBox] = []
    circles: list[tuple[Point2D, float]] = []
    arrowheads: list[Arrowhead] = []

    for drw in page.get_drawings():
        items = drw.get("items", [])
        width = float(drw.get("width") or 0.5)
        fill = drw.get("fill")

        # Check if this drawing path is a filled triangle arrowhead
        if fill is not None and 3 <= len(items) <= 4:
            tri_arrow = _detect_filled_triangle_arrow(items)
            if tri_arrow:
                arrowheads.append(tri_arrow)
                continue

        for item in items:
            kind = item[0]
            if kind == "l":
                p1 = Point2D(float(item[1].x), float(item[1].y))
                p2 = Point2D(float(item[2].x), float(item[2].y))
                if p1.distance_to(p2) > 0.5:
                    segments.append(LineSegment(p1=p1, p2=p2, width=width))
            elif kind == "re":
                r = item[1]
                rectangles.append(BBox(float(r.x0), float(r.y0), float(r.x1), float(r.y1)))
            elif kind == "c":
                # Bezier curve approximation for circle arcs
                r = drw.get("rect")
                if r and abs(r.width - r.height) < 2.0 and r.width > 4.0:
                    center = Point2D(float(r.x0 + r.x1) * 0.5, float(r.y0 + r.y1) * 0.5)
                    rad = float(r.width) * 0.5
                    if not any(center.distance_to(c[0]) < 1.5 and abs(rad - c[1]) < 1.5 for c in circles):
                        circles.append((center, rad))

    arrowheads.extend(_detect_open_vee_arrows(segments))
    leaders, dim_lines = _build_leaders_and_dimension_lines(segments, arrowheads)

    return PageVectorModel(
        page_number=page_index + 1,
        width_pt=float(rect.width),
        height_pt=float(rect.height),
        raw_spans=raw_spans,
        clustered_spans=clustered_spans,
        line_segments=segments,
        rectangles=rectangles,
        circle_centers=circles,
        arrowheads=arrowheads,
        leader_lines=leaders,
        dimension_lines=dim_lines,
    )


def crop_callout_patch_base64(page: fitz.Page, bbox: BBox, dpi: int = 300, pad_pt: float = 8.0) -> str:
    """Renders only the small bounding-box clip at 300 DPI to prevent full-page OOM on 512MB RAM."""
    clip = fitz.Rect(
        max(0.0, bbox.x0 - pad_pt),
        max(0.0, bbox.y0 - pad_pt),
        min(page.rect.width, bbox.x1 + pad_pt),
        min(page.rect.height, bbox.y1 + pad_pt),
    )
    pix = page.get_pixmap(clip=clip, dpi=dpi, alpha=False)
    png_bytes = pix.tobytes("png")
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")


def test_vector_pass() -> None:
    doc = fitz.open()
    page = doc.new_page(width=842, height=595)
    shape = page.new_shape()

    # Draw a leader line from feature at (200, 200) -> angled to (240, 160) -> horizontal shoulder to (265, 160)
    shape.draw_line(fitz.Point(200, 200), fitz.Point(240, 160))
    shape.draw_line(fitz.Point(240, 160), fitz.Point(265, 160))
    # Open-vee arrowhead at (200, 200)
    shape.draw_line(fitz.Point(200, 200), fitz.Point(206, 191))
    shape.draw_line(fitz.Point(200, 200), fitz.Point(209, 194))
    shape.finish(width=0.75, color=(0, 0, 0))
    shape.commit()

    # Insert split nominal and stacked +tol / -tol spans
    page.insert_text(fitz.Point(268, 162), "Ø30.00", fontsize=10)
    page.insert_text(fitz.Point(304, 158), "+0.021", fontsize=6.5)
    page.insert_text(fitz.Point(304, 165), "-0.000", fontsize=6.5)

    model = run_vector_pass(doc, 0)
    assert len(model.arrowheads) >= 1, "Expected open-vee arrowhead detection"
    assert len(model.leader_lines) >= 1, "Expected multi-segment leader detection"
    assert model.leader_lines[0].has_horizontal_shoulder is True
    assert any("Ø30.00 +0.021 / -0.000" in s.text for s in model.clustered_spans), (
        f"Expected clustered tolerance span, got {[s.text for s in model.clustered_spans]}"
    )
    doc.close()


if __name__ == "__main__":
    test_vector_pass()
    print("test_vector_pass PASSED")


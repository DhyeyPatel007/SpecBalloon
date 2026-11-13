# backend/balloon_layout.py
from __future__ import annotations

import math
from dataclasses import dataclass

from vector_pass import BBox, Point2D


@dataclass
class PlacedBalloon:
    char_no: int
    tag_label: str
    callout_id: str
    zone: str
    callout_bbox: BBox
    balloon_center: Point2D
    balloon_radius: float
    leader_start: Point2D  # Point on callout bbox edge
    leader_end: Point2D    # Point on balloon perimeter


def compute_sheet_zone(
    pt: Point2D,
    page_width: float,
    page_height: float,
    rows: int = 4,
    cols: int = 8,
    margin: float = 24.0,
) -> str:
    """
    Computes standard engineering border zone (e.g., 'B2', 'A4').
    Rows are lettered A (top) through D (bottom); columns 1 (left) through 8 (right).
    """
    usable_w = max(1.0, page_width - 2.0 * margin)
    usable_h = max(1.0, page_height - 2.0 * margin)

    col_idx = int((pt.x - margin) / (usable_w / cols))
    row_idx = int((pt.y - margin) / (usable_h / rows))

    col_num = max(1, min(cols, col_idx + 1))
    row_char = chr(ord("A") + max(0, min(rows - 1, row_idx)))
    return f"{row_char}{col_num}"


def _segments_intersect(a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D) -> bool:
    def ccw(p1: Point2D, p2: Point2D, p3: Point2D) -> float:
        return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)

    d1 = ccw(a1, a2, b1)
    d2 = ccw(a1, a2, b2)
    d3 = ccw(b1, b2, a1)
    d4 = ccw(b1, b2, a2)
    return ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and (
        (d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)
    )


def layout_and_number_balloons(
    callouts: list[tuple[str, BBox]],  # list of (callout_id, bbox)
    page_width: float,
    page_height: float,
    balloon_radius: float = 10.0,
    zone_cols: int = 8,
) -> list[PlacedBalloon]:
    if not callouts:
        return []

    # 1. Compute global drawing centroid and sort clockwise starting from top-left (-135 deg)
    cx = sum(b.center.x for _, b in callouts) / len(callouts)
    cy = sum(b.center.y for _, b in callouts) / len(callouts)

    def _clockwise_key(item: tuple[str, BBox]) -> float:
        c = item[1].center
        angle = math.atan2(c.y - cy, c.x - cx)  # -pi to +pi
        # Shift start angle to top-left (-3*pi/4)
        shifted = (angle + 0.75 * math.pi) % (2.0 * math.pi)
        return shifted

    ordered = sorted(callouts, key=_clockwise_key)
    all_text_boxes = [b for _, b in ordered]

    # 2. Initial radial offset placement for each balloon outside its callout box
    positions: list[Point2D] = []
    anchors: list[Point2D] = []
    for _, bbox in ordered:
        bc = bbox.center
        dx, dy = bc.x - cx, bc.y - cy
        norm = math.hypot(dx, dy) or 1.0
        ux, uy = dx / norm, dy / norm
        # Place balloon 22 pt outward from the callout box edge
        init_x = bc.x + ux * (bbox.width * 0.5 + balloon_radius + 12.0)
        init_y = bc.y + uy * (bbox.height * 0.5 + balloon_radius + 10.0)
        positions.append(Point2D(init_x, init_y))
        anchors.append(bc)

    # 3. Force-Directed Collision Solver (30 deterministic iterations)
    min_balloon_dist = max(24.0, balloon_radius * 2.4)
    margin = 28.0
    for _step in range(30):
        forces_x = [0.0] * len(positions)
        forces_y = [0.0] * len(positions)

        for i, pos in enumerate(positions):
            # Spring attraction toward anchor
            ax, ay = anchors[i].x - pos.x, anchors[i].y - pos.y
            dist_anchor = math.hypot(ax, ay) or 1.0
            target_dist = ordered[i][1].width * 0.5 + balloon_radius + 10.0
            if dist_anchor > target_dist:
                forces_x[i] += (ax / dist_anchor) * (dist_anchor - target_dist) * 0.25
                forces_y[i] += (ay / dist_anchor) * (dist_anchor - target_dist) * 0.25

            # Balloon-to-Balloon repulsion
            for j, other_pos in enumerate(positions):
                if i == j:
                    continue
                rx, ry = pos.x - other_pos.x, pos.y - other_pos.y
                d = math.hypot(rx, ry) or 0.1
                if d < min_balloon_dist:
                    push = (min_balloon_dist - d) * 0.6
                    forces_x[i] += (rx / d) * push
                    forces_y[i] += (ry / d) * push

            # Balloon-to-TextBBox repulsion (never cover any dimension text)
            for t_box in all_text_boxes:
                padded = t_box.expanded(balloon_radius + 3.0)
                if padded.contains_point(pos):
                    tc = t_box.center
                    ox, oy = pos.x - tc.x, pos.y - tc.y
                    if abs(ox) < 0.1 and abs(oy) < 0.1:
                        oy = -1.0
                    onorm = math.hypot(ox, oy)
                    forces_x[i] += (ox / onorm) * 8.0
                    forces_y[i] += (oy / onorm) * 8.0

        for i in range(len(positions)):
            nx = max(margin, min(page_width - margin, positions[i].x + forces_x[i]))
            ny = max(margin, min(page_height - margin, positions[i].y + forces_y[i]))
            positions[i] = Point2D(round(nx, 2), round(ny, 2))

    # 4. Pairwise 2-opt tether-uncrossing pass
    for _pass in range(10):
        swapped = False
        for i in range(len(positions)):
            for j in range(i + 1, len(positions)):
                if _segments_intersect(anchors[i], positions[i], anchors[j], positions[j]):
                    positions[i], positions[j] = positions[j], positions[i]
                    swapped = True
        if not swapped:
            break

    # 5. Build PlacedBalloon records
    placed: list[PlacedBalloon] = []
    for idx, (cid, bbox) in enumerate(ordered):
        b_center = positions[idx]
        c_center = bbox.center
        zone = compute_sheet_zone(c_center, page_width, page_height, rows=4, cols=zone_cols)

        # Leader end on balloon circle perimeter
        vx, vy = c_center.x - b_center.x, c_center.y - b_center.y
        vlen = math.hypot(vx, vy) or 1.0
        l_end = Point2D(
            round(b_center.x + (vx / vlen) * balloon_radius, 2),
            round(b_center.y + (vy / vlen) * balloon_radius, 2),
        )
        placed.append(
            PlacedBalloon(
                char_no=idx + 1,
                tag_label=f"{idx + 1:02d}",
                callout_id=cid,
                zone=zone,
                callout_bbox=bbox,
                balloon_center=b_center,
                balloon_radius=balloon_radius,
                leader_start=c_center,
                leader_end=l_end,
            )
        )
    return placed


def test_balloon_layout() -> None:
    sample_boxes = [
        ("c1", BBox(200, 150, 250, 162)),
        ("c2", BBox(202, 165, 255, 177)),  # Tightly stacked right under c1
        ("c3", BBox(450, 150, 500, 162)),
        ("c4", BBox(450, 350, 500, 362)),
    ]
    placed = layout_and_number_balloons(sample_boxes, 842.0, 595.0, balloon_radius=10.0)
    assert len(placed) == 4
    assert [p.char_no for p in placed] == [1, 2, 3, 4]

    # Verify zero balloon-to-balloon overlap
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            dist = placed[i].balloon_center.distance_to(placed[j].balloon_center)
            assert dist >= 23.95, f"Balloons {i+1} and {j+1} overlap: dist={dist}"

        # Verify no balloon center lies inside any text bounding box
        for _, tbox in sample_boxes:
            assert not tbox.contains_point(placed[i].balloon_center, tol=4.0)


if __name__ == "__main__":
    test_balloon_layout()
    print("test_balloon_layout PASSED")


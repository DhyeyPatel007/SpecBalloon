# backend/leader_association.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from vector_pass import BBox, DimensionLine, LeaderLine, PageVectorModel, Point2D

AssociationKind = Literal[
    "LEADER_SHOULDER",
    "DIMENSION_LINE",
    "STACKED_SIBLING",
    "PROXIMITY_EXTENSION",
    "UNMATCHED",
]


@dataclass
class CalloutNode:
    callout_id: str
    raw_text: str
    bbox: BBox
    rotation_deg: float
    quantity: int = 1


@dataclass
class AssociatedCallout:
    callout: CalloutNode
    association_kind: AssociationKind
    feature_points: list[Point2D]
    leader_vertices: list[Point2D]
    anchor_point: Point2D
    distance_score_pt: float
    needs_review: bool
    review_reasons: list[str] = field(default_factory=list)


def _horizontal_overlap_ratio(a: BBox, b: BBox) -> float:
    inter_w = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    min_w = max(1.0, min(a.width, b.width))
    return inter_w / min_w


def associate_callouts_to_geometry(
    callouts: list[CalloutNode],
    model: PageVectorModel,
) -> list[AssociatedCallout]:
    results: dict[str, AssociatedCallout] = {}

    # Pass 1A: Match callouts to LeaderLine tails (greedy by distance)
    leader_candidates: list[tuple[float, CalloutNode, LeaderLine]] = []
    for node in callouts:
        left_mid = Point2D(node.bbox.x0, node.bbox.center.y)
        right_mid = Point2D(node.bbox.x1, node.bbox.center.y)
        for ldr in model.leader_lines:
            d_left = ldr.tail_end.distance_to(left_mid)
            d_right = ldr.tail_end.distance_to(right_mid)
            d_box = node.bbox.min_distance_to_point(ldr.tail_end)
            score = min(d_left, d_right, d_box * 1.1)
            if ldr.has_horizontal_shoulder:
                score *= 0.8
            if score <= 22.0:
                leader_candidates.append((score, node, ldr))

    leader_candidates.sort(key=lambda x: x[0])
    used_callouts: set[str] = set()
    used_leaders: set[str] = set()

    for score, node, best_leader in leader_candidates:
        if node.callout_id in used_callouts or best_leader.leader_id in used_leaders:
            continue
        used_callouts.add(node.callout_id)
        used_leaders.add(best_leader.leader_id)

        branch_tips = [best_leader.arrow_tip]
        for other_ldr in model.leader_lines:
            if other_ldr.leader_id != best_leader.leader_id:
                if other_ldr.tail_end.distance_to(best_leader.tail_end) <= 6.0:
                    branch_tips.append(other_ldr.arrow_tip)

        results[node.callout_id] = AssociatedCallout(
            callout=node,
            association_kind="LEADER_SHOULDER",
            feature_points=branch_tips,
            leader_vertices=list(best_leader.vertices),
            anchor_point=best_leader.tail_end,
            distance_score_pt=round(score, 2),
            needs_review=False,
        )

    # Pass 1B. Check DimensionLine midpoints
    for node in callouts:
        if node.callout_id in results:
            continue
        best_dl: DimensionLine | None = None
        best_dl_dist = 9999.0
        for dl in model.dimension_lines:
            d_mid = node.bbox.min_distance_to_point(dl.midpoint)
            angle_diff = abs((node.rotation_deg - dl.angle_deg + 90) % 180 - 90)
            if d_mid < best_dl_dist and angle_diff <= 15.0:
                best_dl_dist = d_mid
                best_dl = dl

        if best_dl is not None and best_dl_dist <= 18.0:
            results[node.callout_id] = AssociatedCallout(
                callout=node,
                association_kind="DIMENSION_LINE",
                feature_points=[best_dl.tip_a, best_dl.tip_b],
                leader_vertices=[best_dl.midpoint, node.bbox.center],
                anchor_point=best_dl.midpoint,
                distance_score_pt=round(best_dl_dist, 2),
                needs_review=False,
            )

    # Pass 2: Stacked / Compound Sibling Inheritance (e.g. GD&T frame stacked directly under a dimension)
    sorted_nodes = sorted(callouts, key=lambda n: (n.bbox.y0, n.bbox.x0))
    for node in sorted_nodes:
        if node.callout_id in results:
            continue
        for other in sorted_nodes:
            if other.callout_id == node.callout_id or other.callout_id not in results:
                continue
            parent_assoc = results[other.callout_id]
            v_gap = min(
                abs(node.bbox.y0 - other.bbox.y1),
                abs(other.bbox.y0 - node.bbox.y1),
            )
            h_overlap = _horizontal_overlap_ratio(node.bbox, other.bbox)
            if v_gap <= 18.0 and h_overlap >= 0.45:
                results[node.callout_id] = AssociatedCallout(
                    callout=node,
                    association_kind="STACKED_SIBLING",
                    feature_points=list(parent_assoc.feature_points),
                    leader_vertices=[parent_assoc.anchor_point, node.bbox.center],
                    anchor_point=node.bbox.center,
                    distance_score_pt=round(v_gap, 2),
                    needs_review=False,
                )
                break

    # Pass 3: Unmatched Fallback -> Flag honestly for human review, never guess!
    for node in callouts:
        if node.callout_id not in results:
            results[node.callout_id] = AssociatedCallout(
                callout=node,
                association_kind="UNMATCHED",
                feature_points=[],
                leader_vertices=[node.bbox.center],
                anchor_point=node.bbox.center,
                distance_score_pt=999.0,
                needs_review=True,
                review_reasons=["UNMATCHED_LEADER_GEOMETRY: No leader arrowhead or dimension line found within 22 pt"],
            )

    return [results[n.callout_id] for n in callouts]


def test_leader_association() -> None:
    model = PageVectorModel(
        page_number=1,
        width_pt=842.0,
        height_pt=595.0,
        raw_spans=[],
        clustered_spans=[],
        line_segments=[],
        rectangles=[],
        circle_centers=[],
        arrowheads=[],
        leader_lines=[
            LeaderLine(
                leader_id="ldr_001",
                arrow_tip=Point2D(150.0, 220.0),
                tail_end=Point2D(210.0, 160.0),
                vertices=[Point2D(150.0, 220.0), Point2D(190.0, 160.0), Point2D(210.0, 160.0)],
                has_horizontal_shoulder=True,
            )
        ],
        dimension_lines=[],
    )

    c1 = CalloutNode("c1", "Ø30.00 H7", BBox(212.0, 154.0, 265.0, 166.0), 0.0)
    # Stacked GD&T frame right under c1
    c2 = CalloutNode("c2", "|⌖|Ø0.05(M)|A|B|", BBox(212.0, 168.0, 280.0, 180.0), 0.0)
    # Orphan dimension far away with no leader
    c3 = CalloutNode("c3", "15.00 ±0.05", BBox(600.0, 400.0, 650.0, 412.0), 0.0)

    assoc = associate_callouts_to_geometry([c1, c2, c3], model)
    assert assoc[0].association_kind == "LEADER_SHOULDER" and not assoc[0].needs_review
    assert assoc[1].association_kind == "STACKED_SIBLING" and assoc[1].feature_points == [Point2D(150.0, 220.0)]
    assert assoc[2].association_kind == "UNMATCHED" and assoc[2].needs_review is True


if __name__ == "__main__":
    test_leader_association()
    print("test_leader_association PASSED")

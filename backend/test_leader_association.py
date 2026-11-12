# backend/test_leader_association.py
from leader_association import CalloutNode, associate_callouts_to_geometry, test_leader_association
from vector_pass import Arrowhead, BBox, LeaderLine, LineSegment, PageVectorModel, Point2D


def test_leader_association_embedded():
    test_leader_association()


def test_direct_leader_association():
    v_model = PageVectorModel(
        page_number=1,
        width_pt=800,
        height_pt=600,
        raw_spans=[],
        clustered_spans=[],
        line_segments=[
            LineSegment(Point2D(100, 100), Point2D(200, 100), width=1.0),
            LineSegment(Point2D(200, 100), Point2D(210, 100), width=1.0),
        ],
        rectangles=[],
        circle_centers=[],
        arrowheads=[
            Arrowhead(tip=Point2D(100, 100), base_center=Point2D(106, 100), direction_deg=0.0, kind="OPEN_VEE"),
        ],
        leader_lines=[
            LeaderLine(
                leader_id="ldr_test",
                arrow_tip=Point2D(100, 100),
                tail_end=Point2D(210, 100),
                vertices=[Point2D(100, 100), Point2D(200, 100), Point2D(210, 100)],
                has_horizontal_shoulder=True,
            )
        ],
        dimension_lines=[],
    )
    node = CalloutNode(
        callout_id="c1",
        raw_text="Ø20.0 ±0.1",
        bbox=BBox(215, 95, 260, 105),
        rotation_deg=0.0,
    )
    res = associate_callouts_to_geometry([node], v_model)
    assert len(res) == 1
    assert res[0].association_kind == "LEADER_SHOULDER"

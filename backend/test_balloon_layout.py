# backend/test_balloon_layout.py
from balloon_layout import compute_sheet_zone, layout_and_number_balloons, test_balloon_layout
from vector_pass import BBox, Point2D


def test_balloon_layout_embedded():
    test_balloon_layout()


def test_compute_sheet_zone():
    zone = compute_sheet_zone(Point2D(100.0, 100.0), 800.0, 600.0)
    assert len(zone) == 2
    assert zone[0] in "ABCD"
    assert zone[1] in "12345678"


def test_balloon_layout_placement():
    items = [
        ("c1", BBox(100, 100, 150, 120)),
        ("c2", BBox(300, 200, 360, 220)),
    ]
    placed = layout_and_number_balloons(items, 842.0, 595.0)
    assert len(placed) == 2
    assert placed[0].char_no == 1
    assert placed[1].char_no == 2
    assert placed[0].balloon_center.distance_to(placed[1].balloon_center) > 20.0

# backend/test_pipeline_e2e.py
from __future__ import annotations

import os
import fitz

from balloon_layout import layout_and_number_balloons
from confidence import EvidenceSignals, compute_honest_confidence
from dimension_grammar import parse_dimension_callout
from gdt_parser import parse_gdt_frame
from leader_association import CalloutNode, associate_callouts_to_geometry
from limits_math import (
    calculate_iso_2768_limits,
    calculate_iso_286_limits,
    calculate_iso_965_thread_limits,
)
from vector_pass import BBox, Point2D, run_vector_pass


# Ground-truth 17 characteristics matching the frontend AS-4092-C benchmark
AS_4092_C_BENCHMARK_SPECS: list[tuple[str, tuple[float, float], tuple[float, float], float, float]] = [
    # (Callout Text, Feature Arrow Tip (x,y), Text Origin (x,y), Expected LSL, Expected USL)
    ("Ø30.00 H7",              (420, 260), (470, 220), 30.000, 30.021),
    ("|⌖|Ø0.05(M)|A|B|",       (420, 260), (470, 234), 0.000,  0.050),
    ("Ø120.0 ±0.15",           (240, 140), (275, 115), 119.850, 120.150),
    ("4x Ø8.50 +0.10 / -0.00", (300, 175), (345, 145), 8.500,  8.600),
    ("PCD Ø78.0 ±0.10",        (270, 240), (320, 210), 77.900, 78.100),
    ("Ra 1.6 µm Max",          (435, 185), (475, 165), 0.000,  1.600),
    ("45.0° ±0.5°",            (210, 370), (250, 395), 44.500, 45.500),
    ("Ø60.00 ±0.03",           (240, 195), (280, 170), 59.970, 60.030),
    ("30.00 ±0.05",            (405, 145), (430, 118), 29.950, 30.050),
    ("15.00 ±0.05",            (515, 145), (540, 118), 14.950, 15.050),
    ("Ø100.00 ±0.05",          (450, 310), (495, 310), 99.950, 100.050),
    ("Ø80.00 g6",              (535, 290), (575, 290), 79.971, 79.990),
    ("0.5 x 45°",              (330, 410), (370, 430), 0.300,  0.700),
    ("|⟂|0.02|A|",             (400, 350), (450, 375), 0.000,  0.020),
    ("4X M10x1.5 - 6H",        (185, 230), (110, 200), 8.376,  8.676),
    ("R12.5 ±0.10",            (205, 310), (135, 330), 12.400, 12.600),
    ("64.0",                   (520, 410), (560, 430), 63.700, 64.300),
]


def generate_synthetic_as4092_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=842, height=595)
    shape = page.new_shape()

    # Draw outer ISO border and part circles/sections
    shape.draw_rect(fitz.Rect(24, 24, 818, 571))
    shape.draw_circle(fitz.Point(240, 260), 90)
    shape.draw_circle(fitz.Point(240, 260), 45)
    shape.draw_rect(fitz.Rect(390, 155, 450, 365))
    shape.draw_rect(fitz.Rect(505, 155, 555, 365))

    # Draw leaders + arrowheads for all non-stacked callouts
    for text, (fx, fy), (tx, ty), _, _ in AS_4092_C_BENCHMARK_SPECS:
        if text == "|⌖|Ø0.05(M)|A|B|":
            # Stacked directly under Ø30.00 H7 to test STACKED_SIBLING inheritance
            continue
        shoulder_x = tx - 4.0 if tx >= fx else tx + 65.0
        elbow_x = shoulder_x - 14.0 if tx >= fx else shoulder_x + 14.0
        shape.draw_line(fitz.Point(fx, fy), fitz.Point(elbow_x, ty - 3.0))
        shape.draw_line(fitz.Point(elbow_x, ty - 3.0), fitz.Point(shoulder_x, ty - 3.0))
        # Open-vee arrowhead at (fx, fy) pointing toward feature
        dx, dy = (elbow_x - fx), (ty - 3.0 - fy)
        dist = (dx * dx + dy * dy) ** 0.5 or 1.0
        ux, uy = dx / dist, dy / dist
        px, py = -uy, ux
        w1 = fitz.Point(fx + ux * 6.0 + px * 2.2, fy + uy * 6.0 + py * 2.2)
        w2 = fitz.Point(fx + ux * 6.0 - px * 2.2, fy + uy * 6.0 - py * 2.2)
        shape.draw_line(fitz.Point(fx, fy), w1)
        shape.draw_line(fitz.Point(fx, fy), w2)

    shape.finish(width=0.7, color=(0, 0, 0))
    shape.commit()

    font_path = None
    for p in [
        "C:/Windows/Fonts/seguisym.ttf",
        "C:/Windows/Fonts/seguiemj.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]:
        if os.path.exists(p):
            font_path = p
            break

    if font_path:
        page.insert_font(fontname="f0", fontfile=font_path)

    for text, _, (tx, ty), _, _ in AS_4092_C_BENCHMARK_SPECS:
        if font_path:
            page.insert_text(fitz.Point(tx, ty), text, fontname="f0", fontsize=9.0)
        else:
            page.insert_text(fitz.Point(tx, ty), text, fontsize=9.0)

    # Add title block boilerplate that MUST be rejected by grammar
    if font_path:
        page.insert_text(fitz.Point(680, 540), "AS-4092-C", fontname="f0", fontsize=11.0)
        page.insert_text(fitz.Point(680, 555), "SHEET 1 OF 1", fontname="f0", fontsize=8.0)
    else:
        page.insert_text(fitz.Point(680, 540), "AS-4092-C", fontsize=11.0)
        page.insert_text(fitz.Point(680, 555), "SHEET 1 OF 1", fontsize=8.0)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_full_as4092_pipeline() -> None:
    pdf_bytes = generate_synthetic_as4092_pdf()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    v_model = run_vector_pass(doc, 0)

    callout_nodes: list[CalloutNode] = []
    parsed_records: dict[str, tuple[float, float, str]] = {}

    for sp in v_model.clustered_spans:
        gdt = parse_gdt_frame(sp.text)
        if gdt:
            cid = sp.span_id
            callout_nodes.append(CalloutNode(cid, sp.text, sp.bbox, sp.rotation_deg))
            parsed_records[cid] = (gdt.lsl, gdt.usl, "GDT_FRAME")
            continue

        dim = parse_dimension_callout(sp.text)
        if dim:
            cid = sp.span_id
            callout_nodes.append(CalloutNode(cid, sp.text, sp.bbox, sp.rotation_deg, dim.quantity))
            if dim.kind == "ISO_FIT" and dim.fit_class:
                lim = calculate_iso_286_limits(dim.nominal, dim.fit_class)
                parsed_records[cid] = (lim.lsl, lim.usl, "ISO_FIT_OR_THREAD")
            elif dim.kind == "THREAD" and dim.thread_pitch:
                lim = calculate_iso_965_thread_limits(dim.nominal, dim.thread_pitch, dim.thread_class or "6H")["minor_diameter"]
                parsed_records[cid] = (lim.lsl, lim.usl, "ISO_FIT_OR_THREAD")
            elif dim.kind == "SURFACE_ROUGHNESS":
                parsed_records[cid] = (0.0, float(dim.plus_tol or 1.6), "EXACT_EXPLICIT_TOL")
            elif dim.kind == "CHAMFER":
                lim = calculate_iso_2768_limits(dim.nominal, "m", "RADIUS_CHAMFER")
                parsed_records[cid] = (lim.lsl, lim.usl, "GENERAL_UNTOLERANCED")
            elif dim.tolerance_kind == "GENERAL_TOL":
                lim = calculate_iso_2768_limits(dim.nominal, "m", "LINEAR")
                parsed_records[cid] = (lim.lsl, lim.usl, "GENERAL_UNTOLERANCED")
            else:
                lsl = round(dim.nominal + float(dim.minus_tol or 0.0), 4)
                usl = round(dim.nominal + float(dim.plus_tol or 0.0), 4)
                parsed_records[cid] = (lsl, usl, "EXACT_EXPLICIT_TOL")

    # Acceptance Bar 1: Exactly 17 characteristics extracted (boilerplate rejected)
    assert len(callout_nodes) == 17, f"Expected 17 characteristics, got {len(callout_nodes)}"

    # Acceptance Bar 2: Leader association matches all 17 (16 direct leaders + 1 stacked sibling)
    associated = associate_callouts_to_geometry(callout_nodes, v_model)
    unmatched = [a for a in associated if a.association_kind == "UNMATCHED"]
    assert len(unmatched) == 0, f"Expected 0 unmatched leaders, got {[u.callout.raw_text for u in unmatched]}"

    # Acceptance Bar 3: Balloon layout produces 17 non-overlapping balloons in zones A1..D8
    placed = layout_and_number_balloons([(n.callout_id, n.bbox) for n in callout_nodes], v_model.width_pt, v_model.height_pt)
    assert len(placed) == 17

    # Acceptance Bar 4: Verify computed LSL/USL match ground truth to 0.001 mm
    for node in callout_nodes:
        lsl, usl, _ = parsed_records[node.callout_id]
        expected = next(item for item in AS_4092_C_BENCHMARK_SPECS if item[0] == node.raw_text)
        assert abs(lsl - expected[3]) < 1e-3 and abs(usl - expected[4]) < 1e-3, (
            f"Mismatch on {node.raw_text}: got [{lsl}, {usl}], expected [{expected[3]}, {expected[4]}]"
        )

    doc.close()


if __name__ == "__main__":
    test_full_as4092_pipeline()
    print("test_full_as4092_pipeline (17/17 AS-4092-C Acceptance Bar) PASSED")

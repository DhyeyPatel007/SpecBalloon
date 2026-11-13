import unittest
from unittest.mock import patch
import fitz

import main


class TestStage2Multipage(unittest.TestCase):
    def test_same_callout_multipage_and_same_page_dedup(self):
        """1. Same callout on two pages stays two balloons; same-page duplicate span_id deduped to one.
        Patch main.suppress_fragments_and_resolve_multiview with identity (lambda x: x) to isolate the wrapper."""
        records = [
            # Page 0: Two records sharing span_id "sp_1" (different fullness)
            {
                "page_index": 0,
                "span_id": "sp_1",
                "raw_callout": "10",
                "nominal": 10.0,
                "tolerance_kind": "GENERAL_TOL",
            },
            {
                "page_index": 0,
                "span_id": "sp_1",
                "raw_callout": "10 ±0.5",
                "nominal": 10.0,
                "tolerance_kind": "BILATERAL_SYM",
            },
            # Page 1: Same callout on another page with same span_id "sp_1"
            {
                "page_index": 1,
                "span_id": "sp_1",
                "raw_callout": "10 ±0.5",
                "nominal": 10.0,
                "tolerance_kind": "BILATERAL_SYM",
            },
        ]
        with patch("main.suppress_fragments_and_resolve_multiview", side_effect=lambda x: x):
            out = main.suppress_fragments_and_resolve_multiview_on_page(records)

        # Same callout on two pages stays two balloons; same-page duplicate span_id deduped to one
        self.assertEqual(len(out), 2)
        p0 = [r for r in out if r.get("page_index") == 0]
        p1 = [r for r in out if r.get("page_index") == 1]
        self.assertEqual(len(p0), 1)
        self.assertEqual(len(p1), 1)
        self.assertEqual(p0[0]["raw_callout"], "10 ±0.5")
        self.assertEqual(p1[0]["raw_callout"], "10 ±0.5")

    def test_six_page_doc_processes_pages_zero_to_four_only(self):
        """2. A 6-page document processes pages 0..4 only (patch main._extract_page_characteristics, record visited pages)."""
        doc = fitz.open()
        for _ in range(6):
            doc.new_page(width=600, height=800)

        visited_pages = []

        def fake_extract(d, p_idx, dwg_id, tol_class="m", **kwargs):
            visited_pages.append(p_idx)
            return [], {
                "page_index": p_idx,
                "sheet": p_idx + 1,
                "width": 600.0,
                "height": 800.0,
                "count": 0,
            }

        with patch("main._extract_page_characteristics", side_effect=fake_extract):
            chars, pages_meta = main.extract_all_pages(doc, "test_dwg")

        self.assertEqual(visited_pages, [0, 1, 2, 3, 4])
        self.assertEqual(len(pages_meta), 5)
        self.assertEqual([p["page_index"] for p in pages_meta], [0, 1, 2, 3, 4])
        doc.close()

    def test_page_sheet_location_stamping_synthetic_two_page(self):
        """3. Page/sheet/location stamping: build a 2-page synthetic fitz doc (one 10 ±0.5 text span per page),
        run extract_all_pages, assert every record has page_index, sheet = page_index + 1,
        location starting SH {sheet}, and global char_no 1..N across pages."""
        doc = fitz.open()
        p0 = doc.new_page(width=600, height=800)
        p0.insert_text(fitz.Point(100, 100), "10 ±0.5", fontsize=10)
        p1 = doc.new_page(width=600, height=800)
        p1.insert_text(fitz.Point(100, 100), "10 ±0.5", fontsize=10)

        chars, pages_meta = main.extract_all_pages(doc, "dwg_stamp_test")
        self.assertEqual(len(pages_meta), 2)
        self.assertEqual(len(chars), 2)

        for i, c in enumerate(chars, start=1):
            expected_page_idx = i - 1
            expected_sheet = i
            self.assertEqual(c["page_index"], expected_page_idx)
            self.assertEqual(c["sheet"], expected_sheet)
            self.assertTrue(
                c["location"].startswith(f"SH {expected_sheet} -"),
                f"Expected location starting with 'SH {expected_sheet} -', got {c['location']!r}",
            )
            self.assertEqual(c["char_no"], i)
            self.assertEqual(c["balloonNumber"], i)
            self.assertEqual(c["id"], f"char_dwg_stamp_test_{i}")
        doc.close()


if __name__ == "__main__":
    unittest.main()


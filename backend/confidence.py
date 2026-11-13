# backend/confidence.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from leader_association import AssociationKind


@dataclass(frozen=True)
class EvidenceSignals:
    text_source: Literal["NATIVE_VECTOR", "CLUSTERED_VECTOR", "GEMINI_PATCH_OCR"]
    grammar_match: Literal["EXACT_EXPLICIT_TOL", "ISO_FIT_OR_THREAD", "GDT_FRAME", "GENERAL_UNTOLERANCED"]
    leader_association: AssociationKind
    leader_distance_pt: float
    rotation_deg: float
    vision_used: bool = False
    vision_confidence: float | None = None
    vision_vector_conflict: bool = False
    local_neighbour_count: int = 0


@dataclass(frozen=True)
class ConfidenceAssessment:
    score: float  # 0.00 to 0.99 (never 1.00, never a hardcoded constant)
    needs_review: bool
    review_reasons: list[str] = field(default_factory=list)
    evidence_breakdown: dict[str, float] = field(default_factory=dict)


def compute_honest_confidence(signals: EvidenceSignals) -> ConfidenceAssessment:
    reasons: list[str] = []
    breakdown: dict[str, float] = {}

    is_explicit = signals.grammar_match in ("EXACT_EXPLICIT_TOL", "ISO_FIT_OR_THREAD", "GDT_FRAME")
    is_general = signals.grammar_match == "GENERAL_UNTOLERANCED"
    is_matched_leader = signals.leader_association in ("LEADER_SHOULDER", "DIMENSION_LINE", "STACKED_SIBLING")

    # 1. Text Extraction Evidence (0.0 to 0.40)
    if signals.text_source == "NATIVE_VECTOR":
        text_pts = 0.38
    elif signals.text_source == "CLUSTERED_VECTOR":
        text_pts = 0.36
        reasons.append("Merged split superscript/subscript tolerance tokens")
    else:
        v_conf = signals.vision_confidence if signals.vision_confidence is not None else 0.75
        text_pts = round(0.32 * max(0.3, min(0.98, v_conf)), 3)
        reasons.append("Extracted via cropped-patch Vision OCR")
    breakdown["text_source"] = text_pts

    # 2. Grammar & Tolerance Explicitness (0.0 to 0.30)
    if is_explicit:
        gram_pts = 0.30
    else:
        gram_pts = 0.23
        reasons.append("No explicit local tolerance on callout — applied sheet general tolerance (ISO 2768)")
    breakdown["grammar"] = gram_pts

    # 3. Spatial Leader / Geometry Binding (0.0 to 0.25)
    if is_matched_leader:
        if is_explicit:
            if signals.leader_association == "LEADER_SHOULDER":
                dist_penalty = min(0.04, max(0.0, signals.leader_distance_pt - 4.0) * 0.002)
                ldr_pts = round(0.26 - dist_penalty, 3)
            elif signals.leader_association == "DIMENSION_LINE":
                ldr_pts = round(0.25 - min(0.03, signals.leader_distance_pt * 0.001), 3)
            else:  # STACKED_SIBLING
                ldr_pts = 0.25
        else:
            ldr_pts = 0.25
    elif is_explicit:
        ldr_pts = 0.20
        reasons.append("No leader arrowhead or dimension line matched within 22 pt")
    else:
        # General tolerance unmatched
        if signals.local_neighbour_count < 3:
            ldr_pts = 0.21
            reasons.append("No leader arrowhead or dimension line matched within 22 pt")
        else:
            ldr_pts = 0.13
            # Reason added in review check below
    breakdown["leader_binding"] = ldr_pts

    # 4. Orientation & Vision-Vector Conflict Modifiers
    rot_penalty = 0.0
    if abs(signals.rotation_deg) not in (0.0, 90.0, -90.0, 180.0):
        rot_penalty = -0.05
        reasons.append(f"Angled callout ({signals.rotation_deg:.1f}°) — verify orientation")
    breakdown["rotation_adjustment"] = rot_penalty

    conflict_penalty = 0.0
    if signals.vision_vector_conflict:
        conflict_penalty = -0.25
        reasons.append("CONFLICT: Gemini Vision patch disagreed with native PDF vector text (vector text retained)")
    breakdown["conflict_adjustment"] = conflict_penalty

    raw_score = text_pts + gram_pts + ldr_pts + rot_penalty + conflict_penalty
    final_score = round(max(0.10, min(0.98, raw_score)), 3)

    is_crowded_general = (
        is_general
        and not is_matched_leader
        and signals.local_neighbour_count >= 3
    )
    if is_crowded_general:
        reasons.append("Unmatched general-tolerance callout in dense zone — verify leader attachment")

    needs_review = (
        signals.vision_vector_conflict
        or is_crowded_general
        or final_score < 0.70
    )

    return ConfidenceAssessment(
        score=final_score,
        needs_review=needs_review,
        review_reasons=reasons,
        evidence_breakdown=breakdown,
    )

    return ConfidenceAssessment(
        score=final_score,
        needs_review=needs_review,
        review_reasons=reasons,
        evidence_breakdown=breakdown,
    )


def test_confidence() -> None:
    # High-evidence clean vector callout with matched leader shoulder
    c_high = compute_honest_confidence(
        EvidenceSignals(
            text_source="NATIVE_VECTOR",
            grammar_match="EXACT_EXPLICIT_TOL",
            leader_association="LEADER_SHOULDER",
            leader_distance_pt=2.5,
            rotation_deg=0.0,
        )
    )
    assert c_high.score >= 0.90 and c_high.needs_review is False

    # Low-evidence unmatched callout with vision-vector conflict
    c_low = compute_honest_confidence(
        EvidenceSignals(
            text_source="CLUSTERED_VECTOR",
            grammar_match="GDT_FRAME",
            leader_association="UNMATCHED",
            leader_distance_pt=999.0,
            rotation_deg=45.0,
            vision_vector_conflict=True,
        )
    )
    assert c_low.score < 0.65 and c_low.needs_review is True
    assert any("CONFLICT" in r for r in c_low.review_reasons)


if __name__ == "__main__":
    test_confidence()
    print("test_confidence PASSED")


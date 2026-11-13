# backend/test_confidence.py
from confidence import EvidenceSignals, compute_honest_confidence, test_confidence


def test_confidence_embedded():
    test_confidence()


def test_high_confidence():
    signals = EvidenceSignals(
        text_source="NATIVE_VECTOR",
        grammar_match="EXACT_EXPLICIT_TOL",
        leader_association="LEADER_SHOULDER",
        leader_distance_pt=2.5,
        rotation_deg=0.0,
    )
    res = compute_honest_confidence(signals)
    assert 0.92 <= res.score <= 0.96
    assert not res.needs_review


def test_explicit_unmatched_confidence():
    signals = EvidenceSignals(
        text_source="NATIVE_VECTOR",
        grammar_match="EXACT_EXPLICIT_TOL",
        leader_association="UNMATCHED",
        leader_distance_pt=999.0,
        rotation_deg=0.0,
    )
    res = compute_honest_confidence(signals)
    assert res.score == 0.88
    assert not res.needs_review


def test_general_matched_confidence():
    signals = EvidenceSignals(
        text_source="NATIVE_VECTOR",
        grammar_match="GENERAL_UNTOLERANCED",
        leader_association="LEADER_SHOULDER",
        leader_distance_pt=2.5,
        rotation_deg=0.0,
    )
    res = compute_honest_confidence(signals)
    assert res.score == 0.86
    assert not res.needs_review


def test_general_unmatched_isolated_confidence():
    signals = EvidenceSignals(
        text_source="NATIVE_VECTOR",
        grammar_match="GENERAL_UNTOLERANCED",
        leader_association="UNMATCHED",
        leader_distance_pt=999.0,
        rotation_deg=0.0,
        local_neighbour_count=1,
    )
    res = compute_honest_confidence(signals)
    assert res.score == 0.82
    assert not res.needs_review


def test_general_unmatched_crowded_confidence():
    signals = EvidenceSignals(
        text_source="NATIVE_VECTOR",
        grammar_match="GENERAL_UNTOLERANCED",
        leader_association="UNMATCHED",
        leader_distance_pt=999.0,
        rotation_deg=0.0,
        local_neighbour_count=4,
    )
    res = compute_honest_confidence(signals)
    assert res.score == 0.74
    assert res.needs_review
    assert any("dense zone" in r for r in res.review_reasons)


def test_low_confidence_needs_review():
    signals = EvidenceSignals(
        text_source="CLUSTERED_VECTOR",
        grammar_match="GDT_FRAME",
        leader_association="UNMATCHED",
        leader_distance_pt=999.0,
        rotation_deg=45.0,
        vision_vector_conflict=True,
    )
    res = compute_honest_confidence(signals)
    assert res.score < 0.65
    assert res.needs_review


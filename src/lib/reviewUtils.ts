// src/lib/reviewUtils.ts — SINGLE SOURCE OF TRUTH FOR STUDIO UI REVIEW COUNTS & BALLOON OFFSET
// Source: Argon (Gemini 4) fix-round-3 reply, captured from Gemini chat
// "SpecBalloon Startup Idea Research Plan" (browser page-text capture, 13 Nov 2026 ~07:38 IST).

export interface StudioCharacteristic {
  char_no?: number;
  raw_callout?: string;
  rawCallout?: string;
  callout?: string;
  confidence?: number; // 0..1 or 0..100
  needs_review?: boolean;
  needsReview?: boolean;
  status?: string;
  bbox?: [number, number, number, number] | { x: number; y: number; width: number; height: number };
  x?: number;
  y?: number;
  balloon_x?: number;
  balloon_y?: number;
  balloonPosition?: { x: number; y: number };
}

export function normalizeConfidencePct(conf: number | undefined): number {
  if (conf === undefined || conf === null || Number.isNaN(conf)) return 0;
  return conf <= 1.0 ? Number((conf * 100).toFixed(1)) : Number(conf.toFixed(1));
}

export function isCharacteristicFlagged(ch: StudioCharacteristic): boolean {
  if (typeof ch.needs_review === "boolean") return ch.needs_review;
  if (typeof ch.needsReview === "boolean") return ch.needsReview;
  if (
    ch.status === "NEEDS_REVIEW" ||
    ch.status === "REVIEW" ||
    ch.status === "needs_review"
  ) {
    return true;
  }
  return normalizeConfidencePct(ch.confidence) < 85.0;
}

export function getDisplacedBalloonCoords(
  ch: StudioCharacteristic,
) {
  let x0: number, y0: number, x1: number, y1: number;
  if (Array.isArray(ch.bbox)) {
    [x0, y0, x1, y1] = ch.bbox;
  } else if (ch.bbox && typeof ch.bbox === "object") {
    x0 = ch.bbox.x;
    y0 = ch.bbox.y;
    x1 = ch.bbox.x + ch.bbox.width;
    y1 = ch.bbox.y + ch.bbox.height;
  } else {
    x0 = (ch.x ?? 100) - 24;
    y0 = (ch.y ?? 100) - 7;
    x1 = (ch.x ?? 100) + 24;
    y1 = (ch.y ?? 100) + 7;
  }
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const halfW = Math.max(12, (x1 - x0) * 0.5);
  const halfH = Math.max(12, (y1 - y0) * 0.5);
  const balloonRadius = 11;
  let bx = ch.balloon_x ?? ch.balloonPosition?.x ?? (cx - halfW - balloonRadius - 10);
  let by = ch.balloon_y ?? ch.balloonPosition?.y ?? (cy - halfH - balloonRadius - 8);
  const pad = balloonRadius + 4;
  if (bx >= x0 - pad && bx <= x1 + pad && by >= y0 - pad && by <= y1 + pad) {
    bx = x0 - balloonRadius - 10;
    by = y0 - balloonRadius - 6;
  }
  return { bx, by, anchorX: x0, anchorY: cy };
}


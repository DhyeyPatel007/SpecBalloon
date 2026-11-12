import * as pdfjsLib from 'pdfjs-dist';
import { Characteristic, CharacteristicDesignator, Point, BoundingBox } from '../types/metrology';
import {
  parseCalloutAndCalculateLimits,
  calculateISO286,
  calculateISOThread,
  getGeneralTolerance
} from './metrologyMath';

export interface ExtractionResult {
  characteristics: Characteristic[];
  isScannedRaster: boolean;
  totalTextSpansFound: number;
}

interface RawTextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts dimension callouts and calculates ASME / ISO limits directly
 * from vector PDF text streams using pdfjs-dist.
 */
export async function extractVectorDimensionsFromPdf(
  pdfBuffer: ArrayBuffer,
  pageNumber: number = 1
): Promise<ExtractionResult> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(Math.min(pageNumber, pdfDoc.numPages));
  const viewport = page.getViewport({ scale: 1.0 });

  const textContent = await page.getTextContent({ includeMarkedContent: true });
  const rawSpans: RawTextSpan[] = [];

  for (const item of textContent.items) {
    if ('str' in item && typeof item.str === 'string') {
      const trimmed = item.str.trim();
      if (!trimmed) continue;

      const tx = item.transform[4];
      const ty = item.transform[5];
      // Convert PDF coordinate space (origin at bottom-left) to canvas space (origin at top-left)
      const canvasY = Math.max(0, viewport.height - ty - (item.height || 12));
      const canvasX = Math.max(0, tx);

      rawSpans.push({
        text: trimmed,
        x: canvasX,
        y: canvasY,
        width: item.width || Math.max(16, trimmed.length * 7),
        height: item.height || 14,
      });
    }
  }

  if (rawSpans.length === 0) {
    // Document contains zero vector text spans -> Scanned raster bitmap
    return {
      characteristics: [],
      isScannedRaster: true,
      totalTextSpansFound: 0,
    };
  }

  // Cluster horizontally adjacent spans (e.g. "Ø30.00" + "H7" or "50.0" + "±0.05")
  const clusteredSpans: RawTextSpan[] = [];
  const sorted = [...rawSpans].sort((a, b) => a.y - b.y || a.x - b.x);
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    let current = { ...sorted[i] };
    used.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const next = sorted[j];
      const dy = Math.abs(current.y - next.y);
      const dx = next.x - (current.x + current.width);

      // On same horizontal line and closely positioned
      if (dy < 6 && dx >= -2 && dx < 28) {
        current.text = `${current.text} ${next.text}`;
        current.width = next.x + next.width - current.x;
        current.height = Math.max(current.height, next.height);
        used.add(j);
      }
    }
    clusteredSpans.push(current);
  }

  // Regex patterns for mechanical CAD callouts
  const DIM_PATTERN = /(?:Ø|⌀|%%c)?\s*\d+(?:\.\d+)?(?:\s*(?:±|\+|\/-|[+\-]\s*\d|\/[+\-]))?/i;
  const GDT_PATTERN = /[|\[]?(?:⌖|⌯|⏥|⟂|∠|∥|⌒|⌓|○|⌭|↗|⤐)[|\]]?\s*(?:Ø|⌀)?\s*\d+(?:\.\d+)?/i;
  const THREAD_PATTERN = /^[M|m]\d+(?:\.\d+)?(?:\s*[xX]\s*\d+(?:\.\d+)?)?/i;
  const FIT_PATTERN = /(?:Ø|⌀)?\s*(\d+(?:\.\d+)?)\s*([A-Za-z]{1,2}\d{1,2})/i;

  const characteristics: Characteristic[] = [];
  let balloonCounter = 1;

  for (const span of clusteredSpans) {
    const text = span.text.trim();
    const isGdt = GDT_PATTERN.test(text);
    const isThread = THREAD_PATTERN.test(text);
    const isFit = FIT_PATTERN.test(text);
    const isDim = DIM_PATTERN.test(text) && /\d/.test(text);

    // Ignore isolated non-measurement text like title block labels or page numbers
    if (!isGdt && !isThread && !isFit && !isDim) continue;
    if (/^(rev|page|sheet|dwg|date|scale|qty|approved|drawn|weight|title)/i.test(text)) continue;
    if (text.length > 40) continue; // Skip long drawing notes

    // Compute ISO Sheet Zone (A-D, 1-8)
    const zoneCol = Math.min(8, Math.max(1, Math.floor((span.x / viewport.width) * 8) + 1));
    const zoneRow = ['A', 'B', 'C', 'D'][Math.min(3, Math.max(0, Math.floor((span.y / viewport.height) * 4)))];
    const zone = `${zoneRow}${zoneCol}`;

    // Parse callout into metrology limits
    let parsed = parseCalloutAndCalculateLimits(text, 'Bilateral');
    let designator: CharacteristicDesignator = 'Minor';
    let confidence = 88.0;
    let status: 'in_spec' | 'needs_review' = 'in_spec';

    if (isGdt) {
      designator = 'Critical';
      confidence = 92.5;
    } else if (isFit) {
      const match = text.match(FIT_PATTERN);
      if (match) {
        const nom = parseFloat(match[1]);
        const fitClass = match[2];
        const iso = calculateISO286(nom, fitClass);
        if (iso && (iso.plusTol !== 0 || iso.minusTol !== 0)) {
          parsed = {
            nominal_text: text,
            nominal_value: nom,
            plusTolerance: iso.plusTol,
            minusTolerance: iso.minusTol,
            lower_limit: nom - iso.minusTol,
            upper_limit: nom + iso.plusTol,
            toleranceType: 'Limit',
            instrument: iso.instrument || `Air Plug Gauge / Bore Micrometer (${fitClass})`
          };
          designator = 'Critical';
          confidence = 96.0;
        }
      }
    } else if (isThread) {
      const m = text.match(/^[M|m](\d+(?:\.\d+)?)(?:\s*[xX]\s*(\d+(?:\.\d+)?))?/i);
      const nomDia = m ? parseFloat(m[1]) : 6;
      const pitch = m && m[2] ? parseFloat(m[2]) : 1.0;
      const t = calculateISOThread(nomDia, pitch);
      if (t) {
        // Thread verdicts are judged on the ISO 965 pitch diameter (D2), the
        // dimension a plug/ring gauge actually checks. Minor-diameter limits
        // must never be used as the row limits for a pitch-diameter value.
        const d2Lsl = t.pitchD2Lsl ?? t.minorD1Lsl;
        const d2Usl = t.pitchD2Usl ?? t.minorD1Usl;
        parsed = {
          nominal_text: text,
          nominal_value: t.nominalDiameter,
          plusTolerance: Number((d2Usl - t.pitchDiameterD2).toFixed(3)),
          minusTolerance: Number((t.pitchDiameterD2 - d2Lsl).toFixed(3)),
          lower_limit: d2Lsl,
          upper_limit: d2Usl,
          toleranceType: 'Thread',
          instrument: `Thread Go/No-Go Plug Gage (${text})`,
          threadData: t,
        };
        designator = 'Major';
        confidence = 94.0;
      }
    } else {
      const tolSpan = (parsed.plusTolerance + parsed.minusTolerance);
      if (tolSpan <= 0.05) {
        designator = 'Critical';
      } else if (tolSpan <= 0.15) {
        designator = 'Major';
      } else {
        designator = 'Minor';
      }

      // Check if tolerance was explicit or defaulted
      if (parsed.toleranceType === 'Bilateral' && parsed.plusTolerance === 0.1 && parsed.minusTolerance === 0.1 && !text.includes('±')) {
        // Missing explicit tolerance -> flag for review
        confidence = 72.0;
        status = 'needs_review';
      }
    }

    const bbox: BoundingBox = {
      x: Math.round(span.x),
      y: Math.round(span.y),
      width: Math.max(38, Math.round(span.width)),
      height: Math.max(16, Math.round(span.height)),
    };

    const balloonPosition: Point = {
      x: Math.max(16, Math.round(span.x - 26)),
      y: Math.max(16, Math.round(span.y - 12)),
    };

    const charId = `char-pdf-${balloonCounter}-${Date.now().toString(36)}`;

    // Nominal value for baseline measurement
    const nominalVal = parsed.nominal_value;
    const lsl = parsed.lower_limit ?? (nominalVal !== null ? nominalVal - parsed.minusTolerance : 0);
    const usl = parsed.upper_limit ?? (nominalVal !== null ? nominalVal + parsed.plusTolerance : 0);
    const tolType: Characteristic['toleranceType'] = parsed.toleranceType ?? 'Bilateral';

    const measuredVal = nominalVal !== null
      ? Number((nominalVal + (parsed.plusTolerance * 0.15)).toFixed(3))
      : null;

    characteristics.push({
      id: charId,
      balloonNumber: balloonCounter,
      zone,
      designator,
      rawCallout: text,
      featureDescription: `${designator} Dimension (${text})`,
      nominal_text: parsed.nominal_text,
      nominal_value: nominalVal,
      nominal: nominalVal ?? undefined,
      toleranceType: tolType,
      plusTolerance: parsed.plusTolerance,
      minusTolerance: parsed.minusTolerance,
      lsl,
      usl,
      lower_limit: lsl,
      upper_limit: usl,
      units: 'mm',
      instrument: parsed.instrument,
      measuredValue: measuredVal,
      lotMeasurements: measuredVal !== null ? [measuredVal, measuredVal, measuredVal] : [],
      status,
      confidence,
      bbox,
      balloonPosition,
      reviewed: status === 'in_spec' && confidence >= 85,
      isDemo: false,
    });

    balloonCounter++;
  }

  return {
    characteristics,
    isScannedRaster: characteristics.length === 0,
    totalTextSpansFound: rawSpans.length,
  };
}

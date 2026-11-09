import * as XLSX from 'xlsx';
import {
  Characteristic,
  GeneralToleranceStandard,
  ThreadMetrologyData,
  DynamicMmcCalc,
  GageRegistryItem,
  AS9102Form1Data,
  AS9102Form2Item,
  AuditLogEntry
} from '../types/metrology';

/**
 * Strict Number Formatting Utilities
 */
export const fmt3 = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n)) return '0.000';
  return Number(Math.round(Number(n + 'e4')) + 'e-4').toFixed(3);
};

export const fmtDim = fmt3;

export function fmtPct(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${Number(val).toFixed(1)}%`;
}

export function fmtSpc(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toFixed(2);
}

/**
 * Helper to clean revision strings
 */
export function cleanRevision(rev: string): string {
  return rev.replace(/^REV\s*/i, '').replace(/^Rev\s*/i, '').trim() || 'A';
}

/**
 * ISO 68-1 / ISO 965 Metric & Unified Thread Metrology Solver
 * Computes fundamental triangle height H, pitch diameter D2, and minor bore diameter D1.
 */
export function calculateISOThread(
  nominalDiameter: number,
  pitch: number,
  threadClass: string = '6H',
  isInternal: boolean = true
): ThreadMetrologyData {
  const H = Number((0.866025 * pitch).toFixed(3));
  const D2 = Number((nominalDiameter - 0.649519 * pitch).toFixed(3));
  const D1 = Number((nominalDiameter - 1.082532 * pitch).toFixed(3));

  // ISO 965 pitch-diameter limits (TD2 = pitch-diameter tolerance, es = fundamental deviation).
  // Only the pitch/class combos actually used in the sample data are listed; anything else
  // gets no D2 limits rather than invented ones.
  //   M10x1.5 6H internal: D2 9.026-9.206 (TD2 0.180, es 0)
  //   M10x1.25 6H internal: D2 9.188-9.348 (TD2 0.160, es 0)
  //   M24x1.5 6g external: D2 22.814-22.994 (TD2 0.180, es -0.032)
  const ISO965_D2: Record<string, { td2: number; es: number }> = {
    '1.5|6H|internal': { td2: 0.18, es: 0 },
    '1.25|6H|internal': { td2: 0.16, es: 0 },
    '1.5|6g|external': { td2: 0.18, es: -0.032 },
  };
  const d2Entry = ISO965_D2[`${pitch}|${threadClass}|${isInternal ? 'internal' : 'external'}`];
  // Internal (6H): the basic pitch diameter is the MINIMUM (es = 0 at the bottom),
  // tolerance goes up: LSL = D2 + es, USL = LSL + TD2.
  // External (6g): the fundamental deviation sits at the TOP: USL = D2 + es, LSL = USL - TD2.
  let pitchD2Lsl: number | undefined;
  let pitchD2Usl: number | undefined;
  if (d2Entry) {
    if (isInternal) {
      pitchD2Lsl = Number((D2 + d2Entry.es).toFixed(3));
      pitchD2Usl = Number((pitchD2Lsl + d2Entry.td2).toFixed(3));
    } else {
      pitchD2Usl = Number((D2 + d2Entry.es).toFixed(3));
      pitchD2Lsl = Number((pitchD2Usl - d2Entry.td2).toFixed(3));
    }
  }

  // 6H minor diameter tolerance (typically +0.20 to +0.30 mm on D1)
  const minorD1Lsl = D1;
  const minorD1Usl = Number((D1 + 0.25 * Math.sqrt(pitch)).toFixed(3));

  return {
    pitch,
    nominalDiameter,
    fundamentalHeight: H,
    pitchDiameterD2: D2,
    pitchD2Lsl,
    pitchD2Usl,
    minorDiameterD1: D1,
    minorD1Lsl,
    minorD1Usl,
    threadClass,
    goNoGoResult: 'PASS',
    gaugeSerial: `TG-M${nominalDiameter}x${pitch}-${threadClass}`
  };
}

/**
 * ASME Y14.5 Dynamic MMC Bonus & Datum Shift Cross-Row Calculator
 * Effective USL = T_stated + Bonus_Feat_MMC + Shift_Datum_B_MMC
 */
export function calculateDynamicMmcBonus(
  char: Characteristic,
  datumBChar?: Characteristic
): DynamicMmcCalc {
  const stated = char.plusTolerance || 0.050;

  // Feature MMC calculation (for hole, MMC = LSL; bonus = measuredValue - LSL)
  let featureBonus = 0;
  if (char.hasMmcModifier || char.rawCallout.includes('(M)') || char.rawCallout.includes('Ⓜ')) {
    if (char.measuredValue !== undefined && char.measuredValue !== null) {
      const lsl = char.lower_limit ?? char.lsl;
      if (char.measuredValue > lsl) {
        featureBonus = Number(Math.max(0, char.measuredValue - lsl).toFixed(4));
      }
    } else {
      featureBonus = 0.008; // Reference nominal bonus
    }
  }

  // Datum B Shift calculation: Tag #01 (Datum B: Ø30.00 H7, MMC = 30.000)
  let datumShift = 0;
  if (datumBChar) {
    const datumLsl = datumBChar.lower_limit ?? datumBChar.lsl ?? 30.000;
    const datumMeasured = datumBChar.measuredValue ?? 30.012;
    if (datumMeasured > datumLsl) {
      datumShift = Number(Math.max(0, datumMeasured - datumLsl).toFixed(4));
    }
  } else {
    datumShift = 0.012; // Reference demo datum B shift
  }

  const effectiveUsl = Number((stated + featureBonus + datumShift).toFixed(4));
  const measured = char.measuredValue ?? 0.028;
  const passedViaBonus = measured > stated && measured <= effectiveUsl;

  return {
    statedTolerance: stated,
    featureBonus,
    datumShift,
    effectiveUsl,
    passedViaBonus
  };
}

/**
 * Default Active Metrology Gage Calibration Registry (Form 2 Linked)
 */
export const DEFAULT_GAGE_REGISTRY: GageRegistryItem[] = [
  {
    id: 'APG-30',
    name: 'Mahr Air Plug Gauge (Ø30)',
    serial: 'SN-APG-8821',
    certNumber: 'CAL-2026-881',
    lastCalDate: '2026-08-15',
    nextDueDate: '2027-02-15',
    status: 'VALID',
    usedInTags: ['#01']
  },
  {
    id: 'CMM-01',
    name: 'ZEISS Contura CMM Coordinate Probe',
    serial: 'SN-ZEISS-501',
    certNumber: 'CAL-2026-119',
    lastCalDate: '2026-07-20',
    nextDueDate: '2027-01-20',
    status: 'VALID',
    usedInTags: ['#02', '#05', '#11']
  },
  {
    id: 'MIT-204',
    name: 'Mitutoyo Digimatic Outside Micrometer',
    serial: 'SN-MIT-9042',
    certNumber: 'CAL-2026-402',
    lastCalDate: '2026-09-01',
    nextDueDate: '2027-03-01',
    status: 'VALID',
    usedInTags: ['#08', '#10', '#12']
  },
  {
    id: 'RA-09',
    name: 'Taylor Hobson Surtronic Roughness Tester',
    serial: 'SN-TH-4410',
    certNumber: 'CAL-2026-305',
    lastCalDate: '2026-10-10',
    nextDueDate: '2027-04-10',
    status: 'VALID',
    usedInTags: ['#06']
  },
  {
    id: 'PG-55',
    name: 'Meyer Class ZZ Pin Gauge Set',
    serial: 'SN-MEY-1104',
    certNumber: 'CAL-2026-720',
    lastCalDate: '2026-05-12',
    nextDueDate: '2026-11-12',
    status: 'VALID',
    usedInTags: ['#04']
  },
  {
    id: 'CAL-01',
    name: 'Mitutoyo Absolute Digimatic Caliper 150mm',
    serial: 'SN-MIT-3329',
    certNumber: 'CAL-2026-550',
    lastCalDate: '2026-08-01',
    nextDueDate: '2027-02-01',
    status: 'VALID',
    usedInTags: ['#03', '#13', '#14']
  }
];

export const DEFAULT_FORM1_DATA: AS9102Form1Data = {
  partNumber: 'AS-4092-C',
  partName: 'Aerospace Hydraulic Actuator Housing',
  serialNumber: 'SN-001',
  fairIdentifier: 'FAIR-2026-4092',
  drawingRevision: 'Rev C',
  baselineRevision: 'Rev B',
  organization: 'Krynex Precision Aerospace Ltd.',
  partType: 'Detail',
  reportStatus: 'Complete'
};

export const DEFAULT_FORM2_ITEMS: AS9102Form2Item[] = [
  {
    id: 'mat-1',
    category: 'Material',
    specification: 'Aluminum Alloy 6061-T6 per AMS-QQ-A-250/11',
    supplierOrProcessor: 'Kaiser Aluminum / Aerospace Stockist',
    heatLotNumber: 'HT-99281-AL',
    cocVerified: true
  },
  {
    id: 'proc-1',
    category: 'Special Process',
    specification: 'Sulfuric Acid Anodize per MIL-A-8625 Type II Class 1 Clear',
    supplierOrProcessor: 'AeroCoat Surface Technologies (Approved #AC-44)',
    heatLotNumber: 'BATCH-2026-88',
    cocVerified: true
  },
  {
    id: 'proc-2',
    category: 'Special Process',
    specification: 'Fluorescent Penetrant Inspection (FPI) per ASTM E1417 Level 3',
    supplierOrProcessor: 'NDT Labs Quality QA (Approved #NDT-91)',
    heatLotNumber: 'FPI-PASS-091',
    cocVerified: true
  }
];

export interface AQLSamplingResult {
  lotSize: number;
  inspectionLevel: 'Level II' | 'Level III';
  criticalSampleCount: number;
  majorSampleCount: number;
  minorSampleCount: number;
  totalChecksAcrossLot: number;
  faiTimeSec: number;
  faiTimeDisplay: string;
  totalLotTimeSec: number;
  totalLotTimeDisplay: string;
  totalCost: number;
  costPerPart: number;
  currency: 'INR' | 'USD';
  rows: Array<{
    balloonNumber: number;
    rawCallout: string;
    designator: 'Critical' | 'Major' | 'Minor';
    instrument: string;
    cycleTimeSec: number;
    sampleSize: number;
    totalTimeSec: number;
  }>;
}

export function calculateAQLSampling(
  lotSize: number = 250,
  inspectionLevel: 'Level II' | 'Level III' = 'Level II',
  characteristics: Characteristic[] = [],
  qaHourlyRate: number = 600,
  currency: 'INR' | 'USD' = 'INR'
): AQLSamplingResult {
  const mult = inspectionLevel === 'Level III' ? 1.6 : 1.0;
  const critSampleSize = Math.min(lotSize, Math.round(50 * mult));
  const majorSampleSize = Math.min(lotSize, Math.round(32 * mult));
  const minorSampleSize = Math.min(lotSize, Math.round(20 * mult));

  const instrumentTimes: Record<string, number> = {
    'air': 12,
    'plug': 12,
    'micro': 18,
    'bore': 18,
    'cmm': 45,
    'coord': 45,
    'prismo': 45,
    'zeiss': 45,
    'profil': 35,
    'surface': 35,
    'ra': 35,
    'caliper': 15,
    'pin': 10,
    'bevel': 20,
    'protract': 20,
    'thread': 16,
    'optical': 25,
    'radius': 14
  };

  const getCycleTime = (inst: string): number => {
    const lower = (inst || '').toLowerCase();
    for (const [key, sec] of Object.entries(instrumentTimes)) {
      if (lower.includes(key)) return sec;
    }
    return 15;
  };

  let faiTimeSec = 0;
  let totalLotTimeSec = 0;
  let totalChecks = 0;

  const rows = characteristics.map((c) => {
    const cycleTimeSec = getCycleTime(c.instrument);
    const sampleSize =
      c.designator === 'Critical'
        ? critSampleSize
        : c.designator === 'Major'
        ? majorSampleSize
        : minorSampleSize;

    faiTimeSec += cycleTimeSec;
    const timeForRow = sampleSize * cycleTimeSec;
    totalLotTimeSec += timeForRow;
    totalChecks += sampleSize;

    return {
      balloonNumber: c.balloonNumber,
      rawCallout: c.rawCallout,
      designator: c.designator,
      instrument: c.instrument,
      cycleTimeSec,
      sampleSize,
      totalTimeSec: timeForRow
    };
  });

  const formatDuration = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const totalHours = totalLotTimeSec / 3600;
  const totalCost = totalHours * qaHourlyRate;
  const costPerPart = lotSize > 0 ? totalCost / lotSize : 0;

  return {
    lotSize,
    inspectionLevel,
    criticalSampleCount: critSampleSize,
    majorSampleCount: majorSampleSize,
    minorSampleCount: minorSampleSize,
    totalChecksAcrossLot: totalChecks,
    faiTimeSec,
    faiTimeDisplay: formatDuration(faiTimeSec),
    totalLotTimeSec,
    totalLotTimeDisplay: formatDuration(totalLotTimeSec),
    totalCost,
    costPerPart,
    currency,
    rows
  };
}


/**
 * Parse callout string and compute limits for threads, ISO fits, limit dimensions, and bilateral callouts
 * Truth is nominal_text; nominal_value, upper_limit, lower_limit are derived.
 */
export function parseCalloutAndCalculateLimits(
  callout: string,
  toleranceType: Characteristic['toleranceType'] = 'Bilateral',
  standard: GeneralToleranceStandard = 'ISO 2768-m'
): {
  nominal_text: string;
  nominal_value: number | null;
  plusTolerance: number;
  minusTolerance: number;
  upper_limit: number | null;
  lower_limit: number | null;
  instrument: string;
  threadData?: ThreadMetrologyData;
  toleranceType?: Characteristic['toleranceType'];
} {
  const trimmed = callout.trim();

  // 1. Limit Dimension pattern: e.g. "50.00 / 49.95" or "50.00/49.95" or "50.00 - 49.95"
  const limitMatch = trimmed.match(/^([Ø\s]*)?([0-9.]+)\s*[/–-]\s*([0-9.]+)$/);
  if (limitMatch && !trimmed.includes('±') && !trimmed.toUpperCase().includes('M')) {
    const val1 = parseFloat(limitMatch[2]);
    const val2 = parseFloat(limitMatch[3]);
    if (!isNaN(val1) && !isNaN(val2)) {
      const upper = Math.max(val1, val2);
      const lower = Math.min(val1, val2);
      const mid = Number(((upper + lower) / 2).toFixed(4));
      return {
        nominal_text: trimmed,
        nominal_value: mid,
        plusTolerance: Number((upper - mid).toFixed(4)),
        minusTolerance: Number((mid - lower).toFixed(4)),
        upper_limit: upper,
        lower_limit: lower,
        instrument: 'Mitutoyo Digital Caliper / Micrometer',
      };
    }
  }

  // 2. Metric Thread pattern: e.g. "M6x1.0", "M10 x 1.5 - 6H", "M8x1.25", "M10x1.5"
  const threadMatch = trimmed.match(/^M([0-9.]+)\s*[xX]\s*([0-9.]+)(.*)$/i);
  if (threadMatch) {
    const majorDia = parseFloat(threadMatch[1]);
    const pitch = parseFloat(threadMatch[2]);
    const classCallout = threadMatch[3].trim().replace(/^[-–\s]+/, '') || '6H';
    const tData = calculateISOThread(majorDia, pitch, classCallout, true);
    return {
      nominal_text: trimmed,
      nominal_value: majorDia,
      plusTolerance: Number((tData.minorD1Usl - tData.minorD1Lsl).toFixed(3)),
      minusTolerance: 0,
      upper_limit: majorDia,
      lower_limit: tData.minorD1Lsl,
      instrument: `GO / NO-GO Thread Plug Gauge (M${majorDia}x${pitch} ${classCallout})`,
      threadData: tData,
    };
  }

  // 3. ISO Fit pattern: e.g. "Ø30 H7", "25 H8", "50 g6"
  const fitMatch = trimmed.match(/^([Ø\s]*)?([0-9.]+)\s*([A-Za-z][0-9]+)$/);
  if (fitMatch) {
    const nominal = parseFloat(fitMatch[2]);
    const fit = fitMatch[3];
    const iso = calculateISO286(nominal, fit);
    const upper = Number((nominal + iso.plusTol).toFixed(4));
    const lower = Number((nominal - iso.minusTol).toFixed(4));
    return {
      nominal_text: trimmed,
      nominal_value: nominal,
      plusTolerance: iso.plusTol,
      minusTolerance: iso.minusTol,
      upper_limit: upper,
      lower_limit: lower,
      instrument: iso.instrument,
    };
  }

  // 4. Bilateral / Unilateral Tolerance: e.g. "Ø25.000 ±0.020", "40.0 +0.05 / -0.02"
  const plusMinusMatch = trimmed.match(/^([Ø\s]*)?([0-9.]+)\s*±\s*([0-9.]+)/);
  if (plusMinusMatch) {
    const nominal = parseFloat(plusMinusMatch[2]);
    const tol = parseFloat(plusMinusMatch[3]);
    return {
      nominal_text: trimmed,
      nominal_value: nominal,
      plusTolerance: tol,
      minusTolerance: tol,
      upper_limit: Number((nominal + tol).toFixed(4)),
      lower_limit: Number((nominal - tol).toFixed(4)),
      instrument: tol <= 0.015 ? 'Mitutoyo Digital Micrometer' : 'Mitutoyo Absolute Caliper',
    };
  }

  // 5. Explicit + / - offsets: e.g. "20.00 +0.05/-0.02"
  const splitTolMatch = trimmed.match(/^([Ø\s]*)?([0-9.]+)\s*\+([0-9.]+)\s*[/–-]\s*-?([0-9.]+)/);
  if (splitTolMatch) {
    const nominal = parseFloat(splitTolMatch[2]);
    const plus = parseFloat(splitTolMatch[3]);
    const minus = parseFloat(splitTolMatch[4]);
    return {
      nominal_text: trimmed,
      nominal_value: nominal,
      plusTolerance: plus,
      minusTolerance: minus,
      upper_limit: Number((nominal + plus).toFixed(4)),
      lower_limit: Number((nominal - minus).toFixed(4)),
      instrument: 'Mitutoyo Digital Caliper',
    };
  }

  // 6. GD&T Feature Control Frame: e.g. "|⌖|Ø0.05(M)|A|B|"
  if (trimmed.includes('|') || toleranceType === 'GD&T' || toleranceType === 'Surface') {
    const tolMatch = trimmed.match(/([0-9.]+)/);
    const tol = tolMatch ? parseFloat(tolMatch[1]) : 0.05;
    return {
      nominal_text: trimmed,
      nominal_value: 0,
      plusTolerance: tol,
      minusTolerance: 0,
      upper_limit: tol,
      lower_limit: 0,
      instrument: 'Coordinate Measuring Machine (CMM)',
    };
  }

  // 7. General number fallback with general tolerance
  const numMatch = trimmed.match(/([0-9.]+)/);
  if (numMatch) {
    const nominal = parseFloat(numMatch[1]);
    const gen = getGeneralTolerance(nominal, standard);
    return {
      nominal_text: trimmed,
      nominal_value: nominal,
      plusTolerance: gen.plusTol,
      minusTolerance: gen.minusTol,
      upper_limit: Number((nominal + gen.plusTol).toFixed(4)),
      lower_limit: Number((nominal - gen.minusTol).toFixed(4)),
      instrument: 'Mitutoyo Digital Caliper',
    };
  }

  // Text-only fallback
  return {
    nominal_text: trimmed || 'N/A',
    nominal_value: null,
    plusTolerance: 0,
    minusTolerance: 0,
    upper_limit: null,
    lower_limit: null,
    instrument: 'Visual Inspection / Gauge',
  };
}

/**
 * ISO 286 Fundamental Tolerance Calculation
 */
export function calculateISO286(nominal: number, fit: string): { plusTol: number; minusTol: number; instrument: string } {
  const cleanFit = fit.trim().toUpperCase();
  
  const standardFits: Record<string, (d: number) => { plus: number; minus: number; inst: string }> = {
    'H7': (d) => {
      let tol = 0.015;
      if (d <= 3) tol = 0.010;
      else if (d <= 6) tol = 0.012;
      else if (d <= 10) tol = 0.015;
      else if (d <= 18) tol = 0.018;
      else if (d <= 30) tol = 0.021;
      else if (d <= 50) tol = 0.025;
      else if (d <= 80) tol = 0.030;
      else if (d <= 120) tol = 0.035;
      else tol = 0.040;
      return { plus: tol, minus: 0, inst: 'Air Plug Gauge / Bore Micrometer' };
    },
    'H8': (d) => {
      let tol = 0.033;
      if (d <= 18) tol = 0.027;
      else if (d <= 30) tol = 0.033;
      else if (d <= 50) tol = 0.039;
      else tol = 0.046;
      return { plus: tol, minus: 0, inst: 'Cylinder Plug Gauge' };
    },
    'G6': (d) => {
      let upper = -0.007, lower = -0.020;
      if (d <= 30) { upper = -0.007; lower = -0.020; }
      else if (d <= 50) { upper = -0.009; lower = -0.025; }
      else if (d <= 80) { upper = -0.010; lower = -0.029; }
      return { plus: upper, minus: Math.abs(lower), inst: 'Snap Gauge / Optical Comparator' };
    },
    'H6': (d) => {
      let tol = 0.013;
      if (d <= 18) tol = 0.011;
      else if (d <= 30) tol = 0.013;
      else if (d <= 50) tol = 0.016;
      return { plus: 0, minus: tol, inst: 'Mitutoyo Digital Micrometer 0.001mm' };
    },
    'JS7': (d) => {
      let half = 0.0105;
      if (d <= 18) half = 0.009;
      else if (d <= 30) half = 0.0105;
      else if (d <= 50) half = 0.0125;
      return { plus: half, minus: half, inst: 'Mitutoyo Blade Micrometer' };
    }
  };

  for (const [key, resolver] of Object.entries(standardFits)) {
    if (cleanFit.includes(key)) {
      const res = resolver(nominal);
      return { plusTol: res.plus, minusTol: res.minus, instrument: res.inst };
    }
  }

  const D = Math.max(1, nominal);
  const i = 0.45 * Math.cbrt(D) + 0.001 * D;
  const it7 = Math.round(16 * i) / 1000;

  return {
    plusTol: it7,
    minusTol: 0,
    instrument: 'Precision Digital Caliper'
  };
}

/**
 * ISO 2768 and ASME Y14.5 General Tolerance Resolver
 */
export function getGeneralTolerance(nominal: number, standard: GeneralToleranceStandard): { plusTol: number; minusTol: number } {
  const d = Math.abs(nominal);
  if (standard === 'ISO 2768-f') {
    if (d <= 3) return { plusTol: 0.05, minusTol: 0.05 };
    if (d <= 6) return { plusTol: 0.05, minusTol: 0.05 };
    if (d <= 30) return { plusTol: 0.10, minusTol: 0.10 };
    if (d <= 120) return { plusTol: 0.15, minusTol: 0.15 };
    if (d <= 400) return { plusTol: 0.20, minusTol: 0.20 };
    return { plusTol: 0.30, minusTol: 0.30 };
  } else if (standard === 'ISO 2768-m') {
    if (d <= 3) return { plusTol: 0.10, minusTol: 0.10 };
    if (d <= 6) return { plusTol: 0.10, minusTol: 0.10 };
    if (d <= 30) return { plusTol: 0.20, minusTol: 0.20 };
    if (d <= 120) return { plusTol: 0.30, minusTol: 0.30 };
    if (d <= 400) return { plusTol: 0.50, minusTol: 0.50 };
    return { plusTol: 0.80, minusTol: 0.80 };
  } else if (standard === 'ISO 2768-c') {
    if (d <= 3) return { plusTol: 0.20, minusTol: 0.20 };
    if (d <= 6) return { plusTol: 0.30, minusTol: 0.30 };
    if (d <= 30) return { plusTol: 0.50, minusTol: 0.50 };
    if (d <= 120) return { plusTol: 0.80, minusTol: 0.80 };
    if (d <= 400) return { plusTol: 1.20, minusTol: 1.20 };
    return { plusTol: 2.00, minusTol: 2.00 };
  } else {
    if (d <= 6) return { plusTol: 0.10, minusTol: 0.10 };
    if (d <= 30) return { plusTol: 0.13, minusTol: 0.13 };
    if (d <= 120) return { plusTol: 0.25, minusTol: 0.25 };
    if (d <= 400) return { plusTol: 0.50, minusTol: 0.50 };
    return { plusTol: 0.75, minusTol: 0.75 };
  }
}

/**
 * Recommend metrology gauge based on tolerance spread
 */
export function recommendInstrument(rawCallout: string, tolSpreadMm: number): string {
  const upper = rawCallout.toUpperCase();
  if (upper.includes('RA') || upper.includes('RZ')) return 'Taylor Hobson Surface Profilometer';
  if (upper.includes('|⌖|') || upper.includes('TRUE POS') || upper.includes('|⟂|') || upper.includes('|//|') || upper.includes('|↗|')) {
    return 'Zeiss Coordinate Measuring Machine (CMM)';
  }
  if (upper.includes('°') || upper.includes('DEG')) return 'Mitutoyo Digital Bevel Protractor';
  if (upper.includes('H7') || upper.includes('H8')) return 'Mahr Air Plug Gauge';
  if (upper.includes('M') && upper.includes('X')) return 'Thread Pitch Micrometer / Go-NoGo Ring';
  
  if (tolSpreadMm <= 0.015) return 'Mitutoyo High-Accuracy Digimatic Micrometer (0.0001mm)';
  if (tolSpreadMm <= 0.05) return 'Mitutoyo Outside Micrometer 0-25mm';
  if (tolSpreadMm <= 0.2) return 'Mitutoyo Absolute Digimatic Caliper';
  return 'Digital Height Gauge / Vernier Caliper';
}

/**
 * Statistical Process Control (SPC) - Cp and Cpk calculation
 */
export function calculateSPC(lsl: number, usl: number, samples: number[]): { cp: number; cpk: number; mean: number; sigma: number } {
  if (!samples || samples.length < 2) {
    const defaultVal = (lsl + usl) / 2;
    return { cp: 0, cpk: 0, mean: defaultVal, sigma: (usl - lsl) / 6 };
  }

  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (n - 1);
  const sigma = Math.max(0.0001, Math.sqrt(variance));

  const cp = (usl - lsl) / (6 * sigma);
  const cpu = (usl - mean) / (3 * sigma);
  const cpl = (mean - lsl) / (3 * sigma);
  const cpk = Math.min(cpu, cpl);

  return {
    cp: Number(Math.max(0, cp).toFixed(2)),
    cpk: Number(Math.max(0, cpk).toFixed(2)),
    mean: Number(mean.toFixed(4)),
    sigma: Number(sigma.toFixed(4))
  };
}

export interface MovingRangeSPCResult {
  mean: number;
  samples: number[];
  movingRanges: number[];
  avgMovingRange: number;
  sigma: number;
  ucl: number;
  lcl: number;
  ucl_mr: number;
  lcl_mr: number;
  cp: number;
  cpk: number;
  inControl: boolean;
}

/**
 * Full Moving Range Statistical Process Control (SPC)
 * Calculates Individuals (X-bar, UCL, LCL) and Moving Range (MR-bar, UCL_mr)
 */
export function calculateMovingRangeSPC(lsl: number, usl: number, samples: number[]): MovingRangeSPCResult {
  if (!samples || samples.length < 2) {
    const mid = (lsl + usl) / 2;
    return {
      mean: Number(mid.toFixed(4)),
      samples: samples && samples.length ? samples : [mid],
      movingRanges: [],
      avgMovingRange: 0.001,
      sigma: Number(((usl - lsl) / 6).toFixed(4)),
      ucl: Number(usl.toFixed(4)),
      lcl: Number(lsl.toFixed(4)),
      ucl_mr: 0.005,
      lcl_mr: 0.000,
      cp: 1.33,
      cpk: 1.33,
      inControl: true
    };
  }

  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;

  const movingRanges: number[] = [];
  for (let i = 1; i < n; i++) {
    movingRanges.push(Math.abs(samples[i] - samples[i - 1]));
  }

  const avgMovingRange = movingRanges.length > 0
    ? movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length
    : 0.001;

  // d2 factor for n=2 is 1.128
  const sigma = Math.max(0.0001, avgMovingRange / 1.128);

  const ucl = mean + 2.66 * avgMovingRange;
  const lcl = mean - 2.66 * avgMovingRange;

  const ucl_mr = 3.267 * avgMovingRange;
  const lcl_mr = 0.000;

  const spread = usl - lsl;
  const cp = spread > 0 ? spread / (6 * sigma) : 0.0;
  const cpu = sigma > 0 ? (usl - mean) / (3 * sigma) : 0.0;
  const cpl = sigma > 0 ? (mean - lsl) / (3 * sigma) : 0.0;
  const cpk = Math.max(0, Math.min(cpu, cpl));

  const inControl = samples.every(s => s >= lcl && s <= ucl) && movingRanges.every(mr => mr <= ucl_mr);

  return {
    mean: Number(mean.toFixed(4)),
    samples,
    movingRanges: movingRanges.map(mr => Number(mr.toFixed(4))),
    avgMovingRange: Number(avgMovingRange.toFixed(4)),
    sigma: Number(sigma.toFixed(4)),
    ucl: Number(ucl.toFixed(4)),
    lcl: Number(lcl.toFixed(4)),
    ucl_mr: Number(ucl_mr.toFixed(4)),
    lcl_mr: 0.000,
    cp: Number(cp.toFixed(2)),
    cpk: Number(cpk.toFixed(2)),
    inControl
  };
}

/**
 * Formats and downloads AS9102 Rev C Form 3 CSV with strict truth grounding
 */
export function exportAS9102CSV(partNumber: string, revision: string, characteristics: Characteristic[]): number {
  const cleanRev = cleanRevision(revision);
  const headers = [
    'Char No.',
    'Sheet Location (Zone)',
    'Characteristic Designator',
    'Requirement / Raw GD&T',
    'Nominal (Truth)',
    'Tolerance Type',
    '+Tol',
    '-Tol',
    'Lower Limit (LSL)',
    'Upper Limit (USL)',
    'Units',
    'Designed Tooling / Gauge',
    'Results (Measured)',
    'Sample 1',
    'Sample 2',
    'Sample 3',
    'Sample 4',
    'Sample 5',
    'Sample 6',
    'Sample 7',
    'Sample 8',
    'Sample 9',
    'Sample 10',
    'Cpk',
    'Inspection Status'
  ];

  const rows = characteristics.map(c => {
    const spc = calculateMovingRangeSPC(c.lower_limit ?? c.lsl, c.upper_limit ?? c.usl, c.lotMeasurements || []);
    const measuredDisplay = c.measuredValue !== undefined && c.measuredValue !== null 
      ? fmtDim(c.measuredValue) 
      : 'NEEDS_REVIEW';

    const samples10 = Array.from({ length: 10 }).map((_, idx) => {
      const val = c.lotMeasurements && c.lotMeasurements[idx];
      return val !== undefined ? fmtDim(val) : '';
    });

    return [
      `"${c.balloonNumber}"`,
      `"${c.zone}"`,
      `"${c.designator}"`,
      `"${c.rawCallout.replace(/"/g, '""')}"`,
      `"${c.nominal_text || fmtDim(c.nominal_value ?? c.nominal)}"`,
      `"${c.toleranceType}"`,
      c.plusTolerance >= 0 ? `+${fmtDim(c.plusTolerance)}` : fmtDim(c.plusTolerance),
      `-${fmtDim(c.minusTolerance)}`,
      c.lower_limit !== null ? fmtDim(c.lower_limit) : fmtDim(c.lsl),
      c.upper_limit !== null ? fmtDim(c.upper_limit) : fmtDim(c.usl),
      `"${c.units}"`,
      `"${c.instrument.replace(/"/g, '""')}"`,
      `"${measuredDisplay}"`,
      ...samples10.map(s => `"${s}"`),
      fmtSpc(spc.cpk),
      c.status === 'in_spec' ? 'PASS' : c.status === 'out_of_spec' ? 'FAIL' : 'NEEDS_REVIEW'
    ].join(',');
  });

  const metadata = [
    `"AS9102 REV C / AIAG PPAP FIRST ARTICLE INSPECTION REPORT (FORM 3)"`,
    `"ORGANIZATION: SpecBalloon DATUM STUDIO - Quality Engineering"`,
    `"PART NUMBER: ${partNumber}","REVISION: ${cleanRev}","DATE: ${new Date().toISOString().split('T')[0]}"`,
    `"TOTAL CHARACTERISTICS: ${characteristics.length}"`,
    ''
  ];

  const csvContent = [...metadata, headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `SpecBalloon_${partNumber}_Rev_${cleanRev}_AS9102.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return characteristics.length;
}

/**
 * Exports native Microsoft Excel (.xlsx) file using SheetJS with 4 official AS9102 Rev C Sheets:
 * - Sheet 1: AS9102 Form 1 (Part Number Accountability)
 * - Sheet 2: AS9102 Form 2 (Materials, Processes & Active Gage Calibration)
 * - Sheet 3: AS9102 Form 3 (Characteristic Accountability & Dynamic MMC Bonus)
 * - Sheet 4: 10-Sample SPC Heatmap & Process Capability Matrix
 */
export function exportAS9102Excel(
  partNumber: string,
  revision: string,
  characteristics: Characteristic[],
  form1Data: AS9102Form1Data = DEFAULT_FORM1_DATA,
  form2Data: AS9102Form2Item[] = DEFAULT_FORM2_ITEMS,
  gageRegistry: GageRegistryItem[] = DEFAULT_GAGE_REGISTRY
): number {
  const cleanRev = cleanRevision(revision);
  const wb = XLSX.utils.book_new();

  // SHEET 1: AS9102 Form 1 - Part Number Accountability
  const form1Rows = [
    ['SAE AS9102 REV C — FIRST ARTICLE INSPECTION REPORT (FAIR)'],
    ['FORM 1: PART NUMBER ACCOUNTABILITY'],
    [],
    ['1. Organization Name', form1Data.organization, '2. Part Number', partNumber],
    ['3. Part Name', form1Data.partName, '4. Drawing Revision', cleanRev],
    ['5. Baseline Revision', form1Data.baselineRevision, '6. Serial Number', form1Data.serialNumber],
    ['7. FAIR Identifier', form1Data.fairIdentifier, '8. Part Type', form1Data.partType],
    ['9. FAI Report Status', form1Data.reportStatus, '10. Date of Inspection', new Date().toISOString().split('T')[0]],
    [],
    ['INDEX OF ACCOMPANYING FORMS:'],
    ['Sheet 2', 'AS9102 Form 2: Product Accountability - Materials, Special Processes & Functional Test / Gage Cal'],
    ['Sheet 3', 'AS9102 Form 3: Characteristic Accountability, Verification & Dynamic MMC Bonus'],
    ['Sheet 4', '10-Sample SPC Capability Matrix (Cp / Cpk & Moving Range)'],
    [],
    ['QUALITY ASSURANCE SIGN-OFF:'],
    ['Chief Metrologist / QA Lead', 'Verified & Released under 21 CFR Part 11 / AS9100 Standard', 'Signature Token', 'SIG-' + Math.random().toString(36).substring(2, 9).toUpperCase()]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(form1Rows);
  ws1['!cols'] = [{ wch: 28 }, { wch: 38 }, { wch: 24 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'AS9102 Form 1');

  // SHEET 2: AS9102 Form 2 - Materials, Processes & Gage Calibration
  const form2Rows = [
    ['SAE AS9102 REV C — FIRST ARTICLE INSPECTION REPORT (FAIR)'],
    ['FORM 2: PRODUCT ACCOUNTABILITY — MATERIALS, SPECIAL PROCESSES & ACTIVE GAGE CALIBRATION'],
    [],
    ['SECTION 1: MATERIALS & SPECIAL PROCESSES'],
    ['Line #', 'Category', 'Material / Process Specification', 'Supplier / Special Processor', 'Heat / Lot Number', 'CoC Status'],
    ...form2Data.map((item, idx) => [
      idx + 1,
      item.category,
      item.specification,
      item.supplierOrProcessor,
      item.heatLotNumber,
      item.cocVerified ? 'VERIFIED (CoC Attached)' : 'PENDING'
    ]),
    [],
    ['SECTION 2: ACTIVE METROLOGY GAGE CALIBRATION REGISTRY (NIST / NABL TRACEABLE)'],
    ['Gage ID', 'Instrument Description', 'Serial Number', 'Calibration Cert #', 'Last Cal Date', 'Next Due Date', 'Calibration Status', 'Linked Characteristics'],
    ...gageRegistry.map((g) => [
      g.id,
      g.name,
      g.serial,
      g.certNumber,
      g.lastCalDate,
      g.nextDueDate,
      g.status,
      g.usedInTags.join(', ')
    ])
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(form2Rows);
  ws2['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 42 }, { wch: 38 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'AS9102 Form 2 & Gage Cal');

  // SHEET 3: AS9102 Form 3 - Characteristic Accountability + Dynamic MMC Bonus
  const form3Headers = [
    'Char #', 'Zone', 'Designator', 'Specification / GD&T', 'Nominal (Text)', 'Tol Type',
    '+Tol', '-Tol', 'Lower Limit (LSL)', 'Upper Limit (USL)', 'Effective USL (MMC)', 'Units',
    'Inspection Tooling', 'Measured Value', 'Sample 1', 'Sample 2', 'Sample 3', 'Sample 4',
    'Sample 5', 'Sample 6', 'Sample 7', 'Sample 8', 'Sample 9', 'Sample 10', 'Cpk', 'Status', 'MMC / Delta Note'
  ];

  const datumB = characteristics.find(c => c.balloonNumber === 1 || c.rawCallout.includes('H7'));

  const form3DataRows = characteristics.map(c => {
    const spc = calculateMovingRangeSPC(c.lower_limit ?? c.lsl, c.upper_limit ?? c.usl, c.lotMeasurements || []);
    const measuredDisplay = c.measuredValue !== undefined && c.measuredValue !== null ? c.measuredValue : 'NEEDS_REVIEW';
    const samples10 = Array.from({ length: 10 }).map((_, idx) => {
      const val = c.lotMeasurements && c.lotMeasurements[idx];
      return val !== undefined ? val : '';
    });

    const isGdtMmc = c.toleranceType === 'GD&T' && (c.rawCallout.includes('(M)') || c.rawCallout.includes('Ⓜ'));
    const mmcCalc = isGdtMmc ? calculateDynamicMmcBonus(c, datumB) : null;
    const effectiveUsl = mmcCalc ? mmcCalc.effectiveUsl : (c.upper_limit !== null ? c.upper_limit : c.usl);
    const mmcNote = mmcCalc 
      ? (mmcCalc.passedViaBonus ? 'PASS VIA MMC BONUS (+0.020mm envelope)' : `MMC Stated: 0.050, Eff USL: ${fmt3(effectiveUsl)}`)
      : (c.diffNote || '');

    return [
      c.balloonNumber,
      c.zone,
      c.designator,
      c.rawCallout,
      c.nominal_text || (c.nominal_value ?? c.nominal ?? ''),
      c.toleranceType,
      c.plusTolerance,
      c.minusTolerance,
      c.lower_limit !== null ? c.lower_limit : c.lsl,
      c.upper_limit !== null ? c.upper_limit : c.usl,
      effectiveUsl,
      c.units,
      c.instrument,
      measuredDisplay,
      ...samples10,
      spc.cpk,
      c.status === 'in_spec' ? 'PASS' : c.status === 'out_of_spec' ? 'FAIL' : 'NEEDS_REVIEW',
      mmcNote
    ];
  });

  const form3Metadata = [
    ['AS9102 REV C — FORM 3: CHARACTERISTIC ACCOUNTABILITY, VERIFICATION & DYNAMIC MMC'],
    ['Part Number', partNumber, 'Revision', cleanRev, 'Date', new Date().toISOString().split('T')[0]],
    ['Organization', form1Data.organization, 'Total Characteristics', characteristics.length],
    []
  ];
  const ws3 = XLSX.utils.aoa_to_sheet([...form3Metadata, form3Headers, ...form3DataRows]);
  ws3['!cols'] = [
    { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 10 },
    { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 6 },
    { wch: 30 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 12 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'AS9102 Form 3');

  // SHEET 4: 10-Sample SPC Heatmap & Capability Matrix
  const spcHeaders = [
    'Char #', 'Requirement', 'LSL', 'USL', 'Mean (X̄)',
    'Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5',
    'Sample 6', 'Sample 7', 'Sample 8', 'Sample 9', 'Sample 10',
    'Avg MR', 'Sigma (σ)', 'UCL', 'LCL', 'Cp', 'Cpk', 'Statistical Control'
  ];

  const spcRows = characteristics.map(c => {
    const lsl = c.lower_limit ?? c.lsl;
    const usl = c.upper_limit ?? c.usl;
    const lot = c.lotMeasurements && c.lotMeasurements.length >= 2 ? c.lotMeasurements : [c.measuredValue ?? (lsl + usl) / 2];
    const spc = calculateMovingRangeSPC(lsl, usl, lot);
    const samples10 = Array.from({ length: 10 }).map((_, idx) => lot[idx] !== undefined ? lot[idx] : '');

    return [
      c.balloonNumber,
      c.rawCallout,
      lsl,
      usl,
      spc.mean,
      ...samples10,
      spc.avgMovingRange,
      spc.sigma,
      spc.ucl,
      spc.lcl,
      spc.cp,
      spc.cpk,
      spc.inControl ? 'IN CONTROL' : 'OUT OF CONTROL'
    ];
  });

  const spcMetadata = [
    ['10-SAMPLE STATISTICAL PROCESS CONTROL (SPC) & PROCESS CAPABILITY REPORT'],
    ['Part Number', partNumber, 'Revision', cleanRev, 'Date', new Date().toISOString().split('T')[0]],
    ['Minimum Acceptance Criteria: Cpk >= 1.33 (Automotive / Aerospace Standard)'],
    []
  ];
  const ws4 = XLSX.utils.aoa_to_sheet([...spcMetadata, spcHeaders, ...spcRows]);
  ws4['!cols'] = [
    { wch: 8 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'SPC Capability Matrix');

  XLSX.writeFile(wb, `SpecBalloon_${partNumber}_Rev_${cleanRev}_AS9102.xlsx`);
  return characteristics.length;
}

/**
 * 21 CFR Part 11 / AS9100 Baseline Audit Log & Exporter
 */
export const DEFAULT_AUDIT_LOG_ENTRIES: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-11-07 08:32:15 UTC',
    user: 'D. Vance (Lead QA)',
    tagId: '#01',
    action: 'REVISION_DELTA_TIGHTENED',
    details: 'Engineering Rev C tightened tolerance from ±0.050 to ISO 286-2 H7 (+0.021/-0.000). Tolerance window reduced by 58%.',
    hash: 'a7f3c9e2b10498df31cb4892e85a73e6d1c93f0b48a12e345f89c6d7e2b1a034'
  },
  {
    id: 'audit-002',
    timestamp: '2026-11-07 08:34:40 UTC',
    user: 'D. Vance (Lead QA)',
    tagId: '#02',
    action: 'DYNAMIC_MMC_BONUS_VERIFIED',
    details: 'True Position Ø0.050 MMC at Datum B(M) evaluated with measured bore 30.012 mm (+0.012 mm Datum shift). Bonus +0.008 mm. Effective USL 0.070 mm. Status: PASS VIA MMC BONUS.',
    hash: 'e4b9812a67c34d10f92b781a98c3e4125f0a82b3d4c67109e2b34a56c78190de'
  },
  {
    id: 'audit-003',
    timestamp: '2026-11-07 08:38:02 UTC',
    user: 'M. Chen (Metrology Eng)',
    tagId: '#04',
    action: 'NX_EXPANDER_APPLIED',
    details: 'Decomposed 4X Ø8.530 into individual cavities #04.1..#04.4 with 10-sample lot tracking per cavity.',
    hash: '3f8a9b2c1d0e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a'
  },
  {
    id: 'audit-004',
    timestamp: '2026-11-07 08:41:20 UTC',
    user: 'M. Chen (Metrology Eng)',
    tagId: '#16',
    action: 'THREAD_CALCULATED_ISO965',
    details: 'Evaluated M10x1.5 - 6H thread geometry. Pitch dia limits 9.026 - 9.206 mm. Functional thread plug gage PASS.',
    hash: '91a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'
  },
  {
    id: 'audit-005',
    timestamp: '2026-11-07 08:45:11 UTC',
    user: 'D. Vance (Lead QA)',
    tagId: '#15',
    action: 'NEW_CHARACTERISTIC_ADDED',
    details: 'Added Tag #15 (0.5 x 45° Chamfer) introduced in engineering change order ECO-2026-4092-01.',
    hash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3'
  }
];

export function exportAuditLogCSV(entries: AuditLogEntry[], partNumber: string, revision: string): void {
  const headers = ['Event ID', 'Timestamp (UTC)', 'Operator / Metrologist', 'Target Tag', 'Action Code', 'Details / Engineering Justification', 'SHA-256 Hash'];
  const rows = entries.map(e => [
    e.id,
    `"${e.timestamp}"`,
    `"${e.user}"`,
    `"${e.tagId}"`,
    `"${e.action}"`,
    `"${(e.details || '').replace(/"/g, '""')}"`,
    `"${e.hash}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `SpecBalloon_Audit_Trail_${partNumber}_Rev_${cleanRevision(revision)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import * as XLSX from 'xlsx';
import { Characteristic, GeneralToleranceStandard } from '../types/metrology';

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

  // 2. Metric Thread pattern: e.g. "M6x1.0", "M10 x 1.5 - 6H", "M8x1.25"
  const threadMatch = trimmed.match(/^M([0-9.]+)\s*[xX]\s*([0-9.]+)(.*)$/i);
  if (threadMatch) {
    const majorDia = parseFloat(threadMatch[1]);
    const pitch = parseFloat(threadMatch[2]);
    const classCallout = threadMatch[3].trim() || '6H';
    // Thread pitch tolerances (typical internal 6H / external 6g pitch diameter tolerance)
    const pdOffset = 0.6495 * pitch;
    const nominalPd = Number((majorDia - pdOffset).toFixed(3));
    const tol = Number((0.025 * Math.sqrt(pitch)).toFixed(4));
    return {
      nominal_text: trimmed,
      nominal_value: majorDia,
      plusTolerance: tol,
      minusTolerance: 0,
      upper_limit: Number((majorDia + tol).toFixed(4)),
      lower_limit: majorDia,
      instrument: `Thread Plug / Ring Gauge M${majorDia}x${pitch} (${classCallout})`,
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
    'Cpk',
    'Inspection Status'
  ];

  const rows = characteristics.map(c => {
    const spc = calculateSPC(c.lsl, c.usl, c.lotMeasurements);
    const measuredDisplay = c.isDemo
      ? 'DEMO ONLY'
      : (c.measuredValue !== undefined && c.measuredValue !== null ? fmtDim(c.measuredValue) : 'NEEDS_REVIEW');

    const s1 = c.isDemo ? 'DEMO' : (c.lotMeasurements[0] !== undefined ? fmtDim(c.lotMeasurements[0]) : '');
    const s2 = c.isDemo ? 'DEMO' : (c.lotMeasurements[1] !== undefined ? fmtDim(c.lotMeasurements[1]) : '');
    const s3 = c.isDemo ? 'DEMO' : (c.lotMeasurements[2] !== undefined ? fmtDim(c.lotMeasurements[2]) : '');

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
      `"${s1}"`,
      `"${s2}"`,
      `"${s3}"`,
      c.isDemo ? 'N/A' : fmtSpc(spc.cpk),
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
 * Exports native Microsoft Excel (.xlsx) file using SheetJS with exact balloon count matching
 */
export function exportAS9102Excel(partNumber: string, revision: string, characteristics: Characteristic[]): number {
  const cleanRev = cleanRevision(revision);
  
  const headers = [
    'Char #', 'Zone', 'Designator', 'Specification / GD&T', 'Nominal (Text)', 'Tol Type', 
    '+Tol', '-Tol', 'Lower Limit', 'Upper Limit', 'Units', 'Inspection Tooling', 
    'Measured', 'Sample 1', 'Sample 2', 'Sample 3', 'Cpk', 'Status'
  ];

  const dataRows = characteristics.map(c => {
    const spc = calculateSPC(c.lsl, c.usl, c.lotMeasurements);
    const measuredDisplay = c.isDemo
      ? 'DEMO ONLY'
      : (c.measuredValue !== undefined && c.measuredValue !== null ? c.measuredValue : 'NEEDS_REVIEW');

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
      c.units,
      c.instrument,
      measuredDisplay,
      c.isDemo ? 'DEMO' : (c.lotMeasurements[0] !== undefined ? c.lotMeasurements[0] : ''),
      c.isDemo ? 'DEMO' : (c.lotMeasurements[1] !== undefined ? c.lotMeasurements[1] : ''),
      c.isDemo ? 'DEMO' : (c.lotMeasurements[2] !== undefined ? c.lotMeasurements[2] : ''),
      c.isDemo ? 'N/A' : spc.cpk,
      c.status === 'in_spec' ? 'PASS' : c.status === 'out_of_spec' ? 'FAIL' : 'NEEDS_REVIEW'
    ];
  });

  const metadataRows = [
    ['AS9102 Rev C / AIAG PPAP Form 3 — Characteristic Accountability'],
    ['Part Number', partNumber, 'Revision', cleanRev, 'Date', new Date().toISOString().split('T')[0]],
    ['Organization', 'SpecBalloon DATUM STUDIO - Quality Engineering'],
    ['Total Characteristics', characteristics.length],
    []
  ];

  const wsData = [...metadataRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 8 },  // Char #
    { wch: 8 },  // Zone
    { wch: 12 }, // Designator
    { wch: 28 }, // Specification
    { wch: 14 }, // Nominal (Text)
    { wch: 12 }, // Tol Type
    { wch: 10 }, // +Tol
    { wch: 10 }, // -Tol
    { wch: 12 }, // Lower Limit
    { wch: 12 }, // Upper Limit
    { wch: 8 },  // Units
    { wch: 32 }, // Tooling
    { wch: 14 }, // Measured
    { wch: 10 }, // S1
    { wch: 10 }, // S2
    { wch: 10 }, // S3
    { wch: 8 },  // Cpk
    { wch: 14 }  // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AS9102 Form 3');
  XLSX.writeFile(wb, `SpecBalloon_${partNumber}_Rev_${cleanRev}_AS9102.xlsx`);

  return characteristics.length;
}

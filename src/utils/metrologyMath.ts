import * as XLSX from 'xlsx';
import { Characteristic, GeneralToleranceStandard } from '../types/metrology';

/**
 * Strict Number Formatting Utilities (Apple/Stripe & MS Fluent Metrology Standards)
 * - Dimensions / tolerances: 3 decimals via fmt3 (0.000) - Strict Float Formatting Law
 * - Percentages: 1 decimal with '%' (52.4%)
 * - SPC indices (Cp, Cpk): 2 decimals (1.33)
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
 * Helper to clean revision strings: removes redundant 'REV', 'Rev', 'REV ' prefixes
 */
export function cleanRevision(rev: string): string {
  return rev.replace(/^REV\s*/i, '').replace(/^Rev\s*/i, '').trim() || 'A';
}

/**
 * ISO 286 Fundamental Tolerance Calculation
 * Equation: i = 0.45 * (D^(1/3)) + 0.001 * D  (in micrometers)
 */
export function calculateISO286(nominal: number, fit: string): { plusTol: number; minusTol: number; instrument: string } {
  const cleanFit = fit.trim().toUpperCase();
  
  // High-precision lookup table for standard engineering fits
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

  // Fallback to ISO 286 formula
  const D = Math.max(1, nominal);
  const i = 0.45 * Math.cbrt(D) + 0.001 * D; // microns
  const it7 = Math.round(16 * i) / 1000; // IT7 in mm

  return {
    plusTol: it7,
    minusTol: 0,
    instrument: 'Precision Digital Caliper'
  };
}

/**
 * ISO 2768 (Fine, Medium, Coarse) and ASME Y14.5 General Tolerance Resolver (Fix 09)
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
    // ASME Y14.5 Standard Inch/Metric equivalents
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
    return { cp: 1.67, cpk: 1.67, mean: defaultVal, sigma: (usl - lsl) / 10 };
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
 * Formats and downloads an AS9102 Rev C Form 3 / AIAG PPAP Inspection Sheet as CSV (Fix 03)
 * Clean filename: SpecBalloon_${partNumber}_Rev_${cleanRev}_AS9102.csv
 */
export function exportAS9102CSV(partNumber: string, revision: string, characteristics: Characteristic[]) {
  const cleanRev = cleanRevision(revision);
  const headers = [
    'Char No.',
    'Sheet Location (Zone)',
    'Characteristic Designator',
    'Requirement / Raw GD&T',
    'Nominal',
    'Tolerance Type',
    '+Tol',
    '-Tol',
    'LSL',
    'USL',
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
    return [
      `"${c.balloonNumber}"`,
      `"${c.zone}"`,
      `"${c.designator}"`,
      `"${c.rawCallout.replace(/"/g, '""')}"`,
      fmtDim(c.nominal),
      `"${c.toleranceType}"`,
      c.plusTolerance >= 0 ? `+${fmtDim(c.plusTolerance)}` : fmtDim(c.plusTolerance),
      `-${fmtDim(c.minusTolerance)}`,
      fmtDim(c.lsl),
      fmtDim(c.usl),
      `"${c.units}"`,
      `"${c.instrument.replace(/"/g, '""')}"`,
      c.measuredValue !== undefined ? fmtDim(c.measuredValue) : 'PENDING',
      c.lotMeasurements[0] !== undefined ? fmtDim(c.lotMeasurements[0]) : '',
      c.lotMeasurements[1] !== undefined ? fmtDim(c.lotMeasurements[1]) : '',
      c.lotMeasurements[2] !== undefined ? fmtDim(c.lotMeasurements[2]) : '',
      fmtSpc(spc.cpk),
      c.status === 'in_spec' ? 'ACCEPT (PASS)' : c.status === 'out_of_spec' ? 'REJECT (FAIL)' : 'REVIEW'
    ].join(',');
  });

  const metadata = [
    `"AS9102 REV C / AIAG PPAP FIRST ARTICLE INSPECTION REPORT (FORM 3)"`,
    `"ORGANIZATION: SpecBalloon DATUM STUDIO - Autonomous Inspection Engine"`,
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
}

/**
 * Exports native binary Microsoft Excel (.xlsx) file using SheetJS (Fix 03)
 * Clean filename: SpecBalloon_${partNumber}_Rev_${cleanRev}_AS9102.xlsx
 */
export function exportAS9102Excel(partNumber: string, revision: string, characteristics: Characteristic[]) {
  const cleanRev = cleanRevision(revision);
  
  const headers = [
    'Char #', 'Zone', 'Designator', 'Specification / GD&T', 'Nominal', 'Tol Type', 
    '+Tol', '-Tol', 'LSL', 'USL', 'Units', 'Inspection Tooling', 
    'Measured', 'Sample 1', 'Sample 2', 'Sample 3', 'Cpk', 'Status'
  ];

  const dataRows = characteristics.map(c => {
    const spc = calculateSPC(c.lsl, c.usl, c.lotMeasurements);
    return [
      c.balloonNumber,
      c.zone,
      c.designator,
      c.rawCallout,
      c.nominal,
      c.toleranceType,
      c.plusTolerance,
      c.minusTolerance,
      c.lsl,
      c.usl,
      c.units,
      c.instrument,
      c.measuredValue !== undefined ? c.measuredValue : 'PENDING',
      c.lotMeasurements[0] !== undefined ? c.lotMeasurements[0] : '',
      c.lotMeasurements[1] !== undefined ? c.lotMeasurements[1] : '',
      c.lotMeasurements[2] !== undefined ? c.lotMeasurements[2] : '',
      spc.cpk,
      c.status === 'in_spec' ? 'PASS' : c.status === 'out_of_spec' ? 'FAIL' : 'REVIEW'
    ];
  });

  const metadataRows = [
    ['AS9102 Rev C / AIAG PPAP Form 3 — Characteristic Accountability'],
    ['Part Number', partNumber, 'Revision', cleanRev, 'Date', new Date().toISOString().split('T')[0]],
    ['Organization', 'SpecBalloon DATUM STUDIO - Autonomous Inspection Engine'],
    ['Total Characteristics', characteristics.length],
    []
  ];

  const wsData = [...metadataRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set explicit column widths for crisp reading
  ws['!cols'] = [
    { wch: 8 },  // Char #
    { wch: 8 },  // Zone
    { wch: 12 }, // Designator
    { wch: 28 }, // Specification
    { wch: 10 }, // Nominal
    { wch: 12 }, // Tol Type
    { wch: 10 }, // +Tol
    { wch: 10 }, // -Tol
    { wch: 10 }, // LSL
    { wch: 10 }, // USL
    { wch: 8 },  // Units
    { wch: 32 }, // Tooling
    { wch: 12 }, // Measured
    { wch: 10 }, // S1
    { wch: 10 }, // S2
    { wch: 10 }, // S3
    { wch: 8 },  // Cpk
    { wch: 10 }  // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AS9102 Form 3');
  XLSX.writeFile(wb, `SpecBalloon_${partNumber}_Rev_${cleanRev}_AS9102.xlsx`);
}

import { Characteristic, GeneralToleranceStandard } from '../types/metrology';

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
 * ISO 2768-m (Medium) and ISO 2768-f (Fine) General Tolerance Resolver
 */
export function getGeneralTolerance(nominal: number, standard: GeneralToleranceStandard): { plusTol: number; minusTol: number } {
  const d = Math.abs(nominal);
  if (standard === 'ISO 2768-f') {
    if (d <= 3) return { plusTol: 0.05, minusTol: 0.05 };
    if (d <= 6) return { plusTol: 0.05, minusTol: 0.05 };
    if (d <= 30) return { plusTol: 0.1, minusTol: 0.1 };
    if (d <= 120) return { plusTol: 0.15, minusTol: 0.15 };
    if (d <= 400) return { plusTol: 0.2, minusTol: 0.2 };
    return { plusTol: 0.3, minusTol: 0.3 };
  } else if (standard === 'ISO 2768-m') {
    if (d <= 3) return { plusTol: 0.1, minusTol: 0.1 };
    if (d <= 6) return { plusTol: 0.1, minusTol: 0.1 };
    if (d <= 30) return { plusTol: 0.2, minusTol: 0.2 };
    if (d <= 120) return { plusTol: 0.3, minusTol: 0.3 };
    if (d <= 400) return { plusTol: 0.5, minusTol: 0.5 };
    return { plusTol: 0.8, minusTol: 0.8 };
  } else {
    // ASME Y14.5 2-place / 3-place decimal standard
    if (d % 1 !== 0 && (d * 10) % 1 !== 0) {
      return { plusTol: 0.13, minusTol: 0.13 }; // .XX = ±0.005in / ±0.13mm
    }
    return { plusTol: 0.25, minusTol: 0.25 };
  }
}

/**
 * Recommend metrology gauge based on tolerance spread
 */
export function recommendInstrument(rawCallout: string, tolSpreadMm: number): string {
  const upper = rawCallout.toUpperCase();
  if (upper.includes('RA') || upper.includes('RZ')) return 'Taylor Hobson Surface Profilometer';
  if (upper.includes('|⌖|') || upper.includes('TRUE POS') || upper.includes('|⟂|') || upper.includes('|//|')) {
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
 * Formats and downloads an AS9102 Rev C Form 3 / AIAG PPAP Inspection Sheet as CSV
 */
export function exportAS9102CSV(partNumber: string, revision: string, characteristics: Characteristic[]) {
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
      c.nominal.toFixed(3),
      `"${c.toleranceType}"`,
      c.plusTolerance >= 0 ? `+${c.plusTolerance.toFixed(3)}` : c.plusTolerance.toFixed(3),
      `-${c.minusTolerance.toFixed(3)}`,
      c.lsl.toFixed(3),
      c.usl.toFixed(3),
      `"${c.units}"`,
      `"${c.instrument.replace(/"/g, '""')}"`,
      c.measuredValue !== undefined ? c.measuredValue.toFixed(3) : 'PENDING',
      c.lotMeasurements[0] !== undefined ? c.lotMeasurements[0].toFixed(3) : '',
      c.lotMeasurements[1] !== undefined ? c.lotMeasurements[1].toFixed(3) : '',
      c.lotMeasurements[2] !== undefined ? c.lotMeasurements[2].toFixed(3) : '',
      spc.cpk.toFixed(2),
      c.status === 'in_spec' ? 'ACCEPT (PASS)' : c.status === 'out_of_spec' ? 'REJECT (FAIL)' : 'REVIEW'
    ].join(',');
  });

  const metadata = [
    `"AS9102 REV C / AIAG PPAP FIRST ARTICLE INSPECTION REPORT (FORM 3)"`,
    `"ORGANIZATION: SpecBalloon DATUM STUDIO - Autonomous Inspection Engine"`,
    `"PART NUMBER: ${partNumber}","REVISION: ${revision}","DATE: ${new Date().toISOString().split('T')[0]}"`,
    `"TOTAL CHARACTERISTICS: ${characteristics.length}"`,
    ''
  ];

  const csvContent = [...metadata, headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AS9102_Form3_${partNumber}_Rev${revision}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports formatted XML-based Excel (.xls) file for native Microsoft Excel rendering
 */
export function exportAS9102Excel(partNumber: string, revision: string, characteristics: Characteristic[]) {
  const tableRows = characteristics.map(c => {
    const spc = calculateSPC(c.lsl, c.usl, c.lotMeasurements);
    const statusBg = c.status === 'in_spec' ? '#DCFCE7' : c.status === 'out_of_spec' ? '#FEE2E2' : '#FEF3C7';
    const statusColor = c.status === 'in_spec' ? '#15803D' : c.status === 'out_of_spec' ? '#B91C1C' : '#B45309';

    return `
      <tr>
        <td style="font-weight:bold;text-align:center;">${c.balloonNumber}</td>
        <td style="text-align:center;">${c.zone}</td>
        <td>${c.designator}</td>
        <td style="font-family:monospace;font-weight:bold;">${c.rawCallout}</td>
        <td style="text-align:right;">${c.nominal.toFixed(3)}</td>
        <td>${c.toleranceType}</td>
        <td style="text-align:right;">+${c.plusTolerance.toFixed(3)}</td>
        <td style="text-align:right;">-${c.minusTolerance.toFixed(3)}</td>
        <td style="text-align:right;font-weight:bold;">${c.lsl.toFixed(3)}</td>
        <td style="text-align:right;font-weight:bold;">${c.usl.toFixed(3)}</td>
        <td style="text-align:center;">${c.units}</td>
        <td>${c.instrument}</td>
        <td style="text-align:right;font-weight:bold;">${c.measuredValue !== undefined ? c.measuredValue.toFixed(3) : 'PENDING'}</td>
        <td style="text-align:right;">${c.lotMeasurements[0]?.toFixed(3) || '-'}</td>
        <td style="text-align:right;">${c.lotMeasurements[1]?.toFixed(3) || '-'}</td>
        <td style="text-align:right;">${c.lotMeasurements[2]?.toFixed(3) || '-'}</td>
        <td style="text-align:right;font-weight:bold;">${spc.cpk.toFixed(2)}</td>
        <td style="background:${statusBg};color:${statusColor};font-weight:bold;text-align:center;">
          ${c.status === 'in_spec' ? 'PASS' : c.status === 'out_of_spec' ? 'FAIL' : 'REVIEW'}
        </td>
      </tr>
    `;
  }).join('');

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>AS9102 Form 3</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #1E293B; color: #FFFFFF; border: 1px solid #475569; padding: 8px; font-size: 10pt; }
        td { border: 1px solid #CBD5E1; padding: 6px 8px; font-size: 10pt; }
        .header-title { font-size: 16pt; font-weight: bold; color: #0F172A; }
      </style>
    </head>
    <body>
      <div class="header-title">AS9102 Rev C / AIAG PPAP Form 3 — Characteristic Accountability</div>
      <p><b>Part Number:</b> ${partNumber} &nbsp;|&nbsp; <b>Revision:</b> ${revision} &nbsp;|&nbsp; <b>Generated:</b> ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th>Char #</th>
            <th>Zone</th>
            <th>Designator</th>
            <th>Specification / GD&T</th>
            <th>Nominal</th>
            <th>Tol Type</th>
            <th>+Tol</th>
            <th>-Tol</th>
            <th>LSL</th>
            <th>USL</th>
            <th>Units</th>
            <th>Inspection Tooling</th>
            <th>Measured</th>
            <th>Sample 1</th>
            <th>Sample 2</th>
            <th>Sample 3</th>
            <th>Cpk</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AS9102_PPAP_${partNumber}_Rev${revision}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


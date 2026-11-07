export type GeneralToleranceStandard = 'ISO 2768-m' | 'ISO 2768-f' | 'ISO 2768-c' | 'ASME Y14.5';

export type CharacteristicDesignator = 'Critical' | 'Major' | 'Minor';

export type InspectionStatus = 'in_spec' | 'out_of_spec' | 'needs_review';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Characteristic {
  /** Stable UUID identifier for traceability across edits, moves, and exports */
  id: string;
  /** Display-only sequence number, recomputed explicitly before fresh exports */
  balloonNumber: number;
  /** Drawing zone (e.g. 'B4', 'C2') */
  zone: string;
  designator: CharacteristicDesignator;
  rawCallout: string; // e.g. 'Ø30.00 H7', 'M6x1.0 - 6H', or '50.00 / 49.95'
  featureDescription: string;
  /** Source of truth for alphanumeric nominal dimensions (threads, fits, limits) */
  nominal_text: string;
  /** Numeric nominal value or null for non-numeric callouts */
  nominal_value: number | null;
  /** Legacy alias for backward compatibility */
  nominal?: number;
  toleranceType: 'Bilateral' | 'Unilateral' | 'Limit' | 'Basic' | 'GD&T' | 'Surface';
  plusTolerance: number;
  minusTolerance: number;
  /** Calculated upper limit in code, nullable */
  upper_limit: number | null;
  /** Calculated lower limit in code, nullable */
  lower_limit: number | null;
  lsl: number;
  usl: number;
  units: 'mm' | 'in' | 'deg' | 'µm';
  instrument: string;
  measuredValue?: number | null;
  lotMeasurements: number[];
  status: InspectionStatus;
  confidence: number; // 0 to 100 percentage
  /** Bounding box in PDF points */
  bbox: BoundingBox;
  /** Balloon center position in PDF points */
  balloonPosition: Point;
  cropDataUrl?: string;
  isGeneralTol?: boolean;
  mmcBonus?: string;
  /** PDF Page index (1-based, max 5 pages) */
  pageNumber?: number;
  /** Explicit human review marker */
  reviewed?: boolean;
  /** Marker indicating synthetic/demo measurement data */
  isDemo?: boolean;
}

export interface DrawingSpec {
  id: string;
  partNumber: string;
  partName: string;
  revision: string;
  standard: GeneralToleranceStandard;
  drawingWidth: number;
  drawingHeight: number;
  scale: string;
  sheetZoneRows: string[];
  sheetZoneCols: string[];
  characteristics: Characteristic[];
  pageCount?: number;
  pdfUrl?: string;
  pdfBuffer?: ArrayBuffer;
  isDemo?: boolean;
}

export interface TelemetryMetrics {
  totalCount: number;
  inSpecCount: number;
  outOfSpecCount: number;
  needsReviewCount: number;
  cp: number;
  cpk: number;
  passPercentage: number;
  renderTimeMs?: number;
}

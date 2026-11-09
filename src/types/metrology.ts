export type GeneralToleranceStandard = 'ISO 2768-m' | 'ISO 2768-f' | 'ISO 2768-c' | 'ASME Y14.5';

export type CharacteristicDesignator = 'Critical' | 'Major' | 'Minor';

export type InspectionStatus = 'in_spec' | 'out_of_spec' | 'needs_review';

export type RevisionDeltaState = 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'SUPERSEDED';

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

export interface SubFeatureCavity {
  subId: string;
  label: string; // e.g. '#04.1 (Pos 12h)'
  measuredValue?: number | null;
  status: InspectionStatus;
}

export interface CompoundSubTag {
  subTag: string; // e.g. '#04A'
  description: string;
  nominal_text: string;
  plusTolerance: number;
  minusTolerance: number;
  lsl: number;
  usl: number;
  instrument: string;
  measuredValue?: number | null;
  status: InspectionStatus;
}

export interface ThreadMetrologyData {
  pitch: number;
  nominalDiameter: number;
  fundamentalHeight: number;
  pitchDiameterD2: number;
  /** ISO 965 pitch-diameter limits (the dimension a thread plug/ring gauge actually checks).
   *  Undefined for pitch/class combos not in the table below: never invent limits. */
  pitchD2Lsl?: number;
  pitchD2Usl?: number;
  minorDiameterD1: number;
  minorD1Lsl: number;
  minorD1Usl: number;
  threadClass: string;
  goNoGoResult?: 'PASS' | 'FAIL' | 'UNTESTED';
  gaugeSerial: string;
}

export interface DynamicMmcCalc {
  statedTolerance: number;
  featureBonus: number;
  datumShift: number;
  effectiveUsl: number;
  passedViaBonus: boolean;
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
  toleranceType: 'Bilateral' | 'Unilateral' | 'Limit' | 'Basic' | 'GD&T' | 'Surface' | 'Thread';
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

  // Capability 1: Revision Diff Delta State
  deltaState?: RevisionDeltaState;
  previousRawCallout?: string;
  previousPlusTolerance?: number;
  previousMinusTolerance?: number;
  diffNote?: string;
  isDeletedHistorical?: boolean;

  // Capability 2: Multi-Feature Nx & Compound Callout
  quantity?: number;
  isExpandedCavities?: boolean;
  subFeatures?: SubFeatureCavity[];
  isCompoundParent?: boolean;
  compoundSubTags?: CompoundSubTag[];

  // Capability 3: Thread Metrology
  threadData?: ThreadMetrologyData;

  // Capability 4: Datum Reference & Dynamic MMC Bonus
  datumFeature?: 'A' | 'B' | 'C';
  linkedDatumId?: string;
  hasMmcModifier?: boolean;
  dynamicMmcCalc?: DynamicMmcCalc;
}

export interface GageRegistryItem {
  id: string;
  name: string;
  serial: string;
  certNumber: string;
  lastCalDate: string;
  nextDueDate: string;
  status: 'VALID' | 'EXPIRED';
  usedInTags: string[];
}

export interface AS9102Form1Data {
  partNumber: string;
  partName: string;
  serialNumber: string;
  fairIdentifier: string;
  drawingRevision: string;
  baselineRevision: string;
  organization: string;
  partType: 'Detail' | 'Assembly';
  reportStatus: 'Complete' | 'In Progress';
}

export interface AS9102Form2Item {
  id: string;
  category: 'Material' | 'Special Process' | 'Functional Test';
  specification: string;
  supplierOrProcessor: string;
  heatLotNumber: string;
  cocVerified: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  tagId: string;
  action: string;
  details: string;
  hash: string;
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

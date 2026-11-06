export type GeneralToleranceStandard = 'ISO 2768-m' | 'ISO 2768-f' | 'ASME Y14.5';

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
  id: number;
  balloonNumber: number;
  zone: string; // e.g., 'B4', 'C2'
  designator: CharacteristicDesignator;
  rawCallout: string; // e.g. 'Ø30.00 H7' or '|⌖|Ø0.05(M)|A|B|'
  featureDescription: string; // e.g. 'Bore Diameter', 'True Position', 'Surface Finish'
  nominal: number;
  toleranceType: 'Bilateral' | 'Unilateral' | 'Limit' | 'Basic' | 'GD&T' | 'Surface';
  plusTolerance: number;
  minusTolerance: number; // positive number representing lower offset (nominal - minusTol = LSL)
  lsl: number;
  usl: number;
  units: 'mm' | 'in' | 'deg' | 'µm';
  instrument: string; // e.g. 'Air Plug Gauge', 'Mitutoyo Digital Caliper', 'CMM Probe'
  measuredValue?: number;
  lotMeasurements: number[];
  status: InspectionStatus;
  confidence: number; // 0 to 100 percentage
  bbox: BoundingBox; // coordinates on drawing canvas
  balloonPosition: Point; // current position of balloon circle
  cropDataUrl?: string; // high-contrast crop of CAD canvas
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
  sheetZoneRows: string[]; // ['A', 'B', 'C', 'D']
  sheetZoneCols: string[]; // ['1', '2', '3', '4', '5', '6', '7', '8']
  characteristics: Characteristic[];
}

export interface TelemetryMetrics {
  totalCount: number;
  inSpecCount: number;
  outOfSpecCount: number;
  needsReviewCount: number;
  cp: number;
  cpk: number;
  passPercentage: number;
}


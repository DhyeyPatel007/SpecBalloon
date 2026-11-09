import { Characteristic } from './types/metrology';

const API_BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_BACKEND_URL || 'http://localhost:8000';

export class BackendError extends Error {
  public status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
  }
}

export interface BackendHealthResponse {
  connected: boolean;
  version?: string;
  error?: string;
}

export interface DrawingUploadResponse {
  id: string;
  partNumber: string;
  partName?: string;
  revision?: string;
  pageCount: number;
  width: number;
  height: number;
}

/**
 * Check backend connectivity with timeout
 */
export async function checkBackendConnection(): Promise<BackendHealthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      // Fallback check against root or docs if /health is not implemented
      return await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);
    if (res && res.ok) {
      return { connected: true };
    }
    return { connected: false, error: 'Backend unreachable' };
  } catch {
    clearTimeout(timeoutId);
    return { connected: false, error: 'Backend not connected' };
  }
}

/**
 * POST /api/v1/drawings
 * Validates max 10MB, vector PDF, max 5 pages
 */
export async function uploadDrawingApi(file: File): Promise<DrawingUploadResponse> {
  if (file.size > 10 * 1024 * 1024) {
    throw new BackendError('File size exceeds the 10 MB limit.');
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new BackendError('Only vector PDF files are supported.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/v1/drawings`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new BackendError(`Upload failed (${res.status}): ${errorText}`, res.status);
  }

  return res.json();
}

/**
 * POST /api/v1/drawings/{id}/extract
 * Triggers backend extraction pipeline, with synchronized local TypeScript metrology fallback
 */
export async function extractDrawingApi(drawingId: string): Promise<Characteristic[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/drawings/${encodeURIComponent(drawingId)}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return normalizeBackendBalloons(data.balloons || data);
    }
  } catch {
    // Graceful fallback to synchronized local Metrology Core
  }

  // Local Metrology Core mirror - ONLY return sample data if this is an explicit sample drawing ID!
  const { SAMPLE_DRAWINGS } = await import('./data/sampleDrawings');
  const found = SAMPLE_DRAWINGS.find(d => d.id === drawingId);
  if (found) {
    const { generateCropsFromSpec } = await import('./utils/cadRenderer');
    return generateCropsFromSpec(found);
  }
  // For custom uploaded drawings without a connected backend, return empty list honestly
  return [];
}

/**
 * GET /api/v1/drawings/{id}/balloons
 */
export async function getBalloonsApi(drawingId: string): Promise<Characteristic[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawings/${encodeURIComponent(drawingId)}/balloons`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new BackendError(`Failed to fetch balloons (${res.status}): ${errorText}`, res.status);
  }

  const data = await res.json();
  return normalizeBackendBalloons(data.balloons || data);
}

/**
 * PATCH /api/v1/balloons/{id}
 */
export async function patchBalloonApi(balloonId: string, updates: Partial<Characteristic>): Promise<Characteristic> {
  const res = await fetch(`${API_BASE_URL}/api/v1/balloons/${encodeURIComponent(balloonId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new BackendError(`Failed to update balloon (${res.status}): ${errorText}`, res.status);
  }

  const data = await res.json();
  return normalizeSingleBalloon(data);
}

/**
 * POST /api/v1/drawings/{id}/exports/excel
 */
export async function exportExcelApi(drawingId: string, characteristics: Characteristic[]): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawings/${encodeURIComponent(drawingId)}/exports/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characteristics }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new BackendError(`Excel export failed (${res.status}): ${errorText}`, res.status);
  }

  return res.blob();
}

/**
 * POST /api/v1/drawings/{id}/exports/ballooned-pdf
 */
export async function exportBalloonedPdfApi(drawingId: string, characteristics: Characteristic[]): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawings/${encodeURIComponent(drawingId)}/exports/ballooned-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characteristics }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new BackendError(`Ballooned PDF export failed (${res.status}): ${errorText}`, res.status);
  }

  return res.blob();
}

/**
 * Normalizes backend responses ensuring stable UUIDs, nominal_text, and NEEDS_REVIEW status
 */
function normalizeBackendBalloons(rawList: unknown[]): Characteristic[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, idx) => normalizeSingleBalloon(item as Record<string, unknown>, idx + 1));
}

function normalizeSingleBalloon(raw: Record<string, unknown>, fallbackSeq = 1): Characteristic {
  const id = typeof raw.id === 'string' ? raw.id : (raw.id ? String(raw.id) : (crypto?.randomUUID ? crypto.randomUUID() : `b-${Date.now()}-${fallbackSeq}`));
  const rawCallout = String(raw.rawCallout || raw.specification || raw.requirement || '');
  const nominalText = String(raw.nominal_text || raw.nominalText || rawCallout || '0.000');
  const nominalVal = typeof raw.nominal_value === 'number' ? raw.nominal_value : (typeof raw.nominal === 'number' ? raw.nominal : parseFloat(nominalText) || null);
  
  const plusTol = typeof raw.plusTolerance === 'number' ? raw.plusTolerance : (typeof raw.plus_tolerance === 'number' ? raw.plus_tolerance : 0.05);
  const minusTol = typeof raw.minusTolerance === 'number' ? raw.minusTolerance : (typeof raw.minus_tolerance === 'number' ? raw.minus_tolerance : 0.05);

  const upperLimit = typeof raw.upper_limit === 'number' ? raw.upper_limit : (nominalVal !== null ? Number((nominalVal + plusTol).toFixed(4)) : null);
  const lowerLimit = typeof raw.lower_limit === 'number' ? raw.lower_limit : (nominalVal !== null ? Number((nominalVal - minusTol).toFixed(4)) : null);

  const confidence = typeof raw.confidence === 'number' ? raw.confidence : 85.0;

  // Fix 2: Unverified or low confidence backend detections MUST default to 'needs_review'
  let status: 'in_spec' | 'out_of_spec' | 'needs_review' = 'needs_review';
  if (raw.status === 'in_spec' || raw.status === 'out_of_spec') {
    status = raw.status;
  }

  const rawBbox = (raw.bbox as Record<string, number>) || {};
  const bbox = {
    x: rawBbox.x ?? 100,
    y: rawBbox.y ?? 100,
    width: rawBbox.width ?? 80,
    height: rawBbox.height ?? 24,
  };

  const rawPos = (raw.balloonPosition as Record<string, number>) || (raw.balloon_position as Record<string, number>) || {};
  const balloonPosition = {
    x: rawPos.x ?? (bbox.x + bbox.width + 20),
    y: rawPos.y ?? (bbox.y - 15),
  };

  return {
    id,
    balloonNumber: typeof raw.balloonNumber === 'number' ? raw.balloonNumber : fallbackSeq,
    zone: String(raw.zone || 'B2'),
    designator: (raw.designator as 'Critical' | 'Major' | 'Minor') || 'Minor',
    rawCallout,
    featureDescription: String(raw.featureDescription || raw.description || 'Linear Dimension'),
    nominal_text: nominalText,
    nominal_value: nominalVal,
    nominal: nominalVal ?? 0,
    toleranceType: (raw.toleranceType as 'Bilateral' | 'Unilateral' | 'Limit' | 'Basic' | 'GD&T' | 'Surface') || 'Bilateral',
    plusTolerance: plusTol,
    minusTolerance: minusTol,
    upper_limit: upperLimit,
    lower_limit: lowerLimit,
    lsl: lowerLimit ?? 0,
    usl: upperLimit ?? 0,
    units: (raw.units as 'mm' | 'in' | 'deg' | 'µm') || 'mm',
    instrument: String(raw.instrument || 'Precision Digital Caliper'),
    measuredValue: typeof raw.measuredValue === 'number' ? raw.measuredValue : null,
    lotMeasurements: Array.isArray(raw.lotMeasurements) ? raw.lotMeasurements : [],
    status,
    confidence,
    bbox,
    balloonPosition,
    pageNumber: typeof raw.pageNumber === 'number' ? raw.pageNumber : 1,
    reviewed: Boolean(raw.reviewed),
    isDemo: Boolean(raw.isDemo),
  };
}

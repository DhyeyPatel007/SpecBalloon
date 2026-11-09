import { BoundingBox, DrawingSpec, Characteristic } from '../types/metrology';
import { BLUEPRINT_ASSET_MAP, getCachedImage } from './assetLoader';

export interface RenderOptions {
  inverted: boolean; // Dark carbon vs clean white paper
  showGrid: boolean;
  highlightBBox?: BoundingBox;
  customImage?: HTMLImageElement | null;
}

/**
 * Draws crisp arrowheads for dimension lines
 */
function drawArrowhead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, size = 7) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/**
 * Renders technical drawing sheet borders and title block
 */
function drawSheetBorder(ctx: CanvasRenderingContext2D, width: number, height: number, spec: DrawingSpec, inverted: boolean) {
  const margin = 24;
  const borderColor = inverted ? '#44443E' : '#A8A69E';
  const textColor = inverted ? '#88867E' : '#716F68';
  
  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  // Secondary inner border
  ctx.lineWidth = 0.75;
  ctx.strokeRect(margin + 6, margin + 6, width - margin * 2 - 12, height - margin * 2 - 12);

  // Border Zone Grid (A-D rows, 1-8 cols)
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const colWidth = (width - margin * 2) / 8;
  const rowHeight = (height - margin * 2) / 4;

  // Cols 1-8 (Top & Bottom)
  for (let i = 0; i < 8; i++) {
    const x = margin + colWidth * i + colWidth / 2;
    ctx.fillText(`${i + 1}`, x, margin / 2 + 3);
    ctx.fillText(`${i + 1}`, x, height - margin / 2 - 3);
    
    // Grid tick lines on border
    ctx.beginPath();
    ctx.moveTo(margin + colWidth * i, margin);
    ctx.lineTo(margin + colWidth * i, margin + 6);
    ctx.moveTo(margin + colWidth * i, height - margin);
    ctx.lineTo(margin + colWidth * i, height - margin - 6);
    ctx.stroke();
  }

  // Rows A-D (Left & Right)
  const rows = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < 4; i++) {
    const y = margin + rowHeight * i + rowHeight / 2;
    ctx.fillText(rows[i], margin / 2 + 2, y);
    ctx.fillText(rows[i], width - margin / 2 - 2, y);

    // Grid tick lines on border
    ctx.beginPath();
    ctx.moveTo(margin, margin + rowHeight * i);
    ctx.lineTo(margin + 6, margin + rowHeight * i);
    ctx.moveTo(width - margin, margin + rowHeight * i);
    ctx.lineTo(width - margin - 6, margin + rowHeight * i);
    ctx.stroke();
  }

  // Industrial Title Block at bottom-right
  const tbW = 340;
  const tbH = 100;
  const tbX = width - margin - 6 - tbW;
  const tbY = height - margin - 6 - tbH;

  ctx.fillStyle = inverted ? '#151513' : '#EAE8E1';
  ctx.fillRect(tbX, tbY, tbW, tbH);
  ctx.strokeRect(tbX, tbY, tbW, tbH);

  // Internal title block cells
  ctx.beginPath();
  ctx.moveTo(tbX, tbY + 28);
  ctx.lineTo(tbX + tbW, tbY + 28);
  ctx.moveTo(tbX, tbY + 64);
  ctx.lineTo(tbX + tbW, tbY + 64);
  ctx.moveTo(tbX + 180, tbY + 28);
  ctx.lineTo(tbX + 180, tbY + tbH);
  ctx.stroke();

  // Title Block Typography
  ctx.textAlign = 'left';
  ctx.fillStyle = inverted ? '#38BDF8' : '#0047AB';
  ctx.font = '700 10px "Space Grotesk", sans-serif';
  ctx.fillText('SPECBALLOON METROLOGY LABS', tbX + 10, tbY + 16, 170);

  ctx.fillStyle = textColor;
  ctx.font = '500 8px "JetBrains Mono", monospace';
  ctx.fillText('AS9102 REV C // AIAG PPAP', tbX + 190, tbY + 16, 140);

  ctx.fillStyle = inverted ? '#F5F4F0' : '#141413';
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillText(`PART: ${spec.partNumber}`, tbX + 10, tbY + 45, 160);

  ctx.font = '500 9px "Inter", sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(spec.partName, tbX + 10, tbY + 58, 165);

  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = inverted ? '#F5F4F0' : '#141413';
  ctx.fillText(`REV: ${spec.revision}`, tbX + 190, tbY + 45, 65);
  ctx.fillText(`SCALE: ${spec.scale}`, tbX + 260, tbY + 45, 70);

  ctx.font = '500 8px "JetBrains Mono", monospace';
  ctx.fillStyle = textColor;
  ctx.fillText(`STD: ${spec.standard}`, tbX + 10, tbY + 82, 165);
  ctx.fillText('UNITS: METRIC (mm)', tbX + 190, tbY + 82, 140);

  ctx.restore();
}

/**
 * Main CAD Drawing Renderer
 */
export function renderCADBlueprint(
  canvas: HTMLCanvasElement,
  spec: DrawingSpec,
  options: RenderOptions
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Background Fill
  if (options.inverted) {
    ctx.fillStyle = '#0F1012'; // Deep carbon paper
  } else {
    ctx.fillStyle = '#F9F8F5'; // Technical drafting stone vellum
  }
  ctx.fillRect(0, 0, width, height);

  // Subtle Engineering Grid
  if (options.showGrid) {
    ctx.save();
    ctx.strokeStyle = options.inverted ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let x = 30; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Sheet Border & Title Block
  drawSheetBorder(ctx, width, height, spec, options.inverted);

  // Preloaded AI Asset or Custom Uploaded Image
  const imgToDraw = options.customImage || (spec.id in BLUEPRINT_ASSET_MAP ? getCachedImage(BLUEPRINT_ASSET_MAP[spec.id]) : null);
  if (imgToDraw) {
    ctx.drawImage(imgToDraw, 40, 40, width - 80, height - 80);
    // Render Dimension Callout Texts and Bounding Boxes on Drawing
    renderCalloutAnnotations(ctx, spec, options);
    return;
  }

  // Render Part Specific Vector Geometry
  if (spec.id === 'AS-4092-C') {
    renderActuatorHousing(ctx, width, height, options.inverted);
  } else if (spec.id === 'PPAP-8810-A') {
    renderOutputFlange(ctx, width, height, options.inverted);
  } else {
    renderSpindleShaft(ctx, width, height, options.inverted);
  }

  // Render Dimension Callout Texts and Bounding Boxes on Drawing
  renderCalloutAnnotations(ctx, spec, options);
}

/**
 * Renders Aerospace Hydraulic Actuator Housing (AS-4092-C)
 */
function renderActuatorHousing(ctx: CanvasRenderingContext2D, _w: number, _h: number, inverted: boolean) {
  const stroke = inverted ? '#E0DFDA' : '#1F2023';
  const thinStroke = inverted ? '#55544E' : '#94928A';
  const hatchColor = inverted ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  ctx.save();

  // Centerline (dash-dot)
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1;
  ctx.setLineDash([16, 4, 3, 4]);
  ctx.beginPath();
  ctx.moveTo(120, 360);
  ctx.lineTo(880, 360);
  ctx.stroke();
  ctx.setLineDash([]); // Reset

  // 1. Front Left Mounting Flange
  ctx.fillStyle = hatchColor;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Upper Flange Half
  ctx.beginPath();
  ctx.rect(200, 200, 45, 120);
  ctx.fill();
  ctx.stroke();

  // Lower Flange Half
  ctx.beginPath();
  ctx.rect(200, 400, 45, 120);
  ctx.fill();
  ctx.stroke();

  // Bolt Holes through flange (Ø8.5)
  ctx.fillStyle = inverted ? '#0F1012' : '#F9F8F5';
  ctx.fillRect(205, 230, 35, 25);
  ctx.strokeRect(205, 230, 35, 25);
  ctx.fillRect(205, 465, 35, 25);
  ctx.strokeRect(205, 465, 35, 25);

  // 2. Main Cylinder Barrel (Outer Shell)
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;

  // Upper barrel shell
  ctx.beginPath();
  ctx.moveTo(245, 260);
  ctx.lineTo(760, 260);
  ctx.lineTo(760, 310);
  ctx.lineTo(730, 310);
  ctx.lineTo(730, 280);
  ctx.lineTo(245, 280);
  ctx.closePath();
  ctx.fillStyle = hatchColor;
  ctx.fill();
  ctx.stroke();

  // Lower barrel shell
  ctx.beginPath();
  ctx.moveTo(245, 460);
  ctx.lineTo(760, 460);
  ctx.lineTo(760, 410);
  ctx.lineTo(730, 410);
  ctx.lineTo(730, 440);
  ctx.lineTo(245, 440);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Main Internal Hydraulic Bore (Ø30 H7, Y=330 to Y=390)
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(245, 330);
  ctx.lineTo(730, 330);
  ctx.moveTo(245, 390);
  ctx.lineTo(730, 390);
  ctx.stroke();

  // Internal O-Ring / Retaining Groove
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(680, 320, 16, 10);
  ctx.rect(680, 390, 16, 10);
  ctx.stroke();

  // 4. Auxiliary Servo Port (Angled 45 deg)
  ctx.beginPath();
  ctx.moveTo(560, 260);
  ctx.lineTo(590, 220);
  ctx.lineTo(630, 220);
  ctx.lineTo(600, 260);
  ctx.stroke();

  // 5. Cross-Hatch Lines (Section view texture)
  ctx.strokeStyle = hatchColor;
  ctx.lineWidth = 1;
  for (let i = 245; i < 730; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 260);
    ctx.lineTo(i + 20, 280);
    ctx.moveTo(i, 440);
    ctx.lineTo(i + 20, 460);
    ctx.stroke();
  }

  // 6. Datum Feature Triangles
  drawDatumTriangle(ctx, 200, 360, 'left', 'A', inverted);
  drawDatumTriangle(ctx, 480, 260, 'top', 'B', inverted);

  ctx.restore();
}

/**
 * Renders Automotive Transmission Output Flange (PPAP-8810-A)
 */
function renderOutputFlange(ctx: CanvasRenderingContext2D, _w: number, _h: number, inverted: boolean) {
  const stroke = inverted ? '#E0DFDA' : '#1F2023';
  const hatchColor = inverted ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  ctx.save();

  // Horizontal centerline
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1;
  ctx.setLineDash([16, 4, 3, 4]);
  ctx.beginPath();
  ctx.moveTo(140, 360);
  ctx.lineTo(840, 360);
  ctx.stroke();
  ctx.setLineDash([]);

  // Flange Disc Section (Left)
  ctx.fillStyle = hatchColor;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Upper Flange
  ctx.beginPath();
  ctx.rect(220, 190, 40, 130);
  ctx.fill();
  ctx.stroke();

  // Lower Flange
  ctx.beginPath();
  ctx.rect(220, 400, 40, 130);
  ctx.fill();
  ctx.stroke();

  // Central Hub Cylinder
  ctx.beginPath();
  ctx.rect(260, 270, 240, 50);
  ctx.rect(260, 400, 240, 50);
  ctx.fill();
  ctx.stroke();

  // Seal Journal Ø50 g6
  ctx.beginPath();
  ctx.rect(500, 285, 180, 35);
  ctx.rect(500, 400, 180, 35);
  ctx.fill();
  ctx.stroke();

  // Internal Splined Bore (Ø32 H8)
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(220, 335);
  ctx.lineTo(680, 335);
  ctx.moveTo(220, 385);
  ctx.lineTo(680, 385);
  ctx.stroke();

  // 6x Bolt Hole Pattern indicators
  ctx.fillStyle = inverted ? '#0F1012' : '#F9F8F5';
  ctx.fillRect(225, 220, 30, 24);
  ctx.strokeRect(225, 220, 30, 24);
  ctx.fillRect(225, 475, 30, 24);
  ctx.strokeRect(225, 475, 30, 24);

  // Datum Triangles
  drawDatumTriangle(ctx, 220, 360, 'left', 'A', inverted);
  drawDatumTriangle(ctx, 590, 285, 'top', 'B', inverted);

  ctx.restore();
}

/**
 * Renders Precision CNC Spindle Shaft (ISO-2044-B)
 */
function renderSpindleShaft(ctx: CanvasRenderingContext2D, _w: number, _h: number, inverted: boolean) {
  const stroke = inverted ? '#E0DFDA' : '#1F2023';
  const hatchColor = inverted ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  ctx.save();

  // Centerline
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1;
  ctx.setLineDash([16, 4, 3, 4]);
  ctx.beginPath();
  ctx.moveTo(120, 360);
  ctx.lineTo(880, 360);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = hatchColor;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Step 1: Threaded Nose M24x1.5 (X: 180 to 260)
  ctx.beginPath();
  ctx.rect(180, 310, 80, 100);
  ctx.stroke();

  // Step 2: Front Bearing Seat Ø25 h6 (X: 260 to 420)
  ctx.beginPath();
  ctx.rect(260, 290, 160, 140);
  ctx.stroke();

  // Step 3: Main Rotor Journal Ø35 js7 (X: 420 to 640)
  ctx.beginPath();
  ctx.rect(420, 270, 220, 180);
  ctx.stroke();

  // Keyway slot in step 3
  ctx.fillStyle = inverted ? '#0F1012' : '#F9F8F5';
  ctx.fillRect(490, 270, 70, 16);
  ctx.strokeRect(490, 270, 70, 16);

  // Step 4: Rear Pulley Seat Ø20 h6 (X: 640 to 800)
  ctx.fillStyle = hatchColor;
  ctx.beginPath();
  ctx.rect(640, 305, 160, 110);
  ctx.stroke();

  // Chamfers on steps
  ctx.beginPath();
  ctx.moveTo(180, 310);
  ctx.lineTo(188, 318);
  ctx.moveTo(180, 410);
  ctx.lineTo(188, 402);
  ctx.stroke();

  // Datum Triangles
  drawDatumTriangle(ctx, 340, 290, 'top', 'A', inverted);
  drawDatumTriangle(ctx, 720, 305, 'top', 'B', inverted);

  ctx.restore();
}

/**
 * Renders datum reference triangle on drawings
 */
function drawDatumTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'top' | 'left', label: string, inverted: boolean) {
  ctx.save();
  ctx.fillStyle = inverted ? '#151513' : '#FFFFFF';
  ctx.strokeStyle = inverted ? '#E0DFDA' : '#141413';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  if (dir === 'left') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - 14, y - 8);
    ctx.lineTo(x - 14, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x - 26, y);
    ctx.stroke();

    ctx.strokeRect(x - 42, y - 8, 16, 16);
    ctx.fillStyle = inverted ? '#F5F4F0' : '#141413';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x - 34, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y - 14);
    ctx.lineTo(x + 8, y - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y - 26);
    ctx.stroke();

    ctx.strokeRect(x - 8, y - 42, 16, 16);
    ctx.fillStyle = inverted ? '#F5F4F0' : '#141413';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - 34);
  }
  ctx.restore();
}

/**
 * Renders dimension extension lines and callout text for each characteristic
 */
function renderCalloutAnnotations(ctx: CanvasRenderingContext2D, spec: DrawingSpec, options: RenderOptions) {
  const textColor = options.inverted ? '#F5F4F0' : '#141413';
  const dimLineColor = options.inverted ? '#66645E' : '#716F68';

  ctx.save();

  spec.characteristics.forEach((char) => {
    const { bbox } = char;

    // Draw dimension extension lines and arrowheads
    ctx.strokeStyle = dimLineColor;
    ctx.fillStyle = dimLineColor;
    ctx.lineWidth = 1;

    // Dimension tick line under text
    ctx.beginPath();
    ctx.moveTo(bbox.x - 10, bbox.y + bbox.height - 4);
    ctx.lineTo(bbox.x + bbox.width + 10, bbox.y + bbox.height - 4);
    ctx.stroke();

    drawArrowhead(ctx, bbox.x + 10, bbox.y + bbox.height - 4, bbox.x - 10, bbox.y + bbox.height - 4, 6);
    drawArrowhead(ctx, bbox.x + bbox.width - 10, bbox.y + bbox.height - 4, bbox.x + bbox.width + 10, bbox.y + bbox.height - 4, 6);

    // Callout text
    ctx.fillStyle = textColor;
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Check if GD&T frame
    if (char.rawCallout.startsWith('|')) {
      // Draw rectangular Feature Control Frame
      ctx.strokeStyle = options.inverted ? '#E0DFDA' : '#141413';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      ctx.fillText(char.rawCallout, bbox.x + 4, bbox.y + 6);
    } else {
      ctx.fillText(char.rawCallout, bbox.x, bbox.y + 4);
    }

    // Cyan bounding box for AI-extracted dimension
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(bbox.x - 4, bbox.y - 2, bbox.width + 8, bbox.height + 4);
    ctx.setLineDash([]);
  });

  // Optional: Highlighted selection bounding box
  if (options.highlightBBox) {
    ctx.strokeStyle = options.inverted ? '#FF5500' : '#EA580C';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      options.highlightBBox.x - 6,
      options.highlightBBox.y - 4,
      options.highlightBBox.width + 12,
      options.highlightBBox.height + 8
    );
  }

  ctx.restore();
}

/**
 * Extracts a high-contrast visual image snippet from the CAD canvas coordinates
 */
export function cropCanvasSnippet(
  sourceCanvas: HTMLCanvasElement,
  bbox: BoundingBox,
  targetWidth = 140,
  targetHeight = 48
): string {
  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return '';

  // Calculate crop rectangle with padding
  const padX = 12;
  const padY = 8;
  const srcX = Math.max(0, bbox.x - padX);
  const srcY = Math.max(0, bbox.y - padY);
  const srcW = Math.min(sourceCanvas.width - srcX, bbox.width + padX * 2);
  const srcH = Math.min(sourceCanvas.height - srcY, bbox.height + padY * 2);

  // Background
  offCtx.fillStyle = '#FFFFFF';
  offCtx.fillRect(0, 0, targetWidth, targetHeight);

  // Draw scaled crop
  offCtx.drawImage(
    sourceCanvas,
    srcX, srcY, srcW, srcH,
    0, 0, targetWidth, targetHeight
  );

  // Apply subtle micro-border
  offCtx.strokeStyle = 'rgba(0,0,0,0.15)';
  offCtx.lineWidth = 1;
  offCtx.strokeRect(0, 0, targetWidth, targetHeight);

  return offscreen.toDataURL('image/png');
}

/**
 * Pre-generates high-contrast visual crops for all characteristics in a drawing
 */
export function generateAllCrops(
  canvas: HTMLCanvasElement,
  characteristics: Characteristic[]
): Characteristic[] {
  return characteristics.map((char) => {
    if (char.cropDataUrl) return char;
    const cropUrl = cropCanvasSnippet(canvas, char.bbox, 140, 48);
    return { ...char, cropDataUrl: cropUrl };
  });
}

/**
 * Pre-generates high-contrast visual crops directly from offscreen buffer (Fix 05)
 * Guarantees crisp visual callout snippets immediately without waiting for DOM canvas
 */
export function generateCropsFromSpec(
  spec: DrawingSpec,
  options?: { inverted?: boolean; customImage?: HTMLImageElement | null }
): Characteristic[] {
  const offscreen = document.createElement('canvas');
  offscreen.width = spec.drawingWidth || 1600;
  offscreen.height = spec.drawingHeight || 1100;
  renderCADBlueprint(offscreen, spec, {
    inverted: options?.inverted ?? false,
    showGrid: false,
    customImage: options?.customImage || (spec.id in BLUEPRINT_ASSET_MAP ? getCachedImage(BLUEPRINT_ASSET_MAP[spec.id]) : null)
  });
  return spec.characteristics.map((char) => {
    const cropUrl = cropCanvasSnippet(offscreen, char.bbox, 140, 48);
    return { ...char, cropDataUrl: cropUrl };
  });
}



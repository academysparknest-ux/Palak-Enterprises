import QRCode from 'qrcode';
import { executeWithAuthRetry } from '../supabase/authSession';
import { getPhotoSignedUrl, recordGenerationResult } from './database';
import type { IdCardPerson, IdCardTemplate, TemplateField, TemplateSideLayout } from './types';
import { jsPDF } from 'jspdf';
import { sanitizeStudentId, getQrCodePayload } from './validation';

export const MM_TO_PX = 300 / 25.4; // 300 DPI high-precision physical-to-pixel conversion

export function fieldValue(
  field: TemplateField,
  person: IdCardPerson,
  academicYear: string,
  schoolName: string
): string {
  switch (field.key) {
    case 'student_name':
      return person.name || '';
    case 'student_id':
      return sanitizeStudentId(person.student_id);
    case 'class':
      return person.class ? (person.class.toLowerCase().includes('class') ? person.class : `CLASS: ${person.class}`) : '';
    case 'section':
      return person.section ? `Sec: ${person.section}` : '';
    case 'roll_number':
      return person.roll_number ? `Roll: ${person.roll_number}` : '';
    case 'date_of_birth':
      return person.date_of_birth ?? '';
    case 'blood_group':
      return person.blood_group ?? '';
    case 'parent_info':
      return [person.father_name, person.mother_name].filter(Boolean).join(' / ');
    case 'father_name':
      return person.father_name ?? '';
    case 'mother_name':
      return person.mother_name ?? '';
    case 'phone':
      return person.phone ?? '';
    case 'address':
      return person.address ?? '';
    case 'academic_year':
      return academicYear;
    case 'batch':
      return academicYear;
    case 'school_name':
      return schoolName;
    case 'school_subtitle':
      return field.customText || 'Motihari, Bihar';
    case 'designation':
      return field.customText || 'Student';
    case 'emergency_no':
      return field.customText || '';
    case 'valid_till':
      return field.customText || '';
    case 'terms':
      return field.customText || '';
    case 'website':
      return field.customText || '';
    case 'custom_text':
      return field.customText ?? '';
    default:
      return field.customText ?? '';
  }
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function generateBarcodeCanvas(text: string, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(Math.round(width), 100);
  canvas.height = Math.max(Math.round(height), 20);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bars: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    bars.push(c % 3 === 0 ? 2 : 1, 1, c % 2 === 0 ? 1 : 2, 1);
  }
  while (bars.length < 50) bars.push(1, 2, 1, 1);
  const totalUnits = bars.reduce((a, b) => a + b, 0);
  const unitW = canvas.width / totalUnits;
  let x = 0;
  ctx.fillStyle = '#1B2A4A';
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i] * unitW;
    if (i % 2 === 0) {
      ctx.fillRect(x, 0, w, canvas.height);
    }
    x += w;
  }
  return canvas;
}

/**
 * Draws an image fitted within a target rectangle with aspect ratio control
 */
function drawImageFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: 'cover' | 'contain' | 'fill' = 'cover'
) {
  if (fit === 'fill') {
    ctx.drawImage(img, x, y, w, h);
    return;
  }

  const imgRatio = img.width / img.height;
  const targetRatio = w / h;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  let dx = x, dy = y, dw = w, dh = h;

  if (fit === 'cover') {
    if (imgRatio > targetRatio) {
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / targetRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  } else if (fit === 'contain') {
    if (imgRatio > targetRatio) {
      dh = w / imgRatio;
      dy = y + (h - dh) / 2;
    } else {
      dw = h * imgRatio;
      dx = x + (w - dw) / 2;
    }
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  }
}

/**
 * Renders one face of a card to canvas with high physical precision
 */
async function renderSideToCanvas(
  sideLayout: TemplateSideLayout,
  cardWidthMm: number,
  cardHeightMm: number,
  person: IdCardPerson,
  schoolName: string,
  academicYear: string,
  backgroundUrl?: string | null
): Promise<HTMLCanvasElement> {
  const widthPx = Math.round(cardWidthMm * MM_TO_PX);
  const heightPx = Math.round(cardHeightMm * MM_TO_PX);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Background color
  ctx.fillStyle = sideLayout.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Background Image (Front or Back)
  const bgImgSrc = sideLayout.backgroundUrl !== undefined ? sideLayout.backgroundUrl : (backgroundUrl ?? null);
  if (bgImgSrc) {
    try {
      const bg = await loadImage(bgImgSrc);
      const bgFit = sideLayout.backgroundFit || 'fill';
      const fitMode = bgFit === 'fit' ? 'contain' : bgFit === 'crop' ? 'cover' : 'fill';
      drawImageFitted(ctx, bg, 0, 0, widthPx, heightPx, fitMode);
    } catch {
      // Ignore background image load failure gracefully
    }
  }

  // Draw header / footer SVGs if present (only when no background image is set)
  if (sideLayout.headerSvg && !bgImgSrc) {
    try {
      const headerSvgBlob = new Blob([sideLayout.headerSvg], { type: 'image/svg+xml;charset=utf-8' });
      const headerUrl = URL.createObjectURL(headerSvgBlob);
      const headerImg = await loadImage(headerUrl);
      ctx.drawImage(headerImg, 0, 0, widthPx, Math.round(18 * MM_TO_PX));
      URL.revokeObjectURL(headerUrl);
    } catch {
      // Continue
    }
  }

  if (sideLayout.footerSvg && !bgImgSrc) {
    try {
      const footerSvgBlob = new Blob([sideLayout.footerSvg], { type: 'image/svg+xml;charset=utf-8' });
      const footerUrl = URL.createObjectURL(footerSvgBlob);
      const footerImg = await loadImage(footerUrl);
      const footerH = Math.round(14 * MM_TO_PX);
      ctx.drawImage(footerImg, 0, heightPx - footerH, widthPx, footerH);
      URL.revokeObjectURL(footerUrl);
    } catch {
      // Continue
    }
  }

  // Render dynamic elements
  for (const field of sideLayout.fields) {
    if (!field.visible) continue;

    const x = field.x * MM_TO_PX;
    const y = field.y * MM_TO_PX;
    const w = field.width * MM_TO_PX;
    const h = field.height * MM_TO_PX;

    // 1. Student Photo
    if (field.key === 'student_photo') {
      const isCircle = field.photoShape === 'circle' || (field.borderRadius ?? 0) >= 45;
      const radiusPx = isCircle
        ? Math.min(w, h) / 2
        : field.borderRadius
        ? (field.borderRadius / 100) * Math.min(w, h)
        : 0;

      ctx.save();
      ctx.beginPath();
      if (isCircle) {
        ctx.arc(x + w / 2, y + h / 2, radiusPx, 0, Math.PI * 2);
      } else if (radiusPx > 0) {
        ctx.roundRect(x, y, w, h, radiusPx);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.closePath();
      ctx.clip();

      if (person.photo_url) {
        try {
          const signedUrl = await getPhotoSignedUrl(person.photo_url);
          const photo = await loadImage(signedUrl);
          drawImageFitted(ctx, photo, x, y, w, h, field.photoFit || 'cover');
        } catch {
          // Placeholder
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(x, y, w, h);
        }
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();

      // Border outline
      if (field.borderWidth && field.borderWidth > 0 && field.borderColor) {
        ctx.save();
        ctx.beginPath();
        const bWidthPx = field.borderWidth * (MM_TO_PX / 3.78);
        ctx.lineWidth = Math.max(1, bWidthPx);
        ctx.strokeStyle = field.borderColor;
        if (isCircle) {
          ctx.arc(x + w / 2, y + h / 2, radiusPx, 0, Math.PI * 2);
        } else if (radiusPx > 0) {
          ctx.roundRect(x, y, w, h, radiusPx);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.stroke();
        ctx.restore();
      }
      continue;
    }

    // 2. QR Code
    if (field.key === 'qr_code') {
      try {
        const qrPayload = getQrCodePayload(person, schoolName);
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          width: Math.round(w),
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, x, y, w, h);
      } catch {
        // Ignore QR error
      }
      continue;
    }

    // 3. Barcode
    if (field.key === 'barcode') {
      try {
        const barcodePayload = sanitizeStudentId(person.student_id) || '012345678901';
        const barCanvas = generateBarcodeCanvas(barcodePayload, w, h);
        ctx.drawImage(barCanvas, x, y, w, h);
      } catch {
        // Ignore Barcode error
      }
      continue;
    }

    // 4. School Logo
    if (field.key === 'school_logo') {
      if (field.customText) {
        try {
          const logo = await loadImage(field.customText);
          drawImageFitted(ctx, logo, x, y, w, h, 'contain');
        } catch {
          // Logo load failed
        }
      }
      continue;
    }

    // 5. Text Fields
    const textVal = fieldValue(field, person, academicYear, schoolName);
    if (!textVal && !field.labelPrefix) continue;

    const fullText = field.labelPrefix ? `${field.labelPrefix} ${textVal}` : textVal;
    if (!fullText) continue;

    const basePt = field.fontSize ?? 10;
    let fontSizePx = basePt * (MM_TO_PX / 2.835); // pt to canvas px (1 pt = 1/72 in = 25.4/72 mm = 0.3528 mm)
    const fontStyle = field.fontStyle === 'italic' ? 'italic ' : '';
    const fontWeight = field.fontWeight === 'bold' ? 'bold ' : field.fontWeight ? `${field.fontWeight} ` : '';
    const fontFamily = field.fontFamily || "'Times New Roman', serif";

    ctx.fillStyle = field.color ?? '#1B2A4A';
    ctx.textAlign = field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'right' : 'left';
    ctx.textBaseline = 'top';

    const alignX = field.textAlign === 'center' ? x + w / 2 : field.textAlign === 'right' ? x + w : x;

    // Auto font scaling down if strategy is 'scale_down'
    if (field.overflowStrategy === 'scale_down') {
      ctx.font = `${fontStyle}${fontWeight}${Math.round(fontSizePx)}px ${fontFamily}`;
      let textMetrics = ctx.measureText(fullText);
      while (textMetrics.width > w && fontSizePx > 6) {
        fontSizePx -= 0.5;
        ctx.font = `${fontStyle}${fontWeight}${Math.round(fontSizePx)}px ${fontFamily}`;
        textMetrics = ctx.measureText(fullText);
      }
    } else {
      ctx.font = `${fontStyle}${fontWeight}${Math.round(fontSizePx)}px ${fontFamily}`;
    }

    const lineHeightMultiplier = field.lineHeight || 1.25;
    const lineHeightPx = fontSizePx * lineHeightMultiplier;

    // Multi-line word wrapping or clipping
    const words = fullText.split(' ');
    let line = '';
    let curY = y;
    let linesDrawn = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > w && line.length > 0) {
        // If out of height bounds, handle ellipsis
        if (curY + lineHeightPx > y + h && field.overflowStrategy === 'ellipsis') {
          ctx.fillText(`${line}...`, alignX, curY);
          line = '';
          break;
        }

        ctx.fillText(line, alignX, curY);
        linesDrawn++;
        curY += lineHeightPx;

        if (curY + fontSizePx > y + h + 2) {
          // Height overflow
          line = '';
          break;
        }
        line = words[i];
      } else {
        line = testLine;
      }
    }

    if (line && curY + fontSizePx <= y + h + 4) {
      ctx.fillText(line, alignX, curY);
    }
  }

  return canvas;
}

function renderMissingBackCanvas(widthMm: number, heightMm: number): HTMLCanvasElement {
  const widthPx = Math.round(widthMm * MM_TO_PX);
  const heightPx = Math.round(heightMm * MM_TO_PX);
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, widthPx - 24, heightPx - 24);
    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${Math.round(13 * (MM_TO_PX / 2.835))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Back side is not configured for this ID card.', widthPx / 2, heightPx / 2);
  }
  return canvas;
}

// Renders one card (or dual-sided composite) to a PNG blob
export async function renderCardToBlob(
  person: IdCardPerson,
  template: IdCardTemplate,
  schoolName: string,
  academicYear: string,
  side: 'front' | 'back' | 'both' = 'front'
): Promise<Blob> {
  const frontBackground =
    template.layout.backgroundUrl !== undefined
      ? template.layout.backgroundUrl
      : template.background_url;

  const frontLayout: TemplateSideLayout = {
    fields: template.layout.fields,
    backgroundColor: template.layout.backgroundColor,
    backgroundUrl: frontBackground,
    backgroundFit: template.layout.backgroundFit,
    headerSvg: template.layout.headerSvg,
    footerSvg: template.layout.footerSvg,
    headerGradientColors: template.layout.headerGradientColors,
    footerGradientColors: template.layout.footerGradientColors,
  };

  if (side === 'back') {
    if (template.layout.back) {
      const canvas = await renderSideToCanvas(
        template.layout.back,
        template.card_width_mm,
        template.card_height_mm,
        person,
        schoolName,
        academicYear,
        template.layout.back.backgroundUrl ?? null
      );
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png');
      });
    } else {
      const canvas = renderMissingBackCanvas(template.card_width_mm, template.card_height_mm);
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png');
      });
    }
  }

  const canvas = await renderSideToCanvas(
    frontLayout,
    template.card_width_mm,
    template.card_height_mm,
    person,
    schoolName,
    academicYear,
    frontBackground
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png');
  });
}

const cardDataUrlCache = new Map<string, string>();

/** Clear data URL memory cache */
export function clearCardDataUrlCache(): void {
  cardDataUrlCache.clear();
}

// Renders one face of a card to Data URL with memory caching for fast rendering
export async function renderCardToDataUrl(
  person: IdCardPerson,
  template: IdCardTemplate,
  schoolName: string,
  academicYear: string,
  side: 'front' | 'back' = 'front'
): Promise<string> {
  const frontBackground =
    template.layout.backgroundUrl !== undefined
      ? template.layout.backgroundUrl
      : template.background_url;

  const cacheKey = `${person.id}_${template.id}_${template.updated_at || ''}_${person.updated_at || ''}_${side}_${frontBackground || ''}_${template.layout.back?.backgroundUrl || ''}`;
  const cached = cardDataUrlCache.get(cacheKey);
  if (cached) return cached;

  if (side === 'back') {
    if (template.layout.back) {
      const canvas = await renderSideToCanvas(
        template.layout.back,
        template.card_width_mm,
        template.card_height_mm,
        person,
        schoolName,
        academicYear,
        template.layout.back.backgroundUrl ?? null
      );
      const dataUrl = canvas.toDataURL('image/png');
      cardDataUrlCache.set(cacheKey, dataUrl);
      return dataUrl;
    } else {
      const canvas = renderMissingBackCanvas(template.card_width_mm, template.card_height_mm);
      const dataUrl = canvas.toDataURL('image/png');
      cardDataUrlCache.set(cacheKey, dataUrl);
      return dataUrl;
    }
  }

  const frontLayout: TemplateSideLayout = {
    fields: template.layout.fields,
    backgroundColor: template.layout.backgroundColor,
    backgroundUrl: frontBackground,
    backgroundFit: template.layout.backgroundFit,
    headerSvg: template.layout.headerSvg,
    footerSvg: template.layout.footerSvg,
    headerGradientColors: template.layout.headerGradientColors,
    footerGradientColors: template.layout.footerGradientColors,
  };

  const canvas = await renderSideToCanvas(
    frontLayout,
    template.card_width_mm,
    template.card_height_mm,
    person,
    schoolName,
    academicYear,
    frontBackground
  );

  const dataUrl = canvas.toDataURL('image/png');
  cardDataUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}

export async function uploadGeneratedCard(projectId: string, personId: string, blob: Blob): Promise<string> {
  const path = `generated/${projectId}/${personId}.png`;
  return executeWithAuthRetry(
    async (client) => {
      const { error } = await client.storage.from('idcard-photos').upload(path, blob, {
        upsert: true,
        contentType: 'image/png',
      });
      if (error) throw error;

      const { data } = await client.storage.from('idcard-photos').createSignedUrl(path, 60 * 60 * 24);
      return data?.signedUrl ?? path;
    },
    { operationName: 'uploadGeneratedCard' }
  );
}

// Bundles card images into a multi-page PDF (one card per page)
export async function buildCardsPdf(
  cards: { name: string; imageUrl: string }[],
  cardWidthMm: number,
  cardHeightMm: number
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: cardWidthMm > cardHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [cardWidthMm, cardHeightMm],
  });

  for (let i = 0; i < cards.length; i++) {
    const { imageUrl } = cards[i];
    const dataUrl = await fetchAsDataUrl(imageUrl);
    if (i > 0) doc.addPage([cardWidthMm, cardHeightMm], cardWidthMm > cardHeightMm ? 'landscape' : 'portrait');
    doc.addImage(dataUrl, 'PNG', 0, 0, cardWidthMm, cardHeightMm);
  }

  return doc.output('blob');
}

/**
 * Build a multi-card-per-sheet PDF using the shared PrintLayout engine.
 */
export async function buildMultiCardSheetPdf(
  layout: import('./printLayoutEngine').PrintLayout,
  cardImages: Map<string, string>, // key: `${personId}:${side}`, value: data URL or fetch URL
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const totalCards = layout.pages.reduce((n, p) => n + p.cards.length, 0);
  let processed = 0;

  const doc = new jsPDF({
    orientation: layout.orientation,
    unit: 'mm',
    format: [layout.paperWidthMm, layout.paperHeightMm],
  });

  for (let pageIdx = 0; pageIdx < layout.pages.length; pageIdx++) {
    const page = layout.pages[pageIdx];

    if (pageIdx > 0) {
      doc.addPage([layout.paperWidthMm, layout.paperHeightMm], layout.orientation);
    }

    // Draw cut guides if enabled
    if (layout.showCutGuides && page.cards.length > 0) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.15);

      for (const card of page.cards) {
        doc.rect(card.xMm, card.yMm, layout.cardWidthMm, layout.cardHeightMm);
      }
    }

    // Place card images
    for (const card of page.cards) {
      const key = `${card.personId}:${card.side}`;
      let imageData = cardImages.get(key);

      if (imageData && !imageData.startsWith('data:')) {
        try {
          imageData = await fetchAsDataUrl(imageData);
          cardImages.set(key, imageData);
        } catch {
          processed++;
          onProgress?.(processed, totalCards);
          continue;
        }
      }

      if (imageData) {
        try {
          doc.addImage(
            imageData,
            'PNG',
            card.xMm,
            card.yMm,
            layout.cardWidthMm,
            layout.cardHeightMm,
            undefined,
            'FAST'
          );
        } catch {
          // Skip corrupt data
        }
      }

      processed++;
      onProgress?.(processed, totalCards);
    }
  }

  return doc.output('blob');
}

/**
 * Builds a Printer Calibration Test Sheet PDF with exact physical millimeter rulers,
 * corner registration marks, card boundary boxes, and duplex crosshairs.
 */
export function buildCalibrationTestPdf(
  paperWidthMm: number,
  paperHeightMm: number,
  cardWidthMm: number = 85.6,
  cardHeightMm: number = 54
): Blob {
  const orientation = paperWidthMm > paperHeightMm ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [paperWidthMm, paperHeightMm],
  });

  // 1. Page Title & Instructions Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text('ID CARD PRINTER CALIBRATION & TEST SHEET', paperWidthMm / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'IMPORTANT: Print with Print Scale: 100% | Actual Size: ON | Fit to Page: OFF. Measure markings with a physical ruler.',
    paperWidthMm / 2,
    20,
    { align: 'center' }
  );

  // 2. Physical 100mm Calibration Ruler (Top)
  const rulerX = 20;
  const rulerY = 28;
  doc.setDrawColor(27, 42, 74);
  doc.setLineWidth(0.5);
  doc.line(rulerX, rulerY, rulerX + 100, rulerY);

  for (let mm = 0; mm <= 100; mm++) {
    const is10 = mm % 10 === 0;
    const is5 = mm % 5 === 0;
    const tickH = is10 ? 6 : is5 ? 4 : 2;
    doc.setLineWidth(is10 ? 0.4 : 0.2);
    doc.line(rulerX + mm, rulerY - tickH, rulerX + mm, rulerY);
    if (is10) {
      doc.setFontSize(7);
      doc.text(`${mm}mm`, rulerX + mm, rulerY - 7, { align: 'center' });
    }
  }

  // 3. Card Boundary Box (Center)
  const centerX = (paperWidthMm - cardWidthMm) / 2;
  const centerY = (paperHeightMm - cardHeightMm) / 2 + 10;

  doc.setDrawColor(230, 149, 38);
  doc.setLineWidth(0.5);
  doc.rect(centerX, centerY, cardWidthMm, cardHeightMm);

  // Crosshairs in card center
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(centerX + cardWidthMm / 2 - 10, centerY + cardHeightMm / 2, centerX + cardWidthMm / 2 + 10, centerY + cardHeightMm / 2);
  doc.line(centerX + cardWidthMm / 2, centerY + cardHeightMm / 2 - 10, centerX + cardWidthMm / 2, centerY + cardHeightMm / 2 + 10);

  doc.setFontSize(10);
  doc.setTextColor(27, 42, 74);
  doc.setFont('helvetica', 'bold');
  doc.text(`Card Target: ${cardWidthMm} × ${cardHeightMm} mm`, centerX + cardWidthMm / 2, centerY + cardHeightMm / 2 - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Standard CR80 ID Dimension', centerX + cardWidthMm / 2, centerY + cardHeightMm / 2 + 5, { align: 'center' });

  // 4. Corner Registration Targets
  const cornerMargin = 10;
  const corners = [
    { x: cornerMargin, y: cornerMargin },
    { x: paperWidthMm - cornerMargin, y: cornerMargin },
    { x: cornerMargin, y: paperHeightMm - cornerMargin },
    { x: paperWidthMm - cornerMargin, y: paperHeightMm - cornerMargin },
  ];

  doc.setDrawColor(27, 42, 74);
  doc.setLineWidth(0.3);
  for (const c of corners) {
    doc.circle(c.x, c.y, 4);
    doc.line(c.x - 6, c.y, c.x + 6, c.y);
    doc.line(c.x, c.y - 6, c.x, c.y + 6);
  }

  // 5. Back Side Page (for Duplex Alignment Verification)
  doc.addPage([paperWidthMm, paperHeightMm], orientation);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text('ID CARD DUPLEX REGISTRATION TEST (PAGE 2 / BACK)', paperWidthMm / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Hold the printed sheet up to the light. The card boxes on Page 1 and Page 2 must align perfectly.', paperWidthMm / 2, 20, { align: 'center' });

  // Mirrored card box
  doc.setDrawColor(230, 149, 38);
  doc.setLineWidth(0.5);
  doc.rect(centerX, centerY, cardWidthMm, cardHeightMm);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(centerX + cardWidthMm / 2 - 10, centerY + cardHeightMm / 2, centerX + cardWidthMm / 2 + 10, centerY + cardHeightMm / 2);
  doc.line(centerX + cardWidthMm / 2, centerY + cardHeightMm / 2 - 10, centerX + cardWidthMm / 2, centerY + cardHeightMm / 2 + 10);

  doc.setFontSize(10);
  doc.setTextColor(27, 42, 74);
  doc.setFont('helvetica', 'bold');
  doc.text(`Back Registration Box (${cardWidthMm} × ${cardHeightMm} mm)`, centerX + cardWidthMm / 2, centerY + cardHeightMm / 2, { align: 'center' });

  return doc.output('blob');
}

export async function fetchAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface GenerationProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
}

export async function generateCardsForPersons(
  persons: IdCardPerson[],
  template: IdCardTemplate,
  projectId: string,
  schoolName: string,
  academicYear: string,
  onProgress: (progress: GenerationProgress) => void
): Promise<GenerationProgress> {
  const progress: GenerationProgress = { total: persons.length, completed: 0, succeeded: 0, failed: 0 };

  for (const person of persons) {
    try {
      const blob = await renderCardToBlob(person, template, schoolName, academicYear, 'front');
      const fileUrl = await uploadGeneratedCard(projectId, person.id, blob);

      await recordGenerationResult({
        project_id: projectId,
        person_id: person.id,
        template_id: template.id,
        status: 'SUCCESS',
        file_url: fileUrl,
      });

      progress.succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown generation error';
      try {
        await recordGenerationResult({
          project_id: projectId,
          person_id: person.id,
          template_id: template.id,
          status: 'FAILED',
          error_message: message,
        });
      } catch {
        // Continue
      }
      progress.failed += 1;
    }

    progress.completed += 1;
    onProgress({ ...progress });
  }

  return progress;
}

import QRCode from 'qrcode';
import { executeWithAuthRetry } from '../supabase/authSession';
import { getPhotoSignedUrl, recordGenerationResult } from './database';
import type { IdCardPerson, IdCardTemplate, TemplateField, TemplateSideLayout } from './types';
import { jsPDF } from 'jspdf';

const MM_TO_PX = 300 / 25.4; // render at 300 DPI for high-res print quality

function fieldValue(
  field: TemplateField,
  person: IdCardPerson,
  academicYear: string,
  schoolName: string
): string {
  switch (field.key) {
    case 'student_name':
      return person.name;
    case 'student_id':
      return person.student_id;
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
      return '';
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function generateBarcodeCanvas(text: string, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(width, 100);
  canvas.height = Math.max(height, 20);
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

// Renders one face of a card to canvas
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

  ctx.fillStyle = sideLayout.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (backgroundUrl) {
    try {
      const bg = await loadImage(backgroundUrl);
      ctx.drawImage(bg, 0, 0, widthPx, heightPx);
    } catch {
      // Ignore background image failure
    }
  }

  // Draw header / footer SVGs if present
  if (sideLayout.headerSvg) {
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

  if (sideLayout.footerSvg) {
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

  for (const field of sideLayout.fields) {
    if (!field.visible) continue;

    const x = field.x * MM_TO_PX;
    const y = field.y * MM_TO_PX;
    const w = field.width * MM_TO_PX;
    const h = field.height * MM_TO_PX;

    if (field.key === 'student_photo') {
      if (person.photo_url) {
        try {
          const signedUrl = await getPhotoSignedUrl(person.photo_url);
          const photo = await loadImage(signedUrl);
          ctx.save();
          if (field.borderRadius) {
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            ctx.clip();
          }
          ctx.drawImage(photo, x, y, w, h);
          ctx.restore();

          if (field.borderWidth && field.borderColor) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            ctx.lineWidth = field.borderWidth * (MM_TO_PX / 3.78);
            ctx.strokeStyle = field.borderColor;
            ctx.stroke();
            ctx.restore();
          }
        } catch {
          // Photo load failed, continue
        }
      }
      continue;
    }

    if (field.key === 'qr_code') {
      try {
        const qrDataUrl = await QRCode.toDataURL(person.student_id || person.name, {
          width: Math.round(w),
          margin: 1,
          color: { dark: '#1B2A4A', light: '#FFFFFF' },
        });
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, x, y, w, h);
      } catch {
        // Ignore QR error
      }
      continue;
    }

    if (field.key === 'barcode') {
      try {
        const barCanvas = generateBarcodeCanvas(person.student_id || '012345678901', w, h);
        ctx.drawImage(barCanvas, x, y, w, h);
      } catch {
        // Ignore Barcode error
      }
      continue;
    }

    if (field.key === 'school_logo') {
      if (field.customText) {
        try {
          const logo = await loadImage(field.customText);
          ctx.save();
          if (field.borderRadius) {
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            ctx.clip();
          }
          ctx.drawImage(logo, x, y, w, h);
          ctx.restore();

          if (field.borderWidth && field.borderColor) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
            ctx.lineWidth = field.borderWidth * (MM_TO_PX / 3.78);
            ctx.strokeStyle = field.borderColor;
            ctx.stroke();
            ctx.restore();
          }
        } catch {
          // Logo load failed, continue
        }
      }
      continue;
    }

    const textVal = fieldValue(field, person, academicYear, schoolName);
    if (!textVal && !field.labelPrefix) continue;

    const fullText = field.labelPrefix ? `${field.labelPrefix} ${textVal}` : textVal;
    if (!fullText) continue;

    const fontSizePx = (field.fontSize ?? 12) * (MM_TO_PX / 2.835); // pt to canvas px
    const fontStyle = field.fontStyle === 'italic' ? 'italic ' : '';
    const fontWeight = field.fontWeight === 'bold' ? 'bold ' : '';
    const fontFamily = field.fontFamily || "'Times New Roman', serif";

    ctx.font = `${fontStyle}${fontWeight}${Math.round(fontSizePx)}px ${fontFamily}`;
    ctx.fillStyle = field.color ?? '#1B2A4A';
    ctx.textAlign = field.textAlign ?? 'left';
    ctx.textBaseline = 'top';

    const alignX = field.textAlign === 'center' ? x + w / 2 : field.textAlign === 'right' ? x + w : x;

    // Handle multiline text like terms or addresses
    if (fullText.length > 40 && w < widthPx) {
      const words = fullText.split(' ');
      let line = '';
      let curY = y;
      const lineHeight = fontSizePx * 1.25;
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > w && line.length > 0) {
          ctx.fillText(line, alignX, curY);
          line = word + ' ';
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, alignX, curY);
    } else {
      ctx.fillText(fullText, alignX, y);
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
  const frontLayout: TemplateSideLayout = {
    fields: template.layout.fields,
    backgroundColor: template.layout.backgroundColor,
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
        null
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
    template.background_url
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
  const cacheKey = `${person.id}_${template.id}_${template.updated_at || ''}_${person.updated_at || ''}_${side}`;
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
        null
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
    template.background_url
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

// Bundles card images into a multi-page PDF (LEGACY — one card per page)
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
 *
 * Each page in the PDF matches a page in the layout with cards placed
 * at their exact physical (mm) positions. The PDF uses the configured
 * paper size (A4/A5) — NOT individual card dimensions.
 *
 * Cut guides are rendered as thin gray lines when enabled.
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
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);

      for (const card of page.cards) {
        doc.rect(card.xMm, card.yMm, layout.cardWidthMm, layout.cardHeightMm);
      }
    }

    // Place card images
    for (const card of page.cards) {
      const key = `${card.personId}:${card.side}`;
      let imageData = cardImages.get(key);

      if (imageData && !imageData.startsWith('data:')) {
        // It's a URL — fetch and convert to data URL
        try {
          imageData = await fetchAsDataUrl(imageData);
          cardImages.set(key, imageData); // cache for reuse
        } catch {
          // Skip this card if image fetch fails
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
          );
        } catch {
          // addImage can fail for corrupt data — skip silently
        }
      }

      processed++;
      onProgress?.(processed, totalCards);
    }
  }

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

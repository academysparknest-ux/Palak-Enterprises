import { supabase } from '../supabase/client';
import { getPhotoSignedUrl, recordGenerationResult } from './database';
import type { IdCardPerson, IdCardTemplate, TemplateField } from './types';
import { jsPDF } from 'jspdf';

const MM_TO_PX = 300 / 25.4; // render at 300 DPI for print quality

function fieldValue(field: TemplateField, person: IdCardPerson, academicYear: string, schoolName: string): string {
  switch (field.key) {
    case 'student_name':
      return person.name;
    case 'student_id':
      return person.student_id;
    case 'class':
      return person.class ?? '';
    case 'section':
      return person.section ?? '';
    case 'roll_number':
      return person.roll_number ?? '';
    case 'date_of_birth':
      return person.date_of_birth ?? '';
    case 'blood_group':
      return person.blood_group ?? '';
    case 'parent_info':
      return [person.father_name, person.mother_name].filter(Boolean).join(' / ');
    case 'address':
      return person.address ?? '';
    case 'academic_year':
      return academicYear;
    case 'school_name':
      return schoolName;
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

// Renders one card to a canvas and returns it as a PNG blob. Kept synchronous
// per-card so a failure on one student doesn't corrupt state for the rest.
export async function renderCardToBlob(
  person: IdCardPerson,
  template: IdCardTemplate,
  schoolName: string,
  academicYear: string
): Promise<Blob> {
  const widthPx = Math.round(template.card_width_mm * MM_TO_PX);
  const heightPx = Math.round(template.card_height_mm * MM_TO_PX);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.fillStyle = template.layout.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (template.background_url) {
    try {
      const bg = await loadImage(template.background_url);
      ctx.drawImage(bg, 0, 0, widthPx, heightPx);
    } catch {
      // Missing background shouldn't fail the whole card — fall through with the
      // solid background color already painted.
    }
  }

  for (const field of template.layout.fields) {
    if (!field.visible) continue;

    const x = field.x * MM_TO_PX;
    const y = field.y * MM_TO_PX;
    const w = field.width * MM_TO_PX;
    const h = field.height * MM_TO_PX;

    if (field.key === 'student_photo') {
      if (person.photo_url) {
        const signedUrl = await getPhotoSignedUrl(person.photo_url);
        const photo = await loadImage(signedUrl);
        ctx.drawImage(photo, x, y, w, h);
      }
      continue;
    }

    if (field.key === 'school_logo') {
      if (template.background_url) continue; // logo usually baked into background art
      continue;
    }

    const text = fieldValue(field, person, academicYear, schoolName);
    if (!text) continue;

    const fontSize = (field.fontSize ?? 10) * (MM_TO_PX / (300 / 25.4)) * 3.78; // pt -> px approximation
    ctx.font = `${field.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px sans-serif`;
    ctx.fillStyle = field.color ?? '#000000';
    ctx.textAlign = field.textAlign ?? 'left';
    ctx.textBaseline = 'top';

    const alignX = field.textAlign === 'center' ? x + w / 2 : field.textAlign === 'right' ? x + w : x;
    ctx.fillText(text, alignX, y, w);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to render card to image'));
    }, 'image/png');
  });
}

export async function uploadGeneratedCard(projectId: string, personId: string, blob: Blob): Promise<string> {
  const path = `generated/${projectId}/${personId}.png`;
  const { error } = await supabase.storage.from('idcard-photos').upload(path, blob, {
    upsert: true,
    contentType: 'image/png',
  });
  if (error) throw error;

  const { data } = await supabase.storage.from('idcard-photos').createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? path;
}

// Bundles a set of already-generated card PNGs into a single multi-page PDF,
// one card per page, sized to the template's physical dimensions.
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

async function fetchAsDataUrl(url: string): Promise<string> {
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

// Generates cards for a batch of persons one at a time, reporting progress
// as it goes and recording a result row per person regardless of outcome.
// A single failure never aborts the batch (spec section 15).
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
      const blob = await renderCardToBlob(person, template, schoolName, academicYear);
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
        // If even recording the failure fails, we still keep going — the
        // in-memory progress counter below is the fallback source of truth.
      }
      progress.failed += 1;
    }

    progress.completed += 1;
    onProgress({ ...progress });
  }

  return progress;
}

import type { IdCardPerson, IdCardTemplate, TemplateField, TemplateLayout } from './types';
import { extractTemplateFieldSchema, validatePersonForTemplate } from './templateFieldSchema';

export interface ValidationIssue {
  type: 'error' | 'warning';
  fieldKey?: string;
  side?: 'front' | 'back';
  message: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

/**
 * Validates a single side layout against card physical millimeter dimensions
 */
export function validateSideFields(
  fields: TemplateField[],
  cardWidthMm: number,
  cardHeightMm: number,
  side: 'front' | 'back'
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of fields) {
    if (!field.visible) continue;

    // Bounds check
    if (field.x < 0 || field.y < 0) {
      issues.push({
        type: 'warning',
        fieldKey: field.key,
        side,
        message: `Field "${field.label || field.key}" is positioned outside the top/left card boundary (X: ${field.x.toFixed(1)}mm, Y: ${field.y.toFixed(1)}mm).`,
      });
    }

    if (field.x + field.width > cardWidthMm + 0.05 || field.y + field.height > cardHeightMm + 0.05) {
      issues.push({
        type: 'warning',
        fieldKey: field.key,
        side,
        message: `Field "${field.label || field.key}" overflows outside the card boundary (Right: ${(field.x + field.width).toFixed(1)}mm / ${cardWidthMm}mm, Bottom: ${(field.y + field.height).toFixed(1)}mm / ${cardHeightMm}mm).`,
      });
    }

    // Dimension check
    if (field.width <= 0 || field.height <= 0) {
      issues.push({
        type: 'error',
        fieldKey: field.key,
        side,
        message: `Field "${field.label || field.key}" has invalid size (${field.width} × ${field.height}mm).`,
      });
    }
  }

  return issues;
}

/**
 * Validates the entire ID card template before save or generation
 */
export function validateIdCardTemplate(template: {
  name?: string;
  card_width_mm: number;
  card_height_mm: number;
  background_url?: string | null;
  layout: TemplateLayout;
}): TemplateValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Dimensions check
  if (template.card_width_mm <= 10 || template.card_height_mm <= 10) {
    issues.push({
      type: 'error',
      message: 'Card dimensions must be greater than 10 mm.',
    });
  }

  // 2. Front side fields check
  const frontFields = template.layout.fields || [];
  issues.push(...validateSideFields(frontFields, template.card_width_mm, template.card_height_mm, 'front'));

  // 3. Double-sided template check
  const isDoubleSided = Boolean(
    template.layout.isDoubleSided || template.layout.templateType === 'double' || template.layout.back
  );

  if (isDoubleSided) {
    if (!template.layout.back) {
      issues.push({
        type: 'error',
        side: 'back',
        message: 'Double-sided mode is enabled, but the back side layout is not configured.',
      });
    } else {
      const backFields = template.layout.back.fields || [];
      issues.push(...validateSideFields(backFields, template.card_width_mm, template.card_height_mm, 'back'));

      if (backFields.length === 0 && !template.layout.back.backgroundUrl) {
        issues.push({
          type: 'warning',
          side: 'back',
          message: 'Back side has no elements or background image configured.',
        });
      }
    }
  }

  // 4. Background check
  const hasFrontBg = Boolean(
    template.background_url ||
    template.layout.backgroundUrl ||
    template.layout.backgroundColor ||
    template.layout.headerSvg
  );
  if (!hasFrontBg) {
    issues.push({
      type: 'warning',
      side: 'front',
      message: 'No front background image or background color configured.',
    });
  }

  // 5. Essential field warnings
  const allFields = [...frontFields, ...(template.layout.back?.fields || [])];
  const hasName = allFields.some((f) => f.key === 'student_name' && f.visible);
  if (!hasName) {
    issues.push({
      type: 'warning',
      message: 'Template does not have a visible Student/Person Name field.',
    });
  }

  const errors = issues.filter((i) => i.type === 'error').map((i) => i.message);
  const warnings = issues.filter((i) => i.type === 'warning').map((i) => i.message);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues,
  };
}

/**
 * Validates a batch of persons against a template before generation
 */
export function validateBatchBeforeGeneration(
  persons: IdCardPerson[],
  template: IdCardTemplate
): { valid: boolean; errors: string[]; warnings: string[] } {
  const templateResult = validateIdCardTemplate(template);
  const errors = [...templateResult.errors];
  const warnings = [...templateResult.warnings];

  if (persons.length === 0) {
    errors.push('No students or persons selected for generation.');
    return { valid: false, errors, warnings };
  }

  const schema = extractTemplateFieldSchema(template.layout);
  const missingFieldStats: Record<string, number> = {};

  for (const person of persons) {
    const res = validatePersonForTemplate(person, schema);
    if (!res.valid) {
      for (const fieldLabel of res.missingFields) {
        missingFieldStats[fieldLabel] = (missingFieldStats[fieldLabel] || 0) + 1;
      }
    }
  }

  for (const [fieldLabel, count] of Object.entries(missingFieldStats)) {
    if (fieldLabel.toLowerCase().includes('photo')) {
      warnings.push(`${count} student(s) do not have photos uploaded (placeholder will be rendered).`);
    } else {
      errors.push(`${count} student(s) have missing or blank ${fieldLabel}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

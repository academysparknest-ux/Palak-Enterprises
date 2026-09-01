import type {
  IdCardPerson,
  IdCardTemplate,
  TemplateField,
  TemplateFieldCategory,
  TemplateFieldKey,
  TemplateFieldSchema,
  TemplateFieldSchemaItem,
  TemplateFieldSource,
  TemplateLayout,
} from './types';
import {
  CANONICAL_FIELD_REGISTRY,
  normalizeHeader,
  normalizeStudentRecord,
  resolveCanonicalFieldKey,
  resolveTemplateFieldValue,
  validateBatchDataBindings,
  type CanonicalFieldKey,
  type CanonicalStudent,
} from './dataBindingRegistry';

export {
  CANONICAL_FIELD_REGISTRY,
  normalizeHeader,
  normalizeStudentRecord,
  resolveCanonicalFieldKey,
  resolveTemplateFieldValue,
  validateBatchDataBindings,
  type CanonicalFieldKey,
  type CanonicalStudent,
};

/**
 * Authoritative Field Registry mapping TemplateFieldKey to:
 * - Category (student_input, student_asset, auto_generated, static)
 * - Source (dynamic, static, system)
 * - Display label
 * - Input type
 * - Default requirement rule
 * - Target IdCardPerson model property
 */
export interface FieldMetadata {
  key: TemplateFieldKey;
  label: string;
  category: TemplateFieldCategory;
  source: TemplateFieldSource;
  type: 'text' | 'photo' | 'date' | 'select' | 'number';
  defaultRequired: boolean;
  modelKey: keyof IdCardPerson | 'student_photo' | string;
  description?: string;
}

/**
 * Generates a stable internal slug key from any display label
 * e.g. "Transport Route" -> "transport_route", "House / Clan" -> "house_clan"
 */
export function slugifyFieldKey(label: string): string {
  if (!label) return '';
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const FIELD_METADATA_REGISTRY: Record<string, FieldMetadata> = {
  // ── A. Student Dynamic Input Fields ───────────────────────
  student_name: {
    key: 'student_name',
    label: 'Student Name',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: true,
    modelKey: 'name',
    description: 'Full name of the student or person',
  },
  student_id: {
    key: 'student_id',
    label: 'Student ID',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: true,
    modelKey: 'student_id',
    description: 'Unique registration number or admission code',
  },
  class: {
    key: 'class',
    label: 'Class',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: true,
    modelKey: 'class',
    description: 'Grade, class, or standard',
  },
  section: {
    key: 'section',
    label: 'Section',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'section',
    description: 'Class division or section',
  },
  roll_number: {
    key: 'roll_number',
    label: 'Roll Number',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: true,
    modelKey: 'roll_number',
    description: 'Class roll number',
  },
  roll_no: {
    key: 'roll_number',
    label: 'Roll Number',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: true,
    modelKey: 'roll_number',
    description: 'Class roll number',
  },
  roll: {
    key: 'roll_number',
    label: 'Roll Number',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: true,
    modelKey: 'roll_number',
    description: 'Class roll number',
  },
  date_of_birth: {
    key: 'date_of_birth',
    label: 'Date of Birth',
    category: 'student_input',
    source: 'dynamic',
    type: 'date',
    defaultRequired: false,
    modelKey: 'date_of_birth',
    description: 'Birth date (YYYY-MM-DD)',
  },
  dob: {
    key: 'date_of_birth',
    label: 'Date of Birth',
    category: 'student_input',
    source: 'dynamic',
    type: 'date',
    defaultRequired: false,
    modelKey: 'date_of_birth',
    description: 'Birth date (YYYY-MM-DD)',
  },
  blood_group: {
    key: 'blood_group',
    label: 'Blood Group',
    category: 'student_input',
    source: 'dynamic',
    type: 'select',
    defaultRequired: false,
    modelKey: 'blood_group',
    description: 'Blood group (A+, B+, O+, AB+, etc.)',
  },
  blood: {
    key: 'blood_group',
    label: 'Blood Group',
    category: 'student_input',
    source: 'dynamic',
    type: 'select',
    defaultRequired: false,
    modelKey: 'blood_group',
    description: 'Blood group (A+, B+, O+, AB+, etc.)',
  },
  father_name: {
    key: 'father_name',
    label: "Father's Name",
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'father_name',
    description: "Father's or guardian's full name",
  },
  mother_name: {
    key: 'mother_name',
    label: "Mother's Name",
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'mother_name',
    description: "Mother's full name",
  },
  mothers_name: {
    key: 'mother_name',
    label: "Mother's Name",
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'mother_name',
    description: "Mother's full name",
  },
  mother: {
    key: 'mother_name',
    label: "Mother's Name",
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'mother_name',
    description: "Mother's full name",
  },
  parent_info: {
    key: 'parent_info',
    label: 'Parent Info',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'father_name',
    description: "Father's/Mother's combined info",
  },
  phone: {
    key: 'phone',
    label: 'Phone',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'phone',
    description: 'Contact phone or mobile number',
  },
  phone_no: {
    key: 'phone',
    label: 'Phone',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'phone',
    description: 'Contact phone or mobile number',
  },
  mobile: {
    key: 'phone',
    label: 'Phone',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'phone',
    description: 'Contact phone or mobile number',
  },
  emergency_no: {
    key: 'emergency_no',
    label: 'Emergency No',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'emergency_number',
    description: 'Student / Parent emergency contact number',
  },
  emergency_number: {
    key: 'emergency_no',
    label: 'Emergency No',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'emergency_number',
    description: 'Student / Parent emergency contact number',
  },
  emergency_phone: {
    key: 'emergency_no',
    label: 'Emergency No',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'emergency_number',
    description: 'Student / Parent emergency contact number',
  },
  emergency: {
    key: 'emergency_no',
    label: 'Emergency No',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'emergency_number',
    description: 'Student / Parent emergency contact number',
  },
  address: {
    key: 'address',
    label: 'Address',
    category: 'student_input',
    source: 'dynamic',
    type: 'text',
    defaultRequired: false,
    modelKey: 'address',
    description: 'Residential or correspondence address',
  },

  // ── B. Student Asset Fields ──────────────────────────────
  student_photo: {
    key: 'student_photo',
    label: 'Student Photo',
    category: 'student_asset',
    source: 'dynamic',
    type: 'photo',
    defaultRequired: true,
    modelKey: 'photo_url',
    description: 'Passport-style student photograph',
  },

  // ── C. Auto-Generated Fields ─────────────────────────────
  qr_code: {
    key: 'qr_code',
    label: 'QR Code',
    category: 'auto_generated',
    source: 'system',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Auto-generated QR code verification payload',
  },
  barcode: {
    key: 'barcode',
    label: 'Barcode',
    category: 'auto_generated',
    source: 'system',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Auto-generated Code128 / barcode',
  },

  // ── D. Static Template Fields ────────────────────────────
  school_logo: {
    key: 'school_logo',
    label: 'School Logo',
    category: 'static',
    source: 'static',
    type: 'photo',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Static institution logo',
  },
  school_name: {
    key: 'school_name',
    label: 'School Name',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Institution or school header name',
  },
  school_subtitle: {
    key: 'school_subtitle',
    label: 'School Title / Subtitle',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'School location or subtitle line',
  },
  academic_year: {
    key: 'academic_year',
    label: 'Academic Year',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Academic session year (e.g. 2026-27)',
  },
  batch: {
    key: 'batch',
    label: 'Batch',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Batch or academic session',
  },
  designation: {
    key: 'designation',
    label: 'Designation',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Role designation title',
  },
  valid_till: {
    key: 'valid_till',
    label: 'Valid Till',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Card validity expiry date',
  },
  terms: {
    key: 'terms',
    label: 'Terms / Return Policy',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Return policy and terms notice',
  },
  website: {
    key: 'website',
    label: 'Website',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'School official website URL',
  },
  custom_text: {
    key: 'custom_text',
    label: 'Custom Text',
    category: 'static',
    source: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Static custom text block',
  },
};

/**
 * Extracts the dynamic Field Schema from template elements across front and back sides.
 * Deduplicates fields and categorizes them into student_input, student_asset, auto_generated, and static.
 */
export function extractTemplateFieldSchema(
  templateOrLayout?: IdCardTemplate | TemplateLayout | null
): TemplateFieldSchema {
  if (!templateOrLayout) {
    return {
      items: [],
      studentInputFields: [],
      assetFields: [],
      autoGeneratedFields: [],
      staticFields: [],
    };
  }

  const layout: TemplateLayout = 'layout' in templateOrLayout ? templateOrLayout.layout : templateOrLayout;

  const frontFields = (layout.fields || []).filter((f) => f && f.visible !== false);
  const backFields = (layout.back?.fields || []).filter((f) => f && f.visible !== false);
  const allElements: TemplateField[] = [...frontFields, ...backFields];

  const seenKeys = new Set<string>();
  const items: TemplateFieldSchemaItem[] = [];

  for (const element of allElements) {
    const rawKey = element.customKey || element.key;
    if (!rawKey || seenKeys.has(rawKey)) continue;
    seenKeys.add(rawKey);

    const isFront = frontFields.some((f) => (f.customKey || f.key) === rawKey);
    const isBack = backFields.some((f) => (f.customKey || f.key) === rawKey);
    const side: 'front' | 'back' | 'both' = isFront && isBack ? 'both' : isFront ? 'front' : 'back';

    const canonKey = resolveCanonicalStudentKey(rawKey, element.label);
    const registered = FIELD_METADATA_REGISTRY[element.key] || FIELD_METADATA_REGISTRY[rawKey] || FIELD_METADATA_REGISTRY[canonKey];

    // Determine Source & Category:
    // If element explicitly defines source: 'static' | 'dynamic' | 'system', use that.
    // Otherwise fallback to registry definition or infer from key / element properties.
    let source: TemplateFieldSource = element.source || (registered ? registered.source : 'static');
    let category: TemplateFieldCategory = registered ? registered.category : 'static';

    if (element.source) {
      source = element.source;
      category =
        source === 'dynamic'
          ? (canonKey === 'student_photo' ? 'student_asset' : 'student_input')
          : source === 'system'
          ? 'auto_generated'
          : 'static';
    } else if (!registered) {
      // Unregistered custom field
      if (canonKey === 'student_photo') {
        source = 'dynamic';
        category = 'student_asset';
      } else if (canonKey === 'qr_code' || canonKey === 'barcode') {
        source = 'system';
        category = 'auto_generated';
      } else if (
        canonKey === 'student_id' ||
        canonKey === 'student_name' ||
        canonKey === 'class' ||
        canonKey === 'section' ||
        canonKey === 'roll_number' ||
        canonKey === 'date_of_birth' ||
        canonKey === 'blood_group' ||
        canonKey === 'batch' ||
        canonKey === 'father_name' ||
        canonKey === 'mother_name' ||
        canonKey === 'phone' ||
        canonKey === 'emergency_no' ||
        canonKey === 'address' ||
        element.customKey ||
        element.dataType ||
        element.key.startsWith('custom_dynamic_') ||
        (element.label && /roll|mother|father|emergency|blood|phone|mobile|dob|birth|address|class|sec/i.test(element.label))
      ) {
        source = 'dynamic';
        category = 'student_input';
      } else {
        source = 'static';
        category = 'static';
      }
    }

    const defaultType = registered ? registered.type : (element.dataType || 'text');
    const rawLabel = element.label || (registered ? registered.label : rawKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    const defaultLabel = rawLabel.replace(/[:\s]+$/, '').trim();
    const defaultRequired = registered ? registered.defaultRequired : (source === 'dynamic' && (canonKey === 'student_id' || canonKey === 'student_name'));
    const modelKey = registered ? registered.modelKey : canonKey;

    const isExplicitlyRequired = allElements
      .filter((el) => (el.customKey || el.key) === rawKey)
      .some((el) => el.required === true);
    const isExplicitlyOptional = allElements
      .filter((el) => (el.customKey || el.key) === rawKey)
      .some((el) => el.required === false);

    const required = isExplicitlyRequired
      ? true
      : isExplicitlyOptional
      ? false
      : defaultRequired;

    items.push({
      key: rawKey,
      label: defaultLabel,
      type: defaultType,
      required,
      category,
      source,
      modelKey,
      description: registered?.description,
      side,
      isCustom: !registered || Boolean(element.customKey),
      value: element.value || element.customText,
    });
  }

  const rawStudentInputFields = items.filter(
    (item) =>
      item.category === 'student_input' ||
      (item.source === 'dynamic' && item.category !== 'student_asset' && item.category !== 'auto_generated' && item.category !== 'static')
  );
  const studentInputFields = sortStudentFieldsByStandardOrder(rawStudentInputFields);
  const assetFields = items.filter((item) => item.category === 'student_asset');
  const autoGeneratedFields = items.filter((item) => item.category === 'auto_generated' || item.source === 'system');
  const staticFields = items.filter((item) => item.category === 'static' || item.source === 'static');

  return {
    items,
    studentInputFields,
    assetFields,
    autoGeneratedFields,
    staticFields,
  };
}

/**
 * Resolves any field key, slug, or label into its standard canonical student key
 */
export function resolveCanonicalStudentKey(key: string, label?: string): string {
  return resolveCanonicalFieldKey(key, label);
}

export const CANONICAL_DISPLAY_LABELS: Record<string, string> = {
  student_id: 'Student ID',
  student_name: 'Student Name',
  name: 'Student Name',
  class: 'Class',
  section: 'Section',
  roll_number: 'Roll Number',
  date_of_birth: 'Date of Birth',
  blood_group: 'Blood Group',
  batch: 'Batch',
  father_name: "Father's Name",
  mother_name: "Mother's Name",
  parent_info: 'Parent Info',
  phone: 'Phone',
  emergency_no: 'Emergency No',
  emergency_number: 'Emergency No',
  address: 'Address',
};

/**
 * Standard logical ordering for student ID card import and data fields:
 * Student ID first, then Student Name, followed by Class, Section, Roll No, etc.
 */
export const STANDARD_STUDENT_FIELD_ORDER: string[] = [
  'student_id',
  'student_name',
  'name',
  'class',
  'section',
  'roll_number',
  'date_of_birth',
  'blood_group',
  'batch',
  'father_name',
  'mother_name',
  'parent_info',
  'phone',
  'emergency_no',
  'emergency_number',
  'address',
];

export function sortStudentFieldsByStandardOrder(items: TemplateFieldSchemaItem[]): TemplateFieldSchemaItem[] {
  return [...items].sort((a, b) => {
    const canonA = resolveCanonicalStudentKey(a.key, a.label);
    const canonB = resolveCanonicalStudentKey(b.key, b.label);

    let indexA = STANDARD_STUDENT_FIELD_ORDER.indexOf(canonA);
    let indexB = STANDARD_STUDENT_FIELD_ORDER.indexOf(canonB);

    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;

    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return a.label.localeCompare(b.label);
  });
}

/**
 * Returns dynamic student fields from a template (only student_input fields)
 */
export function getDynamicStudentFields(
  templateOrLayout?: IdCardTemplate | TemplateLayout | null
): TemplateFieldSchemaItem[] {
  const schema = extractTemplateFieldSchema(templateOrLayout);
  return schema.studentInputFields;
}

/**
 * Returns static template fields from a template
 */
export function getStaticTemplateFields(
  templateOrLayout?: IdCardTemplate | TemplateLayout | null
): TemplateFieldSchemaItem[] {
  const schema = extractTemplateFieldSchema(templateOrLayout);
  return schema.staticFields;
}

/**
 * Validates a student person record against a template schema.
 * Returns missing required fields.
 */
export function validatePersonForTemplate(
  person: Partial<IdCardPerson>,
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): {
  valid: boolean;
  missingFields: string[];
  missingFieldKeys: string[];
} {
  const schema =
    schemaOrTemplate && 'studentInputFields' in schemaOrTemplate
      ? (schemaOrTemplate as TemplateFieldSchema)
      : extractTemplateFieldSchema(schemaOrTemplate as any);

  const missingFields: string[] = [];
  const missingFieldKeys: string[] = [];

  // Check required student dynamic inputs
  for (const item of schema.studentInputFields) {
    if (!item.required) continue;
    
    // Check primary model property, key, and custom_fields
    const modelVal = person[item.modelKey as keyof IdCardPerson];
    const keyVal = (person as any)[item.key];
    const customVal = person.custom_fields ? person.custom_fields[item.key] : undefined;

    const val = modelVal !== undefined && modelVal !== null && String(modelVal).trim() !== ''
      ? modelVal
      : keyVal !== undefined && keyVal !== null && String(keyVal).trim() !== ''
      ? keyVal
      : customVal;

    if (val === null || val === undefined || String(val).trim() === '') {
      missingFields.push(item.label);
      missingFieldKeys.push(item.key);
    }
  }

  // Check required asset fields (e.g. Photo)
  for (const item of schema.assetFields) {
    if (!item.required) continue;
    if (!person.photo_url || !person.photo_url.trim()) {
      missingFields.push(item.label);
      missingFieldKeys.push(item.key);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    missingFieldKeys,
  };
}

/**
 * Detects diff between old template layout and new template layout:
 * - Newly added required student fields
 * - Removed student fields
 */
export function detectTemplateSchemaDiff(
  oldLayout?: TemplateLayout | null,
  newLayout?: TemplateLayout | null
): {
  addedRequiredFields: TemplateFieldSchemaItem[];
  removedFields: TemplateFieldSchemaItem[];
} {
  const oldSchema = extractTemplateFieldSchema(oldLayout);
  const newSchema = extractTemplateFieldSchema(newLayout);

  const oldKeys = new Set([...oldSchema.studentInputFields, ...oldSchema.assetFields].map((f) => f.key));
  const newKeys = new Set([...newSchema.studentInputFields, ...newSchema.assetFields].map((f) => f.key));

  const addedRequiredFields = [...newSchema.studentInputFields, ...newSchema.assetFields].filter(
    (f) => !oldKeys.has(f.key) && f.required
  );

  const removedFields = [...oldSchema.studentInputFields, ...oldSchema.assetFields].filter(
    (f) => !newKeys.has(f.key)
  );

  return {
    addedRequiredFields,
    removedFields,
  };
}

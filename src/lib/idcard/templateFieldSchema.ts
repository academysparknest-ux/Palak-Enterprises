import type {
  IdCardPerson,
  IdCardTemplate,
  TemplateField,
  TemplateFieldCategory,
  TemplateFieldKey,
  TemplateFieldSchema,
  TemplateFieldSchemaItem,
  TemplateLayout,
} from './types';

/**
 * Authoritative Field Registry mapping TemplateFieldKey to:
 * - Category (student_input, student_asset, auto_generated, static)
 * - Display label
 * - Input type
 * - Default requirement rule
 * - Target IdCardPerson model property
 */
export interface FieldMetadata {
  key: TemplateFieldKey;
  label: string;
  category: TemplateFieldCategory;
  type: 'text' | 'photo' | 'date' | 'select';
  defaultRequired: boolean;
  modelKey: keyof IdCardPerson | 'student_photo';
  description?: string;
}

export const FIELD_METADATA_REGISTRY: Record<TemplateFieldKey, FieldMetadata> = {
  // ── A. Student Dynamic Input Fields ───────────────────────
  student_name: {
    key: 'student_name',
    label: 'Student Name',
    category: 'student_input',
    type: 'text',
    defaultRequired: true,
    modelKey: 'name',
    description: 'Full name of the student or person',
  },
  student_id: {
    key: 'student_id',
    label: 'Student ID',
    category: 'student_input',
    type: 'text',
    defaultRequired: true,
    modelKey: 'student_id',
    description: 'Unique registration number or admission code',
  },
  class: {
    key: 'class',
    label: 'Class',
    category: 'student_input',
    type: 'text',
    defaultRequired: true,
    modelKey: 'class',
    description: 'Grade, class, or standard',
  },
  section: {
    key: 'section',
    label: 'Section',
    category: 'student_input',
    type: 'text',
    defaultRequired: false,
    modelKey: 'section',
    description: 'Class division or section',
  },
  roll_number: {
    key: 'roll_number',
    label: 'Roll Number',
    category: 'student_input',
    type: 'text',
    defaultRequired: true,
    modelKey: 'roll_number',
    description: 'Class roll number',
  },
  date_of_birth: {
    key: 'date_of_birth',
    label: 'Date of Birth',
    category: 'student_input',
    type: 'date',
    defaultRequired: false,
    modelKey: 'date_of_birth',
    description: 'Birth date (YYYY-MM-DD)',
  },
  blood_group: {
    key: 'blood_group',
    label: 'Blood Group',
    category: 'student_input',
    type: 'select',
    defaultRequired: false,
    modelKey: 'blood_group',
    description: 'Blood group (A+, B+, O+, AB+, etc.)',
  },
  father_name: {
    key: 'father_name',
    label: "Father's Name",
    category: 'student_input',
    type: 'text',
    defaultRequired: false,
    modelKey: 'father_name',
    description: "Father's or guardian's full name",
  },
  mother_name: {
    key: 'mother_name',
    label: "Mother's Name",
    category: 'student_input',
    type: 'text',
    defaultRequired: false,
    modelKey: 'mother_name',
    description: "Mother's full name",
  },
  parent_info: {
    key: 'parent_info',
    label: 'Parent Info',
    category: 'student_input',
    type: 'text',
    defaultRequired: false,
    modelKey: 'father_name',
    description: "Father's/Mother's combined info",
  },
  phone: {
    key: 'phone',
    label: 'Phone',
    category: 'student_input',
    type: 'text',
    defaultRequired: false,
    modelKey: 'phone',
    description: 'Contact phone or mobile number',
  },
  address: {
    key: 'address',
    label: 'Address',
    category: 'student_input',
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
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Auto-generated QR code verification payload',
  },
  barcode: {
    key: 'barcode',
    label: 'Barcode',
    category: 'auto_generated',
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
    type: 'photo',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Static institution logo',
  },
  school_name: {
    key: 'school_name',
    label: 'School Name',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Institution or school header name',
  },
  school_subtitle: {
    key: 'school_subtitle',
    label: 'School Subtitle',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'School location or subtitle line',
  },
  academic_year: {
    key: 'academic_year',
    label: 'Academic Year',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Academic session year (e.g. 2026-27)',
  },
  batch: {
    key: 'batch',
    label: 'Batch',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Batch or academic session',
  },
  designation: {
    key: 'designation',
    label: 'Designation',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Role designation title',
  },
  emergency_no: {
    key: 'emergency_no',
    label: 'Emergency No',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Institution helpline / emergency number',
  },
  valid_till: {
    key: 'valid_till',
    label: 'Valid Till',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Card validity expiry date',
  },
  terms: {
    key: 'terms',
    label: 'Terms / Return Policy',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Return policy and terms notice',
  },
  website: {
    key: 'website',
    label: 'Website',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'School official website URL',
  },
  custom_text: {
    key: 'custom_text',
    label: 'Custom Text',
    category: 'static',
    type: 'text',
    defaultRequired: false,
    modelKey: 'student_id',
    description: 'Static custom text block',
  },
};

/**
 * Extracts the dynamic Field Schema from template elements across front and back sides.
 * Deduplicates fields and categorizes them.
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
    const key = element.key;
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);

    const isFront = frontFields.some((f) => f.key === key);
    const isBack = backFields.some((f) => f.key === key);
    const side: 'front' | 'back' | 'both' = isFront && isBack ? 'both' : isFront ? 'front' : 'back';

    const meta = FIELD_METADATA_REGISTRY[key] || {
      key,
      label: element.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      category: 'static',
      type: 'text',
      defaultRequired: false,
      modelKey: key as any,
    };

    const isExplicitlyRequired = allElements
      .filter((el) => el.key === key)
      .some((el) => el.required === true);
    const isExplicitlyOptional = allElements
      .filter((el) => el.key === key)
      .some((el) => el.required === false);

    const required = isExplicitlyRequired
      ? true
      : isExplicitlyOptional
      ? false
      : meta.defaultRequired;

    items.push({
      key: meta.key,
      label: meta.label,
      type: meta.type,
      required,
      category: meta.category,
      modelKey: meta.modelKey,
      description: meta.description,
      side,
    });
  }

  const studentInputFields = items.filter((item) => item.category === 'student_input');
  const assetFields = items.filter((item) => item.category === 'student_asset');
  const autoGeneratedFields = items.filter((item) => item.category === 'auto_generated');
  const staticFields = items.filter((item) => item.category === 'static');

  return {
    items,
    studentInputFields,
    assetFields,
    autoGeneratedFields,
    staticFields,
  };
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

  // Check required student inputs
  for (const item of schema.studentInputFields) {
    if (!item.required) continue;
    const val = person[item.modelKey as keyof IdCardPerson];
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

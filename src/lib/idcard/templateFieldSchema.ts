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

    const registered = FIELD_METADATA_REGISTRY[element.key];

    // Determine Source & Category:
    // If element explicitly defines source: 'static' | 'dynamic' | 'system', use that.
    // Otherwise fallback to registry definition or infer from key / element properties.
    let source: TemplateFieldSource = element.source || (registered ? registered.source : 'static');
    let category: TemplateFieldCategory = registered ? registered.category : 'static';

    if (element.source) {
      source = element.source;
      category =
        source === 'dynamic'
          ? (element.key === 'student_photo' ? 'student_asset' : 'student_input')
          : source === 'system'
          ? 'auto_generated'
          : 'static';
    } else if (!registered) {
      // Unregistered custom field
      if (element.key === 'student_photo') {
        source = 'dynamic';
        category = 'student_asset';
      } else if (element.key === 'qr_code' || element.key === 'barcode') {
        source = 'system';
        category = 'auto_generated';
      } else if (element.customKey || element.dataType || element.key.startsWith('custom_dynamic_')) {
        source = 'dynamic';
        category = 'student_input';
      } else {
        source = 'static';
        category = 'static';
      }
    }

    const defaultType = registered ? registered.type : (element.dataType || 'text');
    const defaultLabel = element.label || (registered ? registered.label : rawKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    const defaultRequired = registered ? registered.defaultRequired : (source === 'dynamic' && (rawKey === 'student_id' || rawKey === 'student_name'));
    const modelKey = registered ? registered.modelKey : rawKey;

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

  const studentInputFields = items.filter((item) => item.category === 'student_input' || (item.source === 'dynamic' && item.category !== 'student_asset'));
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

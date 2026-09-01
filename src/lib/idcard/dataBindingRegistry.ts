import { normalizeDate, normalizeBloodGroup, normalizePhone, sanitizeStudentId } from './validation';
import type {
  IdCardPerson,
  IdCardTemplate,
  TemplateField,
  TemplateFieldCategory,
  TemplateFieldSource,
  TemplateLayout,
} from './types';

// ============================================================
// 1. CANONICAL FIELD IDENTITY & DEFINITIONS
// ============================================================

export type CanonicalFieldKey =
  | 'student_name'
  | 'student_id'
  | 'class'
  | 'section'
  | 'roll_number'
  | 'blood_group'
  | 'father_name'
  | 'mother_name'
  | 'date_of_birth'
  | 'phone'
  | 'emergency_no'
  | 'emergency_number'
  | 'address'
  | 'photo_url'
  | 'valid_till'
  | 'batch'
  | 'designation'
  | 'qr_code'
  | 'barcode'
  | 'school_logo'
  | 'school_name'
  | 'school_subtitle'
  | 'academic_year'
  | 'terms'
  | 'website'
  | 'custom_text';

export interface CanonicalFieldDefinition {
  id: CanonicalFieldKey;
  label: string;
  aliases: string[];
  type: 'text' | 'photo' | 'date' | 'select' | 'number' | 'qr' | 'barcode';
  source: TemplateFieldSource;
  category: TemplateFieldCategory;
  modelKey: keyof CanonicalStudent | string;
  defaultRequired: boolean;
  description: string;
}

export const CANONICAL_FIELD_REGISTRY: Record<CanonicalFieldKey, CanonicalFieldDefinition> = {
  // ── A. Student Dynamic Input Fields ───────────────────────
  student_name: {
    id: 'student_name',
    label: 'Student Name',
    aliases: [
      'student_name',
      'student name',
      'studentname',
      'name',
      'full_name',
      'full name',
      'fullname',
      'candidatename',
      'candidate_name',
      'candidate name',
      'first_name',
      'firstname',
      'student',
      'student_full_name',
      'student full name',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'student_name',
    defaultRequired: true,
    description: 'Full legal name of the student or cardholder',
  },
  student_id: {
    id: 'student_id',
    label: 'Student ID',
    aliases: [
      'student_id',
      'student id',
      'studentid',
      'id',
      'id_number',
      'id number',
      'id_no',
      'id no',
      'idno',
      'admission_no',
      'admission no',
      'admissionno',
      'admission_number',
      'admission number',
      'adm_no',
      'adm no',
      'admno',
      'registration_no',
      'registration no',
      'registrationno',
      'registration_number',
      'registration number',
      'reg_no',
      'reg no',
      'regno',
      'scholar_no',
      'scholar no',
      'scholarno',
      'scholar_number',
      'scholar number',
      'sr_no',
      'sr no',
      'srno',
      's_no',
      's no',
      'sno',
      'enrollment_no',
      'enrollment no',
      'enrollmentno',
      'enrollment_number',
      'enrollment number',
      'student_code',
      'student code',
      'code',
      'card_no',
      'card no',
      'id_card_no',
      'id card no',
      'student_id_no',
      'student id no',
      'student_id_number',
      'student id number',
      'student id / adm no',
      'student id adm no',
      'student_id_adm_no',
      'student id / admission no',
      'id / adm no',
      'id_adm_no',
      'roll_id',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'student_id',
    defaultRequired: true,
    description: 'Unique registration, admission, or scholar code',
  },
  class: {
    id: 'class',
    label: 'Class',
    aliases: [
      'class',
      'grade',
      'standard',
      'std',
      'classname',
      'class_name',
      'class name',
      'course',
      'course_name',
      'course name',
      'department',
      'dept',
      'branch',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'class',
    defaultRequired: true,
    description: 'Grade, standard, or academic class',
  },
  section: {
    id: 'section',
    label: 'Section',
    aliases: [
      'section',
      'sec',
      'division',
      'div',
      'section_name',
      'section name',
      'sec_name',
      'stream',
      'group',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'section',
    defaultRequired: false,
    description: 'Class division or section group',
  },
  roll_number: {
    id: 'roll_number',
    label: 'Roll Number',
    aliases: [
      'roll_number',
      'roll number',
      'roll_no',
      'roll no',
      'roll no.',
      'roll',
      'rollnumber',
      'rollno',
      'r_no',
      'r no',
      'rno',
      'r.no',
      'r.no.',
      'roll_num',
      'roll num',
      'roll_code',
      'class_roll',
      'class roll',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'roll_number',
    defaultRequired: true,
    description: 'Class roll or position number',
  },
  date_of_birth: {
    id: 'date_of_birth',
    label: 'Date of Birth',
    aliases: [
      'date_of_birth',
      'date of birth',
      'dateofbirth',
      'dob',
      'd.o.b',
      'd.o.b.',
      'd_o_b',
      'd o b',
      'birth_date',
      'birth date',
      'birthdate',
      'bday',
      'birth',
    ],
    type: 'date',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'date_of_birth',
    defaultRequired: false,
    description: 'Birth date formatted as YYYY-MM-DD or standard display',
  },
  blood_group: {
    id: 'blood_group',
    label: 'Blood Group',
    aliases: [
      'blood_group',
      'blood group',
      'bloodgroup',
      'blood',
      'blood_grp',
      'blood grp',
      'bg',
      'blood_type',
      'blood type',
      'b_group',
      'bgroup',
    ],
    type: 'select',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'blood_group',
    defaultRequired: false,
    description: 'Blood group (A+, B+, O+, AB+, etc.)',
  },
  father_name: {
    id: 'father_name',
    label: "Father's Name",
    aliases: [
      'father_name',
      'father name',
      "father's name",
      'fathers name',
      'father',
      'fathername',
      'fathersname',
      "father's_name",
      'guardian_name',
      'guardian name',
      'guardian',
      'parent_name',
      'parent name',
      'parent_info',
      'parent info',
      'f_name',
      'fname',
      'dad_name',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'father_name',
    defaultRequired: false,
    description: "Father's or primary guardian's full name",
  },
  mother_name: {
    id: 'mother_name',
    label: "Mother's Name",
    aliases: [
      'mother_name',
      'mother name',
      "mother's name",
      'mothers name',
      'mother',
      'mothername',
      'mothersname',
      "mother's_name",
      'mother_contact',
      'm_name',
      'mname',
      'mom_name',
      'mom',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'mother_name',
    defaultRequired: false,
    description: "Mother's full name",
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    aliases: [
      'phone',
      'phone_number',
      'phone number',
      'phonenumber',
      'phone_no',
      'phone no',
      'phoneno',
      'mobile',
      'mobile_no',
      'mobile no',
      'mobileno',
      'mobile_number',
      'mobile number',
      'contact',
      'contact_no',
      'contact no',
      'contact_number',
      'contact number',
      'student_phone',
      'student phone',
      'student_mobile',
      'tel',
      'telephone',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'phone',
    defaultRequired: false,
    description: 'Primary contact telephone or mobile number',
  },
  emergency_number: {
    id: 'emergency_number',
    label: 'Emergency No',
    aliases: [
      'emergency_number',
      'emergency number',
      'emergencynumber',
      'emergency_no',
      'emergency no',
      'emergencyno',
      'emergency_phone',
      'emergency phone',
      'emergency_contact',
      'emergency contact',
      'emergency',
      'sos',
      'parent_phone',
      'parent phone',
      'parent_mobile',
      'parent mobile',
      'father_phone',
      'father phone',
      'mother_phone',
      'mother phone',
      'guardian_phone',
      'guardian phone',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'emergency_number',
    defaultRequired: false,
    description: 'Emergency contact telephone number',
  },
  emergency_no: {
    id: 'emergency_no',
    label: 'Emergency No',
    aliases: [
      'emergency_no',
      'emergency no',
      'emergencyno',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'emergency_number',
    defaultRequired: false,
    description: 'Emergency contact telephone number',
  },
  address: {
    id: 'address',
    label: 'Address',
    aliases: [
      'address',
      'addr',
      'residential_address',
      'residential address',
      'permanent_address',
      'permanent address',
      'home_address',
      'home address',
      'full_address',
      'full address',
      'location',
      'city',
      'street',
      'residence',
      'house_no',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'address',
    defaultRequired: false,
    description: 'Residential correspondence address',
  },
  batch: {
    id: 'batch',
    label: 'Batch',
    aliases: ['batch', 'academic_year', 'academic year', 'session', 'academic_session', 'year'],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'batch',
    defaultRequired: false,
    description: 'Academic session or batch period (e.g. 2026-27)',
  },
  valid_till: {
    id: 'valid_till',
    label: 'Valid Till',
    aliases: [
      'valid_till',
      'valid till',
      'valid_until',
      'valid until',
      'validity',
      'expiry',
      'expiry_date',
      'expiry date',
      'valid_upto',
      'valid upto',
      'valid_to',
    ],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'validity',
    defaultRequired: false,
    description: 'Card validity expiration period or date',
  },
  designation: {
    id: 'designation',
    label: 'Designation',
    aliases: ['designation', 'role', 'title', 'post', 'occupation'],
    type: 'text',
    source: 'dynamic',
    category: 'student_input',
    modelKey: 'designation',
    defaultRequired: false,
    description: 'Role designation or cardholder title',
  },

  // ── B. Student Asset Fields ──────────────────────────────
  photo_url: {
    id: 'photo_url',
    label: 'Student Photo',
    aliases: [
      'photo_url',
      'photo url',
      'photourl',
      'photo',
      'picture',
      'pic',
      'image',
      'image_url',
      'image url',
      'student_photo',
      'student photo',
      'photoname',
      'photo_name',
      'photo name',
      'photofile',
      'photo_file',
      'filename',
      'file_name',
      'file name',
      'photo_id',
    ],
    type: 'photo',
    source: 'dynamic',
    category: 'student_asset',
    modelKey: 'photo_url',
    defaultRequired: true,
    description: 'Passport-style student photograph asset',
  },

  // ── C. Auto-Generated System Fields ──────────────────────
  qr_code: {
    id: 'qr_code',
    label: 'QR Code',
    aliases: ['qr_code', 'qr code', 'qrcode', 'qr'],
    type: 'qr',
    source: 'system',
    category: 'auto_generated',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Secure digital cardholder verification QR code',
  },
  barcode: {
    id: 'barcode',
    label: 'Barcode',
    aliases: ['barcode', 'bar_code', 'code128', 'student_barcode'],
    type: 'barcode',
    source: 'system',
    category: 'auto_generated',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Optical Code 128 barcode encoding student ID',
  },

  // ── D. Static Template Elements ──────────────────────────
  school_logo: {
    id: 'school_logo',
    label: 'School Logo',
    aliases: ['school_logo', 'school logo', 'logo', 'institution_logo'],
    type: 'photo',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Static institution insignia / emblem',
  },
  school_name: {
    id: 'school_name',
    label: 'School Name',
    aliases: ['school_name', 'school name', 'institution_name', 'school'],
    type: 'text',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Primary institution header text',
  },
  school_subtitle: {
    id: 'school_subtitle',
    label: 'School Subtitle',
    aliases: ['school_subtitle', 'school subtitle', 'subtitle', 'tagline', 'location_subtitle'],
    type: 'text',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'School location or affiliation subtitle',
  },
  academic_year: {
    id: 'academic_year',
    label: 'Academic Year',
    aliases: ['academic_year', 'academic year', 'session', 'academic_session'],
    type: 'text',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Static academic session label',
  },
  terms: {
    id: 'terms',
    label: 'Terms / Return Policy',
    aliases: ['terms', 'terms_and_conditions', 'terms and conditions', 'policy', 'return_policy', 'instructions'],
    type: 'text',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Card return instructions and policy text',
  },
  website: {
    id: 'website',
    label: 'Website',
    aliases: ['website', 'web', 'url', 'school_website', 'domain'],
    type: 'text',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Institution official website URL',
  },
  custom_text: {
    id: 'custom_text',
    label: 'Custom Text',
    aliases: ['custom_text', 'custom text', 'static_text', 'text', 'label'],
    type: 'text',
    source: 'static',
    category: 'static',
    modelKey: 'student_id',
    defaultRequired: false,
    description: 'Custom static text element',
  },
};

// ============================================================
// 2. CANONICAL STUDENT OBJECT DEFINITION
// ============================================================

export interface CanonicalStudent {
  id?: string;
  project_id?: string;
  student_name: string;
  student_id: string;
  class: string | null;
  section: string | null;
  roll_number: string | null;
  blood_group: string | null;
  father_name: string | null;
  mother_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  emergency_no: string | null;
  address: string | null;
  photo_url: string | null;
  validity?: string | null;
  batch?: string | null;
  designation?: string | null;
  custom_fields?: Record<string, any>;

  // Backward compatibility alias getters on same object
  name?: string;
  roll_no?: string | null;
  roll?: string | null;
  dob?: string | null;
  emergency_number?: string | null;
  mothers_name?: string | null;
  [key: string]: any;
}

// ============================================================
// 3. HEADER NORMALIZATION PIPELINE
// ============================================================

/**
 * 8-Step Header Normalization Pipeline:
 * 1. Trim whitespace
 * 2. Lowercase
 * 3. Normalize apostrophes and punctuation
 * 4. Convert separators/spaces to clean single spaces/underscores
 * 5. Collapse duplicate underscores
 * 6. Match against custom fields
 * 7. Match against centralized alias registry
 * 8. Map to canonical field ID
 */
export function normalizeHeader(
  rawHeader: string,
  customFields?: Array<{ key: string; label?: string; modelKey?: string }> | string[]
): string {
  if (!rawHeader) return '';

  const clean = rawHeader
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032']/g, '') // strip apostrophes ("Mother's" -> "Mothers")
    .replace(/[.:;,\-_/\\]+/g, ' ') // convert punctuation/dashes to space
    .replace(/\s+/g, ' ')
    .trim();

  const cleanNoSpace = clean.replace(/\s+/g, '');
  const cleanSnake = rawHeader
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  // 1. Check custom fields
  if (customFields && customFields.length > 0) {
    for (const field of customFields) {
      const key = typeof field === 'string' ? field : field.key;
      const label = typeof field === 'string' ? '' : (field.label || '');
      const modelKey = typeof field === 'string' ? '' : (field.modelKey || '');

      const keyClean = key.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const keySnake = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const labelClean = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

      if (
        clean === keyClean ||
        cleanSnake === keySnake ||
        (label && clean === labelClean) ||
        (modelKey && cleanSnake === modelKey.toLowerCase())
      ) {
        return keySnake;
      }
    }
  }

  // 2. Check canonical registry aliases
  for (const [canonicalKey, def] of Object.entries(CANONICAL_FIELD_REGISTRY)) {
    for (const alias of def.aliases) {
      const aliasClean = alias
        .toLowerCase()
        .replace(/[\u2018\u2019\u201B\u2032']/g, '')
        .replace(/[.:;,\-_/\\]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const aliasNoSpace = aliasClean.replace(/\s+/g, '');

      if (clean === aliasClean || cleanNoSpace === aliasNoSpace || cleanSnake === alias.replace(/[^a-z0-9]+/g, '_')) {
        return canonicalKey;
      }
    }
  }

  return cleanSnake;
}

// ============================================================
// 4. CANONICAL STUDENT RECORD NORMALIZER
// ============================================================

/**
 * Normalizes ANY raw student record into a single unified CanonicalStudent structure.
 * Supports: Supabase DB records, CSV rows, Excel rows, sample mock records.
 * Guarantees:
 * - Leading zeros preserved for Student ID and Roll Number
 * - Clean whitespace without corrupting internal spaces (e.g. addresses)
 * - Strict field isolation (missing mother_name NEVER falls back to father_name)
 * - Normalized dates and blood groups
 */
export function normalizeStudentRecord(raw: Partial<IdCardPerson> | Record<string, any> | null | undefined): CanonicalStudent {
  if (!raw) {
    return {
      student_name: '',
      student_id: '',
      class: null,
      section: null,
      roll_number: null,
      blood_group: null,
      father_name: null,
      mother_name: null,
      date_of_birth: null,
      phone: null,
      emergency_no: null,
      address: null,
      photo_url: null,
      custom_fields: {},
    };
  }

  const customFields: Record<string, any> = { ...(raw.custom_fields || {}) };

  // Helper to extract value checking multiple aliases and custom fields
  const extractVal = (canonicalKey: CanonicalFieldKey, ...directKeys: string[]): string | null => {
    const def = CANONICAL_FIELD_REGISTRY[canonicalKey];
    const allKeysToCheck = Array.from(new Set([...directKeys, canonicalKey, ...(def ? def.aliases : [])]));

    for (const key of allKeysToCheck) {
      if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
        return String(raw[key]).trim();
      }
      if (customFields[key] !== undefined && customFields[key] !== null && String(customFields[key]).trim() !== '') {
        return String(customFields[key]).trim();
      }
    }
    return null;
  };

  // 1. Student Name
  const rawName =
    raw.student_name ||
    raw.name ||
    raw.fullName ||
    raw.full_name ||
    raw['Student Name'] ||
    raw['Full Name'] ||
    customFields.student_name ||
    customFields.name ||
    '';
  const studentName = String(rawName).trim();

  // 2. Student ID (Preserve leading zeros strictly, sanitize file extensions)
  const rawId =
    raw.student_id ??
    raw.id_no ??
    raw.admission_no ??
    raw.scholar_no ??
    raw.reg_no ??
    raw.roll_id ??
    raw['Student ID'] ??
    raw['Admission No'] ??
    customFields.student_id ??
    customFields.admission_no ??
    '';
  const studentId = sanitizeStudentId(String(rawId).trim());

  // 3. Class
  const classVal = extractVal('class', 'class', 'grade', 'standard', 'std', 'Class', 'Grade');

  // 4. Section
  const sectionVal = extractVal('section', 'section', 'sec', 'division', 'div', 'Section', 'Sec');

  // 5. Roll Number (Preserve leading zeros e.g. "08" or "8")
  const rollVal = extractVal('roll_number', 'roll_number', 'roll_no', 'roll', 'rollno', 'r_no', 'rno', 'Roll No', 'Roll Number', 'Roll');

  // 6. Blood Group
  const bloodRaw = extractVal('blood_group', 'blood_group', 'blood', 'blood_grp', 'bg', 'Blood Group', 'Blood');
  const bloodVal = bloodRaw ? normalizeBloodGroup(bloodRaw) : null;

  // 7. Father's Name (NEVER substitute for Mother's Name)
  const fatherVal = extractVal('father_name', 'father_name', 'father', 'fathers_name', "Father's Name", 'Father Name', 'guardian_name');

  // 8. Mother's Name (Strict isolation: if absent, remains null)
  const motherVal = extractVal('mother_name', 'mother_name', 'mother', 'mothers_name', "Mother's Name", 'Mother Name', 'Mother_Name');

  // 9. Date of Birth
  const dobRaw = extractVal('date_of_birth', 'date_of_birth', 'dob', 'birth_date', 'Date of Birth', 'DOB');
  const dobVal = dobRaw ? normalizeDate(dobRaw) : null;

  // 10. Phone
  const phoneRaw = extractVal('phone', 'phone', 'mobile', 'phone_number', 'phone_no', 'Phone', 'Mobile', 'Contact No');
  const phoneVal = phoneRaw ? normalizePhone(phoneRaw) : null;

  // 11. Emergency Number
  const emergencyRaw = extractVal('emergency_no', 'emergency_no', 'emergency_number', 'emergency_phone', 'Emergency No', 'Emergency Number', 'Emergency');
  const emergencyVal = emergencyRaw ? normalizePhone(emergencyRaw) : null;

  // 12. Address
  const addressVal = extractVal('address', 'address', 'addr', 'residential_address', 'Address');

  // 13. Photo URL
  const photoVal = extractVal('photo_url', 'photo_url', 'photo', 'picture', 'image_url', 'Photo', 'Student Photo');

  // 14. Validity / Batch / Designation
  const validityVal = extractVal('valid_till', 'validity', 'valid_till', 'valid_until', 'Valid Till');
  const batchVal = extractVal('batch', 'batch', 'academic_year', 'Batch', 'Session');
  const designationVal = extractVal('designation', 'designation', 'role', 'title', 'Designation') || 'Student';

  // Construct normalized CanonicalStudent
  const canonical: CanonicalStudent = {
    id: raw.id,
    project_id: raw.project_id,
    student_name: studentName,
    student_id: studentId,
    class: classVal,
    section: sectionVal,
    roll_number: rollVal,
    blood_group: bloodVal,
    father_name: fatherVal,
    mother_name: motherVal,
    date_of_birth: dobVal,
    phone: phoneVal,
    emergency_no: emergencyVal,
    address: addressVal,
    photo_url: photoVal,
    validity: validityVal,
    batch: batchVal,
    designation: designationVal,
    custom_fields: customFields,

    // Backward-compatible alias accessors on the object itself
    name: studentName,
    roll_no: rollVal,
    roll: rollVal,
    dob: dobVal,
    emergency_number: emergencyVal,
    mothers_name: motherVal,
  };

  return canonical;
}

// ============================================================
// 5. CANONICAL FIELD KEY RESOLVER
// ============================================================

/**
 * Maps any template element, key, customKey, labelPrefix, or label into its stable canonical field key.
 * Ensures legacy templates using `custom_text` with labelPrefix "MOTHER'S NAME:" correctly bind to `mother_name`.
 */
export function resolveCanonicalFieldKey(fieldOrKey: TemplateField | string, label?: string): CanonicalFieldKey | string {
  if (typeof fieldOrKey !== 'string') {
    const field = fieldOrKey;
    // 1. Explicit modern binding
    if ((field as any).binding?.fieldId) {
      return (field as any).binding.fieldId;
    }
    // 2. If customKey specified
    if (field.customKey) {
      const canon = normalizeHeader(field.customKey);
      if (CANONICAL_FIELD_REGISTRY[canon as CanonicalFieldKey]) return canon;
      return field.customKey;
    }
    // 3. Check key
    const canonFromKey = normalizeHeader(field.key);
    if (canonFromKey !== 'custom_text' && CANONICAL_FIELD_REGISTRY[canonFromKey as CanonicalFieldKey]) {
      return canonFromKey;
    }
    // 4. Legacy custom_text fallback: infer semantic binding from labelPrefix or label
    const rawLabel = field.labelPrefix || (field as any).label || (field as any).name || label || '';
    if (rawLabel) {
      const canonFromLabel = normalizeHeader(rawLabel);
      if (CANONICAL_FIELD_REGISTRY[canonFromLabel as CanonicalFieldKey]) {
        return canonFromLabel;
      }
    }
    return canonFromKey;
  }

  // String input
  const canon = normalizeHeader(fieldOrKey);
  if (CANONICAL_FIELD_REGISTRY[canon as CanonicalFieldKey]) return canon;
  if (label) {
    const canonLabel = normalizeHeader(label);
    if (CANONICAL_FIELD_REGISTRY[canonLabel as CanonicalFieldKey]) return canonLabel;
  }
  return canon;
}

// ============================================================
// 6. UNIVERSAL VALUE RESOLVER
// ============================================================

export interface ResolutionContext {
  schoolName?: string;
  academicYear?: string;
  emptyPlaceholder?: string;
}

/**
 * Universal Single Value Resolver:
 * Used identically across Template Editor, Real Student Preview, Card Generation,
 * PDF Rendering, Print Rendering, and Database Tables.
 *
 * Rules:
 * - Static fields return template static value
 * - System fields return computed payload (QR verification URL, Barcode)
 * - Dynamic student fields resolve strictly from the canonical student record
 * - Missing values return empty string or template placeholder, NEVER cross-contaminating other fields
 */
export function resolveTemplateFieldValue(
  field: TemplateField,
  student: CanonicalStudent | IdCardPerson | null | undefined,
  context?: ResolutionContext
): string {
  const schoolName = context?.schoolName || 'SPARKNEST ACADEMY';
  const academicYear = context?.academicYear || '2026-27';

  // 1. Static Elements
  if (field.source === 'static') {
    if (field.key === 'school_name') {
      return field.value || field.customText || schoolName;
    }
    if (field.key === 'school_subtitle') {
      return field.value || field.customText || 'Affiliated to CBSE, New Delhi';
    }
    if (field.key === 'academic_year' || field.key === 'batch') {
      return field.value || field.customText || academicYear;
    }
    return field.value ?? field.customText ?? '';
  }

  // 2. If no student is provided (e.g. raw template without data)
  if (!student) {
    return field.value ?? field.customText ?? '';
  }

  // 3. Normalize student record into canonical representation
  const canonicalStudent = 'student_name' in student ? (student as CanonicalStudent) : normalizeStudentRecord(student);

  // 4. Resolve canonical binding key
  const canonKey = resolveCanonicalFieldKey(field);

  // 5. Dynamic field lookup
  switch (canonKey) {
    case 'student_name':
      return canonicalStudent.student_name || field.customText || '';

    case 'student_id':
      return sanitizeStudentId(canonicalStudent.student_id) || field.customText || '';

    case 'class':
      return canonicalStudent.class ?? (field.customText || '');

    case 'section':
      return canonicalStudent.section ?? (field.customText || '');

    case 'roll_number':
      return canonicalStudent.roll_number ?? (field.customText || '');

    case 'date_of_birth':
      return canonicalStudent.date_of_birth ?? (field.customText || '');

    case 'blood_group':
      return canonicalStudent.blood_group ?? (field.customText || '');

    case 'father_name':
      return canonicalStudent.father_name ?? (field.customText || '');

    case 'mother_name':
      return canonicalStudent.mother_name ?? (field.customText || '');

    case 'parent_info':
      return [canonicalStudent.father_name, canonicalStudent.mother_name].filter(Boolean).join(' / ') || (field.customText || '');

    case 'phone':
      return canonicalStudent.phone ?? (field.customText || '');

    case 'emergency_no':
      return canonicalStudent.emergency_no ?? (field.customText || '');

    case 'address':
      return canonicalStudent.address ?? (field.customText || '');

    case 'batch':
      return canonicalStudent.batch ?? (field.value || field.customText || academicYear);

    case 'valid_till':
      return canonicalStudent.validity ?? (field.value || field.customText || '');

    case 'designation':
      return canonicalStudent.designation ?? (field.value || field.customText || 'Student');

    case 'school_name':
      return field.value || field.customText || schoolName;

    case 'school_subtitle':
      return field.value || field.customText || 'Affiliated to CBSE, New Delhi';

    case 'academic_year':
      return field.value || field.customText || academicYear;

    case 'terms':
      return field.value || field.customText || '';

    case 'website':
      return field.value || field.customText || '';

    case 'qr_code':
      return sanitizeStudentId(canonicalStudent.student_id);

    case 'barcode':
      return sanitizeStudentId(canonicalStudent.student_id);

    default: {
      // Check custom fields or direct dynamic keys
      const customVal =
        canonicalStudent.custom_fields?.[canonKey] ??
        canonicalStudent.custom_fields?.[field.key] ??
        canonicalStudent[canonKey] ??
        canonicalStudent[field.key];

      if (customVal !== undefined && customVal !== null && String(customVal).trim() !== '') {
        return String(customVal).trim();
      }
      return field.value ?? field.customText ?? '';
    }
  }
}

// ============================================================
// 7. BATCH DATA-BINDING INTEGRITY VALIDATOR
// ============================================================

export interface FieldQualityStat {
  fieldId: string;
  label: string;
  total: number;
  presentCount: number;
  missingCount: number;
  missingPercentage: number;
  required: boolean;
  samplePresentValue?: string;
  affectedStudentIds: string[];
}

export interface BatchDataBindingValidationResult {
  totalStudents: number;
  readyCount: number;
  warningCount: number;
  fieldStats: FieldQualityStat[];
  brokenBindings: Array<{ fieldKey: string; reason: string }>;
  canGenerate: boolean;
  warnings: string[];
}

/**
 * Validates an entire batch of students against the active template schema
 * before card generation to eliminate silent incomplete cards.
 */
export function validateBatchDataBindings(
  rawStudents: Array<Partial<IdCardPerson> | Record<string, any>>,
  templateOrLayout?: IdCardTemplate | TemplateLayout | null
): BatchDataBindingValidationResult {
  const students = rawStudents.map((s) => normalizeStudentRecord(s));
  const totalStudents = students.length;

  const layout: TemplateLayout | null = templateOrLayout
    ? 'layout' in templateOrLayout
      ? templateOrLayout.layout
      : templateOrLayout
    : null;

  const frontFields = (layout?.fields || []).filter((f) => f && f.visible !== false);
  const backFields = (layout?.back?.fields || []).filter((f) => f && f.visible !== false);
  const allElements = [...frontFields, ...backFields];

  const fieldStatsMap = new Map<string, FieldQualityStat>();
  const brokenBindings: Array<{ fieldKey: string; reason: string }> = [];

  for (const element of allElements) {
    if (element.source === 'static') continue;
    const canonKey = resolveCanonicalFieldKey(element);
    const def = CANONICAL_FIELD_REGISTRY[canonKey as CanonicalFieldKey];
    const label = element.label || (def ? def.label : canonKey);

    if (!fieldStatsMap.has(canonKey)) {
      fieldStatsMap.set(canonKey, {
        fieldId: canonKey,
        label,
        total: totalStudents,
        presentCount: 0,
        missingCount: 0,
        missingPercentage: 0,
        required: element.required ?? (def ? def.defaultRequired : false),
        affectedStudentIds: [],
      });
    }
  }

  // Evaluate each student
  let warningCount = 0;
  for (const student of students) {
    let studentHasMissingRequired = false;

    for (const [canonKey, stat] of fieldStatsMap.entries()) {
      const dummyField: TemplateField = {
        key: canonKey as any,
        source: 'dynamic',
        visible: true,
        x: 0, y: 0, width: 10, height: 10,
      };

      const val = resolveTemplateFieldValue(dummyField, student);
      if (val && val.trim()) {
        stat.presentCount++;
        if (!stat.samplePresentValue) {
          stat.samplePresentValue = val;
        }
      } else {
        stat.missingCount++;
        stat.affectedStudentIds.push(student.student_id || student.student_name || 'Unknown');
        if (stat.required) {
          studentHasMissingRequired = true;
        }
      }
    }

    if (studentHasMissingRequired) {
      warningCount++;
    }
  }

  const fieldStats = Array.from(fieldStatsMap.values()).map((stat) => ({
    ...stat,
    missingPercentage: totalStudents > 0 ? Number(((stat.missingCount / totalStudents) * 100).toFixed(1)) : 0,
  }));

  const warnings: string[] = [];
  for (const stat of fieldStats) {
    if (stat.missingCount > 0) {
      if (stat.required) {
        warnings.push(`Required field '${stat.label}' is missing for ${stat.missingCount} of ${totalStudents} students.`);
      } else {
        warnings.push(`Optional field '${stat.label}' is empty for ${stat.missingCount} of ${totalStudents} students.`);
      }
    }
  }

  return {
    totalStudents,
    readyCount: totalStudents - warningCount,
    warningCount,
    fieldStats,
    brokenBindings,
    canGenerate: brokenBindings.length === 0,
    warnings,
  };
}

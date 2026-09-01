import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { normalizeDate, normalizeBloodGroup, normalizePhone, sanitizeStudentId } from './validation';
import type { CsvValidationRow, IdCardPerson, IdCardTemplate, TemplateFieldSchema, TemplateLayout } from './types';
import { extractTemplateFieldSchema, resolveCanonicalStudentKey, CANONICAL_DISPLAY_LABELS } from './templateFieldSchema';
import { normalizeHeader, normalizeStudentRecord } from './dataBindingRegistry';

export interface ParseCsvResult {
  rows: CsvValidationRow[];
  missingHeaders: string[];
  ignoredHeaders: string[];
  validCount: number;
  invalidCount: number;
  detectedHeaders: string[];
  rawHeaders?: string[];
  canonicalHeaders?: string[];
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  summary?: {
    total: number;
    validCount: number;
    invalidCount: number;
    hasErrors: boolean;
  };
}

/**
 * Mapping of canonical fields to possible CSV/Excel header aliases (lowercase, spaces/underscores stripped)
 */
export const HEADER_ALIASES: Record<string, string[]> = {
  student_id: [
    'studentid',
    'student_id',
    'student id',
    'id',
    'admissionno',
    'admission_no',
    'admission no',
    'admno',
    'adm_no',
    'adm no',
    'registrationno',
    'registration_no',
    'registration no',
    'regno',
    'reg_no',
    'reg no',
    'scholar_no',
    'scholar no',
    'scholarno',
    'sr_no',
    'sr no',
    'srno',
    's_no',
    's no',
    'sno',
    'enrollment_no',
    'enrollment no',
    'enrollmentno',
    'student_code',
    'student code',
    'code',
    'card_no',
    'card no',
    'id_card_no',
    'id card no',
  ],
  photo_url: [
    'photo',
    'photourl',
    'photo_url',
    'photo url',
    'photoname',
    'photo_name',
    'photo name',
    'photofile',
    'photo_file',
    'photo file',
    'image',
    'imageurl',
    'image_url',
    'image url',
    'imagename',
    'image_name',
    'image name',
    'picture',
    'pic',
    'picname',
    'pic_name',
    'filename',
    'file_name',
    'file name',
    'photo_id',
    'photo id',
    'student_photo',
    'student photo',
  ],
  name: [
    'name',
    'studentname',
    'student_name',
    'student name',
    'fullname',
    'full_name',
    'full name',
    'candidatename',
    'candidate_name',
    'candidate name',
    'first_name',
    'firstname',
    'student',
  ],
  class: ['class', 'grade', 'standard', 'std', 'classname', 'class_name', 'class name'],
  section: ['section', 'sec', 'division', 'div', 'section_name', 'sec_name'],
  roll_number: [
    'rollnumber',
    'roll_number',
    'roll number',
    'rollno',
    'roll_no',
    'roll no',
    'roll',
    'r_no',
    'r no',
    'rno',
  ],
  date_of_birth: [
    'dateofbirth',
    'date_of_birth',
    'date of birth',
    'dob',
    'd.o.b',
    'd_o_b',
    'birthdate',
    'birth_date',
    'birth date',
    'bday',
  ],
  blood_group: [
    'bloodgroup',
    'blood_group',
    'blood group',
    'blood',
    'blood_grp',
    'blood grp',
    'bg',
    'blood_type',
    'blood type',
  ],
  father_name: [
    'fathername',
    'father_name',
    'father name',
    "father's name",
    'fathers name',
    'father',
    'guardianname',
    'guardian_name',
    'guardian name',
    'guardian',
    'parent_name',
    'parent name',
    'parent_info',
    'parent info',
  ],
  mother_name: [
    'mothername',
    'mother_name',
    'mother name',
    "mother's name",
    'mothers name',
    'mother',
    "mother's_name",
  ],
  phone: [
    'phone',
    'phonenumber',
    'phone_number',
    'phone number',
    'phone_no',
    'phone no',
    'mobile',
    'mobileno',
    'mobile_no',
    'mobile number',
    'student_phone',
    'student phone',
    'student_mobile',
  ],
  emergency_number: [
    'emergency_number',
    'emergency number',
    'emergency_no',
    'emergency no',
    'emergency_phone',
    'emergency phone',
    'emergency_contact',
    'emergency contact',
    'parent_phone',
    'parent phone',
    'father_phone',
    'father phone',
    'mother_phone',
    'guardian_phone',
    'guardian phone',
    'emergency_mobile',
    'parent_mobile',
  ],
  address: [
    'address',
    'addr',
    'residentialaddress',
    'residential_address',
    'residential address',
    'permanent_address',
    'permanent address',
    'location',
    'city',
    'full_address',
    'full address',
    'home_address',
    'home address',
    'street',
    'house_no',
  ],
};

/**
 * Normalizes any header into its canonical field name using the unified 8-step pipeline
 */
export function mapHeaderToCanonical(
  header: string,
  customFields: Array<{ key: string; label?: string; modelKey?: string }> | string[] = []
): string {
  return normalizeHeader(header, customFields);
}

export function parseAndValidateCsv(
  csvText: string,
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): ParseCsvResult {
  // Derive field schema
  const schema: TemplateFieldSchema =
    schemaOrTemplate && 'studentInputFields' in schemaOrTemplate
      ? (schemaOrTemplate as TemplateFieldSchema)
      : extractTemplateFieldSchema(schemaOrTemplate as any);

  const customFields = schema.studentInputFields.map((f) => ({
    key: f.key,
    label: f.label,
    modelKey: String(f.modelKey || ''),
  }));

  const rawHeaders: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => {
      rawHeaders.push(h);
      return mapHeaderToCanonical(h, customFields);
    },
  });

  const canonicalHeaders = (parsed.meta.fields ?? []).map((h) => h.trim());

  // Determine required template fields (dynamic student fields only)
  const templateRelevantFields = schema.studentInputFields;
  const requiredSchemaItems = templateRelevantFields.filter((f) => f.required);

  const missingHeaders: string[] = [];

  if (requiredSchemaItems.length > 0) {
    for (const item of requiredSchemaItems) {
      const canonicalKey = item.modelKey === 'photo_url' || item.key === 'student_photo'
        ? 'photo_url'
        : String(item.modelKey || item.key);
      const isPresent = canonicalHeaders.includes(canonicalKey) || canonicalHeaders.includes(item.key);
      if (!isPresent) {
        missingHeaders.push(item.label);
      }
    }
  } else {
    // Default fallback requirements if no schema was supplied
    if (!canonicalHeaders.includes('student_id')) missingHeaders.push('Student ID');
    if (!canonicalHeaders.includes('name') && !canonicalHeaders.includes('student_name')) missingHeaders.push('Student Name');
  }

  // Identify extra columns that are NOT in the active template schema
  const validCanonicalKeys = new Set<string>();
  for (const f of templateRelevantFields) {
    const rawF = (f.key || '').trim().toLowerCase();
    const canonF = resolveCanonicalStudentKey(f.key, f.label);
    validCanonicalKeys.add(rawF);
    validCanonicalKeys.add(canonF);
    if (f.modelKey) validCanonicalKeys.add(String(f.modelKey).toLowerCase());
  }
  validCanonicalKeys.add('student_id');
  validCanonicalKeys.add('name');
  validCanonicalKeys.add('student_name');
  validCanonicalKeys.add('photo_url');
  validCanonicalKeys.add('photo');

  const ignoredHeaders: string[] = [];
  for (const h of canonicalHeaders) {
    const canonH = resolveCanonicalStudentKey(h);
    if (!validCanonicalKeys.has(h) && !validCanonicalKeys.has(canonH)) {
      // Find human-readable label
      const originalHeader = rawHeaders.find((raw) => mapHeaderToCanonical(raw, customFields) === h) || h;
      if (!ignoredHeaders.includes(originalHeader)) {
        ignoredHeaders.push(originalHeader);
      }
    }
  }

  const rows: CsvValidationRow[] = parsed.data.map((raw, idx) => {
    const rowNumber = idx + 2; // header is row 1

    // Clean string values
    const cleanedRaw: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined && v !== null) {
        cleanedRaw[k] = String(v).trim();
      }
    }

    const errors: string[] = [];

    // Robust value extraction supporting aliases
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        if (cleanedRaw[k] !== undefined && cleanedRaw[k] !== null && cleanedRaw[k] !== '') {
          return cleanedRaw[k];
        }
      }
      return '';
    };

    const normalized = normalizeStudentRecord(cleanedRaw);
    const studentNameVal = normalized.student_name;
    const studentIdVal = normalized.student_id;
    const classVal = normalized.class;
    const sectionVal = normalized.section;
    const rollNumberVal = normalized.roll_number;
    const dobVal = normalized.date_of_birth;
    const bloodGroupVal = normalized.blood_group;
    const fatherNameVal = normalized.father_name;
    const motherNameVal = normalized.mother_name;
    const phoneVal = normalized.phone;
    const emergencyVal = normalized.emergency_no;
    const addressVal = normalized.address;
    const photoUrlVal = normalized.photo_url;

    // Validate student ID
    if (!studentIdVal) {
      errors.push('Student ID is required');
    }

    // Validate Name
    if (!studentNameVal) {
      errors.push('Student Name is required');
    }

    // Validate other template-required fields
    for (const item of requiredSchemaItems) {
      const canonItem = resolveCanonicalStudentKey(item.key, item.label);
      const val =
        cleanedRaw[item.key] ||
        cleanedRaw[canonItem] ||
        cleanedRaw[String(item.modelKey)] ||
        getVal(item.key, canonItem);
      if (!val || !val.trim()) {
        const errorMsg = `${item.label} is required by template`;
        if (!errors.includes(errorMsg)) {
          errors.push(errorMsg);
        }
      }
    }

    // Normalize phone format if provided
    if (phoneVal && !/^[\+0-9\-\s\(\)]{6,20}$/.test(phoneVal.trim())) {
      errors.push('Invalid phone number format');
    }
    if (emergencyVal && !/^[\+0-9\-\s\(\)]{6,20}$/.test(emergencyVal.trim())) {
      errors.push('Invalid emergency contact number format');
    }

    // Extract custom dynamic fields & aliases
    const customFieldsData: Record<string, any> = { ...(normalized.custom_fields || {}) };
    if (motherNameVal) customFieldsData.mothers_name = motherNameVal;
    if (rollNumberVal) customFieldsData.roll_no = rollNumberVal;
    if (emergencyVal) customFieldsData.emergency_no = emergencyVal;

    for (const item of schema.studentInputFields) {
      const canonKey = resolveCanonicalStudentKey(item.key, item.label);
      const val = cleanedRaw[item.key] || cleanedRaw[canonKey] || cleanedRaw[String(item.modelKey)];
      if (val !== undefined && val !== null && val !== '') {
        customFieldsData[item.key] = val;
      }
    }

    const rowData: Partial<IdCardPerson> = {
      student_id: sanitizeStudentId(studentIdVal) || '',
      name: studentNameVal || '',
      class: classVal,
      section: sectionVal,
      roll_number: rollNumberVal,
      date_of_birth: dobVal ? normalizeDate(dobVal) : null,
      blood_group: bloodGroupVal ? normalizeBloodGroup(bloodGroupVal) : null,
      father_name: fatherNameVal,
      mother_name: motherNameVal,
      phone: phoneVal ? normalizePhone(phoneVal) : null,
      emergency_number: emergencyVal ? normalizePhone(emergencyVal) : null,
      address: addressVal,
      photo_url: photoUrlVal,
      custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : undefined,
    };

    // Also populate top-level dynamic keys for direct property access
    for (const [k, v] of Object.entries(customFieldsData)) {
      (rowData as any)[k] = v;
    }

    return {
      rowNumber,
      data: rowData,
      errors,
      valid: errors.length === 0,
    };
  });

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return {
    rawHeaders,
    canonicalHeaders,
    detectedHeaders: canonicalHeaders,
    missingHeaders,
    ignoredHeaders,
    rows,
    totalRows: rows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    validCount,
    invalidCount,
    summary: {
      total: rows.length,
      validCount,
      invalidCount,
      hasErrors: missingHeaders.length > 0 || rows.some((r) => !r.valid),
    },
  };
}

/**
 * Parses either a CSV or Excel (.xlsx / .xls) file into validated student rows.
 * Preserves leading zeros for Student IDs (e.g. 0001 remains "0001").
 */
export async function parseSpreadsheetFile(
  file: File,
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): Promise<ParseCsvResult> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, {
      type: 'array',
      raw: false, // Read formatted text strings to preserve leading zeros
      cellText: true,
    });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('The uploaded Excel workbook contains no sheets.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    // Convert worksheet to CSV string format preserving strings
    const csvText = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false, forceQuotes: true });
    return parseAndValidateCsv(csvText, schemaOrTemplate);
  }

  // Handle standard text CSV
  const text = await file.text();
  return parseAndValidateCsv(text, schemaOrTemplate);
}

/**
 * Template-Driven Sample Data Generator/**
 * Generates columns and sample records tailored strictly to the selected template schema in standard order.
 * Rule 19 & 35: Excludes photo filename column, static school details, and system QR/barcode.
 * Student ID is always 1st, Student Name 2nd, followed by Class, Section, Roll No, etc.
 */
export function getTemplateSampleData(
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): { headers: string[]; rows: string[][] } {
  const schema: TemplateFieldSchema =
    schemaOrTemplate && 'studentInputFields' in schemaOrTemplate
      ? (schemaOrTemplate as TemplateFieldSchema)
      : extractTemplateFieldSchema(schemaOrTemplate as any);

  // ONLY dynamic student input fields, guaranteed in standard logical order (Student ID first, Student Name second)
  const relevantItems = schema.studentInputFields;

  // If no fields in template (or fallback), return standard dynamic student set in strict standard order
  if (relevantItems.length === 0) {
    return {
      headers: ['Student ID', 'Student Name', 'Class', 'Roll Number'],
      rows: [
        ['0001', 'Olivia Wilson', '8th Standard', '1'],
        ['0002', 'Rahul Kumar', '9th Standard', '2'],
        ['0003', 'Priya Sharma', '10th Standard', '3'],
      ],
    };
  }

  // Map each schema field to header and sample cell values
  const SAMPLE_STUDENT_VALUES: Record<string, string[]> = {
    student_id: ['0001', '0002', '0003'],
    student_name: ['Olivia Wilson', 'Rahul Kumar', 'Priya Sharma'],
    name: ['Olivia Wilson', 'Rahul Kumar', 'Priya Sharma'],
    class: ['8th Standard', '9th Standard', '10th Standard'],
    section: ['A', 'B', 'A'],
    roll_number: ['1', '2', '3'],
    date_of_birth: ['15/05/2012', '20/11/2011', '08/03/2010'],
    blood_group: ['B+', 'O+', 'AB+'],
    batch: ['2026', '2026', '2026'],
    father_name: ['Bravia Wilson', 'Suresh Kumar', 'Ramesh Sharma'],
    mother_name: ['Maria Wilson', 'Anita Devi', 'Sunita Sharma'],
    parent_info: ['Bravia Wilson', 'Suresh Kumar', 'Ramesh Sharma'],
    phone: ['9876543210', '9123456780', '9876501234'],
    emergency_no: ['9905238015', '9876543210', '9811223344'],
    emergency_number: ['9905238015', '9876543210', '9811223344'],
    address: [
      '136-Anandpuri, Motihari, Bihar',
      'Station Road, Motihari, Bihar',
      'Main Market, Motihari, Bihar',
    ],
  };

  const headers = relevantItems.map((item) => {
    const canon = resolveCanonicalStudentKey(item.key, item.label);
    return CANONICAL_DISPLAY_LABELS[canon] || item.label;
  });

  const rows: string[][] = [0, 1, 2].map((studentIndex) => {
    return relevantItems.map((item) => {
      const canon = resolveCanonicalStudentKey(item.key, item.label);
      const sampleVals =
        SAMPLE_STUDENT_VALUES[canon] ||
        SAMPLE_STUDENT_VALUES[item.key] || [
          `Sample ${item.label} 1`,
          `Sample ${item.label} 2`,
          `Sample ${item.label} 3`,
        ];
      return sampleVals[studentIndex] || `Sample ${studentIndex + 1}`;
    });
  });

  return { headers, rows };
}

/**
 * Generates a template-specific ready-to-use Sample CSV text for downloading
 */
export function generateSampleCsv(
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): string {
  const { headers, rows } = getTemplateSampleData(schemaOrTemplate);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
  ];
  return csvLines.join('\n');
}

/**
 * Generates a template-specific Excel workbook Blob (.xlsx) for downloading.
 * Formats Student IDs, Phone numbers, Emergency numbers as explicit text cells to preserve leading zeros.
 */
export function generateSampleExcelBlob(
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): Blob {
  const { headers, rows } = getTemplateSampleData(schemaOrTemplate);
  const data = [headers, ...rows];

  const worksheet = XLSX.utils.aoa_to_sheet(data, { cellDates: false });

  // Set generous column widths so text is never truncated
  worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 6, 16) }));

  // Explicitly force text format ('@') for sensitive columns (ID, Phone, Roll No, Emergency)
  const textColIndices = headers
    .map((h, i) => ({ h: h.toLowerCase(), i }))
    .filter(({ h }) =>
      h.includes('id') ||
      h.includes('phone') ||
      h.includes('emergency') ||
      h.includes('roll') ||
      h.includes('contact') ||
      h.includes('mobile')
    )
    .map(({ i }) => i);

  for (let r = 1; r <= rows.length; r++) {
    for (const c of textColIndices) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (worksheet[cellRef]) {
        worksheet[cellRef].t = 's'; // Force string type
        worksheet[cellRef].z = '@'; // Force text format
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generates a complete standard student roster sample containing ALL standard dynamic fields
 */
export function getFullRosterSampleData(): { headers: string[]; rows: string[][] } {
  const headers = [
    'Student ID',
    'Student Name',
    'Class',
    'Section',
    'Roll Number',
    'Date of Birth',
    'Blood Group',
    "Father's Name",
    "Mother's Name",
    'Phone',
    'Address',
  ];

  const rows = [
    [
      '0001',
      'Rahul Kumar',
      '10th Standard',
      'A',
      '1',
      '15/05/2010',
      'B+',
      'Suresh Kumar',
      'Sunita Devi',
      '+91 9876543210',
      '136-Anandpuri, Station Road, Motihari, Bihar',
    ],
    [
      '0002',
      'Priya Sharma',
      '10th Standard',
      'A',
      '2',
      '20/11/2010',
      'O+',
      'Ramesh Sharma',
      'Anita Sharma',
      '+91 9123456780',
      'Main Market, Motihari, Bihar',
    ],
    [
      '0003',
      'Aarav Singh',
      '9th Standard',
      'B',
      '3',
      '08/03/2011',
      'AB+',
      'Vijay Singh',
      'Pooja Singh',
      '+91 9876501234',
      'Near Railway Station, Motihari, Bihar',
    ],
  ];

  return { headers, rows };
}

export function generateFullRosterSampleCsv(): string {
  const { headers, rows } = getFullRosterSampleData();
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
  ];
  return csvLines.join('\n');
}

export function generateFullRosterSampleExcelBlob(): Blob {
  const { headers, rows } = getFullRosterSampleData();
  const data = [headers, ...rows];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 5, 15) }));

  // Force string type on student ID column (first col)
  for (let r = 1; r <= rows.length; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (worksheet[cellRef]) worksheet[cellRef].t = 's';
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'All Students');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}


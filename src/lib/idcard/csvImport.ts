import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { normalizeDate, normalizeBloodGroup, normalizePhone, sanitizeStudentId } from './validation';
import type { CsvValidationRow, IdCardPerson, IdCardTemplate, TemplateFieldSchema, TemplateLayout } from './types';
import { extractTemplateFieldSchema } from './templateFieldSchema';

export interface ParseCsvResult {
  rows: CsvValidationRow[];
  missingHeaders: string[];
  ignoredHeaders: string[];
  validCount: number;
  invalidCount: number;
  detectedHeaders: string[];
}

/**
 * Mapping of canonical fields to possible CSV/Excel header aliases (lowercase, spaces/underscores stripped)
 */
const HEADER_ALIASES: Record<string, string[]> = {
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
    'contact',
    'contactno',
    'contact_no',
    'contact number',
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
 * Normalizes any header into its canonical field name
 */
export function mapHeaderToCanonical(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
  const cleanNoSpace = clean.replace(/\s+/g, '');

  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const aliasClean = alias.replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
      const aliasNoSpace = alias.replace(/\s+/g, '');
      if (clean === aliasClean || cleanNoSpace === aliasNoSpace) {
        return canonical;
      }
    }
  }

  // Default to cleaned header
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseAndValidateCsv(
  csvText: string,
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): ParseCsvResult {
  const rawHeaders: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => {
      rawHeaders.push(h);
      return mapHeaderToCanonical(h);
    },
  });

  const canonicalHeaders = (parsed.meta.fields ?? []).map((h) => h.trim());

  // Derive field schema
  const schema: TemplateFieldSchema =
    schemaOrTemplate && 'studentInputFields' in schemaOrTemplate
      ? (schemaOrTemplate as TemplateFieldSchema)
      : extractTemplateFieldSchema(schemaOrTemplate as any);

  // Determine required template fields
  const templateRelevantFields = [...schema.studentInputFields, ...schema.assetFields];
  const requiredSchemaItems = templateRelevantFields.filter((f) => f.required);

  const missingHeaders: string[] = [];

  if (requiredSchemaItems.length > 0) {
    for (const item of requiredSchemaItems) {
      const canonicalKey = item.modelKey === 'photo_url' || item.key === 'student_photo' ? 'photo_url' : item.modelKey;
      if (!canonicalHeaders.includes(canonicalKey as string)) {
        missingHeaders.push(item.label);
      }
    }
  } else {
    // Default fallback requirements if no schema was supplied
    if (!canonicalHeaders.includes('student_id')) missingHeaders.push('Student ID / ID');
    if (!canonicalHeaders.includes('name')) missingHeaders.push('Student Name / Name');
  }

  // Identify extra columns that are NOT in the active template schema
  const validCanonicalKeys = new Set<string>(
    templateRelevantFields.map((f) => (f.modelKey === 'photo_url' || f.key === 'student_photo' ? 'photo_url' : String(f.modelKey)))
  );
  // Also include base identification keys
  validCanonicalKeys.add('student_id');
  validCanonicalKeys.add('name');

  const ignoredHeaders: string[] = [];
  for (const h of canonicalHeaders) {
    if (!validCanonicalKeys.has(h)) {
      // Find human-readable label
      const originalHeader = rawHeaders.find((raw) => mapHeaderToCanonical(raw) === h) || h;
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

    // Validate student ID
    if (!cleanedRaw.student_id) {
      errors.push('Student ID is required');
    }

    // Validate Name
    if (!cleanedRaw.name) {
      errors.push('Student Name is required');
    }

    // Validate other template-required fields
    for (const item of requiredSchemaItems) {
      const canonicalKey = item.modelKey === 'photo_url' || item.key === 'student_photo' ? 'photo_url' : item.modelKey;
      const val = cleanedRaw[canonicalKey as string];
      if (!val || !val.trim()) {
        const errorMsg = `${item.label} is required by template`;
        if (!errors.includes(errorMsg)) {
          errors.push(errorMsg);
        }
      }
    }

    // Normalize phone format if provided
    if (cleanedRaw.phone && !/^[\+0-9\-\s\(\)]{6,20}$/.test(cleanedRaw.phone.trim())) {
      errors.push('Invalid phone number format');
    }

    const rowData: Partial<IdCardPerson> = {
      student_id: sanitizeStudentId(cleanedRaw.student_id) || '',
      name: cleanedRaw.name || '',
      class: cleanedRaw.class || null,
      section: cleanedRaw.section || null,
      roll_number: cleanedRaw.roll_number || null,
      date_of_birth: cleanedRaw.date_of_birth ? normalizeDate(cleanedRaw.date_of_birth) : null,
      blood_group: cleanedRaw.blood_group ? normalizeBloodGroup(cleanedRaw.blood_group) : null,
      father_name: cleanedRaw.father_name || null,
      mother_name: cleanedRaw.mother_name || null,
      phone: cleanedRaw.phone ? normalizePhone(cleanedRaw.phone) : null,
      address: cleanedRaw.address || null,
      photo_url: cleanedRaw.photo_url || null,
    };

    return {
      rowNumber,
      data: rowData,
      errors,
      valid: errors.length === 0,
    };
  });

  const validCount = rows.filter((r) => r.valid).length;

  return {
    rows,
    missingHeaders,
    ignoredHeaders,
    validCount,
    invalidCount: rows.length - validCount,
    detectedHeaders: canonicalHeaders,
  };
}

/**
 * Parses either a CSV or Excel (.xlsx / .xls) file into validated student rows
 */
export async function parseSpreadsheetFile(
  file: File,
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): Promise<ParseCsvResult> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('The uploaded Excel workbook contains no sheets.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    // Convert worksheet to CSV string format
    const csvText = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
    return parseAndValidateCsv(csvText, schemaOrTemplate);
  }

  // Handle standard text CSV
  const text = await file.text();
  return parseAndValidateCsv(text, schemaOrTemplate);
}

/**
 * Template-Driven Sample Data Generator
 * Generates columns and sample records tailored strictly to the selected template schema.
 */
export function getTemplateSampleData(
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): { headers: string[]; rows: string[][] } {
  const schema: TemplateFieldSchema =
    schemaOrTemplate && 'studentInputFields' in schemaOrTemplate
      ? (schemaOrTemplate as TemplateFieldSchema)
      : extractTemplateFieldSchema(schemaOrTemplate as any);

  const relevantItems = [...schema.studentInputFields, ...schema.assetFields];

  // If no fields in template (or fallback), return standard core set
  if (relevantItems.length === 0) {
    return {
      headers: ['Student ID', 'Student Name', 'Class', 'Roll Number', 'Photo'],
      rows: [
        ['0001', 'Olivia Wilson', '8th', '1', '0001.jpg'],
        ['0002', 'Rahul Kumar', '9th', '2', '0002.jpg'],
        ['0003', 'Priya Sharma', '10th', '3', '0003.jpg'],
      ],
    };
  }

  // Map each schema field to header and sample cell values
  const SAMPLE_STUDENT_VALUES: Record<string, string[]> = {
    student_id: ['0001', '0002', '0003'],
    student_name: ['Olivia Wilson', 'Rahul Kumar', 'Priya Sharma'],
    class: ['8th', '9th', '10th'],
    section: ['A', 'B', 'A'],
    roll_number: ['1', '2', '3'],
    student_photo: ['0001.jpg', '0002.jpg', '0003.jpg'],
    date_of_birth: ['15/05/2012', '20/11/2011', '08/03/2010'],
    blood_group: ['B+', 'O+', 'AB+'],
    father_name: ['Bravia Wilson', 'Suresh Kumar', 'Ramesh Sharma'],
    mother_name: ['Maria Wilson', 'Anita Devi', 'Sunita Sharma'],
    parent_info: ['Bravia Wilson', 'Suresh Kumar', 'Ramesh Sharma'],
    phone: ['9876543210', '9123456780', '9876501234'],
    address: [
      '136-Anandpuri, Motihari, Bihar',
      'Station Road, Motihari, Bihar',
      'Main Market, Motihari, Bihar',
    ],
  };

  const headers = relevantItems.map((item) => item.label);
  const rows: string[][] = [0, 1, 2].map((studentIndex) => {
    return relevantItems.map((item) => {
      const sampleVals = SAMPLE_STUDENT_VALUES[item.key] || ['Sample Value', 'Sample Value 2', 'Sample Value 3'];
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
 * Generates a template-specific Excel workbook Blob (.xlsx) for downloading
 */
export function generateSampleExcelBlob(
  schemaOrTemplate?: TemplateFieldSchema | IdCardTemplate | TemplateLayout | null
): Blob {
  const { headers, rows } = getTemplateSampleData(schemaOrTemplate);
  const data = [headers, ...rows];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set nice column widths
  worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 5, 14) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generates a complete standard student roster sample containing ALL fields (Front + Back details)
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
    'Photo',
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
      '0001.jpg',
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
      '0002.jpg',
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
      '0003.jpg',
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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'All Students');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}


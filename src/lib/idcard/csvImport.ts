import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { personSchema } from './validation';
import type { CsvValidationRow, IdCardPerson } from './types';

export interface ParseCsvResult {
  rows: CsvValidationRow[];
  missingHeaders: string[];
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
  ],
  class: ['class', 'grade', 'standard', 'std', 'classname', 'class_name', 'class name'],
  section: ['section', 'sec', 'division', 'div'],
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
  date_of_birth: ['dateofbirth', 'date_of_birth', 'date of birth', 'dob', 'd.o.b', 'd_o_b', 'birthdate', 'birth_date', 'birth date'],
  blood_group: ['bloodgroup', 'blood_group', 'blood group', 'blood', 'bg'],
  father_name: ['fathername', 'father_name', 'father name', "father's name", 'fathers name', 'father', 'guardianname', 'guardian_name', 'guardian name'],
  mother_name: ['mothername', 'mother_name', 'mother name', "mother's name", 'mothers name', 'mother'],
  phone: ['phone', 'phonenumber', 'phone_number', 'phone number', 'mobile', 'mobileno', 'mobile_no', 'mobile number', 'contact', 'contactno', 'contact_no', 'contact number', 'emergency_no', 'emergency no'],
  address: ['address', 'addr', 'residentialaddress', 'residential_address', 'residential address', 'permanent_address', 'permanent address', 'location', 'city'],
};

/**
 * Normalizes any header into its canonical field name
 */
function mapHeaderToCanonical(header: string): string {
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

export function parseAndValidateCsv(csvText: string): ParseCsvResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => mapHeaderToCanonical(h),
  });

  const headers = (parsed.meta.fields ?? []).map((h) => h.trim());

  // Check required headers
  const hasStudentId = headers.includes('student_id');
  const hasName = headers.includes('name');
  const missingHeaders: string[] = [];
  if (!hasStudentId) missingHeaders.push('Student ID / ID');
  if (!hasName) missingHeaders.push('Student Name / Name');

  const rows: CsvValidationRow[] = parsed.data.map((raw, idx) => {
    const rowNumber = idx + 2; // header is row 1
    
    // Clean string values
    const cleanedRaw: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined && v !== null) {
        cleanedRaw[k] = String(v).trim();
      }
    }

    const result = personSchema.safeParse(cleanedRaw);

    if (result.success) {
      return {
        rowNumber,
        data: cleanRow(result.data),
        errors: [],
        valid: true,
      };
    }

    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return {
      rowNumber,
      data: cleanedRaw,
      errors,
      valid: false,
    };
  });

  const validCount = rows.filter((r) => r.valid).length;

  return {
    rows,
    missingHeaders,
    validCount,
    invalidCount: rows.length - validCount,
    detectedHeaders: headers,
  };
}

function cleanRow(data: Record<string, any>): Partial<IdCardPerson> {
  const out: Partial<IdCardPerson> = {};
  for (const [key, value] of Object.entries(data)) {
    (out as Record<string, unknown>)[key] = value === '' || value === undefined ? null : value;
  }
  return out;
}

/**
 * Parses either a CSV or Excel (.xlsx / .xls) file into validated student rows
 */
export async function parseSpreadsheetFile(file: File): Promise<ParseCsvResult> {
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
    return parseAndValidateCsv(csvText);
  }

  // Handle standard text CSV
  const text = await file.text();
  return parseAndValidateCsv(text);
}

/**
 * Generates a ready-to-use Sample CSV text for downloading
 */
export function generateSampleCsv(): string {
  const headers = [
    'Student ID',
    'Name',
    'Class',
    'Section',
    'Roll Number',
    'Photo',
    'Date of Birth',
    'Blood Group',
    "Father's Name",
    "Mother's Name",
    'Phone',
    'Address',
  ];

  const sampleRows = [
    [
      '0001',
      'Olivia Wilson',
      '8th',
      'A',
      '1',
      '0001.jpg',
      '15/05/2012',
      'B+',
      'Bravia Wilson',
      'Maria Wilson',
      '123-456-7890',
      '136-Anandpuri, Belwanwa, Motihari, Bihar-845429',
    ],
    [
      '0002',
      'Rahul Kumar',
      '9th',
      'B',
      '2',
      '0002.jpg',
      '20/11/2011',
      'O+',
      'Suresh Kumar',
      'Anita Devi',
      '9876543210',
      'Station Road, Motihari, Bihar-845401',
    ],
    [
      '0003',
      'Priya Sharma',
      '10th',
      'A',
      '3',
      '0003.jpg',
      '08/03/2010',
      'AB+',
      'Ramesh Sharma',
      'Sunita Sharma',
      '9123456780',
      'Main Market, Motihari, Bihar-845401',
    ],
  ];

  const csvLines = [
    headers.join(','),
    ...sampleRows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
  ];

  return csvLines.join('\n');
}

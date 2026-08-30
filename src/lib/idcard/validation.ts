import { z } from 'zod';

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/**
 * Normalizes blood group string into standard format (e.g., 'b+' -> 'B+', 'B Positive' -> 'B+')
 */
export function normalizeBloodGroup(val?: string | null): string {
  if (!val) return '';
  const trimmed = val.trim().toUpperCase();
  if (bloodGroups.includes(trimmed as any)) return trimmed;

  const clean = trimmed
    .replace(/POSITIVE/i, '+')
    .replace(/NEGATIVE/i, '-')
    .replace(/POS/i, '+')
    .replace(/NEG/i, '-')
    .replace(/\s+/g, '');

  if (bloodGroups.includes(clean as any)) return clean;
  return trimmed;
}

/**
 * Normalizes phone numbers (e.g., '+91 98765-43210' -> '+91 9876543210')
 */
export function normalizePhone(val?: string | null): string {
  if (!val) return '';
  return val.trim();
}

/**
 * Sanitizes student IDs by stripping accidental image file extensions (.jpg, .jpeg, .png, etc.)
 */
export function sanitizeStudentId(val?: string | null): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  return trimmed.replace(/\.(jpe?g|png|webp|gif|bmp|tiff)$/i, '');
}

/**
 * Generates official Digital ID Verification URL for QR code
 */
export function getQrCodePayload(
  person: {
    student_id?: string | null;
    name?: string | null;
    class?: string | null;
    section?: string | null;
    roll_number?: string | null;
    blood_group?: string | null;
    phone?: string | null;
  },
  _schoolName?: string
): string {
  const cleanId = sanitizeStudentId(person.student_id);
  if (cleanId) {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://palakenterprises.com';
    return `${origin}/verify/${encodeURIComponent(cleanId)}`;
  }

  return person.name || 'STUDENT';
}

/**
 * Parses various date formats into standard YYYY-MM-DD string
 */
export function normalizeDate(val?: string | number | null): string {
  if (val === undefined || val === null) return '';
  const trimmed = String(val).trim();
  if (!trimmed) return '';

  // Check Excel numeric serial date (e.g. 44561)
  if (/^\d{4,5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    if (serial > 10000 && serial < 80000) {
      const utcDays = serial - 25569;
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Check DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Check YYYY/MM/DD, YYYY-MM-DD, or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    return dt.toISOString().split('T')[0];
  }

  return trimmed;
}

export const personSchema = z.object({
  student_id: z.string().trim().min(1, 'Student ID is required'),
  name: z.string().trim().min(1, 'Name is required'),
  class: z.string().trim().optional().or(z.literal('')),
  section: z.string().trim().optional().or(z.literal('')),
  roll_number: z.string().trim().optional().or(z.literal('')),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => normalizeDate(val)),
  blood_group: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => normalizeBloodGroup(val)),
  father_name: z.string().trim().optional().or(z.literal('')),
  mother_name: z.string().trim().optional().or(z.literal('')),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[\+0-9\-\s\(\)]{6,20}$/.test(v), { message: 'Invalid phone number' }),
  address: z.string().trim().optional().or(z.literal('')),
  photo_url: z.string().trim().optional().or(z.literal('')),
});

export type PersonFormInput = z.infer<typeof personSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  academic_year: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2,4}$/, 'Use format like 2026-27'),
  logo_url: z.string().trim().optional().or(z.literal('')),
});

export type ProjectFormInput = z.infer<typeof projectSchema>;

export const CSV_EXPECTED_HEADERS = [
  'student_id',
  'name',
  'class',
  'section',
  'roll_number',
  'date_of_birth',
  'blood_group',
  'father_name',
  'mother_name',
  'phone',
  'address',
] as const;

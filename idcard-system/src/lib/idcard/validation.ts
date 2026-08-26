import { z } from 'zod';

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

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
    .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  blood_group: z.enum(bloodGroups).optional().or(z.literal('')),
  father_name: z.string().trim().optional().or(z.literal('')),
  mother_name: z.string().trim().optional().or(z.literal('')),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^\+?[0-9]{7,15}$/.test(v), { message: 'Invalid phone number' }),
  address: z.string().trim().optional().or(z.literal('')),
});

export type PersonFormInput = z.infer<typeof personSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  academic_year: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2,4}$/, 'Use format like 2026-27'),
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

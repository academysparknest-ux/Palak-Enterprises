export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface IdCardProject {
  id: string;
  name: string;
  description: string | null;
  academic_year: string;
  status: ProjectStatus;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IdCardPerson {
  id: string;
  project_id: string;
  student_id: string;
  name: string;
  class: string | null;
  section: string | null;
  roll_number: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  father_name: string | null;
  mother_name: string | null;
  phone: string | null;
  address: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type TemplateFieldKey =
  | 'school_logo'
  | 'school_name'
  | 'student_photo'
  | 'student_name'
  | 'student_id'
  | 'class'
  | 'section'
  | 'roll_number'
  | 'date_of_birth'
  | 'blood_group'
  | 'parent_info'
  | 'address'
  | 'academic_year'
  | 'custom_text';

export interface TemplateField {
  key: TemplateFieldKey;
  x: number; // mm from left
  y: number; // mm from top
  width: number; // mm
  height: number; // mm
  fontSize?: number; // pt, ignored for image fields
  fontWeight?: 'normal' | 'bold';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  visible: boolean;
  customText?: string; // only used when key === 'custom_text'
}

export interface TemplateLayout {
  fields: TemplateField[];
  backgroundColor: string;
}

export interface IdCardTemplate {
  id: string;
  project_id: string | null;
  name: string;
  layout: TemplateLayout;
  card_width_mm: number;
  card_height_mm: number;
  background_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type GenerationStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface IdCardGeneration {
  id: string;
  project_id: string;
  person_id: string;
  template_id: string;
  status: GenerationStatus;
  file_url: string | null;
  error_message: string | null;
  generated_by: string;
  created_at: string;
}

export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCESS_DENIED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  code: AppErrorCode;
  cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export interface CsvValidationRow {
  rowNumber: number;
  data: Partial<IdCardPerson>;
  errors: string[];
  valid: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

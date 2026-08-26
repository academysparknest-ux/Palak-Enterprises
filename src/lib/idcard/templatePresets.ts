import type { TemplateLayout, TemplateSideLayout } from './types';

// ============================================================
// SVG DECORATIONS MATCHING SPARKNEST ACADEMY
// ============================================================

/** Top arch wave: navy arch curves across with gold accent */
export function makeHeaderSvg(primary: string = '#1B2A4A', accent: string = '#F39C12'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 570 120" preserveAspectRatio="none" style="display:block;width:100%;height:100%;">
    <path d="M0,0 H570 V35 C420,120 160,20 0,80 Z" fill="${primary}"/>
    <path d="M0,80 C160,20 420,120 570,35 V55 C420,135 170,40 0,95 Z" fill="${accent}" opacity="0.9"/>
  </svg>`;
}

/** Bottom wave: gold accent on bottom left + navy wave curve */
export function makeFooterSvg(primary: string = '#1B2A4A', accent: string = '#F39C12'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 570 100" preserveAspectRatio="none" style="display:block;width:100%;height:100%;">
    <path d="M0,60 C120,40 280,100 570,25 V100 H0 Z" fill="${accent}" opacity="0.9"/>
    <path d="M0,75 C140,55 300,105 570,45 V100 H0 Z" fill="${primary}"/>
  </svg>`;
}

// ============================================================
// COLOUR PALETTES
// ============================================================

export const SPARKNEST_NAVY = '#1B2A4A';
export const SPARKNEST_GOLD = '#E69526';
export const SPARKNEST_RED = '#E74C3C';

// ============================================================
// FIELD LABELS
// ============================================================

export const FIELD_LABELS: Record<string, string> = {
  school_logo: 'School Logo',
  school_name: 'School Name',
  school_subtitle: 'School Subtitle',
  student_photo: 'Student Photo',
  student_name: 'Student Name',
  student_id: 'Student ID',
  class: 'Class',
  section: 'Section',
  roll_number: 'Roll Number',
  date_of_birth: 'Date of Birth',
  blood_group: 'Blood Group',
  parent_info: 'Parent Info',
  father_name: "Father's Name",
  phone: 'Phone',
  address: 'Address',
  academic_year: 'Academic Year',
  batch: 'Batch',
  designation: 'Designation',
  emergency_no: 'Emergency No',
  valid_till: 'Valid Till',
  barcode: 'Barcode',
  qr_code: 'QR Code',
  terms: 'Terms / Return Policy',
  website: 'Website',
  custom_text: 'Custom Text',
};

// ============================================================
// PRESET: Sparknest Academy — Both Sides (Dual Sided)
// Card: 54mm × 85.6mm (CR80 Portrait Standard)
// ============================================================

const SPARKNEST_DUAL_BACK: TemplateSideLayout = {
  backgroundColor: '#FFFFFF',
  headerGradientColors: [SPARKNEST_NAVY, SPARKNEST_GOLD],
  footerGradientColors: [SPARKNEST_NAVY, SPARKNEST_GOLD],
  headerSvg: makeHeaderSvg(SPARKNEST_NAVY, SPARKNEST_GOLD),
  footerSvg: makeFooterSvg(SPARKNEST_NAVY, SPARKNEST_GOLD),
  fields: [
    // ── Back Side Details (Left-aligned, navy bold) ────────
    {
      key: 'student_id',
      x: 4, y: 10,
      width: 46, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'ID:',
    },
    {
      key: 'blood_group',
      x: 4, y: 14,
      width: 46, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'BLOOD GROUP:',
    },
    {
      key: 'batch',
      x: 4, y: 18,
      width: 46, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'BATCH:',
    },
    {
      key: 'father_name',
      x: 4, y: 22,
      width: 46, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: "FATHER'S NAME:",
    },
    {
      key: 'phone',
      x: 4, y: 26,
      width: 46, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'PHONE:',
    },
    {
      key: 'address',
      x: 4, y: 30,
      width: 46, height: 6.5,
      fontSize: 5.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'ADDRESS:',
    },
    {
      key: 'emergency_no',
      x: 4, y: 37,
      width: 46, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'EMERGENCY NO:',
      customText: '9876543210',
    },

    // ── Codes (Centered) ──────────────────────────────────
    {
      key: 'qr_code',
      x: 20, y: 41,
      width: 14, height: 14,
      visible: true,
    },
    {
      key: 'barcode',
      x: 13, y: 56,
      width: 28, height: 6,
      visible: true,
    },

    // ── Validity & Policy ─────────────────────────────────
    {
      key: 'valid_till',
      x: 3, y: 63,
      width: 48, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: SPARKNEST_RED,
      textAlign: 'center',
      visible: true,
      labelPrefix: 'VALID TILL:',
      customText: '30-MAY-26',
    },
    {
      key: 'terms',
      x: 3, y: 67,
      width: 48, height: 10,
      fontSize: 4.8,
      fontWeight: 'normal',
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      customText: 'In case of theft or loss it is mandatory for the student to infrom the Administration Office. if found abandoned, may please be returned to SparkNest Academy, Motihari, Bihar',
    },
    {
      key: 'school_subtitle',
      x: 3, y: 77.5,
      width: 48, height: 3,
      fontSize: 5.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      customText: 'Motihari, Bihar',
    },
    {
      key: 'website',
      x: 3, y: 80.5,
      width: 48, height: 3,
      fontSize: 5.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      customText: 'www.sparknestacademy.in',
    },
  ],
};

const SPARKNEST_DUAL_FRONT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'sparknest-dual-sided',
  isDoubleSided: true,
  headerGradientColors: [SPARKNEST_NAVY, SPARKNEST_GOLD],
  footerGradientColors: [SPARKNEST_NAVY, SPARKNEST_GOLD],
  headerSvg: makeHeaderSvg(SPARKNEST_NAVY, SPARKNEST_GOLD),
  footerSvg: makeFooterSvg(SPARKNEST_NAVY, SPARKNEST_GOLD),
  back: SPARKNEST_DUAL_BACK,
  fields: [
    // ── Header & Logo (Centered) ──────────────────────────
    {
      key: 'school_logo',
      x: 21, y: 5.5,
      width: 12, height: 12,
      visible: true,
    },
    {
      key: 'school_name',
      x: 2, y: 18.5,
      width: 50, height: 6,
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
    },
    {
      key: 'school_subtitle',
      x: 2, y: 24.5,
      width: 50, height: 4,
      fontSize: 8,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      customText: 'Motihari, Bihar',
    },

    // ── Student photo (circular with gold border) ─────────
    {
      key: 'student_photo',
      x: 13.5, y: 29.5,
      width: 27, height: 27,
      visible: true,
      borderRadius: 50,
      borderColor: SPARKNEST_GOLD,
      borderWidth: 3,
    },

    // ── Name & Designation ────────────────────────────────
    {
      key: 'student_name',
      x: 2, y: 58,
      width: 50, height: 5.5,
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
    },
    {
      key: 'designation',
      x: 2, y: 63.5,
      width: 50, height: 4,
      fontSize: 9,
      fontWeight: 'normal',
      fontStyle: 'italic',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      customText: 'Student',
    },

    // ── Front Side Student Details (Centered) ─────────────
    {
      key: 'student_id',
      x: 2, y: 68.5,
      width: 50, height: 3.5,
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      labelPrefix: 'ID:',
    },
    {
      key: 'class',
      x: 2, y: 72.5,
      width: 50, height: 3.5,
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      labelPrefix: 'CLASS:',
    },
    {
      key: 'blood_group',
      x: 2, y: 76.5,
      width: 50, height: 3.5,
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      labelPrefix: 'BLOOD GROUP:',
    },
    {
      key: 'batch',
      x: 2, y: 80.5,
      width: 50, height: 3.5,
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      labelPrefix: 'BATCH:',
    },
  ],
};

// ============================================================
// PRESET: Sparknest Academy — Single Side
// ============================================================

const SPARKNEST_SINGLE_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'sparknest-single-sided',
  isDoubleSided: false,
  headerGradientColors: [SPARKNEST_NAVY, SPARKNEST_GOLD],
  footerGradientColors: [SPARKNEST_NAVY, SPARKNEST_GOLD],
  headerSvg: makeHeaderSvg(SPARKNEST_NAVY, SPARKNEST_GOLD),
  footerSvg: makeFooterSvg(SPARKNEST_NAVY, SPARKNEST_GOLD),
  fields: [
    {
      key: 'school_logo',
      x: 3, y: 3,
      width: 9, height: 9,
      visible: true,
    },
    {
      key: 'school_name',
      x: 13, y: 3,
      width: 38, height: 5.5,
      fontSize: 10,
      fontWeight: 'bold',
      fontFamily: 'serif',
      color: '#FFFFFF',
      textAlign: 'center',
      visible: true,
    },
    {
      key: 'school_subtitle',
      x: 13, y: 8.5,
      width: 38, height: 3.5,
      fontSize: 6.5,
      fontWeight: 'normal',
      fontFamily: 'serif',
      color: '#FFFFFF',
      textAlign: 'center',
      visible: true,
      customText: 'Motihari, Bihar',
    },
    {
      key: 'student_photo',
      x: 16, y: 14.5,
      width: 22, height: 22,
      visible: true,
      borderRadius: 50,
      borderColor: SPARKNEST_GOLD,
      borderWidth: 2,
    },
    {
      key: 'student_name',
      x: 2, y: 37.5,
      width: 50, height: 5,
      fontSize: 10.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
    },
    {
      key: 'designation',
      x: 2, y: 42.5,
      width: 50, height: 3.5,
      fontSize: 7.5,
      fontStyle: 'italic',
      color: SPARKNEST_NAVY,
      textAlign: 'center',
      visible: true,
      customText: 'Student',
    },
    {
      key: 'student_id',
      x: 3, y: 47,
      width: 48, height: 3,
      fontSize: 6,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'ID:',
    },
    {
      key: 'blood_group',
      x: 3, y: 50.5,
      width: 48, height: 3,
      fontSize: 6,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'BLOOD GROUP:',
    },
    {
      key: 'batch',
      x: 3, y: 54,
      width: 48, height: 3,
      fontSize: 6,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'BATCH:',
    },
    {
      key: 'father_name',
      x: 3, y: 57.5,
      width: 48, height: 3,
      fontSize: 6,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: "FATHER'S NAME:",
    },
    {
      key: 'phone',
      x: 3, y: 61,
      width: 48, height: 3,
      fontSize: 6,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'PHONE:',
    },
    {
      key: 'address',
      x: 3, y: 64.5,
      width: 48, height: 5,
      fontSize: 5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'ADDRESS:',
    },
    {
      key: 'emergency_no',
      x: 3, y: 70,
      width: 32, height: 3,
      fontSize: 5.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'EMERGENCY NO:',
      customText: '9876543210',
    },
    {
      key: 'valid_till',
      x: 3, y: 73.5,
      width: 32, height: 3,
      fontSize: 5.5,
      fontWeight: 'bold',
      color: SPARKNEST_NAVY,
      visible: true,
      labelPrefix: 'VALID TILL:',
      customText: '30-MAY-26',
    },
    {
      key: 'barcode',
      x: 3, y: 77,
      width: 25, height: 4,
      visible: true,
    },
    {
      key: 'qr_code',
      x: 38, y: 70,
      width: 13, height: 13,
      visible: true,
    },
  ],
};

// ============================================================
// PRESET REGISTRY
// ============================================================

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  orientation: 'portrait' | 'landscape';
  cardWidthMm: number;
  cardHeightMm: number;
  isDoubleSided: boolean;
  layout: TemplateLayout;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'sparknest-dual-sided',
    name: 'Sparknest Academy (Both Sides / Dual Sided)',
    description: 'Front side with centered emblem, photo & basic info; Back side with full details, QR, Barcode, validity & return policy',
    orientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    isDoubleSided: true,
    layout: SPARKNEST_DUAL_FRONT,
  },
  {
    id: 'sparknest-single-sided',
    name: 'Sparknest Academy (Single Side)',
    description: 'Portrait single-sided ID with navy/gold arch waves, photo, student details, QR code and barcode',
    orientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    isDoubleSided: false,
    layout: SPARKNEST_SINGLE_LAYOUT,
  },
  {
    id: 'classic-landscape',
    name: 'Classic Landscape (Single Side)',
    description: 'Standard landscape card with photo on the left and details on the right',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54,
    isDoubleSided: false,
    layout: {
      backgroundColor: '#ffffff',
      presetId: 'classic-landscape',
      isDoubleSided: false,
      fields: [
        { key: 'school_name', x: 4, y: 3, width: 78, height: 6, fontSize: 12, fontWeight: 'bold', textAlign: 'center', visible: true },
        { key: 'student_photo', x: 4, y: 12, width: 22, height: 26, visible: true },
        { key: 'student_name', x: 30, y: 14, width: 52, height: 6, fontSize: 10, fontWeight: 'bold', visible: true },
        { key: 'student_id', x: 30, y: 21, width: 52, height: 5, fontSize: 8, visible: true, labelPrefix: 'ID:' },
        { key: 'class', x: 30, y: 27, width: 25, height: 5, fontSize: 8, visible: true, labelPrefix: 'Class:' },
        { key: 'section', x: 57, y: 27, width: 25, height: 5, fontSize: 8, visible: true, labelPrefix: 'Sec:' },
        { key: 'blood_group', x: 30, y: 33, width: 52, height: 5, fontSize: 8, visible: true, labelPrefix: 'Blood Group:' },
        { key: 'academic_year', x: 4, y: 46, width: 78, height: 5, fontSize: 7, textAlign: 'center', visible: true },
      ],
    },
  },
];

export function getPresetById(id: string): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find((p) => p.id === id);
}

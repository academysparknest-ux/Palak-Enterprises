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
  school_subtitle: 'School Title / Subtitle',
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
// PRESET: Sample-Tempate1 — Dual Sided with Clean Backgrounds
// Card: 54mm × 85.6mm (CR80 Portrait Standard)
// ============================================================

export const SAMPLE_TEMPLATE_1_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'sample-tempate1',
  isDoubleSided: true,
  templateType: 'double',
  backgroundUrl: '/idcard-templates/sample-template1-front.png',
  backgroundFit: 'fill',
  backgroundOpacity: 100,
  backgroundScale: 100,
  headerSvg: null,
  footerSvg: null,
  fields: [
    // ── Header: Logo ──────────────────────────────────────
    {
      id: 'st1-front-logo',
      key: 'school_logo',
      x: 5.5,
      y: 4.5,
      width: 13.0,
      height: 13.0,
      visible: true,
      labelPrefix: '',
    },
    // ── Header: Institution Name ───────────────────────────
    {
      id: 'st1-front-school-name',
      key: 'school_name',
      x: 21.5,
      y: 4.5,
      width: 29.0,
      height: 6.0,
      fontSize: 9.5,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: '#B91C1C',
      textAlign: 'left',
      visible: true,
      customText: 'Graphic Era',
    },
    // ── Header: Institution Subtitle / Location ───────────
    {
      id: 'st1-front-school-sub',
      key: 'school_subtitle',
      x: 21.5,
      y: 10.5,
      width: 29.0,
      height: 6.5,
      fontSize: 4.8,
      fontWeight: 'normal',
      fontFamily: "'Inter', sans-serif",
      color: '#1E293B',
      textAlign: 'left',
      lineHeight: 1.2,
      visible: true,
      customText: 'Deemed to be University\nDehradun',
    },
    // ── Student Photo (Circular border) ────────────────────
    {
      id: 'st1-front-photo',
      key: 'student_photo',
      x: 12.0,
      y: 19.5,
      width: 30.0,
      height: 30.0,
      visible: true,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      borderRadius: 50,
      photoShape: 'circle',
      photoFit: 'cover',
    },
    // ── Lower Left (Purple Zone): Blood Group ──────────────
    {
      id: 'st1-front-blood-group',
      key: 'blood_group',
      x: 4.0,
      y: 56.5,
      width: 18.0,
      height: 7.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'BLOOD GROUP:\n',
    },
    // ── Lower Left (Purple Zone): Batch ────────────────────
    {
      id: 'st1-front-batch',
      key: 'batch',
      x: 4.0,
      y: 66.5,
      width: 18.0,
      height: 7.5,
      fontSize: 6.5,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'BATCH:\n',
    },
    // ── Lower Right (White Zone): Student Name ─────────────
    {
      id: 'st1-front-student-name',
      key: 'student_name',
      x: 23.0,
      y: 56.0,
      width: 28.5,
      height: 6.5,
      fontSize: 9.0,
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      color: '#B91C1C',
      textAlign: 'center',
      letterSpacing: 0.5,
      visible: true,
    },
    // ── Lower Right (White Zone): Course / Program ─────────
    {
      id: 'st1-front-course',
      key: 'class',
      x: 23.0,
      y: 67.5,
      width: 28.5,
      height: 5.5,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      color: '#1E293B',
      textAlign: 'center',
      visible: true,
    },
  ],
  back: {
    backgroundColor: '#FFFFFF',
    backgroundUrl: '/idcard-templates/sample-template1-back.png',
    backgroundFit: 'fill',
    backgroundOpacity: 100,
    backgroundScale: 100,
    headerSvg: null,
    footerSvg: null,
    fields: [
      // ── Top Purple/Red Wave: Father's Name ───────────────
      {
        id: 'st1-back-father-name',
        key: 'father_name',
        x: 4.0,
        y: 4.5,
        width: 46.0,
        height: 3.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: "FATHER'S NAME: ",
      },
      // ── Top Purple/Red Wave: Contact No ──────────────────
      {
        id: 'st1-back-phone',
        key: 'phone',
        x: 4.0,
        y: 8.5,
        width: 46.0,
        height: 3.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: 'CONTACT NO: ',
      },
      // ── Top Purple/Red Wave: Address ─────────────────────
      {
        id: 'st1-back-address',
        key: 'address',
        x: 4.0,
        y: 12.5,
        width: 46.0,
        height: 8.5,
        fontSize: 4.2,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        lineHeight: 1.15,
        visible: true,
        labelPrefix: 'ADDRESS: ',
      },
      // ── Top Purple/Red Wave: Emergency No ────────────────
      {
        id: 'st1-back-emergency-no',
        key: 'emergency_no',
        x: 4.0,
        y: 22.0,
        width: 46.0,
        height: 3.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: 'EMERGENCY NO: ',
      },
      // ── Center White Area: QR Code ───────────────────────
      {
        id: 'st1-back-qr',
        key: 'qr_code',
        x: 18.5,
        y: 27.5,
        width: 17.0,
        height: 17.0,
        visible: true,
      },
      // ── Center White Area: Barcode ───────────────────────
      {
        id: 'st1-back-barcode',
        key: 'barcode',
        x: 8.0,
        y: 46.0,
        width: 38.0,
        height: 7.5,
        visible: true,
      },
      // ── Lower Area: Valid Till ───────────────────────────
      {
        id: 'st1-back-valid-till',
        key: 'valid_till',
        x: 4.0,
        y: 55.0,
        width: 46.0,
        height: 4.0,
        fontSize: 5.8,
        fontWeight: 'bold',
        color: '#B91C1C',
        textAlign: 'center',
        visible: true,
        labelPrefix: 'VALID TILL : ',
        customText: '30-JUN-26',
      },
      // ── Lower Area: Terms / Return Disclaimer ────────────
      {
        id: 'st1-back-terms',
        key: 'terms',
        x: 3.5,
        y: 60.5,
        width: 47.0,
        height: 10.5,
        fontSize: 3.6,
        fontWeight: 'normal',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 1.15,
        visible: true,
        customText:
          'In case of theft or loss it is mandatory for the Student to inform the Administration Office. If found abandoned, may please be returned to Graphic Era (Deemed to be) University, Dehradun.',
      },
      // ── Footer: Location & Contact ───────────────────────
      {
        id: 'st1-back-website',
        key: 'website',
        x: 3.5,
        y: 73.0,
        width: 47.0,
        height: 7.5,
        fontSize: 3.5,
        fontWeight: 'normal',
        color: '#334155',
        textAlign: 'center',
        lineHeight: 1.2,
        visible: true,
        customText:
          'Society Area, Clement Town, Dehradun (UTTARAKHAND)\nwww.geu.ac.in || Tollfree: 1800 270 1280',
      },
    ],
  },
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
    id: 'sample-tempate1',
    name: 'Sample-Tempate1',
    description: 'Two-sided university card template with clean front & back backgrounds, circular photo, student details, QR, Barcode, validity and return disclaimer',
    orientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    isDoubleSided: true,
    layout: SAMPLE_TEMPLATE_1_LAYOUT,
  },
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

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
  roll_no: 'Roll Number',
  roll: 'Roll Number',
  rollno: 'Roll Number',
  r_no: 'Roll Number',
  date_of_birth: 'Date of Birth',
  dob: 'Date of Birth',
  blood_group: 'Blood Group',
  blood: 'Blood Group',
  parent_info: 'Parent Info',
  father_name: "Father's Name",
  mother_name: "Mother's Name",
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
      customText: 'In case of theft or loss it is mandatory for the student to inform the Administration Office. If found abandoned, may please be returned to SparkNest Academy, Motihari, Bihar',
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
  backgroundUrl: '/idcard-templates/sample-template1-front.png',
  backgroundFit: 'fill',
  backgroundOpacity: 100,
  backgroundScale: 105,
  schoolLogoUrl: null,
  isDoubleSided: true,
  templateType: 'double',
  headerSvg: null,
  footerSvg: null,
  presetId: 'my-school-template',
  fields: [
    {
      id: 'st1-front-logo',
      key: 'school_logo',
      x: 5.5,
      y: 4.5,
      width: 13.0,
      height: 13.0,
      visible: true,
      labelPrefix: '',
      borderRadius: 0,
    },
    {
      id: 'st1-front-school-name',
      key: 'school_name',
      x: 23.9,
      y: 6.5,
      width: 29.5,
      height: 7.0,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: '#B91C1C',
      textAlign: 'center',
      visible: true,
      customText: 'SPARKNEST ACADEMY SCHOOL',
    },
    {
      id: 'st1-front-school-sub',
      key: 'school_subtitle',
      x: 24.4,
      y: 14.5,
      width: 29.0,
      height: 2.0,
      fontSize: 6.0,
      fontWeight: 'normal',
      fontFamily: "'Inter', sans-serif",
      color: '#1E293B',
      textAlign: 'left',
      lineHeight: 1.2,
      visible: true,
      customText: '',
    },
    {
      id: 'st1-front-photo',
      key: 'student_photo',
      x: 12.0,
      y: 21.75,
      width: 30.0,
      height: 30.0,
      visible: true,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      borderRadius: 50,
      photoShape: 'circle',
      photoFit: 'cover',
    },
    {
      id: 'field-1788103964013-knir',
      key: 'student_id',
      x: 4.0,
      y: 57.0,
      width: 18.0,
      height: 5.5,
      fontSize: 6.5,
      fontWeight: '600',
      fontFamily: "'Times New Roman', serif",
      color: '#FFFFFF',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'STUDENT ID : \n',
      overflowStrategy: 'wrap',
    },
    {
      id: 'st1-front-student-name',
      key: 'student_name',
      x: 24.4,
      y: 56.0,
      width: 28.5,
      height: 6.5,
      fontSize: 10.0,
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      color: '#B91C1C',
      textAlign: 'center',
      letterSpacing: 0.5,
      labelPrefix: '',
      visible: true,
    },
    {
      id: 'st1-front-blood-group',
      key: 'blood_group',
      x: 4.0,
      y: 65.5,
      width: 18.5,
      height: 5.5,
      fontSize: 6.5,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'BLOOD GROUP :\n',
    },
    {
      id: 'st1-front-course',
      key: 'class',
      x: 24.4,
      y: 66.0,
      width: 28.5,
      height: 5.0,
      fontSize: 8.0,
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      color: '#1E293B',
      textAlign: 'center',
      visible: true,
      labelPrefix: 'Class : ',
    },
    {
      id: 'st1-front-batch',
      key: 'batch',
      x: 4.0,
      y: 74.0,
      width: 18.0,
      height: 5.5,
      fontSize: 6.5,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'left',
      visible: true,
      customText: 'Batch',
      labelPrefix: 'BATCH :\n',
    },
    {
      id: 'field-1788104249887-jw9m',
      key: 'roll_number',
      x: 24.4,
      y: 74.0,
      width: 28.0,
      height: 6.5,
      fontSize: 8.0,
      fontWeight: 'bold',
      fontFamily: "'Times New Roman', serif",
      color: '#1B2A4A',
      textAlign: 'center',
      visible: true,
      labelPrefix: 'Roll Number :',
      overflowStrategy: 'wrap',
    },
  ],
  back: {
    backgroundColor: '#FFFFFF',
    backgroundUrl: '/idcard-templates/sample-template1-back.png',
    backgroundFit: 'fill',
    backgroundOpacity: 100,
    backgroundScale: 105,
    headerSvg: null,
    footerSvg: null,
    fields: [
      {
        id: 'st1-back-father-name',
        key: 'father_name',
        x: 3.5,
        y: 5.0,
        width: 46.0,
        height: 2.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: "FATHER'S NAME: ",
      },
      {
        id: 'field-1788104652148-xsw2',
        key: 'mother_name',
        x: 3.5,
        y: 9.5,
        width: 40.0,
        height: 2.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        fontFamily: "'Times New Roman', serif",
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: 'Mothers Name: ',
        overflowStrategy: 'wrap',
      },
      {
        id: 'st1-back-phone',
        key: 'phone',
        x: 3.5,
        y: 14.0,
        width: 46.0,
        height: 2.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: 'CONTACT NO: ',
      },
      {
        id: 'st1-back-emergency-no',
        key: 'emergency_no',
        x: 3.5,
        y: 18.5,
        width: 46.0,
        height: 2.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        visible: true,
        labelPrefix: 'EMERGENCY NO: ',
      },
      {
        id: 'st1-back-address',
        key: 'address',
        x: 3.5,
        y: 23.0,
        width: 46.0,
        height: 7.5,
        fontSize: 5.0,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        lineHeight: 1.15,
        visible: true,
        labelPrefix: 'ADDRESS: ',
      },
      {
        id: 'st1-back-qr',
        key: 'qr_code',
        x: 18.5,
        y: 32.5,
        width: 17.0,
        height: 17.0,
        locked: true,
        visible: true,
      },
      {
        id: 'st1-back-barcode',
        key: 'barcode',
        x: 8.0,
        y: 51.5,
        width: 38.0,
        height: 7.5,
        locked: true,
        visible: true,
      },
      {
        id: 'st1-back-valid-till',
        key: 'valid_till',
        x: 3.5,
        y: 61.0,
        width: 46.0,
        height: 2.5,
        fontSize: 5.8,
        fontWeight: 'bold',
        color: '#B91C1C',
        textAlign: 'center',
        visible: true,
        labelPrefix: 'VALID TILL : ',
        customText: '30-JUN-26',
        locked: true,
      },
      {
        id: 'st1-back-terms',
        key: 'terms',
        x: 3.5,
        y: 65.5,
        width: 47.0,
        height: 10.5,
        fontSize: 6.0,
        fontWeight: 'normal',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 1.15,
        visible: true,
        locked: true,
        customText:
          'In case of theft or loss it is mandatory for the Student to inform the Administration Office. If found abandoned, may please be returned to Graphic Era (Deemed to be) University, Dehradun.',
      },
      {
        id: 'st1-back-website',
        key: 'website',
        x: 3.5,
        y: 78.0,
        width: 47.0,
        height: 4.5,
        fontSize: 5.0,
        fontWeight: 'normal',
        color: '#334155',
        textAlign: 'center',
        lineHeight: 1.2,
        visible: true,
        locked: true,
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

export const MY_SCHOOL_SINGLE_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  backgroundUrl: '/idcard-templates/sample-template1-front.png',
  backgroundFit: 'fill',
  backgroundOpacity: 100,
  backgroundScale: 105,
  schoolLogoUrl: null,
  isDoubleSided: false,
  templateType: 'single',
  headerSvg: null,
  footerSvg: null,
  presetId: 'my-school-single-sided',
  fields: structuredClone(SAMPLE_TEMPLATE_1_LAYOUT.fields),
};

// ============================================================
// PRESET: Landscape Student ID (Dual-Sided with Reference Artwork)
// Card: 85.6mm × 54mm (CR80 Landscape Standard)
// ============================================================

export const LANDSCAPE_STUDENT_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  backgroundUrl: '/idcard-templates/landscape-reference-front.png',
  backgroundFit: 'fill',
  backgroundOpacity: 100,
  backgroundScale: 100,
  presetId: 'landscape-student',
  orientation: 'landscape',
  cardType: 'student',
  widthMm: 85.6,
  heightMm: 54.0,
  isDoubleSided: true,
  templateType: 'double',
  fields: [
    {
      id: 'ls-front-title',
      key: 'school_name',
      x: 5.0,
      y: 2.5,
      width: 48.0,
      height: 7.0,
      fontSize: 8.5,
      fontWeight: '800',
      fontFamily: "'Inter', sans-serif",
      color: '#FFFFFF',
      textAlign: 'left',
      visible: true,
      customText: 'SPARKNEST ACADEMY',
    },
    {
      id: 'ls-front-category',
      key: 'designation',
      x: 52.0,
      y: 2.5,
      width: 30.0,
      height: 6.0,
      fontSize: 7.0,
      fontWeight: '600',
      fontFamily: "'Inter', sans-serif",
      color: '#FFFFFF',
      textAlign: 'right',
      visible: true,
      customText: 'Student Identity Card',
    },
    {
      id: 'ls-front-photo',
      key: 'student_photo',
      x: 5.0,
      y: 15.0,
      width: 22.0,
      height: 24.0,
      visible: true,
      photoShape: 'rounded',
      borderRadius: 8,
      photoFit: 'cover',
      borderWidth: 0,
    },
    {
      id: 'ls-front-name',
      key: 'student_name',
      x: 32.0,
      y: 16.5,
      width: 49.0,
      height: 4.5,
      fontSize: 7.5,
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      color: '#1B2A4A',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'Name       : ',
    },
    {
      id: 'ls-front-dob',
      key: 'date_of_birth',
      x: 32.0,
      y: 21.5,
      width: 49.0,
      height: 4.0,
      fontSize: 6.5,
      fontWeight: '600',
      fontFamily: "'Inter', sans-serif",
      color: '#1B2A4A',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'D.O.B      : ',
    },
    {
      id: 'ls-front-address',
      key: 'address',
      x: 32.0,
      y: 26.0,
      width: 49.0,
      height: 6.0,
      fontSize: 6.0,
      fontWeight: '500',
      fontFamily: "'Inter', sans-serif",
      color: '#1B2A4A',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'Address    : ',
      overflowStrategy: 'wrap',
    },
    {
      id: 'ls-front-class',
      key: 'class',
      x: 32.0,
      y: 32.5,
      width: 49.0,
      height: 4.0,
      fontSize: 6.5,
      fontWeight: '600',
      fontFamily: "'Inter', sans-serif",
      color: '#1B2A4A',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'Class      : ',
    },
    {
      id: 'ls-front-barcode',
      key: 'barcode',
      x: 5.0,
      y: 40.0,
      width: 24.0,
      height: 8.0,
      visible: true,
    },
    {
      id: 'ls-front-validity',
      key: 'valid_till',
      x: 32.0,
      y: 41.5,
      width: 25.0,
      height: 6.5,
      fontSize: 5.5,
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif",
      color: '#1B2A4A',
      textAlign: 'left',
      visible: true,
      labelPrefix: 'Valid Date\n',
      customText: '11/12/2030',
    },
    {
      id: 'ls-front-signature',
      key: 'custom_text',
      x: 62.0,
      y: 43.5,
      width: 20.0,
      height: 4.5,
      fontSize: 5.5,
      fontWeight: 'italic' as any,
      fontStyle: 'italic',
      fontFamily: "'Inter', sans-serif",
      color: '#FFFFFF',
      textAlign: 'center',
      visible: true,
      customText: 'Authorized Signatory',
    },
  ],
  back: {
    backgroundColor: '#FFFFFF',
    backgroundUrl: '/idcard-templates/landscape-reference-back.png',
    backgroundFit: 'fill',
    backgroundOpacity: 100,
    backgroundScale: 100,
    fields: [
      {
        id: 'ls-back-title',
        key: 'school_name',
        x: 5.0,
        y: 2.5,
        width: 75.0,
        height: 7.0,
        fontSize: 8.5,
        fontWeight: '800',
        fontFamily: "'Inter', sans-serif",
        color: '#FFFFFF',
        textAlign: 'center',
        visible: true,
        customText: 'SPARKNEST ACADEMY',
      },
      {
        id: 'ls-back-terms',
        key: 'terms',
        x: 6.0,
        y: 13.0,
        width: 73.0,
        height: 10.0,
        fontSize: 5.2,
        fontWeight: 'normal',
        fontFamily: "'Inter', sans-serif",
        color: '#334155',
        textAlign: 'center',
        visible: true,
        customText:
          'This card is the property of the issuing institution. If found, please return to the administration office or contact the helpline immediately.',
      },
      {
        id: 'ls-back-qr',
        key: 'qr_code',
        x: 8.0,
        y: 24.5,
        width: 14.0,
        height: 14.0,
        visible: true,
      },
      {
        id: 'ls-back-barcode',
        key: 'barcode',
        x: 26.0,
        y: 27.5,
        width: 32.0,
        height: 8.0,
        visible: true,
      },
      {
        id: 'ls-back-phone',
        key: 'emergency_no',
        x: 60.0,
        y: 26.0,
        width: 22.0,
        height: 6.0,
        fontSize: 5.5,
        fontWeight: 'bold',
        fontFamily: "'Inter', sans-serif",
        color: '#1B2A4A',
        textAlign: 'left',
        visible: true,
        labelPrefix: 'Helpline:\n',
        customText: '1800 123 4567',
      },
      {
        id: 'ls-back-website',
        key: 'website',
        x: 5.0,
        y: 47.5,
        width: 75.0,
        height: 4.0,
        fontSize: 5.0,
        fontWeight: 'bold',
        fontFamily: "'Inter', sans-serif",
        color: '#FFFFFF',
        textAlign: 'center',
        visible: true,
        customText: 'www.sparknestacademy.in | info@sparknestacademy.in',
      },
    ],
  },
};

// ============================================================
// PRESET: Landscape University ID (Dual-Sided)
// ============================================================

export const LANDSCAPE_UNIVERSITY_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'landscape-university',
  orientation: 'landscape',
  cardType: 'student',
  widthMm: 85.6,
  heightMm: 54.0,
  isDoubleSided: true,
  templateType: 'double',
  fields: [
    { key: 'school_logo', x: 4.0, y: 3.5, width: 10.0, height: 10.0, visible: true },
    { key: 'school_name', x: 16.0, y: 3.5, width: 65.0, height: 5.5, fontSize: 9.0, fontWeight: '800', fontFamily: "'Times New Roman', serif", color: '#1B2A4A', textAlign: 'left', visible: true, customText: 'GRAPHIC ERA UNIVERSITY' },
    { key: 'school_subtitle', x: 16.0, y: 9.0, width: 65.0, height: 3.5, fontSize: 5.5, fontWeight: '600', fontFamily: "'Inter', sans-serif", color: '#64748B', textAlign: 'left', visible: true, customText: 'Deemed to be University, Dehradun' },
    { key: 'student_photo', x: 4.0, y: 15.5, width: 22.0, height: 26.0, visible: true, photoShape: 'rounded', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
    { key: 'student_name', x: 28.0, y: 16.0, width: 53.0, height: 5.0, fontSize: 8.5, fontWeight: 'bold', color: '#B91C1C', visible: true },
    { key: 'student_id', x: 28.0, y: 21.5, width: 26.0, height: 4.0, fontSize: 6.5, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Student ID: ', visible: true },
    { key: 'roll_number', x: 55.0, y: 21.5, width: 26.0, height: 4.0, fontSize: 6.5, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Roll No: ', visible: true },
    { key: 'class', x: 28.0, y: 26.0, width: 53.0, height: 4.0, fontSize: 6.5, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Course: ', visible: true },
    { key: 'blood_group', x: 28.0, y: 30.5, width: 26.0, height: 4.0, fontSize: 6.5, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Blood: ', visible: true },
    { key: 'valid_till', x: 55.0, y: 30.5, width: 26.0, height: 4.0, fontSize: 6.5, fontWeight: 'bold', color: '#B91C1C', labelPrefix: 'Valid Upto: ', customText: '2028', visible: true },
    { key: 'barcode', x: 4.0, y: 43.5, width: 35.0, height: 7.0, visible: true },
    { key: 'qr_code', x: 67.0, y: 36.5, width: 14.0, height: 14.0, visible: true },
  ],
  back: {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'terms', x: 4.0, y: 4.0, width: 77.0, height: 14.0, fontSize: 5.0, fontWeight: 'normal', color: '#334155', textAlign: 'center', visible: true, customText: 'This ID card is strictly non-transferable. If found, please return to the Registrar Office, Graphic Era University, Dehradun.' },
      { key: 'father_name', x: 6.0, y: 20.0, width: 40.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: "Father's Name: ", visible: true },
      { key: 'phone', x: 6.0, y: 24.5, width: 40.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Contact: ', visible: true },
      { key: 'emergency_no', x: 6.0, y: 29.0, width: 40.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Emergency: ', visible: true },
      { key: 'address', x: 6.0, y: 33.5, width: 44.0, height: 9.0, fontSize: 5.5, fontWeight: '500', color: '#1B2A4A', labelPrefix: 'Address: ', visible: true },
      { key: 'qr_code', x: 58.0, y: 22.0, width: 18.0, height: 18.0, visible: true },
      { key: 'website', x: 4.0, y: 46.0, width: 77.0, height: 4.5, fontSize: 5.5, fontWeight: 'bold', color: '#1B2A4A', textAlign: 'center', visible: true, customText: 'www.geu.ac.in | Tollfree: 1800 270 1280' },
    ],
  },
};

// ============================================================
// PRESET: Landscape Employee ID (Corporate)
// ============================================================

export const LANDSCAPE_EMPLOYEE_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'landscape-employee',
  orientation: 'landscape',
  cardType: 'employee',
  widthMm: 85.6,
  heightMm: 54.0,
  isDoubleSided: true,
  templateType: 'double',
  fields: [
    { key: 'school_logo', x: 4.0, y: 3.5, width: 9.0, height: 9.0, visible: true },
    { key: 'school_name', x: 15.0, y: 4.0, width: 66.0, height: 5.0, fontSize: 9.0, fontWeight: 'bold', color: '#0F172A', visible: true, customText: 'PALAK ENTERPRISES PVT LTD' },
    { key: 'school_subtitle', x: 15.0, y: 9.0, width: 66.0, height: 3.0, fontSize: 5.5, color: '#64748B', visible: true, customText: 'Digital Identity & Technology Services' },
    { key: 'student_photo', x: 4.0, y: 15.0, width: 22.0, height: 26.0, visible: true, photoShape: 'rounded', borderRadius: 8 },
    { key: 'student_name', x: 28.0, y: 15.5, width: 53.0, height: 5.0, fontSize: 9.0, fontWeight: 'bold', color: '#0F172A', visible: true },
    { key: 'designation', x: 28.0, y: 20.5, width: 53.0, height: 3.5, fontSize: 6.5, fontWeight: '600', color: '#2563EB', visible: true, customText: 'Senior Software Engineer' },
    { key: 'student_id', x: 28.0, y: 25.0, width: 30.0, height: 3.5, fontSize: 6.0, fontWeight: 'bold', color: '#334155', labelPrefix: 'EMP ID: ', visible: true },
    { key: 'blood_group', x: 60.0, y: 25.0, width: 20.0, height: 3.5, fontSize: 6.0, fontWeight: 'bold', color: '#334155', labelPrefix: 'Blood: ', visible: true },
    { key: 'phone', x: 28.0, y: 29.5, width: 53.0, height: 3.5, fontSize: 6.0, fontWeight: 'bold', color: '#334155', labelPrefix: 'Mobile: ', visible: true },
    { key: 'barcode', x: 4.0, y: 43.0, width: 35.0, height: 7.0, visible: true },
    { key: 'qr_code', x: 67.0, y: 35.0, width: 15.0, height: 15.0, visible: true },
  ],
  back: {
    backgroundColor: '#F8FAFC',
    fields: [
      { key: 'terms', x: 4.0, y: 5.0, width: 77.0, height: 14.0, fontSize: 5.2, fontWeight: 'normal', color: '#475569', textAlign: 'center', visible: true, customText: 'This employee badge remains the property of the company. In case of loss or termination, it must be returned to HR immediately.' },
      { key: 'emergency_no', x: 10.0, y: 22.0, width: 65.0, height: 4.5, fontSize: 6.5, fontWeight: 'bold', color: '#0F172A', labelPrefix: 'Emergency Contact: ', visible: true },
      { key: 'address', x: 10.0, y: 27.5, width: 65.0, height: 8.0, fontSize: 5.5, color: '#334155', labelPrefix: 'Office Address: ', visible: true, customText: 'Palak Tower, Plot 42, Tech Zone, Industrial Area' },
      { key: 'website', x: 4.0, y: 44.0, width: 77.0, height: 4.5, fontSize: 5.5, fontWeight: 'bold', color: '#2563EB', textAlign: 'center', visible: true, customText: 'www.palakenterprises.com | hr@palakenterprises.com' },
    ],
  },
};

// ============================================================
// PRESET: Landscape Staff ID
// ============================================================

export const LANDSCAPE_STAFF_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'landscape-staff',
  orientation: 'landscape',
  cardType: 'staff',
  widthMm: 85.6,
  heightMm: 54.0,
  isDoubleSided: true,
  templateType: 'double',
  fields: [
    { key: 'school_logo', x: 4.0, y: 3.5, width: 9.0, height: 9.0, visible: true },
    { key: 'school_name', x: 15.0, y: 3.5, width: 66.0, height: 5.0, fontSize: 9.0, fontWeight: '800', color: '#1B2A4A', visible: true, customText: 'DELHI PUBLIC SCHOOL' },
    { key: 'school_subtitle', x: 15.0, y: 8.5, width: 66.0, height: 3.5, fontSize: 6.0, color: '#64748B', visible: true, customText: 'FACULTY & STAFF IDENTITY CARD' },
    { key: 'student_photo', x: 4.0, y: 14.5, width: 22.0, height: 26.0, visible: true, photoShape: 'rectangle', borderWidth: 1, borderColor: '#CBD5E1' },
    { key: 'student_name', x: 28.0, y: 15.0, width: 53.0, height: 5.0, fontSize: 8.5, fontWeight: 'bold', color: '#1B2A4A', visible: true },
    { key: 'designation', x: 28.0, y: 20.0, width: 53.0, height: 3.5, fontSize: 6.5, fontWeight: 'bold', color: '#B91C1C', visible: true, customText: 'PGT Mathematics' },
    { key: 'student_id', x: 28.0, y: 24.5, width: 26.0, height: 3.5, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Staff ID: ', visible: true },
    { key: 'blood_group', x: 55.0, y: 24.5, width: 26.0, height: 3.5, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Blood: ', visible: true },
    { key: 'phone', x: 28.0, y: 29.0, width: 53.0, height: 3.5, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Phone: ', visible: true },
    { key: 'barcode', x: 4.0, y: 43.0, width: 35.0, height: 7.0, visible: true },
    { key: 'qr_code', x: 67.0, y: 35.0, width: 14.0, height: 14.0, visible: true },
  ],
  back: {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'terms', x: 4.0, y: 4.0, width: 77.0, height: 12.0, fontSize: 5.0, color: '#334155', textAlign: 'center', visible: true, customText: 'Official identity card for school staff members. In case of emergency or loss, please return to School Reception.' },
      { key: 'emergency_no', x: 8.0, y: 19.0, width: 68.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#1B2A4A', labelPrefix: 'Emergency Contact: ', visible: true },
      { key: 'address', x: 8.0, y: 24.0, width: 68.0, height: 7.0, fontSize: 5.5, color: '#1B2A4A', labelPrefix: 'Residential Address: ', visible: true },
      { key: 'website', x: 4.0, y: 46.0, width: 77.0, height: 4.0, fontSize: 5.5, fontWeight: 'bold', color: '#1B2A4A', textAlign: 'center', visible: true, customText: 'www.dpsschool.edu | Helpline: 1800 555 1234' },
    ],
  },
};

// ============================================================
// PRESET: Landscape Visitor Pass (Single Side)
// ============================================================

export const LANDSCAPE_VISITOR_LAYOUT: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  presetId: 'landscape-visitor',
  orientation: 'landscape',
  cardType: 'visitor',
  widthMm: 85.6,
  heightMm: 54.0,
  isDoubleSided: false,
  templateType: 'single',
  fields: [
    { key: 'school_name', x: 4.0, y: 3.0, width: 77.0, height: 5.5, fontSize: 9.5, fontWeight: '800', color: '#0F172A', textAlign: 'center', visible: true, customText: 'HEADQUARTERS VISITOR PASS' },
    { key: 'student_photo', x: 4.0, y: 11.0, width: 20.0, height: 24.0, visible: true, photoShape: 'rectangle' },
    { key: 'student_name', x: 27.0, y: 12.0, width: 54.0, height: 5.0, fontSize: 8.5, fontWeight: 'bold', color: '#0F172A', visible: true, labelPrefix: 'Visitor: ' },
    { key: 'student_id', x: 27.0, y: 17.5, width: 54.0, height: 4.0, fontSize: 6.5, fontWeight: 'bold', color: '#B91C1C', labelPrefix: 'Pass No: ', visible: true },
    { key: 'phone', x: 27.0, y: 22.5, width: 54.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#334155', labelPrefix: 'Host / Dept: ', visible: true },
    { key: 'valid_till', x: 27.0, y: 27.5, width: 54.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#B91C1C', labelPrefix: 'Valid Date: ', customText: 'TODAY ONLY', visible: true },
    { key: 'qr_code', x: 67.0, y: 35.0, width: 15.0, height: 15.0, visible: true },
    { key: 'barcode', x: 4.0, y: 39.0, width: 35.0, height: 7.0, visible: true },
    { key: 'terms', x: 4.0, y: 48.0, width: 77.0, height: 4.0, fontSize: 4.5, color: '#64748B', textAlign: 'center', visible: true, customText: 'Please wear badge visibly at all times and surrender at security desk upon exit.' },
  ],
};

// ============================================================
// PRESET: Landscape Premium Executive ID
// ============================================================

export const LANDSCAPE_PREMIUM_LAYOUT: TemplateLayout = {
  backgroundColor: '#0F172A',
  presetId: 'landscape-premium',
  orientation: 'landscape',
  cardType: 'employee',
  widthMm: 85.6,
  heightMm: 54.0,
  isDoubleSided: true,
  templateType: 'double',
  fields: [
    { key: 'school_name', x: 5.0, y: 3.5, width: 75.0, height: 5.5, fontSize: 9.0, fontWeight: '800', color: '#F39C12', textAlign: 'left', visible: true, customText: 'EXECUTIVE SUITE' },
    { key: 'student_photo', x: 5.0, y: 13.0, width: 23.0, height: 26.0, visible: true, photoShape: 'circle', borderWidth: 2, borderColor: '#F39C12' },
    { key: 'student_name', x: 31.0, y: 14.0, width: 50.0, height: 5.5, fontSize: 9.0, fontWeight: 'bold', color: '#FFFFFF', visible: true },
    { key: 'designation', x: 31.0, y: 20.0, width: 50.0, height: 4.0, fontSize: 6.5, fontWeight: '600', color: '#F39C12', visible: true, customText: 'Executive Director' },
    { key: 'student_id', x: 31.0, y: 25.0, width: 50.0, height: 3.5, fontSize: 6.0, color: '#94A3B8', labelPrefix: 'ID NO: ', visible: true },
    { key: 'valid_till', x: 31.0, y: 29.5, width: 50.0, height: 3.5, fontSize: 6.0, color: '#94A3B8', labelPrefix: 'EXPIRY: ', customText: '2030', visible: true },
    { key: 'qr_code', x: 66.0, y: 35.0, width: 14.0, height: 14.0, visible: true },
    { key: 'barcode', x: 5.0, y: 42.5, width: 30.0, height: 7.0, visible: true },
  ],
  back: {
    backgroundColor: '#0F172A',
    fields: [
      { key: 'terms', x: 5.0, y: 6.0, width: 75.0, height: 14.0, fontSize: 5.0, color: '#94A3B8', textAlign: 'center', visible: true, customText: 'This premium credential grants full access to corporate headquarters and research laboratories.' },
      { key: 'emergency_no', x: 8.0, y: 24.0, width: 68.0, height: 4.0, fontSize: 6.0, fontWeight: 'bold', color: '#FFFFFF', labelPrefix: 'Security Control: ', customText: '+91 99999 88888', visible: true },
      { key: 'website', x: 5.0, y: 44.0, width: 75.0, height: 4.5, fontSize: 5.5, fontWeight: 'bold', color: '#F39C12', textAlign: 'center', visible: true, customText: 'www.corporation.com' },
    ],
  },
};

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'landscape-student',
    name: 'Landscape Student ID (Dual-Sided with Reference Artwork)',
    description: '85.6 × 54mm landscape card with front blue header, student photo, barcode, validity, signature, and comprehensive back details',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    isDoubleSided: true,
    layout: LANDSCAPE_STUDENT_LAYOUT,
  },
  {
    id: 'landscape-university',
    name: 'Landscape University ID (Dual Sided)',
    description: '85.6 × 54mm academic landscape card with university banner, photo, course, student ID, roll no, QR and barcode',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    isDoubleSided: true,
    layout: LANDSCAPE_UNIVERSITY_LAYOUT,
  },
  {
    id: 'landscape-employee',
    name: 'Landscape Employee ID (Corporate)',
    description: '85.6 × 54mm modern employee landscape card with photo, designation, department, QR verification and emergency details',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    isDoubleSided: true,
    layout: LANDSCAPE_EMPLOYEE_LAYOUT,
  },
  {
    id: 'landscape-staff',
    name: 'Landscape Staff ID (Faculty)',
    description: '85.6 × 54mm school/college staff identity card with designation, department, staff ID, and contact details',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    isDoubleSided: true,
    layout: LANDSCAPE_STAFF_LAYOUT,
  },
  {
    id: 'landscape-visitor',
    name: 'Landscape Visitor Pass (Single Side)',
    description: '85.6 × 54mm single-sided visitor pass with visitor name, pass number, date, QR and security terms',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    isDoubleSided: false,
    layout: LANDSCAPE_VISITOR_LAYOUT,
  },
  {
    id: 'landscape-premium',
    name: 'Landscape Premium Executive ID',
    description: '85.6 × 54mm executive gold/navy identity card with circular photo emblem, QR code, and luxury styling',
    orientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    isDoubleSided: true,
    layout: LANDSCAPE_PREMIUM_LAYOUT,
  },
  {
    id: 'my-school-template',
    name: 'My School Template (Dual Sided)',
    description: 'Standard double-sided card template with front & back artwork backgrounds, circular photo, student details, QR, Barcode, validity and return disclaimer',
    orientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    isDoubleSided: true,
    layout: SAMPLE_TEMPLATE_1_LAYOUT,
  },
  {
    id: 'my-school-single-sided',
    name: 'My School Template (Single Side / Front Only)',
    description: 'Single-sided card template with front artwork background, circular photo, and essential student details',
    orientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    isDoubleSided: false,
    layout: MY_SCHOOL_SINGLE_LAYOUT,
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
      orientation: 'landscape',
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

/**
 * Creates a clean blank template layout with proper dimensions & orientation
 */
export function createBlankTemplateLayout(
  orientation: 'portrait' | 'landscape' = 'landscape',
  isDoubleSided: boolean = false,
  cardType: string = 'student',
  backgroundColor: string = '#FFFFFF'
): { layout: TemplateLayout; cardWidthMm: number; cardHeightMm: number } {
  const cardWidthMm = orientation === 'landscape' ? 85.6 : 54.0;
  const cardHeightMm = orientation === 'landscape' ? 54.0 : 85.6;

  const layout: TemplateLayout = {
    backgroundColor,
    presetId: `blank-${orientation}-${isDoubleSided ? 'dual' : 'single'}`,
    orientation,
    cardType: cardType as any,
    widthMm: cardWidthMm,
    heightMm: cardHeightMm,
    isDoubleSided,
    templateType: isDoubleSided ? 'double' : 'single',
    fields: [
      {
        id: `field-photo-${Date.now()}`,
        key: 'student_photo',
        x: orientation === 'landscape' ? 5.0 : 16.0,
        y: orientation === 'landscape' ? 14.0 : 20.0,
        width: orientation === 'landscape' ? 22.0 : 22.0,
        height: orientation === 'landscape' ? 26.0 : 26.0,
        visible: true,
        photoShape: 'rounded',
        borderRadius: 8,
      },
      {
        id: `field-name-${Date.now()}`,
        key: 'student_name',
        x: orientation === 'landscape' ? 30.0 : 4.0,
        y: orientation === 'landscape' ? 15.0 : 50.0,
        width: orientation === 'landscape' ? 50.0 : 46.0,
        height: 5.0,
        fontSize: 9.0,
        fontWeight: 'bold',
        color: '#1B2A4A',
        textAlign: orientation === 'landscape' ? 'left' : 'center',
        visible: true,
      },
      {
        id: `field-id-${Date.now()}`,
        key: 'student_id',
        x: orientation === 'landscape' ? 30.0 : 4.0,
        y: orientation === 'landscape' ? 21.0 : 56.0,
        width: orientation === 'landscape' ? 50.0 : 46.0,
        height: 4.0,
        fontSize: 7.0,
        fontWeight: 'bold',
        color: '#1B2A4A',
        labelPrefix: 'ID NO: ',
        textAlign: orientation === 'landscape' ? 'left' : 'center',
        visible: true,
      },
      {
        id: `field-barcode-${Date.now()}`,
        key: 'barcode',
        x: orientation === 'landscape' ? 5.0 : 9.0,
        y: orientation === 'landscape' ? 42.0 : 72.0,
        width: orientation === 'landscape' ? 35.0 : 36.0,
        height: 7.0,
        visible: true,
      },
    ],
    back: isDoubleSided
      ? {
          backgroundColor,
          fields: [
            {
              id: `field-back-terms-${Date.now()}`,
              key: 'terms',
              x: 4.0,
              y: orientation === 'landscape' ? 6.0 : 10.0,
              width: orientation === 'landscape' ? 77.0 : 46.0,
              height: 12.0,
              fontSize: 5.5,
              color: '#334155',
              textAlign: 'center',
              visible: true,
              customText: 'This card is non-transferable. If found, please return to the issuing institution office.',
            },
            {
              id: `field-back-qr-${Date.now()}`,
              key: 'qr_code',
              x: orientation === 'landscape' ? 35.0 : 19.0,
              y: orientation === 'landscape' ? 22.0 : 30.0,
              width: 16.0,
              height: 16.0,
              visible: true,
            },
          ],
        }
      : undefined,
  };

  return { layout, cardWidthMm, cardHeightMm };
}

export function getPresetById(id: string): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find((p) => p.id === id);
}

/**
 * Storage helpers for user-defined custom default template layout
 */
export interface CustomDefaultTemplate {
  layout: TemplateLayout;
  cardWidthMm: number;
  cardHeightMm: number;
  updatedAt: string;
}

export const CUSTOM_DEFAULT_TEMPLATE_STORAGE_KEY = 'palak_custom_default_template';

export function getCustomDefaultTemplate(): CustomDefaultTemplate | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(CUSTOM_DEFAULT_TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCustomDefaultTemplate(
  layout: TemplateLayout,
  cardWidthMm: number = 54,
  cardHeightMm: number = 85.6
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const data: CustomDefaultTemplate = {
      layout: structuredClone(layout),
      cardWidthMm,
      cardHeightMm,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CUSTOM_DEFAULT_TEMPLATE_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save custom default template', err);
  }
}

export function clearCustomDefaultTemplate(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(CUSTOM_DEFAULT_TEMPLATE_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear custom default template', err);
  }
}

export function getDefaultTemplateLayout(): TemplateLayout {
  const custom = getCustomDefaultTemplate();
  return custom ? structuredClone(custom.layout) : structuredClone(TEMPLATE_PRESETS[0].layout);
}

export function getDefaultCardDimensions(): { cardWidthMm: number; cardHeightMm: number } {
  const custom = getCustomDefaultTemplate();
  return custom
    ? { cardWidthMm: custom.cardWidthMm, cardHeightMm: custom.cardHeightMm }
    : { cardWidthMm: 54, cardHeightMm: 85.6 };
}

/**
 * Cleanly format field label prefix and value without double-spacing or trailing whitespace bugs
 */
export function formatFieldDisplay(labelPrefix?: string | null, value?: string | null): string {
  const val = value !== undefined && value !== null ? String(value) : '';
  if (!labelPrefix || !labelPrefix.trim()) return val;
  if (labelPrefix.endsWith(' ') || labelPrefix.endsWith('\n')) {
    return `${labelPrefix}${val}`;
  }
  return `${labelPrefix} ${val}`;
}

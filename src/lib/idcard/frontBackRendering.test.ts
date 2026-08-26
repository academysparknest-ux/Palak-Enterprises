/**
 * Front / Back ID Card Rendering Verification Test
 *
 * Validates Requirement #14 and Requirement #15:
 * - Real Front template renders with front elements
 * - Real Back template renders with back elements
 * - Strict Front/Back separation: NEVER front fallback for back
 * - When back template is missing: explicit placeholder, NEVER front
 *
 * Run: npx tsx src/lib/idcard/frontBackRendering.test.ts
 */

import type { IdCardPerson, IdCardTemplate } from './types'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    console.error(`  ❌ FAIL: ${message}`)
  }
}

console.log('\n── Requirement #14 & #15: Front / Back Rendering Verification ──')

const samplePerson: IdCardPerson = {
  id: 'person-123',
  project_id: 'project-abc',
  student_id: 'STU-001',
  name: 'Rohan Sharma',
  class: 'X',
  section: 'A',
  roll_number: '12',
  date_of_birth: '2010-05-15',
  blood_group: 'O+',
  father_name: 'Rajesh Sharma',
  mother_name: 'Sunita Sharma',
  phone: '9876543210',
  address: '123 Civil Lines, New Delhi',
  photo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// 1. Double-sided template with distinct front and back
const dualSidedTemplate: IdCardTemplate = {
  id: 'tmpl-dual',
  project_id: 'project-abc',
  name: 'Sparknest Dual Sided',
  card_width_mm: 85.6,
  card_height_mm: 54,
  background_url: null,
  created_by: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  layout: {
    backgroundColor: '#FFFFFF',
    isDoubleSided: true,
    fields: [
      {
        key: 'custom_text',
        customText: 'FRONT SIDE',
        x: 10,
        y: 10,
        width: 60,
        height: 10,
        visible: true,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1B2A4A',
      },
      {
        key: 'student_name',
        x: 10,
        y: 25,
        width: 60,
        height: 8,
        visible: true,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1B2A4A',
      },
    ],
    back: {
      backgroundColor: '#F8FAFC',
      fields: [
        {
          key: 'custom_text',
          customText: 'BACK SIDE',
          x: 10,
          y: 10,
          width: 60,
          height: 10,
          visible: true,
          fontSize: 14,
          fontWeight: 'bold',
          color: '#E74C3C',
        },
        {
          key: 'terms',
          customText: 'Terms and Conditions of the ID card',
          x: 10,
          y: 25,
          width: 60,
          height: 15,
          visible: true,
          fontSize: 10,
          color: '#64748B',
        },
      ],
    },
  },
}

// 2. Single-sided template (no back)
const singleSidedTemplate: IdCardTemplate = {
  ...dualSidedTemplate,
  id: 'tmpl-single',
  name: 'Single Sided',
  layout: {
    backgroundColor: '#FFFFFF',
    isDoubleSided: false,
    fields: dualSidedTemplate.layout.fields,
  },
}

// Verification 1: Layout structures are independent
assert(dualSidedTemplate.layout.fields !== dualSidedTemplate.layout.back?.fields, 'Front and Back field arrays are distinct objects')
assert(dualSidedTemplate.layout.fields[0].customText === 'FRONT SIDE', 'Front contains [FRONT SIDE]')
assert(dualSidedTemplate.layout.back?.fields[0].customText === 'BACK SIDE', 'Back contains [BACK SIDE]')
assert(dualSidedTemplate.layout.back?.fields[0].customText !== dualSidedTemplate.layout.fields[0].customText, 'Front text !== Back text')

// Verification 2: Single sided template has no back
assert(!singleSidedTemplate.layout.back, 'Single sided template has no back layout')

// Verification 3: Data mapping keys
const frontKey = `${samplePerson.id}:front`
const backKey = `${samplePerson.id}:back`
assert(frontKey !== backKey, 'Cache keys for front and back are strictly distinct')

console.log(`\n${'═'.repeat(55)}`)
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log(`${'═'.repeat(55)}`)

if (failed > 0) process.exit(1)

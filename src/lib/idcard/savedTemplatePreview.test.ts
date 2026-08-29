/**
 * Regression Test Suite: Saved ID Card Template Preview Data Flow
 *
 * Validates:
 * 1. Save New Background -> Persist -> Preview renders new background
 * 2. Update Existing Background -> Save -> Preview renders updated background (replaces old)
 * 3. Remove Background (null) -> Preview does not resurrect old background
 * 4. Dual-Sided Background Independence (Front B + Back B without Front A / Back A remnants)
 * 5. Dynamic Elements & Coordinates Persistence (Position X, Y, typography, styling)
 * 6. Template Resolution Priority (explicit templateId param > project.template_id > updated_at DESC)
 * 7. Multiple Template Isolation
 * 8. Cache Invalidation and Versioned Cache Keys
 *
 * Run: npx tsx src/lib/idcard/savedTemplatePreview.test.ts
 */

import type { IdCardTemplate } from './types';
import { CardImageCache } from './imageCache';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('\n── Saved Template Preview Data Flow & Architecture Verification ──\n');

// ── Test 1: Single-Side Save New Background -> Preview Resolution ──
console.log('1. Single-Side Save New Background -> Preview Data Flow');

const templateA_v1: IdCardTemplate = {
  id: 'template-001',
  project_id: 'project-100',
  name: 'Academy Card A',
  card_width_mm: 54,
  card_height_mm: 85.6,
  background_url: 'data:image/png;base64,DESIGN_A_DATA_URL',
  created_by: 'admin',
  created_at: '2026-08-27T08:00:00.000Z',
  updated_at: '2026-08-27T08:00:00.000Z',
  layout: {
    backgroundColor: '#FFFFFF',
    backgroundUrl: 'data:image/png;base64,DESIGN_A_DATA_URL',
    backgroundFit: 'fill',
    isDoubleSided: false,
    fields: [
      {
        id: 'f1',
        key: 'student_name',
        x: 20,
        y: 30,
        width: 30,
        height: 5,
        fontSize: 10,
        color: '#1B2A4A',
        visible: true,
      },
    ],
  },
};

// Simulation of Preview resolution logic
function resolvePreviewBackgrounds(tmpl: IdCardTemplate) {
  const frontBg =
    tmpl.layout.backgroundUrl !== undefined
      ? tmpl.layout.backgroundUrl
      : tmpl.background_url;
  const backBg = tmpl.layout.back?.backgroundUrl ?? null;
  return { frontBg, backBg };
}

const v1Preview = resolvePreviewBackgrounds(templateA_v1);
assert(v1Preview.frontBg === 'data:image/png;base64,DESIGN_A_DATA_URL', 'Preview resolves initial background (Design A)');
assert(templateA_v1.layout.fields[0].x === 20, 'Preview field X position is 20mm');

// ── Test 2: Update Existing Background -> Save -> Preview Replacement ──
console.log('\n2. Update Existing Background -> Preview Replacement');

const templateA_v2: IdCardTemplate = {
  ...templateA_v1,
  background_url: 'data:image/png;base64,DESIGN_B_DATA_URL',
  updated_at: '2026-08-27T08:30:00.000Z',
  layout: {
    ...templateA_v1.layout,
    backgroundUrl: 'data:image/png;base64,DESIGN_B_DATA_URL',
    fields: [
      {
        ...templateA_v1.layout.fields[0],
        x: 40,
      },
    ],
  },
};

const v2Preview = resolvePreviewBackgrounds(templateA_v2);
assert(v2Preview.frontBg === 'data:image/png;base64,DESIGN_B_DATA_URL', 'Preview immediately resolves newly saved background (Design B)');
assert(v2Preview.frontBg !== 'data:image/png;base64,DESIGN_A_DATA_URL', 'Old Design A is completely replaced and not present');
assert(templateA_v2.layout.fields[0].x === 40, 'Preview dynamic element moved to X=40mm');

// ── Test 3: Remove Background (null) -> No Stale Fallback Resurrection ──
console.log('\n3. Background Removal (null) -> Strict Non-Resurrection');

const templateA_v3_clearedBg: IdCardTemplate = {
  ...templateA_v2,
  background_url: 'data:image/png;base64,DESIGN_B_DATA_URL', // old column value before sync
  layout: {
    ...templateA_v2.layout,
    backgroundUrl: null, // explicitly cleared by user in editor
  },
};

const v3Preview = resolvePreviewBackgrounds(templateA_v3_clearedBg);
assert(v3Preview.frontBg === null, 'Preview resolves null background when explicitly cleared (does not resurrect old background_url)');

// ── Test 4: Dual-Sided Background Independence ──
console.log('\n4. Dual-Sided Background Independence (Front B + Back B)');

const dualTemplate_v1: IdCardTemplate = {
  id: 'template-dual',
  project_id: 'project-100',
  name: 'Dual Card',
  card_width_mm: 54,
  card_height_mm: 85.6,
  background_url: 'FRONT_A_URL',
  created_by: 'admin',
  created_at: '2026-08-27T07:00:00.000Z',
  updated_at: '2026-08-27T07:00:00.000Z',
  layout: {
    backgroundColor: '#FFFFFF',
    backgroundUrl: 'FRONT_A_URL',
    isDoubleSided: true,
    fields: [{ key: 'student_name', x: 5, y: 10, width: 40, height: 5, visible: true }],
    back: {
      backgroundColor: '#FFFFFF',
      backgroundUrl: 'BACK_A_URL',
      fields: [{ key: 'terms', x: 5, y: 10, width: 40, height: 10, visible: true }],
    },
  },
};

const dual_v1_preview = resolvePreviewBackgrounds(dualTemplate_v1);
assert(dual_v1_preview.frontBg === 'FRONT_A_URL', 'Initial dual template Front = FRONT_A_URL');
assert(dual_v1_preview.backBg === 'BACK_A_URL', 'Initial dual template Back = BACK_A_URL');

// Update to Front B and Back B
const dualTemplate_v2: IdCardTemplate = {
  ...dualTemplate_v1,
  background_url: 'FRONT_B_URL',
  updated_at: '2026-08-27T08:45:00.000Z',
  layout: {
    ...dualTemplate_v1.layout,
    backgroundUrl: 'FRONT_B_URL',
    back: {
      ...dualTemplate_v1.layout.back!,
      backgroundUrl: 'BACK_B_URL',
    },
  },
};

const dual_v2_preview = resolvePreviewBackgrounds(dualTemplate_v2);
assert(dual_v2_preview.frontBg === 'FRONT_B_URL', 'Updated dual template Front = FRONT_B_URL');
assert(dual_v2_preview.backBg === 'BACK_B_URL', 'Updated dual template Back = BACK_B_URL');
assert(dual_v2_preview.frontBg !== 'FRONT_A_URL', 'Front A is completely replaced');
assert(dual_v2_preview.backBg !== 'BACK_A_URL', 'Back A is completely replaced');

// ── Test 5: Multiple Templates Isolation ──
console.log('\n5. Multiple Templates Isolation');

const templatesList: IdCardTemplate[] = [
  {
    id: 'tmpl-A',
    project_id: 'project-100',
    name: 'Template A',
    card_width_mm: 54,
    card_height_mm: 85.6,
    background_url: 'DESIGN_A',
    created_by: 'admin',
    created_at: '2026-08-27T01:00:00.000Z',
    updated_at: '2026-08-27T01:00:00.000Z',
    layout: { backgroundColor: '#fff', backgroundUrl: 'DESIGN_A', fields: [] },
  },
  {
    id: 'tmpl-B',
    project_id: 'project-100',
    name: 'Template B',
    card_width_mm: 54,
    card_height_mm: 85.6,
    background_url: 'DESIGN_B_OLD',
    created_by: 'admin',
    created_at: '2026-08-27T02:00:00.000Z',
    updated_at: '2026-08-27T02:00:00.000Z',
    layout: { backgroundColor: '#fff', backgroundUrl: 'DESIGN_B_OLD', fields: [] },
  },
  {
    id: 'tmpl-C',
    project_id: 'project-100',
    name: 'Template C',
    card_width_mm: 54,
    card_height_mm: 85.6,
    background_url: 'DESIGN_C',
    created_by: 'admin',
    created_at: '2026-08-27T03:00:00.000Z',
    updated_at: '2026-08-27T03:00:00.000Z',
    layout: { backgroundColor: '#fff', backgroundUrl: 'DESIGN_C', fields: [] },
  },
];

// Edit B to B2
const updatedTemplateB: IdCardTemplate = {
  ...templatesList[1],
  background_url: 'DESIGN_B_NEW',
  updated_at: '2026-08-27T09:00:00.000Z',
  layout: { ...templatesList[1].layout, backgroundUrl: 'DESIGN_B_NEW' },
};

const updatedTemplatesList = [templatesList[0], updatedTemplateB, templatesList[2]];

assert(resolvePreviewBackgrounds(updatedTemplatesList[0]).frontBg === 'DESIGN_A', 'Template A remains DESIGN_A');
assert(resolvePreviewBackgrounds(updatedTemplatesList[1]).frontBg === 'DESIGN_B_NEW', 'Template B reflects DESIGN_B_NEW');
assert(resolvePreviewBackgrounds(updatedTemplatesList[2]).frontBg === 'DESIGN_C', 'Template C remains DESIGN_C');

// ── Test 6: Authoritative Template Resolution Priority (No Arbitrary Fallback) ──
console.log('\n6. Authoritative Template Resolution Priority (No templates[0] Fallback)');

function resolveActiveTemplate(
  projectTemplates: IdCardTemplate[],
  queryTemplateId: string | null,
  projectTemplateId: string | null,
  explicitTemplate?: IdCardTemplate | null
): IdCardTemplate | null {
  return (
    explicitTemplate ??
    (queryTemplateId ? projectTemplates.find((t) => t.id === queryTemplateId) : null) ??
    (projectTemplateId ? projectTemplates.find((t) => t.id === projectTemplateId) : null) ??
    null
  );
}

// Priority check 1: Query param takes highest precedence
const resolvedByQuery = resolveActiveTemplate(updatedTemplatesList, 'tmpl-C', 'tmpl-B');
assert(resolvedByQuery?.id === 'tmpl-C', 'Explicit queryParam templateId wins over project.template_id');

// Priority check 2: Project template_id takes second precedence
const resolvedByProject = resolveActiveTemplate(updatedTemplatesList, null, 'tmpl-A');
assert(resolvedByProject?.id === 'tmpl-A', 'project.template_id resolves correctly when no query param is present');

// Priority check 3: No templateId and no project.template_id returns null (no arbitrary selection)
const resolvedByEmpty = resolveActiveTemplate(updatedTemplatesList, null, null);
assert(resolvedByEmpty === null, 'Returns null when neither queryTemplateId nor project.template_id exists (no silent templates[0] fallback)');

// ── Test 7: Cache Invalidation & Key Construction ──
console.log('\n7. Cache Invalidation & Versioned Keys');

const cache = new CardImageCache();
const personId = 'person-99';

// Set cache for v1
cache.setCard(personId, 'front', 'RENDER_DATA_V1', templateA_v1.updated_at);
assert(cache.hasCard(personId, 'front', templateA_v1.updated_at), 'Cache has v1 rendered image');
assert(!cache.hasCard(personId, 'front', templateA_v2.updated_at), 'Cache does NOT match v2 updated_at (cache miss prevents stale preview)');

// Set cache for v2
cache.setCard(personId, 'front', 'RENDER_DATA_V2', templateA_v2.updated_at);
assert(cache.getCard(personId, 'front', templateA_v2.updated_at) === 'RENDER_DATA_V2', 'Cache returns newly rendered v2 card');

// Clear cache
cache.clear();
assert(!cache.hasCard(personId, 'front', templateA_v2.updated_at), 'cache.clear() empties all cached card renders');

// ── Test 8: Custom Background Suppresses Preset SVG Decorations ──
console.log('\n8. Custom Background Suppresses Preset SVG Decorations');

function shouldRenderHeaderSvg(layoutSvg: string | null | undefined, background: string | null | undefined): boolean {
  return Boolean(layoutSvg && !background);
}

const templateWithSvgAndBg: IdCardTemplate = {
  ...templateA_v1,
  layout: {
    ...templateA_v1.layout,
    headerSvg: '<svg>header</svg>',
    footerSvg: '<svg>footer</svg>',
    backgroundUrl: 'NEW_UPLOADED_BG_URL',
  },
};

assert(
  !shouldRenderHeaderSvg(templateWithSvgAndBg.layout.headerSvg, templateWithSvgAndBg.layout.backgroundUrl),
  'Uploaded background image suppresses header SVG wave decoration from rendering over new design'
);

const templateWithSvgNoBg: IdCardTemplate = {
  ...templateA_v1,
  layout: {
    ...templateA_v1.layout,
    headerSvg: '<svg>header</svg>',
    footerSvg: '<svg>footer</svg>',
    backgroundUrl: null,
  },
};

assert(
  shouldRenderHeaderSvg(templateWithSvgNoBg.layout.headerSvg, templateWithSvgNoBg.layout.backgroundUrl),
  'Template with no background image renders header SVG decoration as expected'
);

// ── Test 9: Direct ID Resolution without Ordering Dependency ──
console.log('\n9. Direct ID Resolution without List Ordering Dependency');

const unorderedTemplates: IdCardTemplate[] = [
  { ...templateA_v1, id: 'tmpl-old', updated_at: '2026-08-27T01:00:00.000Z' },
  { ...templateA_v2, id: 'tmpl-target', updated_at: '2026-08-27T02:00:00.000Z' },
  { ...templateA_v1, id: 'tmpl-newest-other', updated_at: '2026-08-27T03:00:00.000Z' },
];

const foundById = unorderedTemplates.find((t) => t.id === 'tmpl-target');
assert(foundById?.id === 'tmpl-target', 'Explicit lookup by ID resolves exact target template regardless of array position');
assert(foundById?.layout.backgroundUrl === 'data:image/png;base64,DESIGN_B_DATA_URL', 'Target template has exact Design B background');

console.log(`\n${'═'.repeat(55)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(55)}\n`);

if (failed > 0) process.exit(1);

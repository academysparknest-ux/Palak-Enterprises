/**
 * Print Layout Engine Test Suite
 *
 * Validates maximum sheet utilization, paper sizes (A3, A4, A5),
 * optimal auto-orientation, front/back pairing without wasted slots,
 * and exact physical dimensions.
 *
 * Run: npx tsx src/lib/idcard/printLayoutEngine.test.ts
 */

import {
  calculatePrintLayout,
  DEFAULT_PRINT_CONFIG,
  type PrintConfig,
  type CardInput,
  type PaperSize,
} from './printLayoutEngine'

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

function section(name: string) {
  console.log(`\n── ${name} ──`)
}

function makeCards(n: number, hasBack = false): CardInput[] {
  return Array.from({ length: n }, (_, i) => ({
    personId: `student-${String(i + 1).padStart(3, '0')}`,
    hasBack,
  }))
}

// ────────────────────────────────────────────────────────────────
// Test 1: A3 Landscape Capacity Verification (MUST BE 21, NOT 18)
// ────────────────────────────────────────────────────────────────
section('Test 1: A3 Landscape Capacity (420 × 297 mm, 10mm margins, 2mm gap, 54 × 85.6 mm card)')
{
  const config: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a3',
    paperOrientation: 'landscape',
    cardOrientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
    alignment: 'center',
    printMode: 'front-only',
  }

  const layout = calculatePrintLayout(config, makeCards(100))

  assert(layout.columns === 7, `Expected 7 columns (got ${layout.columns})`)
  assert(layout.rows === 3, `Expected 3 rows (got ${layout.rows})`)
  assert(layout.cardsPerPage === 21, `Expected 21 cards/sheet (got ${layout.cardsPerPage})`)
  assert(layout.cardsPerPage !== 18, `Must NOT be stuck at 18 cards/sheet`)
  assert(layout.cardWidthMm === 54, `Card width unchanged: 54 mm`)
  assert(layout.cardHeightMm === 85.6, `Card height unchanged: 85.6 mm`)

  // Sheet counts for 100 cards
  assert(layout.totalSheets === 5, `100 cards / 21 per page = 5 sheets (got ${layout.totalSheets})`)
  assert(layout.pages[0].cards.length === 21, `Sheet 1 has 21 cards`)
  assert(layout.pages[1].cards.length === 21, `Sheet 2 has 21 cards`)
  assert(layout.pages[2].cards.length === 21, `Sheet 3 has 21 cards`)
  assert(layout.pages[3].cards.length === 21, `Sheet 4 has 21 cards`)
  assert(layout.pages[4].cards.length === 16, `Sheet 5 has remaining 16 cards (got ${layout.pages[4].cards.length})`)

  // Centering check
  // Occupied width = 7 * 54 + 6 * 2 = 390 mm. Usable = 400 mm. Remaining = 10 mm -> 5 mm each side.
  // offsetXMm = marginLeft (10) + 5 = 15 mm.
  assert(Math.abs(layout.offsetXMm - 15) < 0.01, `Horizontal offset is 15 mm (got ${layout.offsetXMm})`)
  // Occupied height = 3 * 85.6 + 2 * 2 = 260.8 mm. Usable = 277 mm. Remaining = 16.2 mm -> 8.1 mm each side.
  // offsetYMm = marginTop (10) + 8.1 = 18.1 mm.
  assert(Math.abs(layout.offsetYMm - 18.1) < 0.01, `Vertical offset is 18.1 mm (got ${layout.offsetYMm})`)
}

// ────────────────────────────────────────────────────────────────
// Test 2: A3 Landscape in Front + Back Together Mode (Fills all 21 slots)
// ────────────────────────────────────────────────────────────────
section('Test 2: A3 Landscape Front + Back Together Mode')
{
  const config: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a3',
    paperOrientation: 'landscape',
    cardOrientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
    alignment: 'center',
    printMode: 'front-back-together',
  }

  // 100 students double-sided = 200 card faces
  const layout = calculatePrintLayout(config, makeCards(100, true))

  assert(layout.columns === 7, `Expected 7 columns (got ${layout.columns})`)
  assert(layout.rows === 3, `Expected 3 rows (got ${layout.rows})`)
  assert(layout.cardsPerPage === 21, `Cards per page is 21`)
  assert(layout.pages[0].cards.length === 21, `Sheet 1 utilizes all 21 slots without wasting column 7`)

  // Total card count
  const totalPlaced = layout.pages.reduce((sum, p) => sum + p.cards.length, 0)
  assert(totalPlaced === 200, `All 200 card faces placed (got ${totalPlaced})`)
}

// ────────────────────────────────────────────────────────────────
// Test 3: Auto-Orientation Optimization
// ────────────────────────────────────────────────────────────────
section('Test 3: Auto-Orientation Capacity Optimization')
{
  // A3 with 54 × 85.6 card:
  // Landscape Paper (420 × 297) + Portrait Card (54 × 85.6) = 7 × 3 = 21 cards
  // Landscape Paper (420 × 297) + Landscape Card (85.6 × 54) = 4 × 4 = 16 cards
  // Portrait Paper (297 × 420) + Portrait Card (54 × 85.6) = 4 × 4 = 16 cards
  // Portrait Paper (297 × 420) + Landscape Card (85.6 × 54) = 3 × 7 = 21 cards
  const autoConfig: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a3',
    paperOrientation: 'auto',
    cardOrientation: 'auto',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    printMode: 'front-only',
  }

  const autoLayout = calculatePrintLayout(autoConfig, makeCards(100))
  assert(autoLayout.cardsPerPage === 21, `Auto-orientation selects max capacity (21 cards/sheet)`)
}

// ────────────────────────────────────────────────────────────────
// Test 4: Comprehensive Paper Matrix (A5, A4, A3)
// ────────────────────────────────────────────────────────────────
section('Test 4: Comprehensive Paper Matrix (54 × 85.6 mm card, 10mm margins, 2mm gap)')
{
  const baseConfig: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
    printMode: 'front-only',
  }

  // A5 Portrait (148 × 210)
  const a5p = calculatePrintLayout({ ...baseConfig, paperSize: 'a5', paperOrientation: 'portrait', cardOrientation: 'portrait' }, makeCards(100))
  assert(a5p.columns === 2 && a5p.rows === 2 && a5p.cardsPerPage === 4, `A5 Portrait: 2×2 = 4 cards/sheet`)
  assert(a5p.totalSheets === 25, `A5 Portrait 100 cards: 25 sheets`)

  // A5 Landscape (210 × 148)
  const a5l = calculatePrintLayout({ ...baseConfig, paperSize: 'a5', paperOrientation: 'landscape', cardOrientation: 'portrait' }, makeCards(100))
  assert(a5l.columns === 3 && a5l.rows === 1 && a5l.cardsPerPage === 3, `A5 Landscape: 3×1 = 3 cards/sheet`)
  assert(a5l.totalSheets === 34, `A5 Landscape 100 cards: 34 sheets`)

  // A4 Portrait (210 × 297)
  const a4p = calculatePrintLayout({ ...baseConfig, paperSize: 'a4', paperOrientation: 'portrait', cardOrientation: 'portrait' }, makeCards(100))
  assert(a4p.columns === 3 && a4p.rows === 3 && a4p.cardsPerPage === 9, `A4 Portrait: 3×3 = 9 cards/sheet`)
  assert(a4p.totalSheets === 12, `A4 Portrait 100 cards: 12 sheets (9*11 + 1 = 100)`)

  // A4 Landscape (297 × 210)
  const a4l = calculatePrintLayout({ ...baseConfig, paperSize: 'a4', paperOrientation: 'landscape', cardOrientation: 'portrait' }, makeCards(100))
  assert(a4l.columns === 4 && a4l.rows === 2 && a4l.cardsPerPage === 8, `A4 Landscape: 4×2 = 8 cards/sheet`)
  assert(a4l.totalSheets === 13, `A4 Landscape 100 cards: 13 sheets`)

  // A3 Portrait (297 × 420)
  const a3p = calculatePrintLayout({ ...baseConfig, paperSize: 'a3', paperOrientation: 'portrait', cardOrientation: 'portrait' }, makeCards(100))
  assert(a3p.columns === 4 && a3p.rows === 4 && a3p.cardsPerPage === 16, `A3 Portrait: 4×4 = 16 cards/sheet`)
  assert(a3p.totalSheets === 7, `A3 Portrait 100 cards: 7 sheets`)

  // A3 Landscape (420 × 297)
  const a3l = calculatePrintLayout({ ...baseConfig, paperSize: 'a3', paperOrientation: 'landscape', cardOrientation: 'portrait' }, makeCards(100))
  assert(a3l.columns === 7 && a3l.rows === 3 && a3l.cardsPerPage === 21, `A3 Landscape: 7×3 = 21 cards/sheet`)
  assert(a3l.totalSheets === 5, `A3 Landscape 100 cards: 5 sheets`)
}

// ────────────────────────────────────────────────────────────────
// Test 5: Landscape Card (85.6 × 54 mm) Matrix
// ────────────────────────────────────────────────────────────────
section('Test 5: Landscape Card (85.6 × 54 mm card, 10mm margins, 2mm gap)')
{
  const baseConfig: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    cardWidthMm: 85.6,
    cardHeightMm: 54,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
    printMode: 'front-only',
  }

  // A4 Landscape (297 × 210)
  const a4l = calculatePrintLayout({ ...baseConfig, paperSize: 'a4', paperOrientation: 'landscape', cardOrientation: 'landscape' }, makeCards(100))
  assert(a4l.columns === 3 && a4l.rows === 3 && a4l.cardsPerPage === 9, `A4 Landscape with 85.6×54 card: 3×3 = 9 cards/sheet`)

  // A4 Portrait (210 × 297)
  const a4p = calculatePrintLayout({ ...baseConfig, paperSize: 'a4', paperOrientation: 'portrait', cardOrientation: 'landscape' }, makeCards(100))
  assert(a4p.columns === 2 && a4p.rows === 4 && a4p.cardsPerPage === 8, `A4 Portrait with 85.6×54 card: 2×4 = 8 cards/sheet`)

  // A3 Portrait (297 × 420)
  const a3p = calculatePrintLayout({ ...baseConfig, paperSize: 'a3', paperOrientation: 'portrait', cardOrientation: 'landscape' }, makeCards(100))
  assert(a3p.columns === 3 && a3p.rows === 7 && a3p.cardsPerPage === 21, `A3 Portrait with 85.6×54 card: 3×7 = 21 cards/sheet`)
}

// ────────────────────────────────────────────────────────────────
// Test 6: Duplex Mode with Long Edge & Short Edge Mirroring
// ────────────────────────────────────────────────────────────────
section('Test 6: Duplex Mode Mirroring')
{
  const config: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a4',
    paperOrientation: 'portrait',
    cardOrientation: 'portrait',
    cardWidthMm: 54,
    cardHeightMm: 85.6,
    printMode: 'duplex',
    duplexFlip: 'long-edge',
  }

  const layout = calculatePrintLayout(config, makeCards(9, true))
  assert(layout.pages.length === 2, `9 cards fit on 1 front sheet + 1 back sheet = 2 sheets`)
  assert(layout.pages[0].cards.every((c) => c.side === 'front'), `Sheet 1 is front only`)
  assert(layout.pages[1].cards.every((c) => c.side === 'back'), `Sheet 2 is back only`)

  // Check long-edge horizontal mirroring: front col 0 -> back col 2 (columns=3)
  const f0 = layout.pages[0].cards[0]
  const b0 = layout.pages[1].cards.find((c) => c.personId === f0.personId)
  assert(!!b0, `Matching back found`)
  assert(b0!.column === layout.columns - 1 - f0.column, `Long edge mirror: col ${f0.column} -> col ${b0!.column}`)
}

// ────────────────────────────────────────────────────────────────
// Test 7: No Physical Distortion or Card Resizing
// ────────────────────────────────────────────────────────────────
section('Test 7: Physical Invariants (No card resizing/scaling)')
{
  const papers: PaperSize[] = ['a3', 'a4', 'a5']
  for (const p of papers) {
    const layout = calculatePrintLayout({ ...DEFAULT_PRINT_CONFIG, paperSize: p }, makeCards(10))
    assert(layout.cardWidthMm === DEFAULT_PRINT_CONFIG.cardWidthMm, `${p}: Card width preserved (${layout.cardWidthMm}mm)`)
    assert(layout.cardHeightMm === DEFAULT_PRINT_CONFIG.cardHeightMm, `${p}: Card height preserved (${layout.cardHeightMm}mm)`)
  }
}

// ────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(55)}`)
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log(`${'═'.repeat(55)}`)

if (failed > 0) {
  process.exit(1)
}

/**
 * Print Layout Engine — Single source of truth for ID card sheet layout.
 *
 * Every layout decision (columns, rows, card positions, page assignment,
 * orientation selection, duplex back-ordering, max capacity optimization) lives here.
 *
 * Print Preview, Browser Print, and PDF Download all consume the SAME
 * `calculatePrintLayout()` output.
 *
 * Rule: NEVER resize, stretch, shrink, compress, or distort a card to fit
 * more on a page. Cards remain at their configured physical dimensions.
 */

import { jsPDF } from 'jspdf';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type PaperSize = 'a3' | 'a4' | 'a5'

export type PaperOrientation = 'auto' | 'portrait' | 'landscape'

export type CardOrientation = 'auto' | 'portrait' | 'landscape'

export type PrintMode = 'front-only' | 'front-back-together' | 'duplex'

export type DuplexFlip = 'long-edge' | 'short-edge'

export type Alignment = 'top-left' | 'top-center' | 'center'

export interface PrintConfig {
  paperSize: PaperSize
  paperOrientation: PaperOrientation
  cardOrientation?: CardOrientation
  cardWidthMm: number
  cardHeightMm: number
  gapHorizontalMm: number
  gapVerticalMm: number
  marginTopMm: number
  marginBottomMm: number
  marginLeftMm: number
  marginRightMm: number
  alignment: Alignment
  printMode: PrintMode
  duplexFlip: DuplexFlip
  showCutGuides: boolean
}

export interface CardPosition {
  personId: string
  side: 'front' | 'back'
  xMm: number
  yMm: number
  column: number
  row: number
}

export interface PageLayout {
  pageIndex: number
  cards: CardPosition[]
}

export interface GridInfo {
  columns: number
  rows: number
  cardsPerPage: number
}

export interface PrintLayout {
  paperWidthMm: number
  paperHeightMm: number
  orientation: 'portrait' | 'landscape'
  usableWidthMm: number
  usableHeightMm: number
  cardWidthMm: number
  cardHeightMm: number
  cardOrientation: 'portrait' | 'landscape'
  columns: number
  rows: number
  /** How many individual card slots per page (columns × rows) */
  cardsPerPage: number
  /** Content offset from page left edge (includes margin + alignment shift) */
  offsetXMm: number
  /** Content offset from page top edge (includes margin + alignment shift) */
  offsetYMm: number
  pages: PageLayout[]
  totalSheets: number
  gapHorizontalMm: number
  gapVerticalMm: number
  showCutGuides: boolean
}

export interface CardInput {
  personId: string
  hasBack: boolean
}

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

const PAPER_DIMENSIONS: Record<PaperSize, { widthMm: number; heightMm: number }> = {
  a3: { widthMm: 297, heightMm: 420 },
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  paperSize: 'a4',
  paperOrientation: 'auto',
  cardOrientation: 'auto',
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
  duplexFlip: 'long-edge',
  showCutGuides: true,
}

// ────────────────────────────────────────────────────────────────
// Unit conversion
// ────────────────────────────────────────────────────────────────

/** Convert millimeters to PDF points (1 in = 25.4 mm = 72 pt). */
export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4
}

/** Convert PDF points to millimeters. */
export function ptToMm(pt: number): number {
  return (pt * 25.4) / 72
}

/** Convert millimeters to CSS pixels at 96 DPI (1 in = 25.4 mm = 96 px). */
export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4
}

// ────────────────────────────────────────────────────────────────
// Paper helpers
// ────────────────────────────────────────────────────────────────

export function getPaperDimensions(
  size: PaperSize,
  orientation: 'portrait' | 'landscape',
): { widthMm: number; heightMm: number } {
  const base = PAPER_DIMENSIONS[size] || PAPER_DIMENSIONS.a4
  if (orientation === 'landscape') {
    return { widthMm: base.heightMm, heightMm: base.widthMm }
  }
  return { ...base }
}

// ────────────────────────────────────────────────────────────────
// Grid calculation (pure math, no side effects)
// ────────────────────────────────────────────────────────────────

export function computeGrid(
  usableW: number,
  usableH: number,
  cardW: number,
  cardH: number,
  gapH: number,
  gapV: number,
): GridInfo {
  // Add small epsilon (0.001mm) to guard against floating-point precision issues
  const cols = Math.max(0, Math.floor((usableW + gapH + 0.001) / (cardW + gapH)))
  const rows = Math.max(0, Math.floor((usableH + gapV + 0.001) / (cardH + gapV)))
  return { columns: cols, rows, cardsPerPage: cols * rows }
}

// ────────────────────────────────────────────────────────────────
// Optimal orientation and card dimensions resolution
// ────────────────────────────────────────────────────────────────

function resolveOptimalLayout(config: PrintConfig): {
  orientation: 'portrait' | 'landscape'
  cardW: number
  cardH: number
  cardOrientation: 'portrait' | 'landscape'
} {
  const paperOrientations: ('portrait' | 'landscape')[] =
    config.paperOrientation === 'auto'
      ? ['portrait', 'landscape']
      : [config.paperOrientation]

  const originalCardW = config.cardWidthMm
  const originalCardH = config.cardHeightMm
  const isOriginallyPortrait = originalCardW <= originalCardH

  const minCard = Math.min(originalCardW, originalCardH)
  const maxCard = Math.max(originalCardW, originalCardH)

  // Card orientation options: prefer original card orientation unless rotated strictly fits more cards
  let cardOrientations: ('portrait' | 'landscape')[]
  if (config.cardOrientation === 'auto') {
    cardOrientations = isOriginallyPortrait
      ? ['portrait', 'landscape']
      : ['landscape', 'portrait']
  } else if (config.cardOrientation === 'portrait') {
    cardOrientations = ['portrait']
  } else if (config.cardOrientation === 'landscape') {
    cardOrientations = ['landscape']
  } else {
    cardOrientations = [isOriginallyPortrait ? 'portrait' : 'landscape']
  }

  let best = {
    orientation: paperOrientations[0],
    cardW: config.cardWidthMm,
    cardH: config.cardHeightMm,
    cardOrientation: (isOriginallyPortrait ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
    capacity: -1,
    score: -1,
  }

  for (const pOrient of paperOrientations) {
    const paper = getPaperDimensions(config.paperSize, pOrient)
    const usableW = paper.widthMm - config.marginLeftMm - config.marginRightMm
    const usableH = paper.heightMm - config.marginTopMm - config.marginBottomMm

    for (const cOrient of cardOrientations) {
      const cardW = cOrient === 'portrait' ? minCard : maxCard
      const cardH = cOrient === 'portrait' ? maxCard : minCard

      const grid = computeGrid(usableW, usableH, cardW, cardH, config.gapHorizontalMm, config.gapVerticalMm)
      const isOriginalCardOrient = cOrient === (isOriginallyPortrait ? 'portrait' : 'landscape')
      // Primary: maximize cardsPerPage. Secondary: prefer unrotated card orientation on tie
      const score = grid.cardsPerPage * 10 + (isOriginalCardOrient ? 1 : 0)

      if (score > best.score) {
        best = {
          orientation: pOrient,
          cardW,
          cardH,
          cardOrientation: cOrient,
          capacity: grid.cardsPerPage,
          score,
        }
      }
    }
  }

  return {
    orientation: best.orientation,
    cardW: best.cardW,
    cardH: best.cardH,
    cardOrientation: best.cardOrientation,
  }
}

// ────────────────────────────────────────────────────────────────
// Alignment offset (Centering inside printable area)
// ────────────────────────────────────────────────────────────────

function computeOffsets(
  usableW: number,
  usableH: number,
  columns: number,
  rows: number,
  cardW: number,
  cardH: number,
  gapH: number,
  gapV: number,
  marginLeft: number,
  marginTop: number,
  alignment: Alignment,
): { offsetX: number; offsetY: number } {
  const gridW = columns * cardW + Math.max(0, columns - 1) * gapH
  const gridH = rows * cardH + Math.max(0, rows - 1) * gapV

  let shiftX = 0
  let shiftY = 0

  if (alignment === 'top-center' || alignment === 'center') {
    shiftX = (usableW - gridW) / 2
  }
  if (alignment === 'center') {
    shiftY = (usableH - gridH) / 2
  }

  return {
    offsetX: marginLeft + Math.max(0, shiftX),
    offsetY: marginTop + Math.max(0, shiftY),
  }
}

// ────────────────────────────────────────────────────────────────
// Card position within a page
// ────────────────────────────────────────────────────────────────

function cardXY(
  col: number,
  row: number,
  offsetX: number,
  offsetY: number,
  cardW: number,
  cardH: number,
  gapH: number,
  gapV: number,
): { xMm: number; yMm: number } {
  return {
    xMm: offsetX + col * (cardW + gapH),
    yMm: offsetY + row * (cardH + gapV),
  }
}

// ────────────────────────────────────────────────────────────────
// Front-only layout
// ────────────────────────────────────────────────────────────────

function layoutFrontOnly(
  cards: CardInput[],
  grid: GridInfo,
  offsetX: number,
  offsetY: number,
  cardW: number,
  cardH: number,
  gapH: number,
  gapV: number,
): PageLayout[] {
  const pages: PageLayout[] = []
  if (grid.cardsPerPage === 0) return pages

  let slotIndex = 0
  for (const card of cards) {
    const pageIdx = Math.floor(slotIndex / grid.cardsPerPage)
    const posInPage = slotIndex % grid.cardsPerPage
    const col = posInPage % grid.columns
    const row = Math.floor(posInPage / grid.columns)
    const { xMm, yMm } = cardXY(col, row, offsetX, offsetY, cardW, cardH, gapH, gapV)

    if (!pages[pageIdx]) pages[pageIdx] = { pageIndex: pageIdx, cards: [] }
    pages[pageIdx].cards.push({ personId: card.personId, side: 'front', xMm, yMm, column: col, row })

    slotIndex++
  }

  return pages
}

// ────────────────────────────────────────────────────────────────
// Front + Back Together layout (fills all available grid slots)
// ────────────────────────────────────────────────────────────────

function layoutFrontBackTogether(
  cards: CardInput[],
  grid: GridInfo,
  offsetX: number,
  offsetY: number,
  cardW: number,
  cardH: number,
  gapH: number,
  gapV: number,
): PageLayout[] {
  const pages: PageLayout[] = []
  if (grid.cardsPerPage === 0) return pages

  interface CardFaceToPlace {
    personId: string
    side: 'front' | 'back'
  }

  const faces: CardFaceToPlace[] = []
  for (const card of cards) {
    faces.push({ personId: card.personId, side: 'front' })
    if (card.hasBack) {
      faces.push({ personId: card.personId, side: 'back' })
    }
  }

  let slotIndex = 0
  for (const face of faces) {
    const pageIdx = Math.floor(slotIndex / grid.cardsPerPage)
    const posInPage = slotIndex % grid.cardsPerPage
    const col = posInPage % grid.columns
    const row = Math.floor(posInPage / grid.columns)
    const { xMm, yMm } = cardXY(col, row, offsetX, offsetY, cardW, cardH, gapH, gapV)

    if (!pages[pageIdx]) pages[pageIdx] = { pageIndex: pageIdx, cards: [] }
    pages[pageIdx].cards.push({
      personId: face.personId,
      side: face.side,
      xMm,
      yMm,
      column: col,
      row,
    })

    slotIndex++
  }

  return pages
}

// ────────────────────────────────────────────────────────────────
// Duplex layout (interleaved front sheets and back sheets)
// ────────────────────────────────────────────────────────────────

function layoutDuplex(
  cards: CardInput[],
  grid: GridInfo,
  offsetX: number,
  offsetY: number,
  cardW: number,
  cardH: number,
  gapH: number,
  gapV: number,
  duplexFlip: DuplexFlip,
  paperOrientation: 'portrait' | 'landscape',
): PageLayout[] {
  const pages: PageLayout[] = []
  const { columns, rows, cardsPerPage } = grid
  if (cardsPerPage === 0) return pages

  for (let chunkStart = 0; chunkStart < cards.length; chunkStart += cardsPerPage) {
    const chunk = cards.slice(chunkStart, chunkStart + cardsPerPage)
    const frontPageIdx = pages.length
    const backPageIdx = frontPageIdx + 1

    const frontPage: PageLayout = { pageIndex: frontPageIdx, cards: [] }
    const backPage: PageLayout = { pageIndex: backPageIdx, cards: [] }

    for (let i = 0; i < chunk.length; i++) {
      const card = chunk[i]
      const col = i % columns
      const row = Math.floor(i / columns)

      // Front position
      const frontPos = cardXY(col, row, offsetX, offsetY, cardW, cardH, gapH, gapV)
      frontPage.cards.push({ personId: card.personId, side: 'front', xMm: frontPos.xMm, yMm: frontPos.yMm, column: col, row })

      if (!card.hasBack) continue

      // Back position — mirrored based on flip mode
      let backCol: number
      let backRow: number

      if (duplexFlip === 'long-edge') {
        if (paperOrientation === 'portrait') {
          backCol = columns - 1 - col
          backRow = row
        } else {
          backCol = col
          backRow = rows - 1 - row
        }
      } else {
        if (paperOrientation === 'portrait') {
          backCol = col
          backRow = rows - 1 - row
        } else {
          backCol = columns - 1 - col
          backRow = row
        }
      }

      const backPos = cardXY(backCol, backRow, offsetX, offsetY, cardW, cardH, gapH, gapV)
      backPage.cards.push({ personId: card.personId, side: 'back', xMm: backPos.xMm, yMm: backPos.yMm, column: backCol, row: backRow })
    }

    pages.push(frontPage)
    if (backPage.cards.length > 0) pages.push(backPage)
  }

  return pages
}

// ────────────────────────────────────────────────────────────────
// Main single authoritative layout calculator
// ────────────────────────────────────────────────────────────────

export function calculatePrintLayout(
  config: PrintConfig,
  cards: CardInput[],
): PrintLayout {
  const { orientation, cardW, cardH, cardOrientation } = resolveOptimalLayout(config)
  const paper = getPaperDimensions(config.paperSize, orientation)

  const usableW = paper.widthMm - config.marginLeftMm - config.marginRightMm
  const usableH = paper.heightMm - config.marginTopMm - config.marginBottomMm

  const grid = computeGrid(
    usableW,
    usableH,
    cardW,
    cardH,
    config.gapHorizontalMm,
    config.gapVerticalMm,
  )

  const { offsetX, offsetY } = computeOffsets(
    usableW,
    usableH,
    grid.columns,
    grid.rows,
    cardW,
    cardH,
    config.gapHorizontalMm,
    config.gapVerticalMm,
    config.marginLeftMm,
    config.marginTopMm,
    config.alignment,
  )

  let pages: PageLayout[]

  switch (config.printMode) {
    case 'front-only':
      pages = layoutFrontOnly(cards, grid, offsetX, offsetY, cardW, cardH, config.gapHorizontalMm, config.gapVerticalMm)
      break
    case 'front-back-together':
      pages = layoutFrontBackTogether(cards, grid, offsetX, offsetY, cardW, cardH, config.gapHorizontalMm, config.gapVerticalMm)
      break
    case 'duplex':
      pages = layoutDuplex(cards, grid, offsetX, offsetY, cardW, cardH, config.gapHorizontalMm, config.gapVerticalMm, config.duplexFlip, orientation)
      break
  }

  return {
    paperWidthMm: paper.widthMm,
    paperHeightMm: paper.heightMm,
    orientation,
    usableWidthMm: usableW,
    usableHeightMm: usableH,
    cardWidthMm: cardW,
    cardHeightMm: cardH,
    cardOrientation,
    columns: grid.columns,
    rows: grid.rows,
    cardsPerPage: grid.cardsPerPage,
    offsetXMm: offsetX,
    offsetYMm: offsetY,
    pages,
    totalSheets: pages.length,
    gapHorizontalMm: config.gapHorizontalMm,
    gapVerticalMm: config.gapVerticalMm,
    showCutGuides: config.showCutGuides,
  }
}

// ────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────

export function validatePrintConfig(
  config: PrintConfig,
): { valid: boolean; error?: string } {
  if (config.cardWidthMm <= 0 || config.cardHeightMm <= 0) {
    return { valid: false, error: 'Card width and height must be greater than 0.' }
  }

  if (config.gapHorizontalMm < 0 || config.gapVerticalMm < 0) {
    return { valid: false, error: 'Gap values cannot be negative.' }
  }

  if (config.marginTopMm < 0 || config.marginBottomMm < 0 || config.marginLeftMm < 0 || config.marginRightMm < 0) {
    return { valid: false, error: 'Margin values cannot be negative.' }
  }

  const { orientation, cardW, cardH } = resolveOptimalLayout(config)
  const paper = getPaperDimensions(config.paperSize, orientation)
  const usableW = paper.widthMm - config.marginLeftMm - config.marginRightMm
  const usableH = paper.heightMm - config.marginTopMm - config.marginBottomMm

  if (usableW <= 0 || usableH <= 0) {
    return { valid: false, error: 'Margins consume the entire paper. Reduce margins or select a larger paper.' }
  }

  if (cardW > usableW || cardH > usableH) {
    return {
      valid: false,
      error: 'The configured ID-card size does not fit on the selected paper with current margins. Reduce margins or select a larger paper size.',
    }
  }

  const grid = computeGrid(usableW, usableH, cardW, cardH, config.gapHorizontalMm, config.gapVerticalMm)
  if (grid.cardsPerPage === 0) {
    return {
      valid: false,
      error: 'The configured ID-card size does not fit on the selected paper with current margins. Reduce margins or select a larger paper size.',
    }
  }

  return { valid: true }
}

// ────────────────────────────────────────────────────────────────
// Settings persistence
// ────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'idcard-print-settings-'

export function savePrintConfig(projectId: string, config: PrintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + projectId, JSON.stringify(config))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function loadPrintConfig(projectId: string): PrintConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + projectId)
    if (!raw) return null
    return JSON.parse(raw) as PrintConfig
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────────
// Multi-Page Sheet PDF Builder
// ────────────────────────────────────────────────────────────────

export async function buildSheetPdf(
  layout: PrintLayout,
  cardImages: Map<string, { front?: string; back?: string }>,
  options?: { title?: string }
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: layout.orientation,
    unit: 'mm',
    format: [layout.paperWidthMm, layout.paperHeightMm],
    compress: true,
  });

  if (options?.title) {
    doc.setDocumentProperties({ title: options.title });
  }

  for (let pageIdx = 0; pageIdx < layout.pages.length; pageIdx++) {
    const page = layout.pages[pageIdx];
    if (pageIdx > 0) {
      doc.addPage([layout.paperWidthMm, layout.paperHeightMm], layout.orientation);
    }

    for (const card of page.cards) {
      const urls = cardImages.get(card.personId);
      const imageUrl = card.side === 'front' ? urls?.front : urls?.back;
      if (!imageUrl) continue;

      try {
        doc.addImage(
          imageUrl,
          'PNG',
          card.xMm,
          card.yMm,
          layout.cardWidthMm,
          layout.cardHeightMm,
          undefined,
          'FAST'
        );

        if (layout.showCutGuides) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineDashPattern([1, 1], 0);
          doc.setLineWidth(0.1);
          doc.rect(card.xMm, card.yMm, layout.cardWidthMm, layout.cardHeightMm);
        }
      } catch (err) {
        console.warn(`[buildSheetPdf] Failed to add card image for person ${card.personId}:`, err);
      }
    }
  }

  return doc.output('blob');
}

// ────────────────────────────────────────────────────────────────
// Browser Sheet Print Helper
// ────────────────────────────────────────────────────────────────

export function printSheetsInBrowser(
  layout: PrintLayout,
  cardImages: Map<string, { front?: string; back?: string }>,
  title: string = 'Print Sheet'
): Promise<boolean> {
  return new Promise((resolve) => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print sheets.');
      resolve(false);
      return;
    }

    const sheetsHtml = layout.pages
      .map((page) => {
        const cardsHtml = page.cards
          .map((card) => {
            const urls = cardImages.get(card.personId);
            const img = card.side === 'front' ? urls?.front : urls?.back;
            if (!img) return '';
            return `
              <div class="card-box" style="left: ${card.xMm}mm; top: ${card.yMm}mm; width: ${layout.cardWidthMm}mm; height: ${layout.cardHeightMm}mm; border: ${layout.showCutGuides ? '0.5px dashed #ccc' : 'none'};">
                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              </div>
            `;
          })
          .join('');

        return `
          <div class="sheet" style="width: ${layout.paperWidthMm}mm; height: ${layout.paperHeightMm}mm;">
            ${cardsHtml}
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @page {
              size: ${layout.paperWidthMm}mm ${layout.paperHeightMm}mm;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              background: #fff;
              color: #000;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              position: relative;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
              background: #fff;
            }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .card-box {
              position: absolute;
              overflow: hidden;
              background: transparent;
            }
          </style>
        </head>
        <body>
          ${sheetsHtml}
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 300);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    resolve(true);
  });
}

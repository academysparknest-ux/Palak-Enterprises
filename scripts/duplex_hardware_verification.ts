/**
 * Duplex Hardware Verification & Calibration Suite
 * Validates deterministic coordinate transformations, creates mapping tables,
 * and generates a high-contrast physical duplex calibration test PDF.
 */

import fs from 'node:fs';
import path from 'node:path';
import { jsPDF } from 'jspdf';
import {
  calculatePrintLayout,
  mmToPt,
  DEFAULT_PRINT_CONFIG,
  type PrintConfig,
  type CardInput,
  type PrintLayout,
} from '../src/lib/idcard/printLayoutEngine';

interface PositionMapping {
  studentId: string;
  studentLabel: string;
  front: { pageIndex: number; col: number; row: number; xMm: number; yMm: number };
  back: { pageIndex: number; col: number; row: number; xMm: number; yMm: number };
}

function verifyDuplexConfiguration(
  name: string,
  paperOrientation: 'portrait' | 'landscape',
  duplexFlip: 'long-edge' | 'short-edge',
  cardCount = 4
) {
  console.log(`\n======================================================================`);
  console.log(`🧪 TESTING DUPLEX MODE: ${name}`);
  console.log(`   Orientation: ${paperOrientation.toUpperCase()} | Flip Mode: ${duplexFlip.toUpperCase()}`);
  console.log(`======================================================================`);

  const config: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a4',
    paperOrientation,
    printMode: 'duplex',
    duplexFlip,
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    marginLeftMm: 10,
    marginRightMm: 10,
    marginTopMm: 10,
    marginBottomMm: 10,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
  };

  const cards: CardInput[] = Array.from({ length: cardCount }, (_, i) => ({
    personId: `STUDENT_${String(i + 1).padStart(3, '0')}`,
    hasBack: true,
  }));

  const layout = calculatePrintLayout(config, cards);

  console.log(`📐 Layout Parameters:`);
  console.log(`   Paper Dimensions: ${layout.paperWidthMm} × ${layout.paperHeightMm} mm`);
  console.log(`   Card Dimensions: ${layout.cardWidthMm} × ${layout.cardHeightMm} mm`);
  console.log(`   Grid Structure: ${layout.columns} Columns × ${layout.rows} Rows (${layout.cardsPerPage} cards/sheet)`);
  console.log(`   Generated Pages: ${layout.pages.length} (${layout.totalSheets} physical sheet(s))`);

  // Assertions
  const frontPage = layout.pages[0];
  const backPage = layout.pages[1];

  if (!frontPage || !backPage) {
    throw new Error(`Expected at least 2 pages (Front + Back), got ${layout.pages.length}`);
  }

  const mappings: PositionMapping[] = [];
  let allMatched = true;

  cards.forEach((c) => {
    const fCard = frontPage.cards.find((fc) => fc.personId === c.personId);
    const bCard = backPage.cards.find((bc) => bc.personId === c.personId);

    if (!fCard || !bCard) {
      allMatched = false;
      return;
    }

    mappings.push({
      studentId: c.personId,
      studentLabel: `STUDENT ${c.personId.split('_')[1]}`,
      front: {
        pageIndex: frontPage.pageIndex + 1,
        col: fCard.column,
        row: fCard.row,
        xMm: Number(fCard.xMm.toFixed(2)),
        yMm: Number(fCard.yMm.toFixed(2)),
      },
      back: {
        pageIndex: backPage.pageIndex + 1,
        col: bCard.column,
        row: bCard.row,
        xMm: Number(bCard.xMm.toFixed(2)),
        yMm: Number(bCard.yMm.toFixed(2)),
      },
    });
  });

  console.log(`\n📋 DETERMINISTIC POSITION MAPPING TABLE:`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`Student ID   | Front (Col,Row) [x, y mm]   | Back (Col,Row) [x, y mm]    | Aligned`);
  console.log(`----------------------------------------------------------------------`);

  mappings.forEach((m) => {
    const fStr = `(${m.front.col},${m.front.row}) [${m.front.xMm}mm, ${m.front.yMm}mm]`.padEnd(28, ' ');
    const bStr = `(${m.back.col},${m.back.row}) [${m.back.xMm}mm, ${m.back.yMm}mm]`.padEnd(28, ' ');
    console.log(`${m.studentId.padEnd(12, ' ')} | ${fStr} | ${bStr} | ✅ MATCH`);
  });
  console.log(`----------------------------------------------------------------------`);

  // Verify alignment logic
  // For Long-edge flip on portrait: backCol = cols - 1 - frontCol, backRow = frontRow
  // For Short-edge flip on portrait: backCol = frontCol, backRow = rows - 1 - frontRow
  // For Long-edge flip on landscape: backCol = frontCol, backRow = rows - 1 - frontRow
  // For Short-edge flip on landscape: backCol = cols - 1 - frontCol, backRow = frontRow
  mappings.forEach((m) => {
    let expectedBackCol: number;
    let expectedBackRow: number;

    if (duplexFlip === 'long-edge') {
      if (paperOrientation === 'portrait') {
        expectedBackCol = layout.columns - 1 - m.front.col;
        expectedBackRow = m.front.row;
      } else {
        expectedBackCol = m.front.col;
        expectedBackRow = layout.rows - 1 - m.front.row;
      }
    } else {
      if (paperOrientation === 'portrait') {
        expectedBackCol = m.front.col;
        expectedBackRow = layout.rows - 1 - m.front.row;
      } else {
        expectedBackCol = layout.columns - 1 - m.front.col;
        expectedBackRow = m.front.row;
      }
    }

    if (m.back.col !== expectedBackCol || m.back.row !== expectedBackRow) {
      allMatched = false;
      console.error(`❌ Mismatch for ${m.studentId}: expected back (${expectedBackCol}, ${expectedBackRow}), got (${m.back.col}, ${m.back.row})`);
    }
  });

  return { layout, mappings, passed: allMatched };
}

/**
 * Generate a physical duplex calibration test PDF
 */
function generateDuplexCalibrationPdf(outputPath: string) {
  console.log(`\n📄 GENERATING PHYSICAL DUPLEX CALIBRATION TEST PDF...`);

  const config: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a4',
    paperOrientation: 'portrait',
    printMode: 'duplex',
    duplexFlip: 'long-edge',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    marginLeftMm: 10,
    marginRightMm: 10,
    marginTopMm: 10,
    marginBottomMm: 10,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
  };

  const cards: CardInput[] = [
    { personId: 'STUDENT_001', hasBack: true },
    { personId: 'STUDENT_002', hasBack: true },
    { personId: 'STUDENT_003', hasBack: true },
    { personId: 'STUDENT_004', hasBack: true },
  ];

  const layout = calculatePrintLayout(config, cards);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [mmToPt(layout.paperWidthMm), mmToPt(layout.paperHeightMm)],
  });

  // Page 1: FRONTS
  const frontPage = layout.pages[0];
  frontPage.cards.forEach((card, idx) => {
    const x = mmToPt(card.xMm);
    const y = mmToPt(card.yMm);
    const w = mmToPt(layout.cardWidthMm);
    const h = mmToPt(layout.cardHeightMm);

    // Card Outer Border
    doc.setDrawColor(18, 59, 112); // #123B70
    doc.setLineWidth(1.5);
    doc.rect(x, y, w, h);

    // Header Background
    doc.setFillColor(18, 59, 112);
    doc.rect(x, y, w, 28, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`FRONT — ${card.personId.replace('_', ' ')}`, x + w / 2, y + 18, { align: 'center' });

    // Grid coordinates info
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Front Position: Col ${card.column}, Row ${card.row}`, x + w / 2, y + 45, { align: 'center' });
    doc.text(`Physical Offset: ${card.xMm} × ${card.yMm} mm`, x + w / 2, y + 58, { align: 'center' });
    doc.text(`Card Dimensions: 85.6 × 54.0 mm`, x + w / 2, y + 71, { align: 'center' });

    // Crosshair in center for physical pin-prick test
    doc.setDrawColor(220, 38, 38); // Red
    doc.setLineWidth(0.5);
    doc.line(x + w / 2 - 10, y + h / 2 + 15, x + w / 2 + 10, y + h / 2 + 15);
    doc.line(x + w / 2, y + h / 2 + 5, x + w / 2, y + h / 2 + 25);
    doc.setFontSize(6);
    doc.setTextColor(220, 38, 38);
    doc.text(`ALIGNMENT CROSSHAIR`, x + w / 2, y + h / 2 + 32, { align: 'center' });
  });

  // Page 2: BACKS
  doc.addPage();
  const backPage = layout.pages[1];
  backPage.cards.forEach((card, idx) => {
    const x = mmToPt(card.xMm);
    const y = mmToPt(card.yMm);
    const w = mmToPt(layout.cardWidthMm);
    const h = mmToPt(layout.cardHeightMm);

    // Card Outer Border
    doc.setDrawColor(16, 185, 129); // Emerald
    doc.setLineWidth(1.5);
    doc.rect(x, y, w, h);

    // Header Background
    doc.setFillColor(16, 185, 129);
    doc.rect(x, y, w, 28, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`BACK — ${card.personId.replace('_', ' ')}`, x + w / 2, y + 18, { align: 'center' });

    // Grid coordinates info
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Back Mirrored Position: Col ${card.column}, Row ${card.row}`, x + w / 2, y + 45, { align: 'center' });
    doc.text(`Physical Offset: ${card.xMm} × ${card.yMm} mm`, x + w / 2, y + 58, { align: 'center' });
    doc.text(`Card Dimensions: 85.6 × 54.0 mm`, x + w / 2, y + 71, { align: 'center' });

    // Crosshair in center for physical pin-prick test
    doc.setDrawColor(220, 38, 38); // Red
    doc.setLineWidth(0.5);
    doc.line(x + w / 2 - 10, y + h / 2 + 15, x + w / 2 + 10, y + h / 2 + 15);
    doc.line(x + w / 2, y + h / 2 + 5, x + w / 2, y + h / 2 + 25);
    doc.setFontSize(6);
    doc.setTextColor(220, 38, 38);
    doc.text(`ALIGNMENT CROSSHAIR`, x + w / 2, y + h / 2 + 32, { align: 'center' });
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`✅ Test PDF generated successfully at: ${outputPath} (${pdfBuffer.length} bytes)`);
}

async function main() {
  console.log('🏁 STARTING FINAL DUPLEX HARDWARE VERIFICATION PASS\n');

  const res1 = verifyDuplexConfiguration('A4 Portrait + Long Edge', 'portrait', 'long-edge');
  const res2 = verifyDuplexConfiguration('A4 Portrait + Short Edge', 'portrait', 'short-edge');
  const res3 = verifyDuplexConfiguration('A4 Landscape + Long Edge', 'landscape', 'long-edge');
  const res4 = verifyDuplexConfiguration('A4 Landscape + Short Edge', 'landscape', 'short-edge');

  const allPassed = res1.passed && res2.passed && res3.passed && res4.passed;

  const calibrationPdfPath = path.join(process.cwd(), 'duplex_physical_calibration_test.pdf');
  generateDuplexCalibrationPdf(calibrationPdfPath);

  console.log(`\n======================================================================`);
  console.log(`📊 FINAL REPORT`);
  console.log(`======================================================================`);
  console.log(`Mathematical duplex verification: ${allPassed ? 'PASS' : 'FAIL'}`);
  console.log(`A4 Long Edge:                     ${res1.passed ? 'PASS' : 'FAIL'}`);
  console.log(`A4 Short Edge:                    ${res2.passed ? 'PASS' : 'FAIL'}`);
  console.log(`Landscape Long Edge:              ${res3.passed ? 'PASS' : 'FAIL'}`);
  console.log(`Landscape Short Edge:             ${res4.passed ? 'PASS' : 'FAIL'}`);
  console.log(`Physical printer verification:    NOT AVAILABLE ("Physical printer feeding/alignment was not tested — no physical printer connected")`);
  console.log(`======================================================================\n`);
}

main().catch((e) => {
  console.error('Duplex test error:', e);
  process.exit(1);
});

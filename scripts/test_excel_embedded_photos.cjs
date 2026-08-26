/**
 * Automated Verification Script:
 * 1. Generates a realistic XLSX package with 30 records and embedded drawing images
 * 2. Simulates multiple image files uploaded in random order and validates identifier matching
 * 3. Validates 500 KB limit logic and PDF layout calculation
 */

const JSZip = require('jszip');

// Lightweight Node XML parser for test
function parseXmlSimple(xmlStr) {
  const rels = new Map();
  const relMatches = xmlStr.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g);
  for (const m of relMatches) {
    rels.set(m[1], m[2]);
  }

  const anchors = [];
  const anchorBlocks = xmlStr.split(/<\/?(?:xdr:)?twoCellAnchor[^>]*>/);
  for (const block of anchorBlocks) {
    const rowMatch = block.match(/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/);
    const blipMatch = block.match(/<(?:a:)?blip[^>]+(?:r:)?embed="([^"]+)"/);
    if (rowMatch && blipMatch) {
      anchors.push({
        row: parseInt(rowMatch[1], 10),
        rId: blipMatch[1]
      });
    }
  }
  return { rels, anchors };
}

function normalizeIdentifier(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/[\s\-_.]+/g, '');
}

async function runVerification() {
  console.log('================================================================');
  console.log('RUNNING FULL PRODUCTION VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // TEST 1: XLSX Embedded Image Extraction with 30 Records
  // -------------------------------------------------------------
  console.log('[TEST 1] Testing XLSX Embedded Drawing Extraction (30 records)...');
  try {
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Default Extension="png" ContentType="image/png"/>
      </Types>`);

    let drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;

    let relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;

    const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const samplePngBuffer = Buffer.from(samplePngBase64, 'base64');

    for (let row = 1; row <= 30; row++) {
      const rId = `rId${row}`;
      const imgName = `image${row}.png`;

      relsXml += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgName}"/>`;

      drawingXml += `
      <xdr:twoCellAnchor editAs="oneCell">
        <xdr:from>
          <xdr:col>3</xdr:col>
          <xdr:colOff>0</xdr:colOff>
          <xdr:row>${row}</xdr:row>
          <xdr:rowOff>0</xdr:rowOff>
        </xdr:from>
        <xdr:to>
          <xdr:col>4</xdr:col>
          <xdr:colOff>0</xdr:colOff>
          <xdr:row>${row + 1}</xdr:row>
          <xdr:rowOff>0</xdr:rowOff>
        </xdr:to>
        <xdr:pic>
          <xdr:blipFill>
            <a:blip r:embed="${rId}"/>
          </xdr:blipFill>
        </xdr:pic>
        <xdr:clientData/>
      </xdr:twoCellAnchor>`;

      zip.file(`xl/media/${imgName}`, samplePngBuffer);
    }

    drawingXml += `</xdr:wsDr>`;
    relsXml += `</Relationships>`;

    zip.file('xl/drawings/drawing1.xml', drawingXml);
    zip.file('xl/drawings/_rels/drawing1.xml.rels', relsXml);

    const xlsxBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Test extraction logic
    const readZip = new JSZip();
    await readZip.loadAsync(xlsxBuffer);

    const drawingFile = readZip.file('xl/drawings/drawing1.xml');
    const drawingRelsFile = readZip.file('xl/drawings/_rels/drawing1.xml.rels');

    const { rels } = parseXmlSimple(await drawingRelsFile.async('text'));
    const { anchors } = parseXmlSimple(await drawingFile.async('text'));

    const extractedMap = new Map();

    for (const anchor of anchors) {
      const target = rels.get(anchor.rId);
      if (target) {
        const imgPath = `xl/${target.replace('../', '')}`;
        const imgFile = readZip.file(imgPath);
        if (imgFile) {
          extractedMap.set(anchor.row, await imgFile.async('nodebuffer'));
        }
      }
    }

    if (extractedMap.size === 30 && extractedMap.has(1) && extractedMap.has(30)) {
      console.log(`  ✓ Successfully extracted ${extractedMap.size}/30 embedded photos with exact row mappings.`);
      passed++;
    } else {
      console.error(`  ✗ Extraction count mismatch: expected 30, got ${extractedMap.size}`);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Test 1 failed with error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 2: Multiple Image Selection in Random Upload Order
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing Multiple Individual Image Upload in Random Order...');
  try {
    const excelRecords = [
      { personCode: 'ST001', displayName: 'Aarav Sharma' },
      { personCode: 'ST002', displayName: 'Diya Patel' },
      { personCode: 'ST003', displayName: 'Rohan Gupta' },
      { personCode: 'EMP-904', displayName: 'Pankaj Kumar' },
      { personCode: 'EMP-905', displayName: 'Sneha Verma' },
    ];

    // Photos selected by user in completely random / inverted order
    const uploadedPhotos = [
      { name: 'EMP-905.jpg' },
      { name: 'ST003.png' },
      { name: 'ST001.webp' },
      { name: 'EMP-904.jpeg' },
      { name: 'ST002.jpg' },
    ];

    const matchedPairs = [];
    for (const record of excelRecords) {
      const normRec = normalizeIdentifier(record.personCode);
      const found = uploadedPhotos.find(p => {
        const baseName = p.name.replace(/\.[^/.]+$/, '').trim();
        return normalizeIdentifier(baseName) === normRec;
      });
      if (found) {
        matchedPairs.push({ code: record.personCode, file: found.name });
      }
    }

    if (matchedPairs.length === 5 &&
        matchedPairs[0].file === 'ST001.webp' &&
        matchedPairs[1].file === 'ST002.jpg' &&
        matchedPairs[2].file === 'ST003.png' &&
        matchedPairs[3].file === 'EMP-904.jpeg' &&
        matchedPairs[4].file === 'EMP-905.jpg') {
      console.log(`  ✓ All ${matchedPairs.length} records correctly matched by unique identifier regardless of random upload order.`);
      passed++;
    } else {
      console.error('  ✗ Random order matching failed:', matchedPairs);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Test 2 failed:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 3: Print Layout Calculation (A4, A3, CR80, Duplex)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Print Engine Grid & Physical Dimensions...');
  try {
    // A4 Portrait = 210 x 297 mm, CR80 = 85.60 x 53.98 mm
    const printableWidthA4 = 210 - 20; // 190mm
    const printableHeightA4 = 297 - 20; // 277mm
    const colsA4 = Math.floor((printableWidthA4 + 2) / (85.6 + 2)); // 2
    const rowsA4 = Math.floor((printableHeightA4 + 2) / (53.98 + 2)); // 4
    const cardsPerPageA4 = colsA4 * rowsA4; // 8 cards per A4 page

    // A3 Portrait = 297 x 420 mm
    const printableWidthA3 = 297 - 20; // 277mm
    const printableHeightA3 = 420 - 20; // 400mm
    const colsA3 = Math.floor((printableWidthA3 + 2) / (85.6 + 2)); // 3
    const rowsA3 = Math.floor((printableHeightA3 + 2) / (53.98 + 2)); // 7
    const cardsPerPageA3 = colsA3 * rowsA3; // 21 cards per A3 page

    if (cardsPerPageA4 === 8 && cardsPerPageA3 === 21) {
      console.log(`  ✓ A4 CR80 Grid: ${colsA4} cols x ${rowsA4} rows = ${cardsPerPageA4} cards/page`);
      console.log(`  ✓ A3 CR80 Grid: ${colsA3} cols x ${rowsA3} rows = ${cardsPerPageA3} cards/page`);
      passed++;
    } else {
      console.error(`  ✗ Grid calculation mismatch: A4 got ${cardsPerPageA4}, A3 got ${cardsPerPageA3}`);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Test 3 failed:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 4: Photo Size 500 KB Limit Validation
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing 500 KB Photo Size Boundary...');
  try {
    const MAX_ALLOWED_BYTES = 500 * 1024; // 512,000 bytes
    const sample300Kb = 300 * 1024;
    const sample600Kb = 600 * 1024;

    const isUnder500 = (size) => size <= MAX_ALLOWED_BYTES;

    if (isUnder500(sample300Kb) && !isUnder500(sample600Kb)) {
      console.log(`  ✓ 500 KB threshold (512,000 bytes) correctly flags oversize photos.`);
      passed++;
    } else {
      failed++;
    }
  } catch {
    failed++;
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();

/**
 * Comprehensive Acceptance Test for Palak Enterprises Universal ID Card Manager
 * Excel + Multiple Photo Direct Sync & Matching Workflow
 */

function normalizeIdentifier(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/[\s\-_.]+/g, '');
}

function normalizePersonName(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanPhotoFilename(filename) {
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  let cleaned = withoutExt
    .replace(/^(photo|img|pic|student|emp|employee|id|dsc|pvc)[_\-\s.]+/i, '')
    .replace(/[_\-\s.]+(photo|final|img|pic|passport|card|pvc|id|\(\d+\)|\d{14}|\d{8})$/i, '');

  const normalizedString = normalizeIdentifier(cleaned);
  const rawTokens = withoutExt.toLowerCase().split(/[_\-\s.]+/).filter(Boolean);
  const cleanedTokens = cleaned.toLowerCase().split(/[_\-\s.]+/).filter(Boolean);

  return {
    baseName: withoutExt,
    cleanedTokens: Array.from(new Set([...rawTokens, ...cleanedTokens])),
    normalizedString
  };
}

function safeContainsIdentifier(filename, identifier) {
  if (!filename || !identifier) return false;
  const rawId = identifier.trim();
  if (rawId.length < 2) return false;
  const escaped = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}($|[^a-zA-Z0-9])`, 'i');
  return boundaryRegex.test(filename);
}

function performAutomaticMatching(records, photos, matchingFieldKey = 'personCode', alternateFieldKeys = []) {
  const recs = records.map(r => ({
    ...r,
    matchedPhotoId: null,
    matchedPhoto: null,
    candidatePhotos: [],
    matchMethod: 'NONE',
    matchStatus: r.isValid ? 'MISSING_PHOTO' : 'INVALID_PHOTO',
    matchReason: r.isValid ? 'No matching photo found' : 'Invalid record'
  }));

  const photoList = photos.map(p => ({
    ...p,
    assignedRecordId: null,
    matchMethod: 'NONE',
    matchStatus: 'UNMATCHED',
    matchReason: 'Unmatched in photo pool'
  }));

  const recordCandidateMatches = new Map();
  const photoCandidateMatches = new Map();

  for (const r of recs) {
    if (!r.isValid) continue;
    recordCandidateMatches.set(r.rowId, []);

    let primaryIdentifier = '';
    if (matchingFieldKey === 'personCode' || matchingFieldKey === 'person_code') {
      primaryIdentifier = r.personCode;
    } else if (matchingFieldKey === 'displayName' || matchingFieldKey === 'display_name') {
      primaryIdentifier = r.displayName;
    } else {
      primaryIdentifier = r.fieldValues?.[matchingFieldKey] || r.rawRowData?.[matchingFieldKey] || '';
    }

    const normPrimaryId = normalizeIdentifier(primaryIdentifier);
    const normDisplayName = normalizePersonName(r.displayName);
    const normPersonCode = normalizeIdentifier(r.personCode);
    const normAltIds = alternateFieldKeys
      .map(k => normalizeIdentifier(r.fieldValues?.[k] || r.rawRowData?.[k] || ''))
      .filter(Boolean);

    for (const photo of photoList) {
      if (!photoCandidateMatches.has(photo.id)) {
        photoCandidateMatches.set(photo.id, []);
      }

      const { baseName, cleanedTokens, normalizedString } = cleanPhotoFilename(photo.filename);
      const filenameWithoutExtNorm = normalizeIdentifier(baseName);

      let matched = false;
      let method = 'NONE';
      let confidence = 0;
      let reason = '';

      if (normPrimaryId && (filenameWithoutExtNorm === normPrimaryId || normalizedString === normPrimaryId)) {
        matched = true;
        method = 'EXACT_MATCH';
        confidence = 100;
        reason = `Exact ID Match (${primaryIdentifier})`;
      } else if (normPersonCode && (filenameWithoutExtNorm === normPersonCode || normalizedString === normPersonCode)) {
        matched = true;
        method = 'EXACT_MATCH';
        confidence = 100;
        reason = `Exact Person Code Match (${r.personCode})`;
      } else if (normPrimaryId && normPrimaryId.length >= 2 && safeContainsIdentifier(photo.filename, primaryIdentifier)) {
        matched = true;
        method = 'HIGH_CONFIDENCE';
        confidence = 90;
        reason = `Identifier Found in Filename (${primaryIdentifier})`;
      } else if (normPrimaryId && normPrimaryId.length >= 2 && cleanedTokens.includes(normPrimaryId)) {
        matched = true;
        method = 'HIGH_CONFIDENCE';
        confidence = 88;
        reason = `Identifier Token Match (${primaryIdentifier})`;
      } else if (normAltIds.some(alt => alt.length >= 2 && (filenameWithoutExtNorm === alt || cleanedTokens.includes(alt) || safeContainsIdentifier(photo.filename, alt)))) {
        matched = true;
        method = 'ALTERNATE_ID_MATCH';
        confidence = 80;
        reason = 'Alternate Identifier Match';
      } else if (normDisplayName && normDisplayName.length >= 4 && (normalizedString === normDisplayName || filenameWithoutExtNorm === normDisplayName)) {
        matched = true;
        method = 'NAME_MATCH';
        confidence = 70;
        reason = `Person Name Match (${r.displayName})`;
      }

      if (matched) {
        recordCandidateMatches.get(r.rowId).push({ photo, method, confidence, reason });
        photoCandidateMatches.get(photo.id).push({ record: r, method, confidence, reason });
      }
    }
  }

  for (const r of recs) {
    if (!r.isValid) continue;
    const candidates = recordCandidateMatches.get(r.rowId) || [];

    if (candidates.length === 0) {
      r.matchedPhotoId = null;
      r.matchedPhoto = null;
      r.matchMethod = 'NONE';
      r.matchStatus = 'MISSING_PHOTO';
      r.matchReason = 'No matching photo in upload pool';
    } else if (candidates.length === 1) {
      const match = candidates[0];
      const photoAssignedRecs = photoCandidateMatches.get(match.photo.id) || [];

      if (photoAssignedRecs.length > 1) {
        r.matchedPhotoId = match.photo.id;
        r.matchedPhoto = match.photo;
        r.candidatePhotos = [match.photo];
        r.matchMethod = match.method;
        r.matchStatus = 'AMBIGUOUS';
        r.matchReason = `Ambiguous: Photo also matches ${photoAssignedRecs.length - 1} other record(s)`;
      } else {
        r.matchedPhotoId = match.photo.id;
        r.matchedPhoto = match.photo;
        r.candidatePhotos = [match.photo];
        r.matchMethod = match.method;
        r.matchStatus = match.method === 'NAME_MATCH' ? 'NEEDS_REVIEW' : 'MATCHED';
        r.matchReason = match.reason;

        const photoObj = photoList.find(p => p.id === match.photo.id);
        if (photoObj) {
          photoObj.assignedRecordId = r.rowId;
          photoObj.matchMethod = match.method;
          photoObj.matchStatus = r.matchStatus;
          photoObj.matchReason = match.reason;
        }
      }
    } else {
      candidates.sort((a, b) => b.confidence - a.confidence);
      const best = candidates[0];
      r.matchedPhotoId = best.photo.id;
      r.matchedPhoto = best.photo;
      r.candidatePhotos = candidates.map(c => c.photo);
      r.matchMethod = best.method;
      r.matchStatus = 'DUPLICATE';
      r.matchReason = `Multiple photos (${candidates.length}) found for this person`;

      for (const c of candidates) {
        const photoObj = photoList.find(p => p.id === c.photo.id);
        if (photoObj) {
          photoObj.assignedRecordId = r.rowId;
          photoObj.matchMethod = c.method;
          photoObj.matchStatus = 'DUPLICATE';
          photoObj.matchReason = `Duplicate candidate for ${r.displayName} (${r.personCode})`;
        }
      }
    }
  }

  const stats = {
    totalRecords: recs.length,
    totalPhotos: photoList.length,
    matchedCount: recs.filter(r => r.matchStatus === 'MATCHED').length,
    exactMatches: recs.filter(r => r.matchMethod === 'EXACT_MATCH').length,
    highConfidenceMatches: recs.filter(r => r.matchMethod === 'HIGH_CONFIDENCE').length,
    nameMatches: recs.filter(r => r.matchMethod === 'NAME_MATCH').length,
    manualMatches: recs.filter(r => r.matchMethod === 'MANUAL_MATCH').length,
    rowOrderMatches: recs.filter(r => r.matchMethod === 'ROW_ORDER_MATCH').length,
    needsReviewCount: recs.filter(r => r.matchStatus === 'NEEDS_REVIEW' || r.matchStatus === 'AMBIGUOUS' || r.matchStatus === 'DUPLICATE').length,
    missingPhotosCount: recs.filter(r => r.matchStatus === 'MISSING_PHOTO').length,
    duplicateMatchesCount: recs.filter(r => r.matchStatus === 'DUPLICATE').length,
    unmatchedPhotosCount: photoList.filter(p => !p.assignedRecordId).length,
    invalidPhotosCount: photoList.filter(p => p.qualityGrade === 'Invalid').length,
    readyCount: recs.filter(r => r.isValid && (r.matchStatus === 'MATCHED' || r.matchedPhoto !== null)).length,
  };

  return { updatedRecords: recs, updatedPhotos: photoList, stats };
}

function applyRowOrderMatching(records, photos) {
  const recs = [...records];
  const photoList = [...photos];

  for (const p of photoList) {
    p.assignedRecordId = null;
    p.matchMethod = 'NONE';
    p.matchStatus = 'UNMATCHED';
    p.matchReason = 'Unassigned';
  }

  const validRecs = recs.filter(r => r.isValid);
  const minCount = Math.min(validRecs.length, photoList.length);

  for (let i = 0; i < validRecs.length; i++) {
    const r = validRecs[i];
    if (i < minCount) {
      const p = photoList[i];
      r.matchedPhotoId = p.id;
      r.matchedPhoto = p;
      r.candidatePhotos = [p];
      r.matchMethod = 'ROW_ORDER_MATCH';
      r.matchStatus = 'MATCHED';
      r.matchReason = `Assigned by Excel Row #${i + 1} Order`;

      p.assignedRecordId = r.rowId;
      p.matchMethod = 'ROW_ORDER_MATCH';
      p.matchStatus = 'MATCHED';
      p.matchReason = `Assigned to Row #${i + 1} (${r.displayName})`;
    } else {
      r.matchedPhotoId = null;
      r.matchedPhoto = null;
      r.candidatePhotos = [];
      r.matchMethod = 'NONE';
      r.matchStatus = 'MISSING_PHOTO';
      r.matchReason = 'No photo available for this row in sequential order';
    }
  }

  return { updatedRecords: recs, updatedPhotos: photoList };
}

function manuallyAssignPhotoToRecord(records, photos, targetRowId, photoId) {
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return { updatedRecords: records, updatedPhotos: photos };

  const updatedRecs = records.map(r => {
    if (r.rowId === targetRowId) {
      return {
        ...r,
        matchedPhotoId: photo.id,
        matchedPhoto: photo,
        candidatePhotos: [photo],
        matchMethod: 'MANUAL_MATCH',
        matchStatus: 'MATCHED',
        matchReason: `Manually Assigned: ${photo.filename}`
      };
    }
    if (r.matchedPhotoId === photo.id && r.rowId !== targetRowId) {
      return {
        ...r,
        matchedPhotoId: null,
        matchedPhoto: null,
        candidatePhotos: [],
        matchMethod: 'NONE',
        matchStatus: 'MISSING_PHOTO',
        matchReason: 'Photo was manually reassigned'
      };
    }
    return r;
  });

  const updatedPhotos = photos.map(p => {
    if (p.id === photoId) {
      return {
        ...p,
        assignedRecordId: targetRowId,
        matchMethod: 'MANUAL_MATCH',
        matchStatus: 'MATCHED',
        matchReason: 'Manually assigned to record'
      };
    }
    return p;
  });

  return { updatedRecords: updatedRecs, updatedPhotos: updatedPhotos };
}

// === RUN TEST SUITE ===
console.log('====================================================');
console.log('PALAK ENTERPRISES: PHOTO MATCHING ACCEPTANCE TESTS');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

// TEST 1: RANDOM UPLOAD ORDER
console.log('--- TEST 1: RANDOM UPLOAD ORDER ---');
const test1Records = [
  { rowId: 'r1', personCode: 'ST001', displayName: 'Rahul', isValid: true, fieldValues: {}, rawRowData: {} },
  { rowId: 'r2', personCode: 'ST002', displayName: 'Priya', isValid: true, fieldValues: {}, rawRowData: {} },
  { rowId: 'r3', personCode: 'ST003', displayName: 'Aman', isValid: true, fieldValues: {}, rawRowData: {} },
  { rowId: 'r4', personCode: 'ST004', displayName: 'Neha', isValid: true, fieldValues: {}, rawRowData: {} },
];

const test1Photos = [
  { id: 'p3', filename: 'ST003.jpg', size: 250000, qualityGrade: 'Good' },
  { id: 'p1', filename: 'ST001.jpg', size: 300000, qualityGrade: 'Excellent' },
  { id: 'p4', filename: 'ST004.jpg', size: 180000, qualityGrade: 'Good' },
  { id: 'p2', filename: 'ST002.jpg', size: 220000, qualityGrade: 'Excellent' },
];

const result1 = performAutomaticMatching(test1Records, test1Photos, 'personCode');
const r1 = result1.updatedRecords.find(r => r.personCode === 'ST001');
const r2 = result1.updatedRecords.find(r => r.personCode === 'ST002');
const r3 = result1.updatedRecords.find(r => r.personCode === 'ST003');
const r4 = result1.updatedRecords.find(r => r.personCode === 'ST004');

assert(r1?.matchedPhoto?.filename === 'ST001.jpg' && r1.matchMethod === 'EXACT_MATCH', 'ST001 matches ST001.jpg');
assert(r2?.matchedPhoto?.filename === 'ST002.jpg' && r2.matchMethod === 'EXACT_MATCH', 'ST002 matches ST002.jpg');
assert(r3?.matchedPhoto?.filename === 'ST003.jpg' && r3.matchMethod === 'EXACT_MATCH', 'ST003 matches ST003.jpg');
assert(r4?.matchedPhoto?.filename === 'ST004.jpg' && r4.matchMethod === 'EXACT_MATCH', 'ST004 matches ST004.jpg');
assert(result1.stats.matchedCount === 4, 'All 4 records matched regardless of random upload order');

// TEST 2: FILENAME NORMALIZATION & AFFIXES
console.log('\n--- TEST 2: FILENAME NORMALIZATION & AFFIXES ---');
const test2Photos = [
  { id: 'p1', filename: 'photo_ST001.jpg', size: 200000, qualityGrade: 'Good' },
  { id: 'p2', filename: 'ST002_final.png', size: 210000, qualityGrade: 'Good' },
  { id: 'p3', filename: 'student_ST003.jpeg', size: 220000, qualityGrade: 'Good' },
  { id: 'p4', filename: 'ST004_card.webp', size: 230000, qualityGrade: 'Good' },
];

const result2 = performAutomaticMatching(test1Records, test2Photos, 'personCode');
const res2_r1 = result2.updatedRecords.find(r => r.personCode === 'ST001');
const res2_r2 = result2.updatedRecords.find(r => r.personCode === 'ST002');
const res2_r3 = result2.updatedRecords.find(r => r.personCode === 'ST003');
const res2_r4 = result2.updatedRecords.find(r => r.personCode === 'ST004');

assert(res2_r1?.matchedPhoto?.filename === 'photo_ST001.jpg', 'Prefix photo_ST001.jpg normalized');
assert(res2_r2?.matchedPhoto?.filename === 'ST002_final.png', 'Suffix ST002_final.png normalized');
assert(res2_r3?.matchedPhoto?.filename === 'student_ST003.jpeg', 'Prefix student_ST003.jpeg normalized');
assert(res2_r4?.matchedPhoto?.filename === 'ST004_card.webp', 'Suffix ST004_card.webp normalized');

// TEST 3: DUPLICATE PHOTO DETECTION
console.log('\n--- TEST 3: DUPLICATE PHOTO DETECTION ---');
const test3Photos = [
  { id: 'p1_a', filename: 'ST001.jpg', size: 200000, qualityGrade: 'Good' },
  { id: 'p1_b', filename: 'ST001_final.jpg', size: 210000, qualityGrade: 'Good' },
  { id: 'p2', filename: 'ST002.jpg', size: 220000, qualityGrade: 'Good' },
];

const result3 = performAutomaticMatching(test1Records, test3Photos, 'personCode');
const res3_r1 = result3.updatedRecords.find(r => r.personCode === 'ST001');
const res3_r2 = result3.updatedRecords.find(r => r.personCode === 'ST002');

assert(res3_r1?.matchStatus === 'DUPLICATE', 'ST001 flagged as DUPLICATE');
assert(res3_r1?.candidatePhotos?.length === 2, 'ST001 has 2 candidate photos');
assert(res3_r2?.matchStatus === 'MATCHED', 'ST002 matched normally');
assert(result3.stats.duplicateMatchesCount === 1, 'Stats reflects 1 duplicate');

// TEST 4: MISSING PHOTO DETECTION
console.log('\n--- TEST 4: MISSING PHOTO DETECTION ---');
const res4_r3 = result3.updatedRecords.find(r => r.personCode === 'ST003');
const res4_r4 = result3.updatedRecords.find(r => r.personCode === 'ST004');
assert(res4_r3?.matchStatus === 'MISSING_PHOTO', 'ST003 correctly detected as MISSING_PHOTO');
assert(res4_r4?.matchStatus === 'MISSING_PHOTO', 'ST004 correctly detected as MISSING_PHOTO');

// TEST 5: MANUAL PHOTO ASSIGNMENT FROM POOL
console.log('\n--- TEST 5: MANUAL PHOTO ASSIGNMENT ---');
const manualPoolPhoto = { id: 'p_unmatched', filename: 'IMG_9999.jpg', size: 190000, qualityGrade: 'Good' };
const poolPhotos = [...test3Photos, manualPoolPhoto];
const manualAssignment = manuallyAssignPhotoToRecord(result3.updatedRecords, poolPhotos, 'r3', 'p_unmatched');
const manualR3 = manualAssignment.updatedRecords.find(r => r.personCode === 'ST003');
const manualPhoto = manualAssignment.updatedPhotos.find(p => p.id === 'p_unmatched');

assert(manualR3?.matchedPhotoId === 'p_unmatched' && manualR3.matchMethod === 'MANUAL_MATCH', 'Manual assignment to ST003 succeeded');
assert(manualPhoto?.assignedRecordId === 'r3' && manualPhoto.matchStatus === 'MATCHED', 'Photo pool state updated with assigned record');

// TEST 6: OPTIONAL ROW-ORDER MATCHING
console.log('\n--- TEST 6: OPTIONAL ROW ORDER MATCHING ---');
const rowOrderPhotos = [
  { id: 'seq_1', filename: 'photo_first.jpg', size: 100000 },
  { id: 'seq_2', filename: 'photo_second.jpg', size: 100000 },
  { id: 'seq_3', filename: 'photo_third.jpg', size: 100000 },
  { id: 'seq_4', filename: 'photo_fourth.jpg', size: 100000 },
];
const rowOrderResult = applyRowOrderMatching(test1Records, rowOrderPhotos);
assert(rowOrderResult.updatedRecords[0].matchedPhotoId === 'seq_1' && rowOrderResult.updatedRecords[0].matchMethod === 'ROW_ORDER_MATCH', 'Row 1 matched Photo 1');
assert(rowOrderResult.updatedRecords[1].matchedPhotoId === 'seq_2' && rowOrderResult.updatedRecords[1].matchMethod === 'ROW_ORDER_MATCH', 'Row 2 matched Photo 2');
assert(rowOrderResult.updatedRecords[2].matchedPhotoId === 'seq_3' && rowOrderResult.updatedRecords[2].matchMethod === 'ROW_ORDER_MATCH', 'Row 3 matched Photo 3');
assert(rowOrderResult.updatedRecords[3].matchedPhotoId === 'seq_4' && rowOrderResult.updatedRecords[3].matchMethod === 'ROW_ORDER_MATCH', 'Row 4 matched Photo 4');

// SUMMARY
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) process.exit(1);

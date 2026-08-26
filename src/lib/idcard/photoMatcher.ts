import type { IdCardPerson } from './types';

export type MatchType =
  | 'student_id'
  | 'photo_url'
  | 'roll_number'
  | 'numeric_id'
  | 'numeric_roll'
  | 'name'
  | 'prefixed_id'
  | 'composite'
  | 'extracted_number'
  | 'manual'
  | 'none';

export interface MatchResult {
  person: IdCardPerson | null;
  matchType: MatchType;
  matchReason?: string;
}

/**
 * Strips image extensions (.jpg, .jpeg, .png, .webp, .gif, etc.)
 */
export function stripExtension(str: string): string {
  if (!str) return '';
  const lastDot = str.lastIndexOf('.');
  if (lastDot > 0 && /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(str.substring(lastDot))) {
    return str.substring(0, lastDot).trim();
  }
  return str.trim();
}

/**
 * Normalizes string by making it lowercase and stripping all non-alphanumeric characters
 */
export function normalizeKey(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts integer string representation without leading zeros (e.g. "00034" -> "34", "00" -> "0")
 */
export function stripLeadingZeros(str: string): string | null {
  if (!str) return null;
  const digitsOnly = str.replace(/\D/g, '');
  if (!digitsOnly) return null;
  return String(parseInt(digitsOnly, 10));
}

/**
 * Strips common camera / student photo prefixes like IMG_, DSC_, PIC_, PHOTO_, STU_, ROLL_
 */
export function stripCommonPrefixes(str: string): string {
  if (!str) return '';
  return str.replace(/^(img|dsc|pic|photo|student|stu|roll|adm|admission|id|s|p|no)[_\-\s.]+/i, '');
}

/**
 * Extracts all digit sequences from a string
 */
export function extractNumbers(str: string): string[] {
  if (!str) return [];
  const matches = str.match(/\d+/g);
  return matches || [];
}

/**
 * Multi-layer smart matching engine that automatically maps an uploaded photo to student records.
 */
export function matchPhotoToPerson(
  fileName: string,
  baseName: string,
  persons: IdCardPerson[]
): MatchResult {
  if (!persons || persons.length === 0) {
    return { person: null, matchType: 'none' };
  }

  const rawFileNameLower = fileName.toLowerCase().trim();
  const baseNameLower = baseName.toLowerCase().trim();
  const normBase = normalizeKey(baseName);
  const baseStrippedPrefix = stripCommonPrefixes(baseName);
  const normStrippedPrefix = normalizeKey(baseStrippedPrefix);
  const baseIntegerStr = stripLeadingZeros(baseName);

  // 1. Direct Student ID Match (exact, case-insensitive, normalized, or with/without extension)
  // Handles: DB has "0034.jpg", "0034", "0123 4567 8901", "STU-101", etc.
  for (const p of persons) {
    const sId = p.student_id ? p.student_id.trim() : '';
    if (!sId) continue;
    const sIdLower = sId.toLowerCase();
    const sIdNoExt = stripExtension(sId).toLowerCase();
    const normSId = normalizeKey(sId);
    const normSIdNoExt = normalizeKey(stripExtension(sId));

    if (
      sIdLower === rawFileNameLower ||
      sIdLower === baseNameLower ||
      sIdNoExt === baseNameLower ||
      (normBase && normSId === normBase) ||
      (normBase && normSIdNoExt === normBase)
    ) {
      return {
        person: p,
        matchType: 'student_id',
        matchReason: `Student ID: ${p.student_id}`,
      };
    }
  }

  // 2. Photo URL / Imported Photo Column Match
  // If Excel had a "photo" or "image" column (e.g. "0034.jpg", "0001.jpg", "pic1.jpg")
  for (const p of persons) {
    if (!p.photo_url) continue;
    const pUrl = p.photo_url.trim().toLowerCase();
    const pUrlNoExt = stripExtension(pUrl).toLowerCase();
    const normPUrl = normalizeKey(pUrl);
    const normPUrlNoExt = normalizeKey(stripExtension(pUrl));

    if (
      pUrl === rawFileNameLower ||
      pUrl === baseNameLower ||
      pUrlNoExt === baseNameLower ||
      (normBase && normPUrl === normBase) ||
      (normBase && normPUrlNoExt === normBase) ||
      pUrl.endsWith('/' + rawFileNameLower) ||
      pUrl.endsWith('/' + baseNameLower)
    ) {
      return {
        person: p,
        matchType: 'photo_url',
        matchReason: `Photo: ${p.photo_url}`,
      };
    }
  }

  // 3. Numeric Student ID Match (Zero-padding agnostic)
  // Handles: File "0001.jpg" matching student_id "1" or "01", File "0034.jpg" matching student_id "34"
  if (baseIntegerStr !== null) {
    const matched = persons.filter((p) => {
      const sId = p.student_id ? p.student_id.trim() : '';
      if (!sId) return false;
      const sIdInt = stripLeadingZeros(stripExtension(sId));
      return sIdInt !== null && sIdInt === baseIntegerStr;
    });

    if (matched.length === 1) {
      return {
        person: matched[0],
        matchType: 'numeric_id',
        matchReason: `Student ID #${matched[0].student_id}`,
      };
    }
  }

  // 4. Exact & Normalized Roll Number Match
  // Handles: File "12.jpg" matching roll_number "12"
  for (const p of persons) {
    if (!p.roll_number) continue;
    const rNo = p.roll_number.trim().toLowerCase();
    const normRNo = normalizeKey(rNo);

    if (rNo === baseNameLower || (normBase && normRNo === normBase)) {
      return {
        person: p,
        matchType: 'roll_number',
        matchReason: `Roll No: ${p.roll_number}`,
      };
    }
  }

  // 5. Numeric Roll Number Match (Zero-padding agnostic)
  // Handles: File "0034.jpg" matching roll_number "34", "034", etc.
  if (baseIntegerStr !== null) {
    const matched = persons.filter((p) => {
      if (!p.roll_number) return false;
      const rInt = stripLeadingZeros(p.roll_number);
      return rInt !== null && rInt === baseIntegerStr;
    });

    if (matched.length === 1) {
      return {
        person: matched[0],
        matchType: 'numeric_roll',
        matchReason: `Roll No #${matched[0].roll_number}`,
      };
    }
  }

  // 6. Camera / Standard Prefix Stripped Match (e.g. IMG_0001, DSC_0034, STU_102, PHOTO_34)
  if (baseStrippedPrefix && baseStrippedPrefix !== baseName) {
    const strippedInt = stripLeadingZeros(baseStrippedPrefix);

    for (const p of persons) {
      const sIdNoExt = stripExtension(p.student_id || '').toLowerCase();
      const normSId = normalizeKey(sIdNoExt);
      const sIdInt = stripLeadingZeros(sIdNoExt);
      const rNo = (p.roll_number || '').trim().toLowerCase();
      const normRNo = normalizeKey(rNo);
      const rInt = stripLeadingZeros(rNo);

      if (
        sIdNoExt === baseStrippedPrefix.toLowerCase() ||
        (normStrippedPrefix && normSId === normStrippedPrefix) ||
        (strippedInt !== null && sIdInt === strippedInt) ||
        rNo === baseStrippedPrefix.toLowerCase() ||
        (normStrippedPrefix && normRNo === normStrippedPrefix) ||
        (strippedInt !== null && rInt === strippedInt)
      ) {
        return {
          person: p,
          matchType: 'prefixed_id',
          matchReason: `ID: ${p.student_id || p.roll_number}`,
        };
      }
    }
  }

  // 7. Full Name Match (Exact & Normalized)
  // Handles: "Arjun Gupta.jpg", "arjun_gupta.jpg", "Arjun-Gupta.png"
  for (const p of persons) {
    if (!p.name) continue;
    const pNameLower = p.name.trim().toLowerCase();
    const normPName = normalizeKey(p.name);
    if (
      pNameLower === baseNameLower ||
      (normPName.length >= 3 && normBase && normPName === normBase)
    ) {
      return {
        person: p,
        matchType: 'name',
        matchReason: `Name: ${p.name}`,
      };
    }
  }

  // 8. Composite Name & Number / Class & Roll Match
  // Handles: "0034_Arjun_Gupta.jpg", "Arjun Gupta (34).jpg", "10-B-34.jpg"
  for (const p of persons) {
    const normPName = normalizeKey(p.name || '');

    // Name substring in file
    if (normPName.length >= 4 && normBase && normBase.includes(normPName)) {
      return {
        person: p,
        matchType: 'composite',
        matchReason: `Name: ${p.name}`,
      };
    }

    // Class + Section + Roll Number (e.g. "10-B-34" or "10B34")
    if (p.class && p.roll_number) {
      const classRollNorm = normalizeKey(`${p.class}${p.section || ''}${p.roll_number}`);
      if (normBase && (normBase === classRollNorm || normBase.includes(classRollNorm))) {
        return {
          person: p,
          matchType: 'composite',
          matchReason: `Class ${p.class}${p.section ? ' ' + p.section : ''} Roll ${p.roll_number}`,
        };
      }
    }
  }

  // 9. Extracted Numeric Substrings from Filename
  const numbers = extractNumbers(baseName);
  for (const numStr of numbers) {
    const numInt = stripLeadingZeros(numStr);
    if (!numInt) continue;

    const sMatches = persons.filter((p) => {
      const sInt = stripLeadingZeros(stripExtension(p.student_id || ''));
      return sInt === numInt;
    });
    if (sMatches.length === 1) {
      return {
        person: sMatches[0],
        matchType: 'extracted_number',
        matchReason: `ID: ${sMatches[0].student_id}`,
      };
    }

    const rMatches = persons.filter((p) => {
      const rInt = stripLeadingZeros(p.roll_number || '');
      return rInt === numInt;
    });
    if (rMatches.length === 1) {
      return {
        person: rMatches[0],
        matchType: 'extracted_number',
        matchReason: `Roll: ${rMatches[0].roll_number}`,
      };
    }
  }

  return { person: null, matchType: 'none' };
}

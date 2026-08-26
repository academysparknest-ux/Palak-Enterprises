import Papa from 'papaparse';
import { personSchema } from './validation';
import type { CsvValidationRow, IdCardPerson } from './types';

interface ParseCsvResult {
  rows: CsvValidationRow[];
  missingHeaders: string[];
  validCount: number;
  invalidCount: number;
}

export function parseAndValidateCsv(csvText: string): ParseCsvResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];

  // student_id and name are the only truly required columns; everything else is optional.
  const requiredMissing = ['student_id', 'name'].filter((h) => !headers.includes(h));

  const rows: CsvValidationRow[] = parsed.data.map((raw, idx) => {
    const rowNumber = idx + 2; // account for header row, 1-indexed for humans
    const result = personSchema.safeParse(raw);

    if (result.success) {
      return {
        rowNumber,
        data: cleanRow(result.data),
        errors: [],
        valid: true,
      };
    }

    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return {
      rowNumber,
      data: raw,
      errors,
      valid: false,
    };
  });

  const validCount = rows.filter((r) => r.valid).length;

  return {
    rows,
    missingHeaders: requiredMissing,
    validCount,
    invalidCount: rows.length - validCount,
  };
}

function cleanRow(data: Record<string, string>): Partial<IdCardPerson> {
  const out: Partial<IdCardPerson> = {};
  for (const [key, value] of Object.entries(data)) {
    (out as Record<string, unknown>)[key] = value === '' ? null : value;
  }
  return out;
}

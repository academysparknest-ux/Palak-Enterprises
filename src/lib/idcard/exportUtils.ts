import Papa from 'papaparse';
import type { IdCardPerson, StudentIdCardStatusInfo } from './types';
import { sanitizeStudentId } from './validation';
import { STATUS_CONFIG } from '../../components/idcard/IdCardStatusBadge';

export interface ColumnVisibilityMap {
  primary: boolean;
  student_id: boolean;
  class: boolean;
  roll: boolean;
  student_name: boolean;
  photo: boolean;
  information: boolean;
  status: boolean;
  generated: boolean;
  printed: boolean;
  print_count: boolean;
  actions: boolean;
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibilityMap = {
  primary: true,
  student_id: true,
  class: true,
  roll: true,
  student_name: true,
  photo: true,
  information: true,
  status: true,
  generated: true,
  printed: true,
  print_count: true,
  actions: true,
};

export function loadColumnVisibility(): ColumnVisibilityMap {
  try {
    const saved = localStorage.getItem('idcard_prod_table_cols');
    if (saved) {
      return { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_COLUMN_VISIBILITY };
}

export function saveColumnVisibility(pref: ColumnVisibilityMap): void {
  try {
    localStorage.setItem('idcard_prod_table_cols', JSON.stringify(pref));
  } catch {
    // ignore
  }
}

/**
 * Exports currently filtered and sorted student records respecting column visibility.
 */
export function exportStudentProductionView(
  persons: IdCardPerson[],
  statusMap: Map<string, StudentIdCardStatusInfo>,
  colPref: ColumnVisibilityMap,
  projectName: string
): void {
  if (!persons || persons.length === 0) {
    alert('No records to export in current view.');
    return;
  }

  const rows: Record<string, string | number>[] = [];

  for (const person of persons) {
    const statusInfo = statusMap.get(person.id);
    const row: Record<string, string | number> = {};

    if (colPref.student_id) {
      row['Student ID'] = sanitizeStudentId(person.student_id);
    }
    if (colPref.student_name) {
      row['Student Name'] = person.name || '';
    }
    if (colPref.class) {
      row['Class'] = person.class || '';
      row['Section'] = person.section || '';
    }
    if (colPref.roll) {
      row['Roll Number'] = person.roll_number || '';
    }
    if (colPref.photo) {
      row['Photo Available'] = person.photo_url ? 'Yes' : 'Missing';
    }
    if (colPref.information) {
      row['Information Status'] = statusInfo?.ready ? 'Complete' : 'Incomplete';
      if (statusInfo?.missingFields && statusInfo.missingFields.length > 0) {
        row['Missing Fields'] = statusInfo.missingFields.join('; ');
      } else {
        row['Missing Fields'] = 'None';
      }
    }
    if (colPref.status) {
      const label = statusInfo ? STATUS_CONFIG[statusInfo.status]?.label : 'Not Ready';
      row['ID Card Status'] = label || 'Not Ready';
    }
    if (colPref.generated) {
      const isGen = statusInfo?.lastGeneration?.status === 'SUCCESS';
      row['Generated'] = isGen ? 'Yes' : 'No';
      row['Generated Date'] = statusInfo?.lastGeneration?.created_at
        ? new Date(statusInfo.lastGeneration.created_at).toLocaleDateString()
        : 'N/A';
    }
    if (colPref.printed) {
      row['Printed'] = statusInfo?.lastPrintedAt ? 'Yes' : 'No';
      row['Last Printed Date'] = statusInfo?.lastPrintedAt
        ? new Date(statusInfo.lastPrintedAt).toLocaleDateString()
        : 'N/A';
    }
    if (colPref.print_count) {
      row['Print Count'] = statusInfo?.printCount ?? 0;
    }

    // Additional important student data
    row['Phone'] = person.phone || '';
    row['Father Name'] = person.father_name || '';
    row['Blood Group'] = person.blood_group || '';

    rows.push(row);
  }

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedProject = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `${sanitizedProject}_production_records_${timestamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

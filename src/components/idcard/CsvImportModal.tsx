import { useState, useMemo } from 'react';
import { Upload, Loader2, Download, CheckCircle2, AlertCircle, FileSpreadsheet, Info, ChevronDown } from 'lucide-react';
import {
  parseSpreadsheetFile,
  generateSampleCsv,
  generateSampleExcelBlob,
} from '../../lib/idcard/csvImport';
import { createIdCardPersonsBulk } from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';
import type { CsvValidationRow, IdCardTemplate } from '../../lib/idcard/types';
import { extractTemplateFieldSchema } from '../../lib/idcard/templateFieldSchema';

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function CsvImportModal({
  projectId,
  template,
  onClose,
  onImported,
}: {
  projectId: string;
  template?: IdCardTemplate | null;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<CsvValidationRow[]>([]);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [ignoredHeaders, setIgnoredHeaders] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [insertedCount, setInsertedCount] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const fieldSchema = useMemo(() => extractTemplateFieldSchema(template?.layout), [template]);
  const frontFields = fieldSchema.studentInputFields.filter((f) => f.side === 'front' || f.side === 'both');
  const backFields = fieldSchema.studentInputFields.filter((f) => f.side === 'back' || f.side === 'both');

  function handleDownloadTemplateExcel() {
    const blob = generateSampleExcelBlob(template);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(template?.name || 'student_id_template').toLowerCase().replace(/\s+/g, '_')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }

  function handleDownloadSampleCsv() {
    const csvContent = generateSampleCsv(template);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(template?.name || 'student_id_template').toLowerCase().replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setImportError(null);
    try {
      const result = await parseSpreadsheetFile(file, template);
      setRows(result.rows);
      setMissingHeaders(result.missingHeaders);
      setIgnoredHeaders(result.ignoredHeaders);
      setStep('preview');
    } catch (err: any) {
      setImportError(err?.message || 'Failed to read spreadsheet file');
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirmImport() {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setStep('importing');
    setImportError(null);
    try {
      const { inserted } = await createIdCardPersonsBulk(
        validRows.map((r) => ({ ...r.data, project_id: projectId }) as Parameters<typeof createIdCardPersonsBulk>[0][number])
      );
      setInsertedCount(inserted);
      setStep('done');
    } catch (err) {
      const appErr = classifySupabaseError(err);
      setImportError(appErr.message || errorCodeToUserMessage(appErr.code));
      setStep('preview');
    }
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidRows = rows.filter((r) => !r.valid);

  // Collect all columns that actually contain data across the imported rows
  const activeColumns = useMemo(() => {
    const cols: { key: string; label: string }[] = [
      { key: 'student_id', label: 'Student ID' },
      { key: 'name', label: 'Full Name' },
    ];
    const checkField = (key: string, label: string) => {
      const hasAnyData = rows.some((r) => (r.data as any)[key]);
      if (hasAnyData) cols.push({ key, label });
    };

    checkField('class', 'Class');
    checkField('section', 'Section');
    checkField('roll_number', 'Roll No');
    checkField('date_of_birth', 'DOB');
    checkField('blood_group', 'Blood');
    checkField('father_name', "Father's Name");
    checkField('mother_name', "Mother's Name");
    checkField('phone', 'Phone');
    checkField('emergency_number', 'Emergency No');
    checkField('address', 'Address');
    checkField('photo_url', 'Photo');

    return cols;
  }, [rows]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-2xs">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Students from Excel / CSV</h2>
              <p className="text-xs text-slate-500">
                Front & back card details are synced with template: <strong className="text-slate-700">{template?.name || 'Standard ID Card'}</strong>
              </p>
            </div>
          </div>

          {/* Download Dropdown (2 Options Only: Excel & CSV) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Download Blank Template</span>
              <ChevronDown size={13} />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-20 text-xs animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handleDownloadTemplateExcel}
                  className="w-full text-left rounded-lg p-2.5 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 font-semibold cursor-pointer transition"
                >
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <FileSpreadsheet size={14} className="text-emerald-600" /> Excel Template (.xlsx)
                  </p>
                  <p className="text-[10px] text-slate-500 font-normal pl-5">Template fields for student import</p>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="w-full text-left rounded-lg p-2.5 hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer border-t border-slate-100 mt-1 transition"
                >
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Download size={14} className="text-slate-600" /> CSV Template (.csv)
                  </p>
                  <p className="text-[10px] text-slate-500 font-normal pl-5">CSV format for student import</p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="mt-4 space-y-4">
            {/* Front & Back Dynamic Details Breakdown */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <p className="font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Front Side Dynamic Fields ({frontFields.length})
                </p>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {frontFields.length > 0
                    ? frontFields.map((f) => f.label).join(', ')
                    : 'None (Static graphics & photo only)'}
                </p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
                <p className="font-bold text-purple-950 mb-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-600" />
                  Back Side Dynamic Fields ({backFields.length})
                </p>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {backFields.length > 0
                    ? backFields.map((f) => f.label).join(', ')
                    : 'None (Static terms & barcode only)'}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              💡 <strong>Smart Column Recognition:</strong> Uploading Excel (.xlsx) or CSV automatically maps dynamic fields like Student ID, Name, Class, DOB, Blood Group, Father's Name, Phone, and Address. Static template designs (logos, terms, background) are applied automatically.
            </p>

            {parsing ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-sm font-semibold">Analyzing spreadsheet rows and columns...</p>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-300 py-12 text-slate-400 hover:border-emerald-500 hover:bg-emerald-50/30 transition">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <Upload size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800">Click to upload Excel or CSV file</p>
                  <p className="text-xs text-slate-400 mt-0.5">Supports .xlsx, .xls, and .csv files</p>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            )}

            {importError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {importError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Verification */}
        {step === 'preview' && (
          <div className="mt-4 space-y-3">
            {missingHeaders.length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-red-900">
                  <AlertCircle size={16} />
                  Missing Required Column(s): {missingHeaders.join(', ')}
                </div>
                <p className="text-xs text-red-700">
                  The selected template requires these columns. Please download the sample template or add these headers to your spreadsheet.
                </p>
                <button
                  onClick={() => setStep('upload')}
                  className="mt-2 rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 cursor-pointer"
                >
                  Choose another file
                </button>
              </div>
            ) : (
              <>
                {/* Ignored Extra Columns Notice */}
                {ignoredHeaders.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2">
                    <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-950">
                        {ignoredHeaders.length} extra column{ignoredHeaders.length === 1 ? '' : 's'} skipped
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        The following column(s) are not required by this template and were skipped:{' '}
                        <strong>{ignoredHeaders.join(', ')}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                      <CheckCircle2 size={13} /> {validCount} Valid Student{validCount === 1 ? '' : 's'} Ready
                    </span>
                    {invalidRows.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded">
                        <AlertCircle size={13} /> {invalidRows.length} Invalid
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Change File
                  </button>
                </div>

                {/* Comprehensive Valid rows preview table */}
                {validCount > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      Student Details Verification (showing first 10 rows):
                    </p>
                    <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 text-xs">
                      <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                          <tr>
                            {activeColumns.map((col) => (
                              <th key={col.key} className="px-3 py-2">
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows
                            .filter((r) => r.valid)
                            .slice(0, 10)
                            .map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                {activeColumns.map((col) => {
                                  const val = (r.data as any)[col.key];
                                  return (
                                    <td key={col.key} className="px-3 py-1.5 text-slate-700">
                                      {val ? String(val) : <span className="text-slate-300">-</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {validCount > 10 && (
                        <p className="p-2 text-center text-[11px] text-slate-400 bg-slate-50">
                          ... and {validCount - 10} more rows ready for import
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Invalid rows list */}
                {invalidRows.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50 p-2 text-xs">
                    <p className="font-semibold text-red-900 mb-1">Rows with errors (will be skipped):</p>
                    <table className="w-full text-left text-[11px]">
                      <tbody className="divide-y divide-red-100">
                        {invalidRows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="py-1 font-semibold text-red-800">Row {row.rowNumber}:</td>
                            <td className="py-1 text-red-700">{row.errors.join('; ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {importError && <p className="text-xs font-semibold text-red-600">{importError}</p>}

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validCount === 0}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    Import {validCount} Student{validCount === 1 ? '' : 's'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-slate-600">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-sm font-semibold">Importing student records into database...</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="mt-8 text-center py-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Import Successful!</h3>
            <p className="mt-1 text-sm text-slate-500">
              Successfully imported <span className="font-bold text-slate-900">{insertedCount}</span> student records.
            </p>
            <button
              onClick={onImported}
              className="mt-6 rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-sm"
            >
              Done & View Student Roster
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


import { useState } from 'react';
import { Upload, Loader2, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { parseSpreadsheetFile, generateSampleCsv } from '../../lib/idcard/csvImport';
import { createIdCardPersonsBulk } from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';
import type { CsvValidationRow } from '../../lib/idcard/types';

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function CsvImportModal({
  projectId,
  onClose,
  onImported,
}: {
  projectId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<CsvValidationRow[]>([]);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [insertedCount, setInsertedCount] = useState(0);
  const [parsing, setParsing] = useState(false);

  function handleDownloadSample() {
    const csvContent = generateSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_sample_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setImportError(null);
    try {
      const result = await parseSpreadsheetFile(file);
      setRows(result.rows);
      setMissingHeaders(result.missingHeaders);
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
      setImportError(errorCodeToUserMessage(classifySupabaseError(err).code));
      setStep('preview');
    }
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidRows = rows.filter((r) => !r.valid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-2xs">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Students from Excel / CSV</h2>
              <p className="text-xs text-slate-500">Fast batch import of student records from Excel (.xlsx, .xls) or CSV</p>
            </div>
          </div>
          <button
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Download size={13} />
            <span>Sample Template</span>
          </button>
        </div>

        {step === 'upload' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-blue-50/70 p-3.5 text-xs text-blue-900 leading-relaxed border border-blue-100">
              <p className="font-semibold text-blue-950 mb-1">Supported Columns:</p>
              <p className="text-slate-600">
                <span className="font-semibold text-blue-900">Student ID</span> (or Roll No / Adm No),{' '}
                <span className="font-semibold text-blue-900">Name</span> (or Full Name),{' '}
                Class, Section, Roll No, Photo (filename like 0001.jpg), Date of Birth, Blood Group, Father's Name, Mother's Name, Phone, Address.
              </p>
              <p className="mt-1 text-[11px] text-blue-700 font-medium">
                ✨ Auto-detects Excel columns even if they have spaces or different headers.
              </p>
            </div>

            {parsing ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-sm font-semibold">Reading spreadsheet...</p>
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
          </div>
        )}

        {step === 'preview' && (
          <div className="mt-4">
            {missingHeaders.length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-red-900">
                  <AlertCircle size={16} />
                  Missing Required Column(s): {missingHeaders.join(', ')}
                </div>
                <p className="text-xs text-red-700">
                  Your CSV must have at least a column for <strong>Student ID</strong> and <strong>Name</strong>.
                </p>
                <button
                  onClick={() => setStep('upload')}
                  className="mt-2 rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200"
                >
                  Choose another file
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                      <CheckCircle2 size={13} /> {validCount} Valid Row{validCount === 1 ? '' : 's'}
                    </span>
                    {invalidRows.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded">
                        <AlertCircle size={13} /> {invalidRows.length} Invalid
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Change File
                  </button>
                </div>

                {/* Valid rows preview */}
                {validCount > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Preview of students to import:</p>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0">
                          <tr>
                            <th className="px-2.5 py-1.5">ID</th>
                            <th className="px-2.5 py-1.5">Name</th>
                            <th className="px-2.5 py-1.5">Class</th>
                            <th className="px-2.5 py-1.5">Blood</th>
                            <th className="px-2.5 py-1.5">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows
                            .filter((r) => r.valid)
                            .slice(0, 10)
                            .map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-2.5 py-1.5 font-medium text-slate-800">{r.data.student_id}</td>
                                <td className="px-2.5 py-1.5 text-slate-700">{r.data.name}</td>
                                <td className="px-2.5 py-1.5 text-slate-500">{r.data.class || '-'}</td>
                                <td className="px-2.5 py-1.5 text-slate-500">{r.data.blood_group || '-'}</td>
                                <td className="px-2.5 py-1.5 text-slate-500">{r.data.phone || '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {validCount > 10 && (
                        <p className="p-2 text-center text-[11px] text-slate-400 bg-slate-50">
                          ... and {validCount - 10} more rows
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Invalid rows list */}
                {invalidRows.length > 0 && (
                  <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50 p-2 text-xs">
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

                {importError && <p className="mt-2 text-xs font-semibold text-red-600">{importError}</p>}

                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validCount === 0}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                  >
                    Import {validCount} Student{validCount === 1 ? '' : 's'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-slate-600">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-sm font-semibold">Importing students into project...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="mt-8 text-center py-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Import Successful!</h3>
            <p className="mt-1 text-sm text-slate-500">
              Successfully imported <span className="font-bold text-slate-900">{insertedCount}</span> students.
            </p>
            <button
              onClick={onImported}
              className="mt-6 rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Done & View Students
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

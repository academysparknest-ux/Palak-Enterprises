import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { parseAndValidateCsv } from '../../lib/idcard/csvImport';
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseAndValidateCsv(String(reader.result));
      setRows(result.rows);
      setMissingHeaders(result.missingHeaders);
      setStep('preview');
    };
    reader.readAsText(file);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Import Students from CSV</h2>

        {step === 'upload' && (
          <div className="mt-4">
            <p className="text-sm text-slate-500">
              CSV should include columns: student_id, name, class, section, roll_number, date_of_birth, blood_group,
              father_name, mother_name, phone, address. Only student_id and name are required.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-10 text-slate-400 hover:border-slate-300">
              <Upload size={22} />
              <span className="text-sm">Click to choose a CSV file</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            </label>
          </div>
        )}

        {step === 'preview' && (
          <div className="mt-4">
            {missingHeaders.length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Missing required column(s): {missingHeaders.join(', ')}. Please fix the CSV and re-upload.
              </div>
            ) : (
              <>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600">{validCount} valid</span>
                  <span className="text-red-600">{invalidRows.length} invalid</span>
                </div>

                {invalidRows.length > 0 && (
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <th className="px-2 py-1">Row</th>
                          <th className="px-2 py-1">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invalidRows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-2 py-1 align-top text-slate-600">{row.rowNumber}</td>
                            <td className="px-2 py-1 text-red-600">{row.errors.join('; ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={onClose} className="rounded-md px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validCount === 0}
                    className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Import {validCount} student{validCount === 1 ? '' : 's'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="mt-6 flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="animate-spin" size={18} /> Importing students...
          </div>
        )}

        {step === 'done' && (
          <div className="mt-6 text-center">
            <p className="text-emerald-600">Imported {insertedCount} students successfully.</p>
            <button
              onClick={onImported}
              className="mt-4 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

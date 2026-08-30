import { AlertTriangle, CheckCircle2, XCircle, Sparkles, Printer } from 'lucide-react';
import type { IdCardPerson } from '../../lib/idcard/types';
import { sanitizeStudentId } from '../../lib/idcard/validation';
import { Modal } from '../ui/Modal';

export function BatchValidationConfirmModal({
  isOpen,
  mode,
  totalCount,
  readyPersons,
  skippedPersons,
  onConfirm,
  onClose,
  loading = false,
}: {
  isOpen: boolean;
  mode: 'generate' | 'print';
  totalCount: number;
  readyPersons: IdCardPerson[];
  skippedPersons: Array<{ person: IdCardPerson; reason: string }>;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const isGenerate = mode === 'generate';
  const readyCount = readyPersons.length;
  const skippedCount = skippedPersons.length;

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-slate-500 font-medium">
        {skippedCount > 0 ? (
          <span className="text-amber-700 font-semibold">
            ⚠ {skippedCount} student(s) will be automatically skipped
          </span>
        ) : (
          <span className="text-emerald-700 font-semibold">
            ✓ All {readyCount} students ready
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={readyCount === 0 || loading}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-2xs cursor-pointer disabled:opacity-50 ${
            isGenerate
              ? 'bg-slate-900 hover:bg-slate-800'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isGenerate ? <Sparkles size={13} /> : <Printer size={13} />}
          {loading
            ? 'Processing...'
            : isGenerate
            ? `Generate ${readyCount} Ready Card${readyCount !== 1 ? 's' : ''}`
            : `Print ${readyCount} Ready Card${readyCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isGenerate ? 'Confirm Bulk ID Card Generation' : 'Confirm Bulk Printing'}
      subtitle={
        isGenerate
          ? 'Validation completed before generating cards'
          : 'Safety check completed before printing cards'
      }
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Status Metrics Banner */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-500">Total Selected</span>
            <p className="text-xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
            <span className="text-[11px] font-semibold text-emerald-700">Eligible / Ready</span>
            <p className="text-xl font-bold text-emerald-900">{readyCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center">
            <span className="text-[11px] font-semibold text-amber-700">Skipped / Ineligible</span>
            <p className="text-xl font-bold text-amber-900">{skippedCount}</p>
          </div>
        </div>

        {/* Warning if any skipped */}
        {skippedCount > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {skippedCount} student(s) will not be {isGenerate ? 'generated' : 'printed'}:
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                {isGenerate
                  ? 'These student records are missing required fields or photos according to the active template.'
                  : 'These students have not been generated yet, are incomplete, or have already been printed without a reprint request.'}
              </p>
            </div>
          </div>
        )}

        {/* Skipped Students List */}
        {skippedCount > 0 && (
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Skipped Records ({skippedCount})
            </h5>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {skippedPersons.map(({ person, reason }) => (
                <div key={person.id} className="flex items-center justify-between p-2.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{person.name}</p>
                    <span className="font-mono text-[11px] text-slate-500">
                      ID: {sanitizeStudentId(person.student_id)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                      {reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready Students Summary */}
        {readyCount > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              <strong>{readyCount} student(s)</strong> meet all validation requirements and will be processed immediately.
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import type { IdCardPerson, ReprintReason } from '../../lib/idcard/types';
import { recordReprintRequest, REPRINT_REASON_LABELS } from '../../lib/idcard/printTracker';
import { sanitizeStudentId } from '../../lib/idcard/validation';
import { Modal } from '../ui/Modal';

export function ReprintRequestModal({
  person,
  projectId,
  isOpen,
  onClose,
  onRequested,
}: {
  person: IdCardPerson | null;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequested: () => void;
}) {
  const [reason, setReason] = useState<ReprintReason>('DAMAGED_CARD');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!person) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      recordReprintRequest(projectId, person, REPRINT_REASON_LABELS[reason] || reason, notes);
      onRequested();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="reprint-request-form"
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-50 cursor-pointer shadow-2xs"
      >
        <RotateCcw size={13} /> {submitting ? 'Requesting...' : 'Submit Reprint Request'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request ID Card Reprint"
      subtitle={`Create an official reprint request for ${person.name} (${sanitizeStudentId(person.student_id)})`}
      size="md"
      footer={footer}
    >
      <form id="reprint-request-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-purple-700 shrink-0 mt-0.5" />
          <p>
            This card has already been printed. Creating a reprint request will update its status to{' '}
            <strong>REPRINT REQUIRED</strong>, preserve all past print history, and allow a new physical card to be printed.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">Reprint Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReprintReason)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-purple-500 focus:outline-none"
          >
            {(Object.entries(REPRINT_REASON_LABELS) as [ReprintReason, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">Administrative Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Student lost card on 30 Aug; requested replacement with updated guardian number."
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}

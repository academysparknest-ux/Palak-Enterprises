import { Printer, RotateCcw, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react';
import type { IdCardPerson, IdCardGeneration } from '../../lib/idcard/types';
import { getPrintHistory } from '../../lib/idcard/printTracker';
import { sanitizeStudentId } from '../../lib/idcard/validation';
import { Modal } from '../ui/Modal';

export function StudentPrintHistoryModal({
  person,
  generations,
  projectId,
  isOpen,
  onClose,
  onRequestReprint,
}: {
  person: IdCardPerson | null;
  generations: IdCardGeneration[];
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestReprint?: (person: IdCardPerson) => void;
}) {
  if (!person) return null;

  const history = getPrintHistory(projectId, person.id);
  const personGens = generations.filter((g) => g.person_id === person.id);

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-slate-500 font-medium">
        Total Prints Logged: <strong className="text-slate-800">{history.filter((h) => h.status === 'SUCCESS').length}</strong>
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          Close
        </button>
        {onRequestReprint && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestReprint(person);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 shadow-2xs cursor-pointer"
          >
            <RotateCcw size={13} /> Request Reprint
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ID Card Generation & Print History"
      subtitle={`Complete audit trail for ${person.name} (${sanitizeStudentId(person.student_id)})`}
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Student summary banner */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {person.photo_url ? (
              <img src={person.photo_url} alt={person.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">No Pic</span>
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">{person.name}</h4>
            <p className="text-[11px] text-slate-500 font-mono">ID: {sanitizeStudentId(person.student_id)}</p>
          </div>
        </div>

        {/* History timeline */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Timeline Events
          </h5>

          {history.length === 0 && personGens.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              No generations or print operations recorded for this student yet.
            </div>
          )}

          <div className="space-y-2.5">
            {/* Print History Entries */}
            {history.map((entry) => {
              const isSuccess = entry.status === 'SUCCESS';
              const isFailed = entry.status === 'FAILED';
              const isReprint = entry.status === 'REPRINT_REQUESTED';

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs text-xs"
                >
                  <div
                    className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${
                      isSuccess
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : isFailed
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {isSuccess && <Printer size={15} />}
                    {isFailed && <XCircle size={15} />}
                    {isReprint && <RotateCcw size={15} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">
                        {isSuccess && `Print #${entry.print_number} — Successful`}
                        {isFailed && 'Print Attempt Failed'}
                        {isReprint && 'Reprint Requested'}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {entry.reprint_reason && (
                      <p className="mt-1 text-[11px] text-purple-800 font-semibold">
                        Reason: {entry.reprint_reason}
                      </p>
                    )}

                    {entry.notes && (
                      <p className="mt-0.5 text-[11px] text-slate-600 italic">
                        Notes: {entry.notes}
                      </p>
                    )}

                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                      <span>Operator: {entry.printed_by || 'Admin'}</span>
                      {entry.template_name && <span>· Template: {entry.template_name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Generation Records from Database */}
            {personGens.map((gen) => (
              <div
                key={gen.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs"
              >
                <div className="mt-0.5 rounded-lg bg-blue-50 p-1.5 text-blue-700 border border-blue-200 shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800">
                      ID Card Generated ({gen.status})
                    </p>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(gen.created_at).toLocaleString()}
                    </span>
                  </div>
                  {gen.printed_at && (
                    <p className="mt-0.5 text-[11px] text-teal-700 font-medium">
                      Marked printed on: {new Date(gen.printed_at).toLocaleString()}
                    </p>
                  )}
                  {gen.error_message && (
                    <p className="mt-0.5 text-[11px] text-rose-600 font-medium">
                      Error: {gen.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

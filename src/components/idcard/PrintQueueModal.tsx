import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { IdCardPerson } from '../../lib/idcard/types';
import { sanitizeStudentId } from '../../lib/idcard/validation';

export type QueueItemStatus = 'WAITING' | 'PRINTING' | 'PRINTED' | 'FAILED';

export interface PrintQueueItem {
  person: IdCardPerson;
  status: QueueItemStatus;
  errorMessage?: string;
}

export function PrintQueueModal({
  isOpen,
  sessionId,
  items,
  isProcessing,
  onRetryFailed,
  onConfirmDone,
  onClose,
}: {
  isOpen: boolean;
  sessionId: string;
  items: PrintQueueItem[];
  isProcessing: boolean;
  onRetryFailed?: (failedItems: PrintQueueItem[]) => void;
  onConfirmDone: () => void;
  onClose: () => void;
}) {
  const total = items.length;
  const printed = items.filter((i) => i.status === 'PRINTED').length;
  const failed = items.filter((i) => i.status === 'FAILED').length;
  const printing = items.filter((i) => i.status === 'PRINTING').length;
  const waiting = items.filter((i) => i.status === 'WAITING').length;

  const failedItems = items.filter((i) => i.status === 'FAILED');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Print Session & Queue"
      subtitle={`Batch execution tracker for Session ${sessionId}`}
      size="lg"
      closeOnBackdropClick={!isProcessing}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Session: <strong className="font-mono text-slate-800">{sessionId}</strong></span>
            <span>Total: <strong>{total}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {failedItems.length > 0 && onRetryFailed && !isProcessing && (
              <button
                type="button"
                onClick={() => onRetryFailed(failedItems)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={13} /> Retry Failed ({failedItems.length})
              </button>
            )}

            <button
              type="button"
              onClick={onConfirmDone}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={14} /> Close & Update Records
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Session Stats Bar */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-500">Total In Queue</span>
            <p className="text-xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
            <span className="text-[11px] font-semibold text-emerald-700">✓ Printed</span>
            <p className="text-xl font-bold text-emerald-800">{printed}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-center">
            <span className="text-[11px] font-semibold text-blue-700">⏳ In Progress / Waiting</span>
            <p className="text-xl font-bold text-blue-800">{printing + waiting}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center">
            <span className="text-[11px] font-semibold text-rose-700">⚠ Failed</span>
            <p className="text-xl font-bold text-rose-800">{failed}</p>
          </div>
        </div>

        {/* Progress status notice */}
        {isProcessing && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <Loader2 size={15} className="animate-spin text-blue-600 shrink-0" />
            <span>
              Transmitting layout sheets to printer spooler. Please do not close this window...
            </span>
          </div>
        )}

        {/* Queue Items List */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Student Queue Order</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[42vh] overflow-y-auto">
            {items.map((item, idx) => {
              const num = String(idx + 1).padStart(2, '0');
              const studentId = sanitizeStudentId(item.person.student_id);

              return (
                <div
                  key={item.person.id}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-bold text-slate-400">{num}</span>
                    <div className="h-6 w-6 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.person.photo_url ? (
                        <img
                          src={item.person.photo_url}
                          alt={item.person.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[8px] text-slate-400">ID</span>
                      )}
                    </div>
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">{studentId}</span>
                      <span className="font-medium text-slate-700">{item.person.name}</span>
                      {item.person.class && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          (Class: {item.person.class} {item.person.roll_number ? `· Roll ${item.person.roll_number}` : ''})
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {item.status === 'PRINTED' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 size={12} /> Printed
                      </span>
                    )}
                    {item.status === 'PRINTING' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 animate-pulse">
                        <Loader2 size={12} className="animate-spin" /> Printing
                      </span>
                    )}
                    {item.status === 'WAITING' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        <Clock size={12} /> Waiting
                      </span>
                    )}
                    {item.status === 'FAILED' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

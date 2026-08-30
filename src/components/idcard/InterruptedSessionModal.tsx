import { AlertTriangle, Printer, XCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { PrintSession } from '../../lib/idcard/printSessionManager';

export interface InterruptedSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PrintSession | null;
  onContinuePrinting: (session: PrintSession) => void;
  onCancelRemaining: (session: PrintSession) => void;
  onViewSessionDetails: (session: PrintSession) => void;
}

export function InterruptedSessionModal({
  isOpen,
  onClose,
  session,
  onContinuePrinting,
  onCancelRemaining,
  onViewSessionDetails,
}: InterruptedSessionModalProps) {
  if (!isOpen || !session) return null;

  const confirmedPrinted = session.items.filter((i) => i.status === 'PRINTED').length;
  const failedCount = session.items.filter((i) => i.status === 'FAILED').length;
  const unconfirmedCount = session.items.filter((i) => i.status === 'UNCONFIRMED' || i.status === 'QUEUED' || i.status === 'PRINTING').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Previous Print Session Interrupted / Recovered"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onCancelRemaining(session)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Cancel Remaining ({unconfirmedCount})
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewSessionDetails(session)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer shadow-2xs"
            >
              Review Session
            </button>
            <button
              type="button"
              onClick={() => onContinuePrinting(session)}
              disabled={unconfirmedCount === 0}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Printer size={14} /> Continue Printing ({unconfirmedCount} Remaining)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-amber-950">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-950">
              An unfinished print batch was detected from a previous session.
            </div>
            <div className="text-[11px] text-amber-800 leading-relaxed">
              The browser was closed, reloaded, or physical printing was interrupted before confirmation.
              Unconfirmed cards were <strong>protected and NOT marked as printed</strong>.
            </div>
          </div>
        </div>

        {/* Session Info Details */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-[11px]">
            <span className="text-slate-500 font-medium">Session Identifier:</span>
            <span className="font-mono font-bold text-slate-800">{session.sessionId}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold">Total Requested</div>
              <div className="text-base font-bold text-slate-900">{session.requestedCount}</div>
            </div>

            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 shadow-2xs text-emerald-950">
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 size={11} /> Confirmed
              </div>
              <div className="text-base font-bold text-emerald-900">{confirmedPrinted}</div>
            </div>

            <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 shadow-2xs text-rose-950">
              <div className="text-[10px] text-rose-700 font-semibold flex items-center justify-center gap-1">
                <XCircle size={11} /> Failed
              </div>
              <div className="text-base font-bold text-rose-900">{failedCount}</div>
            </div>

            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 shadow-2xs text-amber-950">
              <div className="text-[10px] text-amber-700 font-semibold flex items-center justify-center gap-1">
                <AlertTriangle size={11} /> Unconfirmed
              </div>
              <div className="text-base font-bold text-amber-900">{unconfirmedCount}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

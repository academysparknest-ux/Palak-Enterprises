import { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  FileSpreadsheet, Check, AlertCircle, RotateCcw,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { PrintSession, PrintSessionItem } from '../../lib/idcard/printSessionManager';
import { exportPrintSessionReport } from '../../lib/idcard/printSessionManager';

export interface LivePrintQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PrintSession | null;
  onRetryFailed: (failedItemIds: string[]) => void;
  onConfirmComplete: () => void;
  isPrinting?: boolean;
}

export function LivePrintQueueModal({
  isOpen,
  onClose,
  session,
  onRetryFailed,
  onConfirmComplete,
  isPrinting = false,
}: LivePrintQueueModalProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'PRINTED' | 'FAILED' | 'WAITING'>('ALL');
  const [selectedErrorItem, setSelectedErrorItem] = useState<PrintSessionItem | null>(null);

  if (!isOpen || !session) return null;

  const printedCount = session.items.filter((i) => i.status === 'PRINTED').length;
  const failedCount = session.items.filter((i) => i.status === 'FAILED').length;
  const waitingCount = session.items.filter((i) => i.status === 'QUEUED' || i.status === 'PRINTING' || i.status === 'UNCONFIRMED').length;

  const failedItems = session.items.filter((i) => i.status === 'FAILED');

  const visibleItems = session.items.filter((item) => {
    if (filterMode === 'PRINTED') return item.status === 'PRINTED';
    if (filterMode === 'FAILED') return item.status === 'FAILED';
    if (filterMode === 'WAITING') return item.status === 'QUEUED' || item.status === 'PRINTING' || item.status === 'UNCONFIRMED';
    return true;
  });

  const isCompleted = !isPrinting && waitingCount === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Session Execution & Live Production Queue"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportPrintSessionReport(session)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" /> Export Session Report (.xlsx)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <button
                type="button"
                onClick={() => onRetryFailed(failedItems.map((i) => i.personId))}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={13} /> Retry Failed ({failedCount})
              </button>
            )}

            <button
              type="button"
              onClick={onConfirmComplete}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer shadow-md"
            >
              <Check size={14} /> Close / Complete Session
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        {/* Session Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Session Identifier</div>
            <div className="font-mono text-sm font-bold text-slate-900">{session.sessionId}</div>
            <div className="text-[11px] text-slate-500">
              Template: <strong>{session.templateName}</strong> · Operator: <strong>{session.operator}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPrinting ? (
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 font-bold text-blue-800 animate-pulse">
                <RefreshCw size={14} className="animate-spin text-blue-600" /> Printing In Progress...
              </div>
            ) : isCompleted && failedCount === 0 ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 font-bold text-emerald-800">
                <CheckCircle2 size={15} className="text-emerald-600" /> Print Session Completed
              </div>
            ) : failedCount > 0 ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 font-bold text-amber-800">
                <AlertTriangle size={15} className="text-amber-600" /> Partially Completed ({failedCount} Failed)
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 font-bold text-slate-700">
                <Clock size={14} /> Session Interrupted / Paused
              </div>
            )}
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`rounded-lg border p-2 text-left cursor-pointer transition-all ${
              filterMode === 'ALL' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="text-[10px] font-semibold opacity-75">Requested Total</div>
            <div className="text-base font-bold">{session.items.length}</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('PRINTED')}
            className={`rounded-lg border p-2 text-left cursor-pointer transition-all ${
              filterMode === 'PRINTED' ? 'border-emerald-600 bg-emerald-700 text-white' : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-950'
            }`}
          >
            <div className="text-[10px] font-semibold opacity-80 flex items-center justify-between">
              <span>Printed</span>
              <CheckCircle2 size={12} />
            </div>
            <div className="text-base font-bold">{printedCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('FAILED')}
            className={`rounded-lg border p-2 text-left cursor-pointer transition-all ${
              filterMode === 'FAILED' ? 'border-rose-600 bg-rose-700 text-white' : 'border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-950'
            }`}
          >
            <div className="text-[10px] font-semibold opacity-80 flex items-center justify-between">
              <span>Failed</span>
              <XCircle size={12} />
            </div>
            <div className="text-base font-bold">{failedCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('WAITING')}
            className={`rounded-lg border p-2 text-left cursor-pointer transition-all ${
              filterMode === 'WAITING' ? 'border-amber-600 bg-amber-700 text-white' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-amber-950'
            }`}
          >
            <div className="text-[10px] font-semibold opacity-80 flex items-center justify-between">
              <span>Remaining</span>
              <Clock size={12} />
            </div>
            <div className="text-base font-bold">{waitingCount}</div>
          </button>
        </div>

        {/* Live Queue Table */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-bold text-slate-700 text-[11px]">
            <span>Live Card Queue Status ({visibleItems.length})</span>
            {filterMode !== 'ALL' && (
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className="text-[10px] font-normal text-blue-600 hover:underline cursor-pointer"
              >
                Clear Filter (Show All)
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs text-[11px]">
            {visibleItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No cards match this filter.</div>
            ) : (
              visibleItems.map((item) => (
                <div
                  key={item.personId}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 w-7 text-right font-semibold">
                      {String(item.sequence).padStart(3, '0')}
                    </span>
                    <span className="font-mono font-bold text-slate-800 w-16">{item.studentId}</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[150px]">{item.studentName}</span>
                    <span className="text-slate-500 text-[10px]">
                      {item.class ? `Class ${item.class}` : ''}
                      {item.rollNumber ? ` / Roll ${item.rollNumber}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'PRINTED' && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                        <CheckCircle2 size={11} /> Printed
                      </span>
                    )}

                    {item.status === 'PRINTING' && (
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] animate-pulse">
                        <RefreshCw size={10} className="animate-spin" /> Printing...
                      </span>
                    )}

                    {item.status === 'QUEUED' && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        <Clock size={10} /> Waiting
                      </span>
                    )}

                    {item.status === 'FAILED' && (
                      <button
                        type="button"
                        onClick={() => setSelectedErrorItem(item)}
                        className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded text-[10px] cursor-pointer"
                        title={item.failureReason || 'Print failed'}
                      >
                        <XCircle size={11} /> Failed (View Log)
                      </button>
                    )}

                    {item.status === 'SKIPPED' && (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                        <AlertTriangle size={10} /> Skipped
                      </span>
                    )}

                    {item.status === 'UNCONFIRMED' && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        <AlertCircle size={10} /> Unconfirmed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Failure Detail Popover / Modal */}
        {selectedErrorItem && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 space-y-2">
            <div className="flex items-center justify-between font-bold text-rose-900">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={14} className="text-rose-600" />
                Failure Details for {selectedErrorItem.studentName} ({selectedErrorItem.studentId})
              </span>
              <button
                type="button"
                onClick={() => setSelectedErrorItem(null)}
                className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="text-[11px] text-rose-800 bg-white/80 p-2 rounded border border-rose-100 font-mono whitespace-pre-wrap">
              {selectedErrorItem.failureReason || 'Physical printer failed or job was cancelled.'}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

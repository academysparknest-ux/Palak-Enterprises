import { Printer, AlertTriangle, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Layers } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { IdCardPerson, IdCardTemplate, StudentIdCardStatusInfo } from '../../lib/idcard/types';
import type { PrintOrderMode } from '../../lib/idcard/studentSort';
import { IdCardStatusBadge } from './IdCardStatusBadge';

export interface PrePrintReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: () => void;
  sessionId: string;
  template: IdCardTemplate | null;
  printOrder: PrintOrderMode;
  orderedPersons: IdCardPerson[];
  statusMap: Map<string, StudentIdCardStatusInfo>;
  operator?: string;
}

export function PrePrintReviewModal({
  isOpen,
  onClose,
  onConfirmStart,
  sessionId,
  template,
  printOrder,
  orderedPersons,
  statusMap,
  operator = 'Admin',
}: PrePrintReviewModalProps) {
  if (!isOpen) return null;

  let readyToPrintCount = 0;
  let alreadyPrintedCount = 0;
  let notReadyCount = 0;
  let printFailedCount = 0;
  let outdatedCount = 0;
  let reprintCount = 0;

  const partitioned = orderedPersons.map((p, idx) => {
    const info = statusMap.get(p.id);
    const status = info?.status || 'NOT_READY';
    const willPrint = status === 'READY_TO_PRINT' || status === 'REPRINT_REQUIRED' || status === 'PRINT_FAILED';

    if (status === 'READY_TO_PRINT') readyToPrintCount++;
    else if (status === 'PRINTED') alreadyPrintedCount++;
    else if (status === 'NOT_READY') notReadyCount++;
    else if (status === 'PRINT_FAILED') printFailedCount++;
    else if (status === 'OUTDATED') outdatedCount++;
    else if (status === 'REPRINT_REQUIRED') reprintCount++;

    return {
      sequence: idx + 1,
      person: p,
      info,
      status,
      willPrint,
    };
  });

  const cardsThatWillPrint = readyToPrintCount + reprintCount + printFailedCount;

  const printOrderLabels: Record<PrintOrderMode, string> = {
    table_order: 'Current Table View Order',
    student_id: 'Student ID (Ascending)',
    class_roll: 'Class → Roll Number',
    name: 'Student Name (A-Z)',
    print_status: 'ID Card Status Grouped',
    custom: 'Custom Sort Order',
    default: 'Default Order',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Session Review & Physical Print Safety Check"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">
              Operator: <strong className="text-slate-800">{operator}</strong>
            </span>
            <button
              type="button"
              onClick={onConfirmStart}
              disabled={cardsThatWillPrint === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Printer size={15} />
              Start Printing ({cardsThatWillPrint} Cards)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Session ID & Physical Safety Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-mono font-bold text-xs shadow-2xs">
              PS
            </div>
            <div>
              <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                Unique Print Session ID
              </div>
              <div className="font-mono text-sm font-bold text-blue-950">{sessionId}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-800">
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Duplex & Duplicate Protection Active</span>
          </div>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-[11px] font-semibold text-slate-500">Selected in Table</div>
            <div className="text-lg font-bold text-slate-900">{orderedPersons.length}</div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center justify-between">
              <span>Ready to Print</span>
              <CheckCircle2 size={13} />
            </div>
            <div className="text-lg font-bold text-emerald-900">{readyToPrintCount + reprintCount}</div>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5">
            <div className="text-[11px] font-semibold text-indigo-700 flex items-center justify-between">
              <span>Already Printed</span>
              <ShieldAlert size={13} />
            </div>
            <div className="text-lg font-bold text-indigo-900">{alreadyPrintedCount}</div>
            <div className="text-[10px] text-indigo-600 font-medium">Duplicate Protected</div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
            <div className="text-[11px] font-semibold text-amber-700 flex items-center justify-between">
              <span>Not Ready / Incomplete</span>
              <AlertTriangle size={13} />
            </div>
            <div className="text-lg font-bold text-amber-900">{notReadyCount + outdatedCount}</div>
            <div className="text-[10px] text-amber-600 font-medium">Will be skipped</div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Layers size={14} className="text-slate-500" /> Physical Print Specifications
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 font-medium">Active Template:</span>{' '}
              <strong className="text-slate-800">{template?.name || 'Default ID Template'}</strong>
              {template && (
                <span className="text-slate-500 block">
                  {template.card_width_mm} × {template.card_height_mm} mm
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 font-medium">Physical Print Order:</span>{' '}
              <strong className="text-indigo-700 block">{printOrderLabels[printOrder] || printOrder}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Will Actually Print:</span>{' '}
              <strong className="text-emerald-700 text-xs block font-bold">
                {cardsThatWillPrint} Cards ({Math.ceil(cardsThatWillPrint / 10)} A4 Sheets)
              </strong>
            </div>
          </div>
        </div>

        {/* Itemized Queue Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>Physical Card Sequence Order</span>
            <span className="text-slate-500 font-normal">
              Showing {Math.min(orderedPersons.length, 50)} of {orderedPersons.length} records
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 divide-y divide-slate-200 text-[11px]">
            {partitioned.slice(0, 50).map(({ sequence, person, info, status, willPrint }) => (
              <div
                key={person.id}
                className={`flex items-center justify-between px-3 py-1.5 ${
                  willPrint ? 'bg-white' : 'bg-slate-100/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 w-6 text-right font-semibold">
                    {String(sequence).padStart(3, '0')}
                  </span>
                  <span className="font-mono font-bold text-slate-800 w-16">{person.student_id}</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[140px]">{person.name}</span>
                  <span className="text-slate-500 text-[10px]">
                    {person.class ? `Class ${person.class}` : ''}
                    {person.roll_number ? ` / Roll ${person.roll_number}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {info ? (
                    <IdCardStatusBadge statusInfo={info} />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{status}</span>
                  )}
                  {willPrint ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 size={11} /> Will Print
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                      <XCircle size={11} /> Skipped
                    </span>
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

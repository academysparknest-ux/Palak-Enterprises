import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Printer,
  XCircle,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { IdCardStatus, StudentIdCardStatusInfo } from '../../lib/idcard/types';

export const STATUS_CONFIG: Record<
  IdCardStatus,
  {
    label: string;
    description: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  NOT_READY: {
    label: 'Not Ready',
    description: 'Incomplete information or missing student photo according to active template.',
    bgClass: 'bg-amber-50 text-amber-900',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-300',
    icon: AlertCircle,
  },
  READY_TO_GENERATE: {
    label: 'Ready',
    description: 'All required information complete. Ready for ID card generation.',
    bgClass: 'bg-blue-50 text-blue-800',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: Sparkles,
  },
  READY_TO_PRINT: {
    label: 'Ready to Print',
    description: 'ID card generated successfully and waiting for physical printing.',
    bgClass: 'bg-emerald-50 text-emerald-800',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
    icon: Printer,
  },
  PRINTED: {
    label: 'Printed',
    description: 'ID card has been successfully printed.',
    bgClass: 'bg-teal-50 text-teal-800',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-300',
    icon: CheckCircle2,
  },
  PRINT_FAILED: {
    label: 'Print Failed',
    description: 'Print operation failed or was interrupted. Retry is available.',
    bgClass: 'bg-rose-50 text-rose-800',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-300',
    icon: XCircle,
  },
  REPRINT_REQUIRED: {
    label: 'Reprint Required',
    description: 'Card was printed previously, but a reprint was requested.',
    bgClass: 'bg-purple-50 text-purple-800',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-300',
    icon: RotateCcw,
  },
  OUTDATED: {
    label: 'Outdated',
    description: 'Student information or photo changed after this ID card was generated.',
    bgClass: 'bg-orange-50 text-orange-900',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-300',
    icon: Clock,
  },
};

export function IdCardStatusBadge({
  statusInfo,
  onMissingClick,
  onHistoryClick,
  onReprintClick,
}: {
  statusInfo: StudentIdCardStatusInfo;
  onMissingClick?: () => void;
  onHistoryClick?: () => void;
  onReprintClick?: () => void;
}) {
  const config = STATUS_CONFIG[statusInfo.status] || STATUS_CONFIG.NOT_READY;
  const Icon = config.icon;

  if (statusInfo.status === 'NOT_READY') {
    return (
      <button
        type="button"
        onClick={onMissingClick}
        title={`Missing: ${statusInfo.missingFields.join(', ')} — Click to view & fix`}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-2xs cursor-pointer transition hover:opacity-90 ${config.bgClass} ${config.borderClass}`}
      >
        <Icon size={12} className="text-amber-600 shrink-0" />
        <span>Not Ready</span>
        {statusInfo.missingFields.length > 0 && (
          <span className="ml-0.5 rounded bg-amber-200/80 px-1 py-0.2 text-[9px] font-extrabold text-amber-950">
            {statusInfo.missingFields.length} missing
          </span>
        )}
      </button>
    );
  }

  if (statusInfo.status === 'OUTDATED') {
    return (
      <button
        type="button"
        onClick={onMissingClick}
        title="Student data was modified after generation. Card needs regeneration."
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-2xs cursor-pointer transition hover:opacity-90 ${config.bgClass} ${config.borderClass}`}
      >
        <Icon size={12} className="text-orange-600 shrink-0" />
        <span>Outdated</span>
        <span className="ml-0.5 rounded bg-orange-200/80 px-1 py-0.2 text-[9px] font-extrabold text-orange-950">
          Data Changed
        </span>
      </button>
    );
  }

  if (statusInfo.status === 'PRINTED') {
    return (
      <button
        type="button"
        onClick={onHistoryClick}
        title={`Printed ${statusInfo.printCount} time(s). Click to view print history`}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold shadow-2xs cursor-pointer transition hover:opacity-90 ${config.bgClass} ${config.borderClass}`}
      >
        <Icon size={12} className="text-teal-600 shrink-0" />
        <span>Printed</span>
        {statusInfo.printCount > 1 && (
          <span className="ml-0.5 rounded bg-teal-200/80 px-1 py-0.2 text-[9px] font-extrabold text-teal-950">
            ×{statusInfo.printCount}
          </span>
        )}
      </button>
    );
  }

  if (statusInfo.status === 'REPRINT_REQUIRED') {
    return (
      <button
        type="button"
        onClick={onHistoryClick || onReprintClick}
        title={`Reprint requested: ${statusInfo.reprintReason || 'Pending print'}`}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-2xs cursor-pointer transition hover:opacity-90 ${config.bgClass} ${config.borderClass}`}
      >
        <Icon size={12} className="text-purple-600 shrink-0" />
        <span>Reprint Required</span>
      </button>
    );
  }

  if (statusInfo.status === 'PRINT_FAILED') {
    return (
      <button
        type="button"
        onClick={onHistoryClick}
        title="Print operation failed. Click to view history or retry"
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-2xs cursor-pointer transition hover:opacity-90 ${config.bgClass} ${config.borderClass}`}
      >
        <Icon size={12} className="text-rose-600 shrink-0" />
        <span>Print Failed</span>
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold shadow-2xs ${config.bgClass} ${config.borderClass}`}
    >
      <Icon size={12} className={config.textClass} />
      <span>{config.label}</span>
    </span>
  );
}

import {
  Users,
  AlertCircle,
  Sparkles,
  Printer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
} from 'lucide-react';
import type { IdCardStatus } from '../../lib/idcard/types';

export interface StatusCounts {
  total: number;
  notReady: number;
  readyToGenerate: number;
  readyToPrint: number;
  printed: number;
  printFailed: number;
  reprintRequired: number;
  outdated: number;
}

export function StatusSummaryDashboard({
  counts,
  activeFilter,
  onFilterChange,
}: {
  counts: StatusCounts;
  activeFilter: 'ALL' | IdCardStatus;
  onFilterChange: (filter: 'ALL' | IdCardStatus) => void;
}) {
  const cards: Array<{
    key: 'ALL' | IdCardStatus;
    label: string;
    count: number;
    icon: typeof Users;
    activeBorder: string;
    badgeBg: string;
    textColor: string;
  }> = [
    {
      key: 'ALL',
      label: 'Total Students',
      count: counts.total,
      icon: Users,
      activeBorder: 'border-slate-900 ring-2 ring-slate-900/10',
      badgeBg: 'bg-slate-100 text-slate-900',
      textColor: 'text-slate-900',
    },
    {
      key: 'NOT_READY',
      label: 'Not Ready',
      count: counts.notReady,
      icon: AlertCircle,
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40',
      badgeBg: 'bg-amber-100 text-amber-900',
      textColor: 'text-amber-700',
    },
    {
      key: 'READY_TO_GENERATE',
      label: 'Ready',
      count: counts.readyToGenerate,
      icon: Sparkles,
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40',
      badgeBg: 'bg-blue-100 text-blue-900',
      textColor: 'text-blue-700',
    },
    {
      key: 'READY_TO_PRINT',
      label: 'Ready to Print',
      count: counts.readyToPrint,
      icon: Printer,
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40',
      badgeBg: 'bg-emerald-100 text-emerald-900',
      textColor: 'text-emerald-700',
    },
    {
      key: 'PRINTED',
      label: 'Printed',
      count: counts.printed,
      icon: CheckCircle2,
      activeBorder: 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/40',
      badgeBg: 'bg-teal-100 text-teal-900',
      textColor: 'text-teal-700',
    },
    {
      key: 'PRINT_FAILED',
      label: 'Print Failed',
      count: counts.printFailed,
      icon: XCircle,
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40',
      badgeBg: 'bg-rose-100 text-rose-900',
      textColor: 'text-rose-700',
    },
    {
      key: 'REPRINT_REQUIRED',
      label: 'Reprint Required',
      count: counts.reprintRequired,
      icon: RotateCcw,
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40',
      badgeBg: 'bg-purple-100 text-purple-900',
      textColor: 'text-purple-700',
    },
    {
      key: 'OUTDATED',
      label: 'Outdated',
      count: counts.outdated,
      icon: Clock,
      activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40',
      badgeBg: 'bg-orange-100 text-orange-900',
      textColor: 'text-orange-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilterChange(card.key)}
            className={`flex flex-col justify-between rounded-xl border bg-white p-3 text-left transition shadow-2xs hover:border-slate-300 hover:shadow-xs cursor-pointer ${
              isActive ? card.activeBorder : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold truncate">{card.label}</span>
              <Icon size={14} className={isActive ? card.textColor : 'text-slate-400'} />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-xl font-bold ${isActive ? card.textColor : 'text-slate-900'}`}>
                {card.count}
              </span>
              {isActive && (
                <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${card.badgeBg}`}>
                  Active
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

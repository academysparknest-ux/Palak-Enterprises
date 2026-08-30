import React from 'react';
import {
  Search,
  Sparkles,
  Printer,
  Download,
  Eye,
  Sliders,
  ArrowUpDown,
  X,
  Scissors,
} from 'lucide-react';
import type { IdCardPerson, IdCardStatus, StudentIdCardStatusInfo } from '../../lib/idcard/types';
import type { PrintOrderMode, SortRule } from '../../lib/idcard/studentSort';

export interface ProductionFilters {
  search: string;
  classVal: string;
  status: 'ALL' | IdCardStatus;
  photo: 'ALL' | 'AVAILABLE' | 'MISSING';
  generated: 'ALL' | 'YES' | 'NO';
  printed: 'ALL' | 'YES' | 'NO';
}

export function ProductionToolbar({
  totalCount,
  filteredCount,
  selectedCount,
  selectedPersons,
  statusMap,
  filters,
  onFiltersChange,
  availableClasses,
  printOrder,
  onPrintOrderChange,
  onSelectAllVisible,
  onSelectAllTotal,
  onDeselectAll,
  onQuickSelectStatus,
  onOpenMultiSort,
  onOpenColumnConfig,
  onExportView,
  onGenerateSelected,
  onPrintSelected,
  onPreviewSelected,
  onDownloadPdf,
  onPrintCalibration,
  isGenerating,
  isBuildingPdf,
  activeMultiSortRules,
}: {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  selectedPersons: IdCardPerson[];
  statusMap: Map<string, StudentIdCardStatusInfo>;
  filters: ProductionFilters;
  onFiltersChange: (f: ProductionFilters) => void;
  availableClasses: string[];
  printOrder: PrintOrderMode;
  onPrintOrderChange: (mode: PrintOrderMode) => void;
  onSelectAllVisible: () => void;
  onSelectAllTotal?: () => void;
  onDeselectAll: () => void;
  onQuickSelectStatus: (status: IdCardStatus | 'ALL') => void;
  onOpenMultiSort: () => void;
  onOpenColumnConfig: () => void;
  onExportView: () => void;
  onGenerateSelected: () => void;
  onPrintSelected: () => void;
  onPreviewSelected: () => void;
  onDownloadPdf: () => void;
  onPrintCalibration: () => void;
  isGenerating: boolean;
  isBuildingPdf: boolean;
  activeMultiSortRules?: SortRule[];
}) {
  // Analyze readiness of currently selected persons
  const selectionBreakdown = React.useMemo(() => {
    let readyToGenerate = 0;
    let readyToPrint = 0;
    let printed = 0;
    let notReady = 0;
    let failed = 0;
    let reprint = 0;
    let outdated = 0;

    for (const p of selectedPersons) {
      const info = statusMap.get(p.id);
      if (!info) continue;
      if (info.status === 'READY_TO_GENERATE') readyToGenerate++;
      else if (info.status === 'READY_TO_PRINT') readyToPrint++;
      else if (info.status === 'PRINTED') printed++;
      else if (info.status === 'NOT_READY') notReady++;
      else if (info.status === 'PRINT_FAILED') failed++;
      else if (info.status === 'REPRINT_REQUIRED') reprint++;
      else if (info.status === 'OUTDATED') outdated++;
    }

    return {
      readyToGenerate,
      readyToPrint,
      printed,
      notReady,
      failed,
      reprint,
      outdated,
    };
  }, [selectedPersons, statusMap]);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.classVal !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.photo !== 'ALL' ||
    filters.generated !== 'ALL' ||
    filters.printed !== 'ALL';

  function resetFilters() {
    onFiltersChange({
      search: '',
      classVal: 'ALL',
      status: 'ALL',
      photo: 'ALL',
      generated: 'ALL',
      printed: 'ALL',
    });
  }

  return (
    <div className="sticky top-0 z-20 space-y-2.5 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-sm backdrop-blur-md">
      {/* Top row: Global Search + Primary Action Buttons + Column/Export/Sort tools */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Global Instant Search */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="🔍 Search name, ID, roll, phone, parent..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Center: Production Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onGenerateSelected}
            disabled={isGenerating || selectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer shadow-2xs transition"
          >
            <Sparkles size={13} />
            Generate Selected ({selectedCount > 0 ? selectedCount : 0})
          </button>

          <button
            type="button"
            onClick={onPrintSelected}
            disabled={selectedCount === 0 && filteredCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shadow-2xs transition"
          >
            <Printer size={13} />
            Print Selected ({selectedCount > 0 ? selectedCount : filteredCount})
          </button>

          <button
            type="button"
            onClick={onPreviewSelected}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition"
          >
            <Eye size={13} /> Preview
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isBuildingPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs transition"
          >
            <Download size={13} /> {isBuildingPdf ? 'PDF...' : 'PDF'}
          </button>
        </div>

        {/* Right: Tools & Utilities */}
        <div className="flex items-center gap-1.5">
          {/* Printing Order Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Order:</span>
            <select
              value={printOrder}
              onChange={(e) => onPrintOrderChange(e.target.value as PrintOrderMode)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="student_id">Student ID ↑</option>
              <option value="class_roll">Class → Roll ↑</option>
              <option value="name">Name A → Z</option>
              <option value="table_order">Current Table View</option>
            </select>
          </div>

          {/* Multi-Sort Button */}
          <button
            type="button"
            onClick={onOpenMultiSort}
            title="Multi-column sorting rules"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer ${
              activeMultiSortRules && activeMultiSortRules.length > 1
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowUpDown size={13} />
            Sort
            {activeMultiSortRules && activeMultiSortRules.length > 1 && (
              <span className="rounded bg-blue-200 px-1 py-0.2 text-[9px] font-extrabold">
                {activeMultiSortRules.length}
              </span>
            )}
          </button>

          {/* Column Visibility */}
          <button
            type="button"
            onClick={onOpenColumnConfig}
            title="Customize Visible Columns"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Sliders size={13} /> Columns
          </button>

          {/* Export View */}
          <button
            type="button"
            onClick={onExportView}
            title="Export current view to CSV / Excel"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Download size={13} /> Export
          </button>

          {/* Calibration test */}
          <button
            type="button"
            onClick={onPrintCalibration}
            title="Print measurement alignment calibration test sheet"
            className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-1.5 text-indigo-700 hover:bg-indigo-100 cursor-pointer shadow-2xs"
          >
            <Scissors size={14} />
          </button>
        </div>
      </div>

      {/* Middle row: Column Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs">
        {/* Class Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Class:</span>
          <select
            value={filters.classVal}
            onChange={(e) => onFiltersChange({ ...filters, classVal: e.target.value })}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Status:</span>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_READY">Not Ready</option>
            <option value="READY_TO_GENERATE">Ready to Generate</option>
            <option value="READY_TO_PRINT">Ready to Print</option>
            <option value="PRINTED">Printed</option>
            <option value="PRINT_FAILED">Print Failed</option>
            <option value="REPRINT_REQUIRED">Reprint Required</option>
            <option value="OUTDATED">Outdated</option>
          </select>
        </div>

        {/* Photo Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Photo:</span>
          <select
            value={filters.photo}
            onChange={(e) => onFiltersChange({ ...filters, photo: e.target.value as any })}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Photos</option>
            <option value="AVAILABLE">Photo Available</option>
            <option value="MISSING">Photo Missing</option>
          </select>
        </div>

        {/* Generated Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Generated:</span>
          <select
            value={filters.generated}
            onChange={(e) => onFiltersChange({ ...filters, generated: e.target.value as any })}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All</option>
            <option value="YES">Generated</option>
            <option value="NO">Not Generated</option>
          </select>
        </div>

        {/* Printed Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Printed:</span>
          <select
            value={filters.printed}
            onChange={(e) => onFiltersChange({ ...filters, printed: e.target.value as any })}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value="ALL">All</option>
            <option value="YES">Printed</option>
            <option value="NO">Not Printed</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer ml-auto"
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {/* Bottom row: Smart Quick Selectors + Selected Counts Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
        {/* Left: Quick Select Controls */}
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="font-semibold text-slate-400 mr-1">Select:</span>
          <button
            type="button"
            onClick={onSelectAllVisible}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            All Visible ({filteredCount})
          </button>
          {filteredCount < totalCount && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Select all ${totalCount} students across the entire project?`)) {
                  onSelectAllTotal?.();
                }
              }}
              className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            >
              All {totalCount} Total
            </button>
          )}

          <button
            type="button"
            onClick={() => onQuickSelectStatus('READY_TO_GENERATE')}
            className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer"
          >
            Ready
          </button>
          <button
            type="button"
            onClick={() => onQuickSelectStatus('READY_TO_PRINT')}
            className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
          >
            Ready to Print
          </button>
          <button
            type="button"
            onClick={() => onQuickSelectStatus('NOT_READY')}
            className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
          >
            Not Ready
          </button>
          <button
            type="button"
            onClick={() => onQuickSelectStatus('PRINTED')}
            className="rounded border border-teal-200 bg-teal-50 px-2 py-0.5 font-semibold text-teal-800 hover:bg-teal-100 cursor-pointer"
          >
            Printed
          </button>
          <button
            type="button"
            onClick={() => onQuickSelectStatus('PRINT_FAILED')}
            className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
          >
            Failed
          </button>
          <button
            type="button"
            onClick={() => onQuickSelectStatus('REPRINT_REQUIRED')}
            className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 font-semibold text-purple-800 hover:bg-purple-100 cursor-pointer"
          >
            Reprint Required
          </button>
          <button
            type="button"
            onClick={() => onQuickSelectStatus('OUTDATED')}
            className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-semibold text-orange-800 hover:bg-orange-100 cursor-pointer"
          >
            Outdated
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="ml-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Right: Selected Breakdown Pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">
            Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> students
          </span>
          {selectedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-2xs">
              <span>Selected: <strong>{selectedCount}</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-blue-300">Ready: {selectionBreakdown.readyToGenerate}</span>
              <span className="text-emerald-300">Printable: {selectionBreakdown.readyToPrint}</span>
              {selectionBreakdown.printed > 0 && (
                <span className="text-teal-300">Printed: {selectionBreakdown.printed}</span>
              )}
              {selectionBreakdown.notReady > 0 && (
                <span className="text-amber-300">Not Ready: {selectionBreakdown.notReady}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

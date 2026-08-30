import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import {
  Loader2, Printer, Download, Eye, CheckCircle2, XCircle, Settings2,
  ChevronLeft, ChevronRight, X, Scissors, AlertTriangle, RotateCcw, History,
  Sparkles, Search, Columns, FileSpreadsheet, CheckSquare, ChevronDown,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getIdCardPersons, getIdCardTemplates, getIdCardGenerations, markGenerationsAsPrinted } from '../../../lib/idcard/database'
import {
  generateCardsForPersons,
  buildMultiCardSheetPdf,
  buildCalibrationTestPdf,
  renderCardToDataUrl,
  type GenerationProgress,
} from '../../../lib/idcard/generation'
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors'
import { sanitizeStudentId } from '../../../lib/idcard/validation'
import { extractTemplateFieldSchema } from '../../../lib/idcard/templateFieldSchema'
import { computeStudentIdCardStatus, validateStudentForIdCard } from '../../../lib/idcard/statusEngine'
import {
  recordPrintSuccess,
  recordPrintFailure,
} from '../../../lib/idcard/printTracker'
import {
  sortStudentsMulti,
  getStudentsInPrintOrder,
  type StudentSortField,
  type SortRule,
  type PrintOrderMode,
} from '../../../lib/idcard/studentSort'
import { GenerationProgressBar } from '../../../components/idcard/GenerationProgress'
import { IdCardStatusBadge } from '../../../components/idcard/IdCardStatusBadge'
import { StatusSummaryDashboard } from '../../../components/idcard/StatusSummaryDashboard'
import { BatchValidationConfirmModal } from '../../../components/idcard/BatchValidationConfirmModal'
import { StudentMissingInfoModal } from '../../../components/idcard/StudentMissingInfoModal'
import { StudentPrintHistoryModal } from '../../../components/idcard/StudentPrintHistoryModal'
import { ReprintRequestModal } from '../../../components/idcard/ReprintRequestModal'
import { PrePrintReviewModal } from '../../../components/idcard/PrePrintReviewModal'
import { LivePrintQueueModal } from '../../../components/idcard/LivePrintQueueModal'
import { InterruptedSessionModal } from '../../../components/idcard/InterruptedSessionModal'
import { PrintSessionsHistoryModal } from '../../../components/idcard/PrintSessionsHistoryModal'
import {
  createPrintSession,
  recordSessionCompletion,
  getActivePrintSession,
  handleInterruptedPrintSession,
  isStudentPrintLocked,
  verifyStudentCardIntegrity,
  generatePrintSessionId,
  getProjectPrintSessions,
  type PrintSession,
} from '../../../lib/idcard/printSessionManager'
import { Modal } from '../../../components/ui/Modal'
import { useScrollLock } from '../../../hooks/useScrollLock'
import {
  calculatePrintLayout,
  validatePrintConfig,
  savePrintConfig,
  loadPrintConfig,
  DEFAULT_PRINT_CONFIG,
  type PrintConfig,
  type PrintLayout,
  type CardInput,
  type PaperSize,
  type PaperOrientation,
  type CardOrientation,
  type PrintMode,
  type DuplexFlip,
  type Alignment,
} from '../../../lib/idcard/printLayoutEngine'
import { CardImageCache } from '../../../lib/idcard/imageCache'
import type {
  IdCardProject,
  IdCardPerson,
  IdCardTemplate,
  IdCardGeneration,
  IdCardStatus,
  StudentIdCardStatusInfo,
} from '../../../lib/idcard/types'

// ────────────────────────────────────────────────────────────────
// Column Definitions for Spreadsheet View
// ────────────────────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  sortField?: StudentSortField;
  canHide?: boolean;
  minWidth?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'primary', label: 'PRIMARY', canHide: false, minWidth: '44px' },
  { key: 'student_id', label: 'Student ID', sortField: 'student_id', canHide: false, minWidth: '120px' },
  { key: 'class', label: 'Class', sortField: 'class', canHide: true, minWidth: '90px' },
  { key: 'roll', label: 'Roll', sortField: 'roll_number', canHide: true, minWidth: '70px' },
  { key: 'name', label: 'Student Name', sortField: 'name', canHide: false, minWidth: '160px' },
  { key: 'photo', label: 'Photo', sortField: 'photo', canHide: true, minWidth: '70px' },
  { key: 'information', label: 'Information', sortField: 'information', canHide: true, minWidth: '130px' },
  { key: 'status', label: 'ID Card Status', sortField: 'status', canHide: false, minWidth: '150px' },
  { key: 'generated', label: 'Generated', sortField: 'generated', canHide: true, minWidth: '120px' },
  { key: 'printed', label: 'Printed', sortField: 'printed', canHide: true, minWidth: '120px' },
  { key: 'print_count', label: 'Count', sortField: 'print_count', canHide: true, minWidth: '80px' },
  { key: 'actions', label: 'Actions', canHide: false, minWidth: '160px' },
];

const INITIAL_VISIBILITY: Record<string, boolean> = {
  primary: true,
  student_id: true,
  class: true,
  roll: true,
  name: true,
  photo: true,
  information: true,
  status: true,
  generated: true,
  printed: true,
  print_count: true,
  actions: true,
};

// ────────────────────────────────────────────────────────────────
// Print confirmation dialog with Success & Failure branches
// ────────────────────────────────────────────────────────────────

function PrintConfirmDialog({
  count,
  onConfirmSuccess,
  onConfirmFailed,
  onDismiss,
}: {
  count: number
  onConfirmSuccess: () => void
  onConfirmFailed: () => void
  onDismiss: () => void
}) {
  return (
    <Modal
      isOpen={true}
      onClose={onDismiss}
      title="Print Operation Complete?"
      subtitle={`Verify physical print results for ${count} ID card${count !== 1 ? 's' : ''}`}
      size="sm"
      closeOnBackdropClick={false}
      footer={
        <div className="flex flex-col sm:flex-row gap-2 w-full justify-between items-center">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Decide Later
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onConfirmFailed}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shadow-2xs"
            >
              <XCircle size={14} /> Print Failed
            </button>
            <button
              type="button"
              onClick={onConfirmSuccess}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={14} /> Yes, Mark Printed
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 text-xs text-slate-600">
        <p>
          Did the physical printer complete all <strong>{count} cards</strong> accurately without paper jams or alignment issues?
        </p>
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 space-y-1 text-[11px]">
          <p>• <strong>Yes, Mark Printed:</strong> Updates status to <strong>PRINTED</strong> and increments print count history.</p>
          <p>• <strong>Print Failed:</strong> Marks status as <strong>PRINT FAILED</strong>, preserving retry actions for administrators.</p>
        </div>
      </div>
    </Modal>
  )
}

// ────────────────────────────────────────────────────────────────
// Print Preview Modal
// ────────────────────────────────────────────────────────────────

function PrintPreviewModal({
  layout,
  cardImages,
  config,
  selectedCount,
  onClose,
  onPrint,
  onDownloadPdf,
}: {
  layout: PrintLayout
  cardImages: Map<string, string>
  config: PrintConfig
  selectedCount: number
  onClose: () => void
  onPrint: () => void
  onDownloadPdf: () => void
}) {
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = layout.pages.length

  useScrollLock(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const maxWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth - 80 : 800, 850)
  const screenScale = maxWidth / layout.paperWidthMm

  function scrollToPage(idx: number) {
    setCurrentPage(idx)
    const el = document.getElementById(`preview-page-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/75 backdrop-blur-xs overflow-hidden touch-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Print Preview</h2>
          <span className="rounded bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300">
            {config.paperSize.toUpperCase()} {layout.orientation} ({layout.paperWidthMm} × {layout.paperHeightMm} mm)
          </span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">
            Card: {layout.cardWidthMm} × {layout.cardHeightMm} mm
          </span>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            {layout.columns} × {layout.rows} = {layout.cardsPerPage} cards/sheet
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <button
              onClick={() => scrollToPage(Math.max(0, currentPage - 1))}
              disabled={currentPage <= 0}
              className="rounded p-1 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => scrollToPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded p-1 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 cursor-pointer"
          >
            <Download size={14} /> Download PDF
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"
          >
            <Printer size={14} /> Print Now
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto space-y-8" style={{ width: `${maxWidth}px` }}>
          {layout.pages.map((page, pageIdx) => (
            <div key={pageIdx} id={`preview-page-${pageIdx}`} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Sheet {pageIdx + 1} of {totalPages}</span>
                <span>{page.cards.length} cards · {page.cards.filter((c) => c.side === 'front').length} front, {page.cards.filter((c) => c.side === 'back').length} back</span>
              </div>

              <div
                className="relative mx-auto bg-white shadow-2xl transition-all"
                style={{
                  width: `${layout.paperWidthMm * screenScale}px`,
                  height: `${layout.paperHeightMm * screenScale}px`,
                }}
              >
                {page.cards.map((card, cardIdx) => {
                  const key = `${card.personId}:${card.side}`
                  const imageUrl = cardImages.get(key)
                  return (
                    <div
                      key={cardIdx}
                      className="absolute overflow-hidden bg-slate-50"
                      style={{
                        left: `${card.xMm * screenScale}px`,
                        top: `${card.yMm * screenScale}px`,
                        width: `${layout.cardWidthMm * screenScale}px`,
                        height: `${layout.cardHeightMm * screenScale}px`,
                        border: layout.showCutGuides ? '0.5px dashed #94a3b8' : undefined,
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${card.side} - ${card.personId}`}
                          className="h-full w-full object-fill"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[10px] text-slate-400">
                          <span className="font-bold">{card.side.toUpperCase()}</span>
                          <span className="truncate">{card.personId}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-slate-700 bg-slate-900/90 p-4 text-xs text-slate-300 shadow-xl">
          <p className="mb-2 font-bold uppercase tracking-wider text-blue-400">Live Physical Layout Diagnostic</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div><span className="text-slate-400">Paper:</span> <strong className="text-white">{config.paperSize.toUpperCase()} {layout.orientation}</strong></div>
            <div><span className="text-slate-400">Paper Size:</span> <strong className="text-white">{layout.paperWidthMm} × {layout.paperHeightMm} mm</strong></div>
            <div><span className="text-slate-400">Card:</span> <strong className="text-white">{layout.cardWidthMm} × {layout.cardHeightMm} mm</strong></div>
            <div><span className="text-slate-400">Margins (T/B/L/R):</span> <span className="text-slate-200">{config.marginTopMm}/{config.marginBottomMm}/{config.marginLeftMm}/{config.marginRightMm} mm</span></div>
            <div><span className="text-slate-400">Gap (H/V):</span> <span className="text-slate-200">{config.gapHorizontalMm} / {config.gapVerticalMm} mm</span></div>
            <div><span className="text-slate-400">Card Orientation:</span> <span className="text-slate-200">{layout.cardOrientation}</span></div>
            <div><span className="text-slate-400">Columns:</span> <strong className="text-blue-300">{layout.columns}</strong></div>
            <div><span className="text-slate-400">Rows:</span> <strong className="text-blue-300">{layout.rows}</strong></div>
            <div><span className="text-slate-400">Cards / Sheet:</span> <strong className="text-emerald-400">{layout.cardsPerPage}</strong></div>
            <div><span className="text-slate-400">Selected Cards:</span> <span className="text-slate-200">{selectedCount}</span></div>
            <div><span className="text-slate-400">Total Sheets:</span> <strong className="text-emerald-400">{layout.totalSheets}</strong></div>
          </div>
          <p className="mt-3 border-t border-slate-800 pt-2 text-center text-[11px] text-slate-400">
            For accurate ID-card physical dimensions, print at 100% scale without browser "Fit to page".
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ────────────────────────────────────────────────────────────────
// Settings panel
// ────────────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix = 'mm',
}: {
  label: string
  value: number
  onChange: (val: number) => void
  min?: number
  step?: number
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="mt-0.5 flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus-within:border-blue-400">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          step={step}
          className="w-full bg-transparent text-xs focus:outline-none"
        />
        {suffix && <span className="text-[10px] text-slate-400">{suffix}</span>}
      </div>
    </label>
  )
}

function SettingsPanel({
  config,
  onChange,
  isDoubleSided,
  selectedCount,
  cards,
  expanded,
  onToggle,
}: {
  config: PrintConfig
  onChange: (c: PrintConfig) => void
  isDoubleSided: boolean
  selectedCount: number
  cards: CardInput[]
  expanded: boolean
  onToggle: () => void
}) {
  const validation = validatePrintConfig(config)
  const layout = validation.valid ? calculatePrintLayout(config, cards) : null

  function set<K extends keyof PrintConfig>(key: K, value: PrintConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-2xs">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50 cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Settings2 size={16} />
          Print Settings
        </span>
        <div className="flex items-center gap-3">
          {layout && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Paper: <strong className="text-slate-700">{config.paperSize.toUpperCase()}</strong> ({layout.orientation}) · Grid: <strong className="text-slate-700">{layout.columns}×{layout.rows}</strong> · Capacity: <strong className="text-blue-700 font-bold">{layout.cardsPerPage}</strong> cards/sheet · Total: <strong className="text-slate-700">{layout.totalSheets}</strong> sheet{layout.totalSheets !== 1 ? 's' : ''}
            </span>
          )}
          <ChevronRight size={16} className={`text-slate-400 transition ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {!validation.valid && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {validation.error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium text-slate-500">Paper Size</span>
                <select
                  value={config.paperSize}
                  onChange={(e) => set('paperSize', e.target.value as PaperSize)}
                  className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none"
                >
                  <option value="a3">A3 (297 × 420 mm)</option>
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="a5">A5 (148 × 210 mm)</option>
                </select>
              </label>

              <div>
                <span className="text-[11px] font-medium text-slate-500">Paper Orientation</span>
                <div className="mt-1 flex gap-3">
                  {(['auto', 'portrait', 'landscape'] as const).map((o) => (
                    <label key={o} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        value={o}
                        checked={config.paperOrientation === o}
                        onChange={() => set('paperOrientation', o as PaperOrientation)}
                        className="h-3.5 w-3.5"
                      />
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500">Card Orientation</span>
                <div className="mt-1 flex gap-3">
                  {([
                    { value: 'auto', label: 'Auto (Maximize)' },
                    { value: 'portrait', label: 'Portrait (54 × 85.6)' },
                    { value: 'landscape', label: 'Landscape (85.6 × 54)' },
                  ] as const).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="cardOrientation"
                        value={value}
                        checked={(config.cardOrientation || 'auto') === value}
                        onChange={() => set('cardOrientation', value as CardOrientation)}
                        className="h-3.5 w-3.5"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Card Width" value={config.cardWidthMm} onChange={(v) => set('cardWidthMm', v)} min={1} step={0.1} />
                <NumberField label="Card Height" value={config.cardHeightMm} onChange={(v) => set('cardHeightMm', v)} min={1} step={0.1} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Horizontal Gap" value={config.gapHorizontalMm} onChange={(v) => set('gapHorizontalMm', v)} />
                <NumberField label="Vertical Gap" value={config.gapVerticalMm} onChange={(v) => set('gapVerticalMm', v)} />
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500">Margins (mm)</span>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  <NumberField label="Top" value={config.marginTopMm} onChange={(v) => set('marginTopMm', v)} suffix="" />
                  <NumberField label="Bottom" value={config.marginBottomMm} onChange={(v) => set('marginBottomMm', v)} suffix="" />
                  <NumberField label="Left" value={config.marginLeftMm} onChange={(v) => set('marginLeftMm', v)} suffix="" />
                  <NumberField label="Right" value={config.marginRightMm} onChange={(v) => set('marginRightMm', v)} suffix="" />
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] font-medium text-slate-500">Grid Alignment</span>
                <select
                  value={config.alignment}
                  onChange={(e) => set('alignment', e.target.value as Alignment)}
                  className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none"
                >
                  <option value="center">Center (Recommended)</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-left">Top Left</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500">Print Mode</span>
                <div className="mt-1 space-y-1.5">
                  {([
                    { value: 'front-only', label: 'Front only (Single-sided cards)' },
                    { value: 'duplex', label: 'Duplex (Alternating Front / Back pages)' },
                    { value: 'front-back-together', label: 'Side by Side (Front & Back adjacent on same sheet)' },
                  ] as const).map(({ value, label }) => {
                    const isSelected =
                      config.printMode === value ||
                      (value === 'front-back-together' && ((config.printMode as string) === 'side-by-side' || config.printMode === 'front-back-together'));
                    const disabled = !isDoubleSided && value !== 'front-only';
                    return (
                      <label key={value} className={`flex items-center gap-2 text-xs cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : 'text-slate-700'}`}>
                        <input
                          type="radio"
                          name="printMode"
                          value={value}
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => set('printMode', value as PrintMode)}
                          className="h-3.5 w-3.5"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {config.printMode === 'duplex' && (
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Duplex Flip Edge</span>
                  <div className="mt-1 flex gap-3">
                    {([
                      { value: 'long-edge', label: 'Long Edge (Standard)' },
                      { value: 'short-edge', label: 'Short Edge (Top Bound)' },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="duplexFlip"
                          value={value}
                          checked={config.duplexFlip === value}
                          onChange={() => set('duplexFlip', value as DuplexFlip)}
                          className="h-3.5 w-3.5"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showCutGuides}
                    onChange={(e) => set('showCutGuides', e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Show dashed cutting guides around each card
                </label>
              </div>

              {layout && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Physical Layout Summary</div>
                  <div className="mt-1 space-y-0.5">
                    <div>Grid: <strong>{layout.columns} cols × {layout.rows} rows</strong> ({layout.cardsPerPage} cards/sheet)</div>
                    <div>Page Size: <strong>{layout.paperWidthMm} × {layout.paperHeightMm} mm</strong> ({layout.orientation})</div>
                    <div>Cards to print: <strong>{selectedCount}</strong> → <strong>{layout.totalSheets} total sheet{layout.totalSheets !== 1 ? 's' : ''}</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Main Spreadsheet ID Card Production Control Center Page
// ────────────────────────────────────────────────────────────────

export default function IdCardGeneratePage() {
  const { project } = useOutletContext<{ project: IdCardProject }>()
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string }>({ kind: 'loading' })
  const [persons, setPersons] = useState<IdCardPerson[]>([])
  const [templates, setTemplates] = useState<IdCardTemplate[]>([])
  const [template, setTemplate] = useState<IdCardTemplate | null>(null)
  const [generations, setGenerations] = useState<IdCardGeneration[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [generating, setGenerating] = useState(false)
  const [buildingPdf, setBuildingPdf] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPrintConfirm, setShowPrintConfirm] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [pendingPrintGenIds, setPendingPrintGenIds] = useState<string[]>([])
  const [pendingPrintPersons, setPendingPrintPersons] = useState<IdCardPerson[]>([])
  const [cardImages, setCardImages] = useState<Map<string, string>>(new Map())
  const [loadingImages, setLoadingImages] = useState(false)

  // ── Spreadsheet Controls State ─────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | IdCardStatus>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'has_photo' | 'missing_photo'>('ALL')
  const [infoFilter, setInfoFilter] = useState<'ALL' | 'complete' | 'incomplete'>('ALL')
  const [generatedFilter, setGeneratedFilter] = useState<'ALL' | 'generated' | 'not_generated'>('ALL')
  const [printedFilter, setPrintedFilter] = useState<'ALL' | 'printed' | 'not_printed'>('ALL')

  // Sorting: Primary & Secondary rule
  const [primarySortField, setPrimarySortField] = useState<StudentSortField>('student_id')
  const [primarySortAsc, setPrimarySortAsc] = useState(true)
  const [secondarySortField, setSecondarySortField] = useState<StudentSortField | null>(null)
  const [secondarySortAsc, setSecondarySortAsc] = useState(true)

  // Print Order mode
  const [printOrder, setPrintOrder] = useState<PrintOrderMode>('table_order')

  // Column Visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(`palak_gen_col_vis_${project?.id || 'default'}`)
        if (saved) return { ...INITIAL_VISIBILITY, ...JSON.parse(saved) }
      } catch (e) {
        console.warn('Failed to load column visibility:', e)
      }
    }
    return { ...INITIAL_VISIBILITY }
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [showSmartSelectMenu, setShowSmartSelectMenu] = useState(false)

  // Modals for batch validation, duplicate warnings, history, and reprints
  const [batchModalConfig, setBatchModalConfig] = useState<{
    isOpen: boolean;
    mode: 'generate' | 'print';
    readyPersons: IdCardPerson[];
    skippedPersons: Array<{ person: IdCardPerson; reason: string }>;
  } | null>(null)

  const [selectedPersonForMissing, setSelectedPersonForMissing] = useState<IdCardPerson | null>(null)
  const [selectedPersonForHistory, setSelectedPersonForHistory] = useState<IdCardPerson | null>(null)
  const [selectedPersonForReprint, setSelectedPersonForReprint] = useState<IdCardPerson | null>(null)
  const [duplicateWarningPerson, setDuplicateWarningPerson] = useState<IdCardPerson | null>(null)

  // Print Session States
  const [activeSession, setActiveSession] = useState<PrintSession | null>(null)
  const [showPrePrintReview, setShowPrePrintReview] = useState(false)
  const [prePrintReviewSessionId, setPrePrintReviewSessionId] = useState('')
  const [prePrintOrderedPersons, setPrePrintOrderedPersons] = useState<IdCardPerson[]>([])
  const [showLiveQueueModal, setShowLiveQueueModal] = useState(false)
  const [isSessionPrinting, setIsSessionPrinting] = useState(false)
  const [showInterruptedModal, setShowInterruptedModal] = useState(false)
  const [interruptedSession, setInterruptedSession] = useState<PrintSession | null>(null)
  const [showSessionHistoryModal, setShowSessionHistoryModal] = useState(false)

  // Detect previous interrupted session on mount
  useEffect(() => {
    const interrupted = getActivePrintSession(project.id)
    if (interrupted && (interrupted.status === 'INTERRUPTED' || interrupted.status === 'IN_PROGRESS')) {
      setInterruptedSession(interrupted)
      setShowInterruptedModal(true)
    }
  }, [project.id])

  const imageCacheRef = useRef(new CardImageCache())
  const isMountedRef = useRef(true)

  // Print layout config
  const [printConfig, setPrintConfig] = useState<PrintConfig>(() => {
    const saved = loadPrintConfig(project.id)
    return saved ?? { ...DEFAULT_PRINT_CONFIG }
  })

  // Sync card dimensions from template
  useEffect(() => {
    if (template) {
      setPrintConfig((prev) => ({
        ...prev,
        cardWidthMm: template.card_width_mm,
        cardHeightMm: template.card_height_mm,
      }))
    }
  }, [template?.id, template?.card_width_mm, template?.card_height_mm])

  // Persist print config & column visibility
  useEffect(() => {
    try {
      savePrintConfig(project.id, printConfig)
    } catch (e) {
      console.error('Failed to save print config', e)
    }
  }, [printConfig, project.id])

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`palak_gen_col_vis_${project.id}`, JSON.stringify(columnVisibility))
      } catch (e) {
        console.warn('Failed to save column visibility:', e)
      }
    }
  }, [columnVisibility, project.id])

  const isDoubleSided = Boolean(
    template?.layout?.isDoubleSided || template?.layout?.templateType === 'double' || template?.layout?.back
  )
  const effectiveConfig = useMemo(() => {
    if (!isDoubleSided && printConfig.printMode !== 'front-only') {
      return { ...printConfig, printMode: 'front-only' as PrintMode }
    }
    return printConfig
  }, [printConfig, isDoubleSided])

  const fieldSchema = useMemo(() => extractTemplateFieldSchema(template?.layout), [template])

  // ── Data loading ──────────────────────────────────
  async function load() {
    setState({ kind: 'loading' })
    try {
      const [personsResult, projectTemplates, gens] = await Promise.all([
        getIdCardPersons(project.id, { pageSize: 5000 }), // Load full project roster without page truncation
        getIdCardTemplates(project.id),
        getIdCardGenerations(project.id),
      ])
      setPersons(personsResult.data)
      setTemplates(projectTemplates)
      const resolvedTemplate = project.template_id
        ? (projectTemplates.find((t) => t.id === project.template_id) ?? (projectTemplates[0] || null))
        : (projectTemplates[0] || null)
      setTemplate(resolvedTemplate)
      setGenerations(gens)
      setState({ kind: 'ready' })
    } catch (err) {
      setState({ kind: 'error', message: errorCodeToUserMessage(classifySupabaseError(err).code) })
    }
  }

  useEffect(() => {
    load()
    return () => imageCacheRef.current.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.template_id])

  useEffect(() => {
    imageCacheRef.current.clear()
  }, [template?.id, template?.updated_at])

  // ── Unique Helper ─────────────────────────────────
  function latestGenerationFor(personId: string): IdCardGeneration | undefined {
    return generations.find((g) => g.person_id === personId)
  }

  // Authoritative Status mapping for all students
  const studentStatusMap = useMemo(() => {
    const map = new Map<string, StudentIdCardStatusInfo>()
    for (const person of persons) {
      const latestGen = latestGenerationFor(person.id)
      const info = computeStudentIdCardStatus({
        person,
        schema: fieldSchema,
        template,
        latestGen,
      })
      map.set(person.id, info)
    }
    return map
  }, [persons, generations, fieldSchema, template])

  // Real-time status counts for top dashboard
  const statusCounts = useMemo(() => {
    let notReady = 0
    let readyToGenerate = 0
    let readyToPrint = 0
    let printed = 0
    let printFailed = 0
    let reprintRequired = 0
    let outdated = 0

    for (const person of persons) {
      const info = studentStatusMap.get(person.id)
      if (!info) continue
      switch (info.status) {
        case 'NOT_READY':
          notReady++
          break
        case 'READY_TO_GENERATE':
          readyToGenerate++
          break
        case 'READY_TO_PRINT':
          readyToPrint++
          break
        case 'PRINTED':
          printed++
          break
        case 'PRINT_FAILED':
          printFailed++
          break
        case 'REPRINT_REQUIRED':
          reprintRequired++
          break
        case 'OUTDATED':
          outdated++
          break
      }
    }

    return {
      total: persons.length,
      notReady,
      readyToGenerate,
      readyToPrint,
      printed,
      printFailed,
      reprintRequired,
      outdated,
    }
  }, [persons, studentStatusMap])

  // Distinct classes for filter dropdown
  const distinctClasses = useMemo(() => {
    const set = new Set<string>()
    for (const p of persons) {
      if (p.class && p.class.trim()) set.add(p.class.trim())
    }
    return Array.from(set).sort()
  }, [persons])

  // ── Unified Search + Filter + Multi-Sort Pipeline ───────────
  const filteredAndSortedPersons = useMemo(() => {
    let list = [...persons]

    // 1. Global Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => {
        const idMatch = (p.student_id || '').toLowerCase().includes(q)
        const nameMatch = (p.name || '').toLowerCase().includes(q)
        const rollMatch = (p.roll_number || '').toLowerCase().includes(q)
        const classMatch = (p.class || '').toLowerCase().includes(q)
        const phoneMatch = (p.phone || '').toLowerCase().includes(q)
        const emMatch = (p.emergency_number || '').toLowerCase().includes(q)
        const parentMatch = (p.father_name || p.mother_name || '').toLowerCase().includes(q)
        const addrMatch = (p.address || '').toLowerCase().includes(q)
        return idMatch || nameMatch || rollMatch || classMatch || phoneMatch || emMatch || parentMatch || addrMatch
      })
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      list = list.filter((p) => {
        const info = studentStatusMap.get(p.id)
        return info?.status === statusFilter
      })
    }

    // 3. Class Filter
    if (classFilter !== 'ALL') {
      list = list.filter((p) => (p.class || '').trim() === classFilter)
    }

    // 4. Photo Filter
    if (photoFilter === 'has_photo') {
      list = list.filter((p) => Boolean(p.photo_url && p.photo_url.trim()))
    } else if (photoFilter === 'missing_photo') {
      list = list.filter((p) => !p.photo_url || !p.photo_url.trim())
    }

    // 5. Information Filter
    if (infoFilter === 'complete') {
      list = list.filter((p) => studentStatusMap.get(p.id)?.ready === true)
    } else if (infoFilter === 'incomplete') {
      list = list.filter((p) => studentStatusMap.get(p.id)?.ready === false)
    }

    // 6. Generated Filter
    if (generatedFilter === 'generated') {
      list = list.filter((p) => {
        const gen = latestGenerationFor(p.id)
        return gen && gen.status === 'SUCCESS'
      })
    } else if (generatedFilter === 'not_generated') {
      list = list.filter((p) => {
        const gen = latestGenerationFor(p.id)
        return !gen || gen.status !== 'SUCCESS'
      })
    }

    // 7. Printed Filter
    if (printedFilter === 'printed') {
      list = list.filter((p) => (studentStatusMap.get(p.id)?.printCount || 0) > 0)
    } else if (printedFilter === 'not_printed') {
      list = list.filter((p) => (studentStatusMap.get(p.id)?.printCount || 0) === 0)
    }

    // 8. Multi-Column Sorting
    const sortRules: SortRule[] = [
      { field: primarySortField, ascending: primarySortAsc },
    ]
    if (secondarySortField && secondarySortField !== primarySortField) {
      sortRules.push({ field: secondarySortField, ascending: secondarySortAsc })
    }

    return sortStudentsMulti(list, sortRules, studentStatusMap)
  }, [
    persons,
    search,
    statusFilter,
    classFilter,
    photoFilter,
    infoFilter,
    generatedFilter,
    printedFilter,
    primarySortField,
    primarySortAsc,
    secondarySortField,
    secondarySortAsc,
    studentStatusMap,
    generations,
  ])

  // ── Selection State Calculations ───────────────────────────
  const selectedPersons = useMemo(() => persons.filter((p) => selected.has(p.id)), [persons, selected])
  const visibleSelectedCount = useMemo(
    () => filteredAndSortedPersons.filter((p) => selected.has(p.id)).length,
    [filteredAndSortedPersons, selected]
  )
  const hiddenSelectedCount = selected.size - visibleSelectedCount

  // Target students for print/generate action
  const actionTargets = useMemo(() => {
    let base = selectedPersons.length > 0 ? selectedPersons : filteredAndSortedPersons
    return getStudentsInPrintOrder(base, printOrder)
  }, [selectedPersons, filteredAndSortedPersons, printOrder])

  // Toggle single selection
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Header checkbox: Toggle all visible
  function toggleSelectAllVisible() {
    if (visibleSelectedCount === filteredAndSortedPersons.length && filteredAndSortedPersons.length > 0) {
      // Deselect all visible
      setSelected((prev) => {
        const next = new Set(prev)
        for (const p of filteredAndSortedPersons) next.delete(p.id)
        return next
      })
    } else {
      // Select all visible
      setSelected((prev) => {
        const next = new Set(prev)
        for (const p of filteredAndSortedPersons) next.add(p.id)
        return next
      })
    }
  }

  // Smart Selection handlers
  function handleSmartSelect(type: string) {
    setShowSmartSelectMenu(false)
    if (type === 'clear') {
      setSelected(new Set())
      return
    }
    if (type === 'clear_hidden') {
      const visibleIds = new Set(filteredAndSortedPersons.map((p) => p.id))
      setSelected((prev) => {
        const next = new Set<string>()
        for (const id of prev) {
          if (visibleIds.has(id)) next.add(id)
        }
        return next
      })
      return
    }
    if (type === 'all_project') {
      if (persons.length > 100) {
        const ok = confirm(`Select all ${persons.length} students in this project?`)
        if (!ok) return
      }
      setSelected(new Set(persons.map((p) => p.id)))
      return
    }
    if (type === 'all_filtered') {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const p of filteredAndSortedPersons) next.add(p.id)
        return next
      })
      return
    }

    // Status-based smart selections
    const newSelected = new Set<string>(selected)
    for (const p of filteredAndSortedPersons) {
      const info = studentStatusMap.get(p.id)
      if (type === 'ready_to_generate' && info?.status === 'READY_TO_GENERATE') newSelected.add(p.id)
      else if (type === 'ready_to_print' && info?.status === 'READY_TO_PRINT') newSelected.add(p.id)
      else if (type === 'printed' && info?.status === 'PRINTED') newSelected.add(p.id)
      else if (type === 'print_failed' && info?.status === 'PRINT_FAILED') newSelected.add(p.id)
      else if (type === 'reprint_required' && info?.status === 'REPRINT_REQUIRED') newSelected.add(p.id)
      else if (type === 'not_ready' && info?.status === 'NOT_READY') newSelected.add(p.id)
    }
    setSelected(newSelected)
  }

  // ── Column Sorting Click Handler ───────────────────────────
  function handleHeaderSort(field?: StudentSortField) {
    if (!field) return

    if (primarySortField === field) {
      // Toggle Asc -> Desc -> Asc
      setPrimarySortAsc(!primarySortAsc)
    } else {
      setPrimarySortField(field)
      setPrimarySortAsc(true)
    }
  }

  // ── Card Inputs & Print Layout Engine Calculation ──────────
  const cardInputs: CardInput[] = useMemo(() => {
    return actionTargets.map((p) => ({
      personId: p.id,
      hasBack: isDoubleSided,
    }))
  }, [actionTargets, isDoubleSided])

  const validation = validatePrintConfig(effectiveConfig)
  const layout = useMemo(() => {
    if (!validation.valid) return null
    return calculatePrintLayout(effectiveConfig, cardInputs)
  }, [effectiveConfig, cardInputs, validation.valid])

  // ── Render Card Images for Printing ────────────────────────
  useEffect(() => {
    let active = true
    if (!template || actionTargets.length === 0) {
      setCardImages(new Map())
      return
    }

    async function loadAllCardImages() {
      setLoadingImages(true)
      const map = new Map<string, string>()

      for (const person of actionTargets) {
        try {
          const frontUrl = await renderCardToDataUrl(
            person,
            template!,
            project.name,
            project.academic_year,
            'front'
          )
          map.set(`${person.id}:front`, frontUrl)

          if (isDoubleSided || effectiveConfig.printMode !== 'front-only') {
            const backUrl = await renderCardToDataUrl(
              person,
              template!,
              project.name,
              project.academic_year,
              'back'
            )
            map.set(`${person.id}:back`, backUrl)
          }
        } catch (err) {
          console.warn(`Card render error for ${person.name}:`, err)
        }
      }

      if (active) {
        setCardImages(map)
        setLoadingImages(false)
      }
    }

    loadAllCardImages()

    return () => {
      active = false
    }
  }, [actionTargets, template, isDoubleSided, effectiveConfig.printMode, project.name, project.academic_year])

  // ── Calibration Test Sheet ─────────────────────────────────
  function handlePrintCalibration() {
    try {
      const paperW = layout?.paperWidthMm || (effectiveConfig.paperSize === 'a3' ? 297 : effectiveConfig.paperSize === 'a5' ? 148 : 210)
      const paperH = layout?.paperHeightMm || (effectiveConfig.paperSize === 'a3' ? 420 : effectiveConfig.paperSize === 'a5' ? 210 : 297)
      const pdfBlob = buildCalibrationTestPdf(
        paperW,
        paperH,
        template?.card_width_mm || 85.6,
        template?.card_height_mm || 54.0
      )
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Calibration_Test_Sheet_${effectiveConfig.paperSize.toUpperCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate calibration test sheet.')
    }
  }

  // ── Safe Batch Generation ──────────────────────────────────
  function handleRequestGenerate(targets: IdCardPerson[]) {
    if (!template || targets.length === 0) return

    const ready: IdCardPerson[] = []
    const skipped: Array<{ person: IdCardPerson; reason: string }> = []

    for (const p of targets) {
      const val = validateStudentForIdCard(p, fieldSchema, template)
      if (val.ready) {
        ready.push(p)
      } else {
        skipped.push({
          person: p,
          reason: `Missing: ${val.missingFields.join(', ')}`,
        })
      }
    }

    if (skipped.length > 0) {
      setBatchModalConfig({
        isOpen: true,
        mode: 'generate',
        readyPersons: ready,
        skippedPersons: skipped,
      })
      return
    }

    executeGeneration(ready)
  }

  async function executeGeneration(targets: IdCardPerson[]) {
    if (!template || targets.length === 0) return

    setGenerating(true)
    setProgress({ total: targets.length, completed: 0, succeeded: 0, failed: 0 })
    try {
      await generateCardsForPersons(targets, template, project.id, project.name, project.academic_year, setProgress)
    } finally {
      if (!isMountedRef.current) return
      setGenerating(false)
      setBatchModalConfig(null)
      imageCacheRef.current.clear()
      const gens = await getIdCardGenerations(project.id)
      if (!isMountedRef.current) return
      setGenerations(gens)
    }
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // ── Safe Batch Print (Pre-Flight Review & Session Safety) ──
  function handleRequestPrint(targets: IdCardPerson[]) {
    if (!layout || !template || cardImages.size === 0) return

    const printable: IdCardPerson[] = []
    const skipped: Array<{ person: IdCardPerson; reason: string }> = []

    for (const p of targets) {
      const statusInfo = studentStatusMap.get(p.id)
      const gen = latestGenerationFor(p.id)

      // Concurrency Lock check
      if (isStudentPrintLocked(project.id, p.id)) {
        skipped.push({ person: p, reason: 'Currently locked by another active print session' })
        continue
      }

      // Card Version & Data Integrity check
      const integrity = verifyStudentCardIntegrity(p, template, gen)
      if (!integrity.valid) {
        skipped.push({ person: p, reason: integrity.detail || 'Card data changed / regeneration required' })
        continue
      }

      if (!gen || gen.status !== 'SUCCESS') {
        skipped.push({ person: p, reason: 'Card not generated yet' })
      } else if (statusInfo?.status === 'PRINTED') {
        skipped.push({
          person: p,
          reason: `Already printed ${statusInfo.printCount} time(s) (Reprint request needed)`,
        })
      } else if (statusInfo?.status === 'NOT_READY') {
        skipped.push({ person: p, reason: 'Incomplete information' })
      } else {
        printable.push(p)
      }
    }

    if (targets.length === 1 && printable.length === 0 && skipped[0]?.reason.includes('Already printed')) {
      setDuplicateWarningPerson(targets[0])
      return
    }

    if (skipped.length > 0 && printable.length === 0) {
      setBatchModalConfig({
        isOpen: true,
        mode: 'print',
        readyPersons: printable,
        skippedPersons: skipped,
      })
      return
    }

    // Sort targets according to current printOrder mode
    const ordered = getStudentsInPrintOrder(targets, printOrder, filteredAndSortedPersons, studentStatusMap)
    const existingSessions = getProjectPrintSessions(project.id)
    const nextSessionId = generatePrintSessionId(existingSessions.length)

    setPrePrintReviewSessionId(nextSessionId)
    setPrePrintOrderedPersons(ordered)
    setShowPrePrintReview(true)
  }

  // ── Start Print Session from Review Screen ─────────────────
  function handleStartPrintSession() {
    if (!template || prePrintOrderedPersons.length === 0) return

    const printableOnly = prePrintOrderedPersons.filter((p) => {
      const info = studentStatusMap.get(p.id)
      return info?.status === 'READY_TO_PRINT' || info?.status === 'REPRINT_REQUIRED' || info?.status === 'PRINT_FAILED'
    })

    if (printableOnly.length === 0) {
      alert('No cards are in a ready state to print.')
      setShowPrePrintReview(false)
      return
    }

    const { session, lockError } = createPrintSession({
      projectId: project.id,
      template,
      operator: 'Admin',
      printOrder,
      orderedPersons: printableOnly,
      generations,
    })

    if (lockError || !session) {
      alert(lockError || 'Failed to initialize print session locks.')
      setShowPrePrintReview(false)
      return
    }

    setActiveSession(session)
    setShowPrePrintReview(false)
    setShowLiveQueueModal(true)
    setIsSessionPrinting(true)

    executePrint(printableOnly, session.sessionId)
  }

  // ── Browser Print Execution ────────────────────────────────
  function executePrint(targetsToPrint: IdCardPerson[], _currentSessionId?: string) {
    if (!layout || !template || targetsToPrint.length === 0) return

    const targetIds = new Set(targetsToPrint.map((p) => p.id))
    const printableGenIds: string[] = []
    for (const p of targetsToPrint) {
      const gen = latestGenerationFor(p.id)
      if (gen) printableGenIds.push(gen.id)
    }

    const paperW = layout.paperWidthMm
    const paperH = layout.paperHeightMm

    let pagesHtml = ''
    for (const page of layout.pages) {
      let cardsHtml = ''
      for (const card of page.cards) {
        if (!targetIds.has(card.personId)) continue

        const key = `${card.personId}:${card.side}`
        const imageUrl = cardImages.get(key)
        if (!imageUrl) continue

        const cutGuideStyle = layout.showCutGuides
          ? 'border: 0.15mm dashed #94a3b8;'
          : ''

        cardsHtml += `<img
          src="${imageUrl}"
          alt="${card.side}"
          style="position:absolute; left:${card.xMm}mm; top:${card.yMm}mm; width:${layout.cardWidthMm}mm; height:${layout.cardHeightMm}mm; object-fit:fill; display:block; ${cutGuideStyle}"
        />`
      }

      if (cardsHtml.trim()) {
        pagesHtml += `<div class="print-sheet">${cardsHtml}</div>`
      }
    }

    if (!pagesHtml.trim()) {
      alert('No valid images found to print for the selected students.')
      setIsSessionPrinting(false)
      return
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Print ID Cards - ${project.name}</title>
<style>
  @page {
    size: ${paperW}mm ${paperH}mm;
    margin: 0mm !important;
  }
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: ${paperW}mm;
    height: auto;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-sheet {
    box-sizing: border-box;
    position: relative;
    width: ${paperW}mm;
    height: calc(${paperH}mm - 0.5mm);
    max-height: calc(${paperH}mm - 0.5mm);
    overflow: hidden;
    background: #fff;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: block;
  }
  .print-sheet:not(:last-child) {
    page-break-after: always !important;
    break-after: page !important;
  }
  .print-sheet:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  img {
    display: block;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
</head>
<body>${pagesHtml.trim()}</body></html>`

    const win = window.open('', '_blank')
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
      setIsSessionPrinting(false)
      return
    }
    win.document.write(html)
    win.document.close()

    const images = win.document.querySelectorAll('img')
    let loaded = 0
    const total = images.length

    function onAllLoaded() {
      win!.focus()
      win!.print()
      setIsSessionPrinting(false)
      if (printableGenIds.length > 0) {
        setPendingPrintGenIds(printableGenIds)
        setPendingPrintPersons(targetsToPrint)
        setShowPrintConfirm(true)
      }
    }

    if (total === 0) {
      win.close()
      alert('No valid card renders found to print.')
      setIsSessionPrinting(false)
      return
    }

    images.forEach((img) => {
      if (img.complete) {
        loaded++
        if (loaded >= total) onAllLoaded()
      } else {
        img.onload = () => { loaded++; if (loaded >= total) onAllLoaded() }
        img.onerror = () => { loaded++; if (loaded >= total) onAllLoaded() }
      }
    })
  }

  // ── Print Confirmation Actions ─────────────────────────────
  async function confirmPrintedSuccess() {
    try {
      await markGenerationsAsPrinted(pendingPrintGenIds)

      if (activeSession) {
        const results = pendingPrintPersons.map((p) => ({
          personId: p.id,
          status: 'PRINTED' as const,
        }))
        const updated = recordSessionCompletion({
          sessionId: activeSession.sessionId,
          projectId: project.id,
          results,
          templateName: template?.name,
        })
        setActiveSession(updated)
      } else {
        for (const p of pendingPrintPersons) {
          const gen = latestGenerationFor(p.id)
          recordPrintSuccess(project.id, p, gen?.id, template?.name)
        }
      }

      const gens = await getIdCardGenerations(project.id)
      setGenerations(gens)
    } catch {
      alert('Failed to update print status. Please try again.')
    } finally {
      setShowPrintConfirm(false)
      setPendingPrintGenIds([])
      setPendingPrintPersons([])
    }
  }

  function confirmPrintedFailed() {
    if (activeSession) {
      const results = pendingPrintPersons.map((p) => ({
        personId: p.id,
        status: 'FAILED' as const,
        failureReason: 'Physical print failed or was cancelled by user.',
      }))
      const updated = recordSessionCompletion({
        sessionId: activeSession.sessionId,
        projectId: project.id,
        results,
        templateName: template?.name,
      })
      setActiveSession(updated)
    } else {
      for (const p of pendingPrintPersons) {
        const gen = latestGenerationFor(p.id)
        recordPrintFailure(project.id, p, 'User flagged print operation as failed / misprinted.', gen?.id)
      }
    }

    setShowPrintConfirm(false)
    setPendingPrintGenIds([])
    setPendingPrintPersons([])
    load()
  }

  function cancelPrintConfirm() {
    if (activeSession) {
      const results = pendingPrintPersons.map((p) => ({
        personId: p.id,
        status: 'UNCONFIRMED' as const,
      }))
      const updated = recordSessionCompletion({
        sessionId: activeSession.sessionId,
        projectId: project.id,
        results,
        templateName: template?.name,
      })
      setActiveSession(updated)
    }
    setShowPrintConfirm(false)
    setPendingPrintGenIds([])
    setPendingPrintPersons([])
  }

  // ── Retry Failed Session Cards ─────────────────────────────
  function handleRetryFailedSessionItems(failedPersonIds: string[]) {
    const targets = persons.filter((p) => failedPersonIds.includes(p.id))
    if (targets.length === 0) return
    setShowLiveQueueModal(false)
    handleRequestPrint(targets)
  }

  // ── Interrupted Session Handlers ───────────────────────────
  function handleContinueInterruptedSession(session: PrintSession) {
    setShowInterruptedModal(false)
    const unconfirmedIds = new Set(
      session.items.filter((i) => i.status === 'UNCONFIRMED' || i.status === 'QUEUED' || i.status === 'PRINTING').map((i) => i.personId)
    )
    const targets = persons.filter((p) => unconfirmedIds.has(p.id))
    if (targets.length > 0) {
      handleRequestPrint(targets)
    }
  }

  function handleCancelInterruptedSession(session: PrintSession) {
    handleInterruptedPrintSession(project.id, session.sessionId)
    setShowInterruptedModal(false)
    setInterruptedSession(null)
  }

  // ── PDF Download ───────────────────────────────────────────
  async function handleDownloadPdf() {
    if (!layout || !template || cardImages.size === 0) return

    setBuildingPdf(true)
    try {
      const pdfBlob = await buildMultiCardSheetPdf(
        layout,
        new Map(cardImages)
      )
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name.replace(/\s+/g, '_')}_${effectiveConfig.paperSize.toUpperCase()}_id_cards.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to build PDF. Please try again.')
    } finally {
      setBuildingPdf(false)
    }
  }

  // ── Export Current Filtered & Sorted View to Excel ─────────
  function handleExportCurrentView() {
    if (filteredAndSortedPersons.length === 0) {
      alert('No student records match the current view.')
      return
    }

    const exportCols = DEFAULT_COLUMNS.filter((c) => c.key !== 'primary' && c.key !== 'actions' && columnVisibility[c.key])
    const headers = exportCols.map((c) => c.label)

    const rows = filteredAndSortedPersons.map((p) => {
      const gen = latestGenerationFor(p.id)
      const statusInfo = studentStatusMap.get(p.id)

      return exportCols.map((col) => {
        switch (col.key) {
          case 'student_id':
            return p.student_id || ''
          case 'class':
            return p.class ? `${p.class}${p.section ? ` - ${p.section}` : ''}` : ''
          case 'roll':
            return p.roll_number || ''
          case 'name':
            return p.name || ''
          case 'photo':
            return p.photo_url ? 'Yes' : 'No'
          case 'information':
            return statusInfo?.ready ? 'Complete' : `Missing: ${statusInfo?.missingFields.join(', ')}`
          case 'status':
            return statusInfo?.status.replace(/_/g, ' ') || ''
          case 'generated':
            return gen?.status === 'SUCCESS' ? `Generated (${new Date(gen.created_at).toLocaleDateString()})` : 'Not Generated'
          case 'printed':
            return (statusInfo?.printCount || 0) > 0 ? `Printed (${statusInfo?.lastPrintedAt ? new Date(statusInfo.lastPrintedAt).toLocaleDateString() : 'Yes'})` : 'Not Printed'
          case 'print_count':
            return statusInfo?.printCount || 0
          default:
            return ''
        }
      })
    })

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ID Card Production')
    const filename = `${project.name.replace(/\s+/g, '_')}_ID_Cards_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  // ── Render ─────────────────────────────────────────────────
  if (state.kind === 'loading') {
    return (
      <div className="flex h-48 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading spreadsheet production control center...
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        Unable to load ID card production data: {state.message}
      </div>
    )
  }

  if (!template) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
        Set up an ID-card template before generating cards.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Status Summary Dashboard */}
      <StatusSummaryDashboard
        counts={statusCounts}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* 2. Top Action Controls & Print Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleRequestGenerate(actionTargets)}
            disabled={generating || actionTargets.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <Sparkles size={14} /> Generate {selected.size > 0 ? `Selected (${selected.size})` : `All Ready (${statusCounts.readyToGenerate})`}
          </button>

          <button
            onClick={() => setShowPreview(true)}
            disabled={!validation.valid || loadingImages || cardImages.size === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <Eye size={14} /> {loadingImages ? 'Preparing Cards...' : 'Print Preview'}
          </button>

          <button
            onClick={() => handleRequestPrint(actionTargets)}
            disabled={!validation.valid || loadingImages || cardImages.size === 0}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <Printer size={14} /> Print {selected.size > 0 ? `Selected (${selected.size})` : `All Ready (${statusCounts.readyToPrint})`}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={buildingPdf || !validation.valid || loadingImages || cardImages.size === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <Download size={14} /> {buildingPdf ? 'Building PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={handleExportCurrentView}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs"
            title="Export currently filtered and sorted records to Excel spreadsheet"
          >
            <FileSpreadsheet size={14} /> Export Current View
          </button>

          <button
            type="button"
            onClick={() => setShowSessionHistoryModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 cursor-pointer shadow-2xs"
            title="View previous print sessions and physical print audit trail"
          >
            <History size={14} /> Print Sessions
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Order Selection */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <span className="font-semibold text-slate-600">Print Order:</span>
            <select
              value={printOrder}
              onChange={(e) => setPrintOrder(e.target.value as PrintOrderMode)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="table_order">Current Table Order</option>
              <option value="student_id">Student ID (Ascending)</option>
              <option value="class_roll">Class → Roll Number</option>
              <option value="name">Student Name (A-Z)</option>
            </select>
          </div>

          {/* Template Switcher */}
          {templates.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
              <label className="font-semibold text-slate-600">Template:</label>
              <select
                value={template.id}
                onChange={(e) => {
                  const found = templates.find((t) => t.id === e.target.value)
                  if (found) setTemplate(found)
                }}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.card_width_mm}×{t.card_height_mm}mm) {t.id === project.template_id ? '★ Active' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handlePrintCalibration}
            title="Print physical measurement test page with 10mm rulers and duplex alignment boxes"
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer shadow-2xs"
          >
            <Scissors size={13} /> Calibration Test
          </button>
        </div>
      </div>

      {/* Actual Size 100% Print Notice */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
        <span>
          💡 <strong>Printer Dialog Settings:</strong> Margins: <strong>None</strong> (or 0mm) · Print Scale: <strong>100% (Actual Size)</strong> · Fit to Page: <strong>OFF</strong> to guarantee 0 blank pages and exact physical mm accuracy.
        </span>
      </div>

      {/* Generation Progress Bar */}
      {progress && (
        <div>
          <GenerationProgressBar progress={progress} />
        </div>
      )}

      {/* Print Settings Panel */}
      <SettingsPanel
        config={effectiveConfig}
        onChange={setPrintConfig}
        isDoubleSided={isDoubleSided}
        selectedCount={actionTargets.length}
        cards={cardInputs}
        expanded={settingsExpanded}
        onToggle={() => setSettingsExpanded(!settingsExpanded)}
      />

      {/* 3. Search, Multi-Filtering & Spreadsheet Controls Bar */}
      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Global Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, ID, roll, phone, class, parent..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses ({persons.length})</option>
              <option value="NOT_READY">Not Ready ({statusCounts.notReady})</option>
              <option value="READY_TO_GENERATE">Ready to Generate ({statusCounts.readyToGenerate})</option>
              <option value="READY_TO_PRINT">Ready to Print ({statusCounts.readyToPrint})</option>
              <option value="PRINTED">Printed ({statusCounts.printed})</option>
              <option value="PRINT_FAILED">Print Failed ({statusCounts.printFailed})</option>
              <option value="REPRINT_REQUIRED">Reprint Required ({statusCounts.reprintRequired})</option>
              <option value="OUTDATED">Outdated ({statusCounts.outdated})</option>
            </select>

            {/* Class Filter */}
            {distinctClasses.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Classes</option>
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls}>Class: {cls}</option>
                ))}
              </select>
            )}

            {/* Photo Filter */}
            <select
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Photo: All</option>
              <option value="has_photo">Has Photo</option>
              <option value="missing_photo">Missing Photo</option>
            </select>

            {/* Information Filter */}
            <select
              value={infoFilter}
              onChange={(e) => setInfoFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Info: All</option>
              <option value="complete">✓ Complete Info</option>
              <option value="incomplete">⚠ Incomplete Info</option>
            </select>

            {/* Generated Filter */}
            <select
              value={generatedFilter}
              onChange={(e) => setGeneratedFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Generation: All</option>
              <option value="generated">✓ Generated</option>
              <option value="not_generated">Not Generated</option>
            </select>

            {/* Printed Filter */}
            <select
              value={printedFilter}
              onChange={(e) => setPrintedFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Print: All</option>
              <option value="printed">✓ Printed</option>
              <option value="not_printed">Not Printed</option>
            </select>

            {/* Secondary Sort Selector */}
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              <span className="font-semibold text-slate-500">Then by:</span>
              <select
                value={secondarySortField || 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  setSecondarySortField(val === 'none' ? null : (val as StudentSortField));
                }}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="none">None</option>
                <option value="class">Class</option>
                <option value="roll_number">Roll</option>
                <option value="name">Name</option>
                <option value="student_id">Student ID</option>
                <option value="status">Status</option>
                <option value="print_count">Print Count</option>
              </select>
              {secondarySortField && (
                <button
                  type="button"
                  onClick={() => setSecondarySortAsc(!secondarySortAsc)}
                  className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer ml-0.5"
                  title="Toggle Secondary Sort Direction"
                >
                  {secondarySortAsc ? '↑' : '↓'}
                </button>
              )}
            </div>

            {/* Column Visibility Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <Columns size={13} /> ⚙ Columns
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Column Visibility</span>
                    <button
                      type="button"
                      onClick={() => setColumnVisibility({ ...INITIAL_VISIBILITY })}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                    {DEFAULT_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className={`flex items-center justify-between px-1.5 py-1 rounded text-xs cursor-pointer ${col.canHide === false ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                      >
                        <span className="text-slate-700 font-medium">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={columnVisibility[col.key] ?? true}
                          disabled={col.canHide === false}
                          onChange={(e) => setColumnVisibility({ ...columnVisibility, [col.key]: e.target.checked })}
                          className="rounded border-slate-300 text-slate-900"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Smart Selection Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSmartSelectMenu(!showSmartSelectMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <CheckSquare size={13} /> Select <ChevronDown size={12} />
              </button>

              {showSmartSelectMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl space-y-1 text-xs">
                  <button
                    onClick={() => handleSmartSelect('all_filtered')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    Select All Matching Visible ({filteredAndSortedPersons.length})
                  </button>
                  <button
                    onClick={() => handleSmartSelect('ready_to_generate')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    Select Ready to Generate
                  </button>
                  <button
                    onClick={() => handleSmartSelect('ready_to_print')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  >
                    Select Ready to Print
                  </button>
                  <button
                    onClick={() => handleSmartSelect('printed')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-teal-700 hover:bg-teal-50 cursor-pointer"
                  >
                    Select Printed
                  </button>
                  <button
                    onClick={() => handleSmartSelect('print_failed')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    Select Print Failed
                  </button>
                  <button
                    onClick={() => handleSmartSelect('reprint_required')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-purple-700 hover:bg-purple-50 cursor-pointer"
                  >
                    Select Reprint Required
                  </button>
                  <button
                    onClick={() => handleSmartSelect('not_ready')}
                    className="w-full text-left px-2 py-1.5 rounded font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer"
                  >
                    Select Not Ready
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => handleSmartSelect('all_project')}
                    className="w-full text-left px-2 py-1.5 rounded font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Select All in Project ({persons.length})
                  </button>
                  {hiddenSelectedCount > 0 && (
                    <button
                      onClick={() => handleSmartSelect('clear_hidden')}
                      className="w-full text-left px-2 py-1.5 rounded font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Clear Hidden Selections ({hiddenSelectedCount})
                    </button>
                  )}
                  <button
                    onClick={() => handleSmartSelect('clear')}
                    className="w-full text-left px-2 py-1.5 rounded font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    Clear All Selections
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Live View Count Status & Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            <span>Total Students: <strong className="text-slate-900">{persons.length}</strong></span>
            <span>Showing: <strong className="text-slate-900">{filteredAndSortedPersons.length}</strong></span>
            <span>
              Selected: <strong className="text-blue-700 font-bold">{selected.size}</strong>
              {hiddenSelectedCount > 0 && (
                <span className="text-[11px] text-slate-400 ml-1">
                  (Visible: {visibleSelectedCount}, Hidden: {hiddenSelectedCount})
                </span>
              )}
            </span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span>Primary Sort: <strong className="text-slate-700">{primarySortField.replace(/_/g, ' ').toUpperCase()} {primarySortAsc ? '↑' : '↓'}</strong></span>
          </div>
        </div>
      </div>

      {/* 5. Continuous Scrollable Spreadsheet Table */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[620px] rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full min-w-[1250px] border-collapse text-left text-xs">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 font-semibold text-slate-700 select-none">
            <tr>
              {/* 1. PRIMARY CHECKBOX (Sticky Left 0) */}
              {columnVisibility.primary && (
                <th className="sticky left-0 top-0 z-30 bg-slate-100 w-11 px-3 py-2.5 text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={visibleSelectedCount === filteredAndSortedPersons.length && filteredAndSortedPersons.length > 0}
                    onChange={toggleSelectAllVisible}
                    title="Select/Deselect all visible students"
                    className="rounded border-slate-300 text-slate-900 cursor-pointer"
                  />
                </th>
              )}

              {/* 2. STUDENT ID (Sticky Left 44px) */}
              {columnVisibility.student_id && (
                <th
                  onClick={() => handleHeaderSort('student_id')}
                  className="sticky left-[44px] top-0 z-30 bg-slate-100 px-3 py-2.5 min-w-[120px] border-r border-slate-200 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Student ID</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'student_id' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 3. CLASS */}
              {columnVisibility.class && (
                <th
                  onClick={() => handleHeaderSort('class')}
                  className="px-3 py-2.5 min-w-[90px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Class</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'class' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 4. ROLL */}
              {columnVisibility.roll && (
                <th
                  onClick={() => handleHeaderSort('roll_number')}
                  className="px-3 py-2.5 min-w-[70px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Roll</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'roll_number' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 5. STUDENT NAME */}
              {columnVisibility.name && (
                <th
                  onClick={() => handleHeaderSort('name')}
                  className="px-3 py-2.5 min-w-[160px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Student Name</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'name' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 6. PHOTO */}
              {columnVisibility.photo && (
                <th
                  onClick={() => handleHeaderSort('photo')}
                  className="px-3 py-2.5 min-w-[70px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Photo</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'photo' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 7. INFORMATION */}
              {columnVisibility.information && (
                <th
                  onClick={() => handleHeaderSort('information')}
                  className="px-3 py-2.5 min-w-[130px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Information</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'information' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 8. ID CARD STATUS */}
              {columnVisibility.status && (
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="px-3 py-2.5 min-w-[150px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>ID Card Status</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'status' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 9. GENERATED */}
              {columnVisibility.generated && (
                <th
                  onClick={() => handleHeaderSort('generated')}
                  className="px-3 py-2.5 min-w-[120px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Generated</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'generated' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 10. PRINTED */}
              {columnVisibility.printed && (
                <th
                  onClick={() => handleHeaderSort('printed')}
                  className="px-3 py-2.5 min-w-[120px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Printed</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'printed' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 11. PRINT COUNT */}
              {columnVisibility.print_count && (
                <th
                  onClick={() => handleHeaderSort('print_count')}
                  className="px-3 py-2.5 min-w-[80px] border-r border-slate-100 hover:bg-slate-200/80 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Count</span>
                    <span className="text-slate-400 font-bold">
                      {primarySortField === 'print_count' ? (primarySortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
              )}

              {/* 12. ACTIONS */}
              {columnVisibility.actions && (
                <th className="px-3 py-2.5 min-w-[160px] text-right">
                  <span>Actions</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredAndSortedPersons.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-12 text-center text-slate-400">
                  No students match the selected search and filters.
                </td>
              </tr>
            ) : (
              filteredAndSortedPersons.map((person) => {
                const isSelected = selected.has(person.id)
                const gen = latestGenerationFor(person.id)
                const statusInfo = studentStatusMap.get(person.id) || computeStudentIdCardStatus({ person, schema: fieldSchema, template, latestGen: gen })

                return (
                  <tr
                    key={person.id}
                    className={`transition-colors ${isSelected ? 'bg-blue-50/70 hover:bg-blue-50/90' : 'hover:bg-slate-50/90'}`}
                  >
                    {/* 1. PRIMARY CHECKBOX */}
                    {columnVisibility.primary && (
                      <td className={`sticky left-0 z-10 w-11 px-3 py-2 text-center border-r border-slate-100 ${isSelected ? 'bg-blue-50/90' : 'bg-white'}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(person.id)}
                          className="rounded border-slate-300 text-slate-900 cursor-pointer"
                        />
                      </td>
                    )}

                    {/* 2. STUDENT ID */}
                    {columnVisibility.student_id && (
                      <td className={`sticky left-[44px] z-10 px-3 py-2 min-w-[120px] font-mono font-bold text-slate-900 border-r border-slate-100 ${isSelected ? 'bg-blue-50/90' : 'bg-white'}`}>
                        {sanitizeStudentId(person.student_id)}
                      </td>
                    )}

                    {/* 3. CLASS */}
                    {columnVisibility.class && (
                      <td className="px-3 py-2 min-w-[90px] border-r border-slate-100 text-slate-700">
                        {person.class ? `${person.class}${person.section ? ` - ${person.section}` : ''}` : '—'}
                      </td>
                    )}

                    {/* 4. ROLL */}
                    {columnVisibility.roll && (
                      <td className="px-3 py-2 min-w-[70px] border-r border-slate-100 font-mono text-slate-700">
                        {person.roll_number || '—'}
                      </td>
                    )}

                    {/* 5. STUDENT NAME */}
                    {columnVisibility.name && (
                      <td className="px-3 py-2 min-w-[160px] border-r border-slate-100 font-medium text-slate-900">
                        {person.name}
                      </td>
                    )}

                    {/* 6. PHOTO */}
                    {columnVisibility.photo && (
                      <td className="px-3 py-2 min-w-[70px] border-r border-slate-100">
                        <div className="h-7 w-7 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {person.photo_url ? (
                            <img src={person.photo_url} alt={person.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-amber-600 font-bold">None</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 7. INFORMATION */}
                    {columnVisibility.information && (
                      <td className="px-3 py-2 min-w-[130px] border-r border-slate-100">
                        {statusInfo.ready ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 size={12} /> Complete
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedPersonForMissing(person)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                            title="Click to view missing fields"
                          >
                            <AlertTriangle size={12} /> {statusInfo.missingFields.length} Missing ↗
                          </button>
                        )}
                      </td>
                    )}

                    {/* 8. ID CARD STATUS */}
                    {columnVisibility.status && (
                      <td className="px-3 py-2 min-w-[150px] border-r border-slate-100">
                        <IdCardStatusBadge
                          statusInfo={statusInfo}
                          onMissingClick={() => setSelectedPersonForMissing(person)}
                          onHistoryClick={() => setSelectedPersonForHistory(person)}
                          onReprintClick={() => setSelectedPersonForReprint(person)}
                        />
                      </td>
                    )}

                    {/* 9. GENERATED */}
                    {columnVisibility.generated && (
                      <td className="px-3 py-2 min-w-[120px] border-r border-slate-100 text-[11px]">
                        {gen?.status === 'SUCCESS' ? (
                          <div>
                            <span className="font-bold text-blue-700">✓ Generated</span>
                            <p className="text-[10px] text-slate-400">{new Date(gen.created_at).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not Generated</span>
                        )}
                      </td>
                    )}

                    {/* 10. PRINTED */}
                    {columnVisibility.printed && (
                      <td className="px-3 py-2 min-w-[120px] border-r border-slate-100 text-[11px]">
                        {statusInfo.printCount > 0 ? (
                          <div>
                            <span className="font-bold text-teal-700">✓ Printed</span>
                            {statusInfo.lastPrintedAt && (
                              <p className="text-[10px] text-slate-400">{new Date(statusInfo.lastPrintedAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Not Printed</span>
                        )}
                      </td>
                    )}

                    {/* 11. PRINT COUNT */}
                    {columnVisibility.print_count && (
                      <td className="px-3 py-2 min-w-[80px] border-r border-slate-100 font-mono font-bold text-slate-800">
                        {statusInfo.printCount}
                      </td>
                    )}

                    {/* 12. STATUS-AWARE ACTIONS */}
                    {columnVisibility.actions && (
                      <td className="px-3 py-2 min-w-[160px] text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {statusInfo.status === 'NOT_READY' && (
                            <button
                              type="button"
                              onClick={() => setSelectedPersonForMissing(person)}
                              className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                            >
                              Fix Info
                            </button>
                          )}

                          {statusInfo.status === 'READY_TO_GENERATE' && (
                            <button
                              type="button"
                              onClick={() => executeGeneration([person])}
                              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
                            >
                              <Sparkles size={11} /> Generate
                            </button>
                          )}

                          {statusInfo.status === 'READY_TO_PRINT' && (
                            <button
                              type="button"
                              onClick={() => executePrint([person])}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-2xs"
                            >
                              <Printer size={11} /> Print
                            </button>
                          )}

                          {statusInfo.status === 'PRINT_FAILED' && (
                            <button
                              type="button"
                              onClick={() => executePrint([person])}
                              className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-700 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw size={11} /> Retry Print
                            </button>
                          )}

                          {statusInfo.status === 'REPRINT_REQUIRED' && (
                            <button
                              type="button"
                              onClick={() => executePrint([person])}
                              className="inline-flex items-center gap-1 rounded bg-purple-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-800 cursor-pointer shadow-2xs"
                            >
                              <Printer size={11} /> Print Again
                            </button>
                          )}

                          {statusInfo.status === 'PRINTED' && (
                            <button
                              type="button"
                              onClick={() => setSelectedPersonForReprint(person)}
                              className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-800 hover:bg-purple-100 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw size={11} /> Reprint
                            </button>
                          )}

                          {statusInfo.status === 'OUTDATED' && (
                            <button
                              type="button"
                              onClick={() => executeGeneration([person])}
                              className="inline-flex items-center gap-1 rounded bg-orange-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-orange-700 cursor-pointer shadow-2xs"
                            >
                              <Sparkles size={11} /> Regenerate
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedPersonForHistory(person)}
                            title="View full audit trail"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            <History size={13} />
                          </button>

                          {gen?.status === 'SUCCESS' && gen.file_url && (
                            <a
                              href={gen.file_url}
                              download={`${sanitizeStudentId(person.student_id)}.png`}
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              title="Download high-resolution card PNG"
                            >
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Modals for Batch Validation, Duplicate Warnings, Missing Info, History, Reprint */}
      {batchModalConfig && (
        <BatchValidationConfirmModal
          isOpen={batchModalConfig.isOpen}
          mode={batchModalConfig.mode}
          totalCount={batchModalConfig.readyPersons.length + batchModalConfig.skippedPersons.length}
          readyPersons={batchModalConfig.readyPersons}
          skippedPersons={batchModalConfig.skippedPersons}
          onClose={() => setBatchModalConfig(null)}
          onConfirm={() => {
            if (batchModalConfig.mode === 'generate') {
              executeGeneration(batchModalConfig.readyPersons)
            } else {
              setBatchModalConfig(null)
              executePrint(batchModalConfig.readyPersons)
            }
          }}
        />
      )}

      {duplicateWarningPerson && (
        <Modal
          isOpen={true}
          onClose={() => setDuplicateWarningPerson(null)}
          title="ID Card Already Printed"
          subtitle="Duplicate print protection active"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateWarningPerson(null)}
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = duplicateWarningPerson
                  setDuplicateWarningPerson(null)
                  setSelectedPersonForReprint(p)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={13} /> Request Official Reprint
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">
                  This ID card for {duplicateWarningPerson.name} ({duplicateWarningPerson.student_id}) has already been printed.
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  To prevent accidental duplicate prints, physical reprinting requires an explicit reprint request with a logged reason.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {selectedPersonForMissing && (
        <StudentMissingInfoModal
          person={selectedPersonForMissing}
          template={template}
          schema={fieldSchema}
          isOpen={true}
          onClose={() => setSelectedPersonForMissing(null)}
          onEdit={() => setSelectedPersonForMissing(null)}
        />
      )}

      {selectedPersonForHistory && (
        <StudentPrintHistoryModal
          person={selectedPersonForHistory}
          generations={generations}
          projectId={project.id}
          isOpen={true}
          onClose={() => setSelectedPersonForHistory(null)}
          onRequestReprint={(person) => {
            setSelectedPersonForHistory(null)
            setSelectedPersonForReprint(person)
          }}
        />
      )}

      {selectedPersonForReprint && (
        <ReprintRequestModal
          person={selectedPersonForReprint}
          projectId={project.id}
          isOpen={true}
          onClose={() => setSelectedPersonForReprint(null)}
          onRequested={() => {
            setSelectedPersonForReprint(null)
            load()
          }}
        />
      )}

      {showPreview && layout && (
        <PrintPreviewModal
          layout={layout}
          cardImages={cardImages}
          config={effectiveConfig}
          selectedCount={actionTargets.length}
          onClose={() => setShowPreview(false)}
          onPrint={() => { setShowPreview(false); handleRequestPrint(actionTargets) }}
          onDownloadPdf={() => { setShowPreview(false); handleDownloadPdf() }}
        />
      )}

      {showPrintConfirm && (
        <PrintConfirmDialog
          count={pendingPrintPersons.length}
          onConfirmSuccess={confirmPrintedSuccess}
          onConfirmFailed={confirmPrintedFailed}
          onDismiss={cancelPrintConfirm}
        />
      )}

      {showPrePrintReview && (
        <PrePrintReviewModal
          isOpen={showPrePrintReview}
          onClose={() => setShowPrePrintReview(false)}
          onConfirmStart={handleStartPrintSession}
          sessionId={prePrintReviewSessionId}
          template={template}
          printOrder={printOrder}
          orderedPersons={prePrintOrderedPersons}
          statusMap={studentStatusMap}
          operator="Admin"
        />
      )}

      {showLiveQueueModal && (
        <LivePrintQueueModal
          isOpen={showLiveQueueModal}
          onClose={() => setShowLiveQueueModal(false)}
          session={activeSession}
          isPrinting={isSessionPrinting}
          onRetryFailed={handleRetryFailedSessionItems}
          onConfirmComplete={() => {
            setShowLiveQueueModal(false)
            load()
          }}
        />
      )}

      {showInterruptedModal && (
        <InterruptedSessionModal
          isOpen={showInterruptedModal}
          onClose={() => setShowInterruptedModal(false)}
          session={interruptedSession}
          onContinuePrinting={handleContinueInterruptedSession}
          onCancelRemaining={handleCancelInterruptedSession}
          onViewSessionDetails={(s) => {
            setShowInterruptedModal(false)
            setActiveSession(s)
            setShowLiveQueueModal(true)
          }}
        />
      )}

      {showSessionHistoryModal && (
        <PrintSessionsHistoryModal
          isOpen={showSessionHistoryModal}
          onClose={() => setShowSessionHistoryModal(false)}
          projectId={project.id}
          onSelectSessionForView={(s) => {
            setActiveSession(s)
            setShowLiveQueueModal(true)
          }}
        />
      )}
    </div>
  )
}

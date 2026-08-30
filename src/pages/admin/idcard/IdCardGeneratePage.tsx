import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import {
  Loader2, Printer, Download, Eye, CheckCircle2, XCircle, Settings2,
  ChevronLeft, ChevronRight, X, Scissors, AlertTriangle, RotateCcw, History,
  Sparkles,
} from 'lucide-react'
import { getIdCardPersons, getIdCardTemplates, getIdCardGenerations, markGenerationsAsPrinted } from '../../../lib/idcard/database'
import {
  generateCardsForPersons,
  buildMultiCardSheetPdf,
  buildCalibrationTestPdf,
  renderCardToDataUrl,
  type GenerationProgress,
} from '../../../lib/idcard/generation'
import { validateBatchBeforeGeneration } from '../../../lib/idcard/templateValidation'
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors'
import { sanitizeStudentId } from '../../../lib/idcard/validation'
import { extractTemplateFieldSchema } from '../../../lib/idcard/templateFieldSchema'
import { computeStudentIdCardStatus, validateStudentForIdCard } from '../../../lib/idcard/statusEngine'
import {
  recordPrintSuccess,
  recordPrintFailure,
  getPrintStats,
} from '../../../lib/idcard/printTracker'
import { GenerationProgressBar } from '../../../components/idcard/GenerationProgress'
import { IdCardStatusBadge } from '../../../components/idcard/IdCardStatusBadge'
import { BatchValidationConfirmModal } from '../../../components/idcard/BatchValidationConfirmModal'
import { StudentMissingInfoModal } from '../../../components/idcard/StudentMissingInfoModal'
import { StudentPrintHistoryModal } from '../../../components/idcard/StudentPrintHistoryModal'
import { ReprintRequestModal } from '../../../components/idcard/ReprintRequestModal'
import { Modal, ConfirmModal } from '../../../components/ui/Modal'
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
  StudentIdCardStatusInfo,
} from '../../../lib/idcard/types'

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
// Print Preview (embedded modal)
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

  // Scale down physical paper to fit viewport (display only)
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
      {/* Header Bar */}
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
              className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => scrollToPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            <Download size={14} /> Download PDF
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <Printer size={14} /> Print Now
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Pages Container */}
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

        {/* Live Diagnostics Card at Bottom of Preview */}
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Settings2 size={16} />
          Print Settings
        </span>
        <div className="flex items-center gap-3">
          {layout && (
            <span className="text-xs text-slate-500">
              Paper: <strong className="text-slate-700">{config.paperSize.toUpperCase()}</strong> ({layout.orientation}) · Grid: <strong className="text-slate-700">{layout.columns}×{layout.rows}</strong> · Capacity: <strong className="text-blue-700 font-bold">{layout.cardsPerPage}</strong> cards/sheet · Total: <strong className="text-slate-700">{layout.totalSheets}</strong> sheet{layout.totalSheets !== 1 ? 's' : ''}
            </span>
          )}
          <ChevronRight size={16} className={`text-slate-400 transition ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* Validation error */}
          {!validation.valid && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {validation.error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-3">
              {/* Paper size */}
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

              {/* Paper Orientation */}
              <div>
                <span className="text-[11px] font-medium text-slate-500">Paper Orientation</span>
                <div className="mt-1 flex gap-3">
                  {(['auto', 'portrait', 'landscape'] as const).map((o) => (
                    <label key={o} className="flex items-center gap-1 text-xs text-slate-700">
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

              {/* Card Orientation / Rotation */}
              <div>
                <span className="text-[11px] font-medium text-slate-500">Card Orientation</span>
                <div className="mt-1 flex gap-3">
                  {([
                    { value: 'auto', label: 'Auto (Maximize)' },
                    { value: 'portrait', label: 'Portrait (54 × 85.6)' },
                    { value: 'landscape', label: 'Landscape (85.6 × 54)' },
                  ] as const).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1 text-xs text-slate-700">
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

              {/* Card dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Card Width" value={config.cardWidthMm} onChange={(v) => set('cardWidthMm', v)} min={1} step={0.1} />
                <NumberField label="Card Height" value={config.cardHeightMm} onChange={(v) => set('cardHeightMm', v)} min={1} step={0.1} />
              </div>

              {/* Gaps */}
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Horizontal Gap" value={config.gapHorizontalMm} onChange={(v) => set('gapHorizontalMm', v)} />
                <NumberField label="Vertical Gap" value={config.gapVerticalMm} onChange={(v) => set('gapVerticalMm', v)} />
              </div>

              {/* Margins */}
              <div>
                <span className="text-[11px] font-medium text-slate-500">Margins (mm)</span>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  <NumberField label="Top" value={config.marginTopMm} onChange={(v) => set('marginTopMm', v)} suffix="" />
                  <NumberField label="Bottom" value={config.marginBottomMm} onChange={(v) => set('marginBottomMm', v)} suffix="" />
                  <NumberField label="Left" value={config.marginLeftMm} onChange={(v) => set('marginLeftMm', v)} suffix="" />
                  <NumberField label="Right" value={config.marginRightMm} onChange={(v) => set('marginRightMm', v)} suffix="" />
                </div>
              </div>

              {/* Alignment */}
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

            {/* Right column */}
            <div className="space-y-3">
              {/* Print Mode */}
              <div>
                <span className="text-[11px] font-medium text-slate-500">Print Mode</span>
                <div className="mt-1 space-y-1.5">
                  {([
                    { value: 'front-only', label: 'Front only (Single-sided cards)' },
                    { value: 'duplex', label: 'Duplex (Alternating Front / Back pages)' },
                    { value: 'side-by-side', label: 'Side by Side (Front & Back adjacent on same sheet)' },
                  ] as const).map(({ value, label }) => {
                    const disabled = !isDoubleSided && value !== 'front-only'
                    return (
                      <label key={value} className={`flex items-center gap-2 text-xs ${disabled ? 'opacity-40' : 'text-slate-700'}`}>
                        <input
                          type="radio"
                          name="printMode"
                          value={value}
                          checked={config.printMode === value}
                          disabled={disabled}
                          onChange={() => set('printMode', value as PrintMode)}
                          className="h-3.5 w-3.5"
                        />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Duplex Flip */}
              {config.printMode === 'duplex' && (
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Duplex Flip Edge</span>
                  <div className="mt-1 flex gap-3">
                    {([
                      { value: 'long-edge', label: 'Long Edge (Standard)' },
                      { value: 'short-edge', label: 'Short Edge (Top Bound)' },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-1 text-xs text-slate-700">
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

              {/* Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.showCutGuides}
                    onChange={(e) => set('showCutGuides', e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Show dashed cutting guides around each card
                </label>
              </div>

              {/* Summary info */}
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
// Main Page Component
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

  // Modals for batch validation, duplicate warnings, history, and reprints
  const [batchModalConfig, setBatchModalConfig] = useState<{
    isOpen: boolean;
    mode: 'generate' | 'print';
    readyPersons: IdCardPerson[];
    skippedPersons: Array<{ person: IdCardPerson; reason: string }>;
  } | null>(null);

  const [selectedPersonForMissing, setSelectedPersonForMissing] = useState<IdCardPerson | null>(null);
  const [selectedPersonForHistory, setSelectedPersonForHistory] = useState<IdCardPerson | null>(null);
  const [selectedPersonForReprint, setSelectedPersonForReprint] = useState<IdCardPerson | null>(null);
  const [duplicateWarningPerson, setDuplicateWarningPerson] = useState<IdCardPerson | null>(null);

  const imageCacheRef = useRef(new CardImageCache())
  const isMountedRef = useRef(true)

  // Print config — load from localStorage or defaults
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

  // Persist config on change
  useEffect(() => {
    try {
      savePrintConfig(project.id, printConfig)
    } catch (e) {
      console.error('Failed to save print config', e)
    }
  }, [printConfig, project.id])

  // Double-sided detection from template
  const isDoubleSided = Boolean(template?.layout?.isDoubleSided && template?.layout?.back)
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
        getIdCardPersons(project.id, { pageSize: 500 }),
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

  // ── Selection ─────────────────────────────────────
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(persons.map((p) => p.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  // ── Helpers ───────────────────────────────────────
  function latestGenerationFor(personId: string): IdCardGeneration | undefined {
    return generations.find((g) => g.person_id === personId)
  }

  // Status mapping for all students
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

  const selectedPersons = useMemo(() => persons.filter((p) => selected.has(p.id)), [persons, selected])
  const actionTargets = selectedPersons.length > 0 ? selectedPersons : persons

  // Build card inputs for layout calculation
  const cardInputs: CardInput[] = useMemo(() => {
    return actionTargets.map((p) => ({
      personId: p.id,
      hasBack: isDoubleSided,
    }))
  }, [actionTargets, isDoubleSided])

  // Compute layout using single authoritative engine
  const validation = validatePrintConfig(effectiveConfig)
  const layout = useMemo(() => {
    if (!validation.valid) return null
    return calculatePrintLayout(effectiveConfig, cardInputs)
  }, [effectiveConfig, cardInputs, validation.valid])

  // ── Prepare Card Images (Front + Back) ─────────────
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
          // 1. Render actual FRONT face
          const frontUrl = await renderCardToDataUrl(
            person,
            template!,
            project.name,
            project.academic_year,
            'front'
          )
          map.set(`${person.id}:front`, frontUrl)

          // 2. Render actual BACK face
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

  // ── Print Calibration Test Sheet ───────────────────
  function handlePrintCalibration() {
    try {
      const paperW = layout?.paperWidthMm || (effectiveConfig.paperSize === 'a3' ? 297 : effectiveConfig.paperSize === 'a5' ? 148 : 210);
      const paperH = layout?.paperHeightMm || (effectiveConfig.paperSize === 'a3' ? 420 : effectiveConfig.paperSize === 'a5' ? 210 : 297);
      const pdfBlob = buildCalibrationTestPdf(
        paperW,
        paperH,
        template?.card_width_mm || 85.6,
        template?.card_height_mm || 54.0
      );
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Calibration_Test_Sheet_${effectiveConfig.paperSize.toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate calibration test sheet.');
    }
  }

  // ── Safe Batch Generation Handler ─────────────────
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

  // ── Safe Batch Print Handler ──────────────────────
  function handleRequestPrint(targets: IdCardPerson[]) {
    if (!layout || !template || cardImages.size === 0) return

    const printable: IdCardPerson[] = []
    const skipped: Array<{ person: IdCardPerson; reason: string }> = []

    for (const p of targets) {
      const statusInfo = studentStatusMap.get(p.id)
      const gen = latestGenerationFor(p.id)

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

    // If single target was already printed, trigger duplicate warning modal
    if (targets.length === 1 && printable.length === 0 && skipped[0]?.reason.includes('Already printed')) {
      setDuplicateWarningPerson(targets[0])
      return
    }

    if (skipped.length > 0) {
      setBatchModalConfig({
        isOpen: true,
        mode: 'print',
        readyPersons: printable,
        skippedPersons: skipped,
      })
      return
    }

    executePrint(printable)
  }

  // ── Print (Browser) ───────────────────────────────
  function executePrint(targetsToPrint: IdCardPerson[]) {
    if (!layout || !template || targetsToPrint.length === 0) return

    const targetIds = new Set(targetsToPrint.map((p) => p.id))
    const printableGenIds: string[] = []
    for (const p of targetsToPrint) {
      const gen = latestGenerationFor(p.id)
      if (gen) printableGenIds.push(gen.id)
    }

    const orientationStr = layout.orientation
    const paperW = layout.paperWidthMm
    const paperH = layout.paperHeightMm
    const paperSizeName = effectiveConfig.paperSize.toUpperCase()

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
        pagesHtml += `<div class="print-sheet" style="position:relative; width:${paperW}mm; height:${paperH}mm; page-break-after:always; break-after:page; overflow:hidden; background:#fff;">${cardsHtml}</div>`
      }
    }

    if (!pagesHtml.trim()) {
      alert('No valid images found to print for the selected students.')
      return
    }

    const html = `<!DOCTYPE html>
<html><head><title>Print ID Cards - ${project.name}</title>
<style>
  @page {
    size: ${paperSizeName} ${orientationStr};
    margin: 0mm;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-sheet {
    position: relative;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .print-sheet:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  img {
    display: block;
  }
</style>
</head>
<body>${pagesHtml}</body></html>`

    const win = window.open('', '_blank')
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
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
      if (printableGenIds.length > 0) {
        setPendingPrintGenIds(printableGenIds)
        setPendingPrintPersons(targetsToPrint)
        setShowPrintConfirm(true)
      }
    }

    if (total === 0) {
      win.close()
      alert('No valid card renders found to print.')
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

  // ── Print confirmation: Success & Failure Handling ──
  async function confirmPrintedSuccess() {
    try {
      await markGenerationsAsPrinted(pendingPrintGenIds)
      for (const p of pendingPrintPersons) {
        const gen = latestGenerationFor(p.id)
        recordPrintSuccess(project.id, p, gen?.id, template?.name)
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
    for (const p of pendingPrintPersons) {
      const gen = latestGenerationFor(p.id)
      recordPrintFailure(project.id, p, 'User flagged print operation as failed / misprinted.', gen?.id)
    }
    setShowPrintConfirm(false)
    setPendingPrintGenIds([])
    setPendingPrintPersons([])
    load()
  }

  function cancelPrintConfirm() {
    setShowPrintConfirm(false)
    setPendingPrintGenIds([])
    setPendingPrintPersons([])
  }

  // ── PDF download ──────────────────────────────────
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

  // ── Render ────────────────────────────────────────
  if (state.kind === 'loading') {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading card studio...
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        Unable to load generation data: {state.message}
      </div>
    )
  }

  if (!template) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-slate-400">
        Set up a template before generating cards.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleRequestGenerate(selectedPersons)}
          disabled={generating || selectedPersons.length === 0}
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          Generate Selected ({selectedPersons.length})
        </button>
        <button
          onClick={() => handleRequestGenerate(persons)}
          disabled={generating || persons.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          <Sparkles size={14} /> Generate All Ready Cards ({persons.length})
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          onClick={() => setShowPreview(true)}
          disabled={!validation.valid || loadingImages || cardImages.size === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          <Eye size={14} /> {loadingImages ? 'Preparing...' : 'Preview'}
        </button>
        <button
          onClick={() => handleRequestPrint(actionTargets)}
          disabled={!validation.valid || loadingImages || cardImages.size === 0}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          <Printer size={14} /> Print All Ready Cards
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={buildingPdf || !validation.valid || loadingImages || cardImages.size === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          <Download size={14} /> {buildingPdf ? 'Building PDF...' : 'Download PDF'}
        </button>

        {templates.length > 1 && (
          <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <label className="text-xs font-semibold text-slate-600">Template:</label>
            <select
              value={template.id}
              onChange={(e) => {
                const found = templates.find((t) => t.id === e.target.value);
                if (found) setTemplate(found);
              }}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.card_width_mm}×{t.card_height_mm}mm) {t.id === project.template_id ? '★ Active' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          onClick={handlePrintCalibration}
          title="Print physical measurement test page with 10mm rulers and duplex alignment boxes"
          className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer shadow-2xs"
        >
          <Scissors size={14} /> Print Calibration Test
        </button>
      </div>

      {/* Actual Size 100% Print Notice */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span>
          💡 <strong>Printing Standard:</strong> Print Scale: <strong>100% (Actual Size)</strong> · Fit to Page: <strong>OFF</strong> to guarantee physical mm accuracy.
        </span>
      </div>

      {/* Generation progress */}
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

      {/* Selection controls */}
      <div className="flex items-center gap-3">
        <button onClick={selectAll} className="text-xs font-medium text-blue-600 hover:underline">
          Select All ({persons.length})
        </button>
        <button onClick={deselectAll} className="text-xs font-medium text-slate-500 hover:underline">
          Deselect All
        </button>
        {selected.size > 0 && (
          <span className="text-xs text-slate-500 font-medium">({selected.size} of {persons.length} selected for Print / PDF)</span>
        )}
      </div>

      {/* Students table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-600 border-b border-slate-200 font-semibold">
            <tr>
              <th className="w-9 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.size === persons.length && persons.length > 0}
                  onChange={() => (selected.size === persons.length ? deselectAll() : selectAll())}
                  className="rounded border-slate-300 text-slate-900 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 font-semibold text-slate-800">Student & ID</th>
              <th className="px-3 py-2.5 font-semibold text-slate-700">Readiness & Print Status</th>
              <th className="px-3 py-2.5 font-semibold text-slate-700">Print Stats</th>
              <th className="px-3 py-2.5 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {persons.map((person) => {
              const gen = latestGenerationFor(person.id)
              const statusInfo = studentStatusMap.get(person.id) || computeStudentIdCardStatus({ person, schema: fieldSchema, template, latestGen: gen })

              return (
                <tr key={person.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(person.id)}
                      onChange={() => toggle(person.id)}
                      className="rounded border-slate-300 text-slate-900 cursor-pointer"
                    />
                  </td>

                  {/* Student */}
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {person.photo_url ? (
                          <img src={person.photo_url} alt={person.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-amber-600 font-bold">No Pic</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{person.name}</p>
                        <p className="font-mono text-[10px] text-slate-500">{sanitizeStudentId(person.student_id)}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-2.5">
                    <IdCardStatusBadge
                      statusInfo={statusInfo}
                      onMissingClick={() => setSelectedPersonForMissing(person)}
                      onHistoryClick={() => setSelectedPersonForHistory(person)}
                      onReprintClick={() => setSelectedPersonForReprint(person)}
                    />
                  </td>

                  {/* Print Stats */}
                  <td className="px-3 py-2.5 text-slate-600">
                    {statusInfo.printCount > 0 ? (
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-800">Print Count: {statusInfo.printCount}</span>
                        {statusInfo.lastPrintedAt && (
                          <p className="text-[10px] text-slate-400">
                            Last: {new Date(statusInfo.lastPrintedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Not Printed Yet</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {statusInfo.canGenerate && (
                        <button
                          type="button"
                          onClick={() => executeGeneration([person])}
                          title="Generate card"
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer shadow-2xs"
                        >
                          <Sparkles size={11} /> {gen?.status === 'SUCCESS' ? 'Regen' : 'Generate'}
                        </button>
                      )}

                      {statusInfo.status === 'READY_TO_PRINT' && (
                        <button
                          type="button"
                          onClick={() => executePrint([person])}
                          title="Print ID card"
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-2xs"
                        >
                          <Printer size={11} /> Print
                        </button>
                      )}

                      {statusInfo.status === 'PRINT_FAILED' && (
                        <button
                          type="button"
                          onClick={() => executePrint([person])}
                          title="Retry print"
                          className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-700 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw size={11} /> Retry Print
                        </button>
                      )}

                      {statusInfo.status === 'PRINTED' && (
                        <button
                          type="button"
                          onClick={() => setSelectedPersonForReprint(person)}
                          title="Request card reprint"
                          className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-800 hover:bg-purple-200 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw size={11} /> Reprint
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedPersonForHistory(person)}
                        title="View history"
                        className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                      >
                        <History size={13} />
                      </button>

                      {gen?.status === 'SUCCESS' && gen.file_url && (
                        <a
                          href={gen.file_url}
                          download={`${sanitizeStudentId(person.student_id)}.png`}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="Download high-res PNG"
                        >
                          <Download size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Batch Validation Confirm Modal (For Pre-Generation and Pre-Printing) */}
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

      {/* Duplicate Print Warning Modal */}
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

      {/* Modals for Missing Info, History, and Reprint */}
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

      {/* Print Preview Modal */}
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

      {/* Print Confirmation Dialog */}
      {showPrintConfirm && (
        <PrintConfirmDialog
          count={pendingPrintPersons.length}
          onConfirmSuccess={confirmPrintedSuccess}
          onConfirmFailed={confirmPrintedFailed}
          onDismiss={cancelPrintConfirm}
        />
      )}
    </div>
  )
}

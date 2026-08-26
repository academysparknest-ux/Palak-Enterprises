import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Loader2, Printer, Download, Eye, CheckCircle2, XCircle, Settings2,
  ChevronLeft, ChevronRight, X, Scissors,
} from 'lucide-react'
import { getIdCardPersons, getIdCardTemplates, getIdCardGenerations, markGenerationsAsPrinted } from '../../../lib/idcard/database'
import {
  generateCardsForPersons,
  buildMultiCardSheetPdf,
  renderCardToDataUrl,
  type GenerationProgress,
} from '../../../lib/idcard/generation'
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors'
import { GenerationProgressBar } from '../../../components/idcard/GenerationProgress'
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
import type { IdCardProject, IdCardPerson, IdCardTemplate, IdCardGeneration } from '../../../lib/idcard/types'

type ProjectContext = { project: IdCardProject }
type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }

// ────────────────────────────────────────────────────────────────
// Print confirmation dialog
// ────────────────────────────────────────────────────────────────

function PrintConfirmDialog({
  count,
  onConfirm,
  onCancel,
}: {
  count: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Printer className="text-slate-700" size={22} />
          <h3 className="text-lg font-semibold text-slate-900">Print Complete?</h3>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Did the {count} ID card{count !== 1 ? 's' : ''} print successfully?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={16} />
            Yes, Mark as Printed
          </button>
          <button
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <XCircle size={16} />
            No, Keep Status
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-xs" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
              disabled={currentPage === 0}
              className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
              title="Previous sheet"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Sheet {currentPage + 1} of {totalPages}</span>
            <button
              onClick={() => scrollToPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
              title="Next sheet"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mx-2 h-5 w-px bg-white/20" />
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 shadow-sm"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
          >
            <Download size={14} /> PDF
          </button>
          <button onClick={onClose} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable pages */}
      <div className="flex-1 overflow-y-auto bg-slate-800/60 p-6">
        <div className="mx-auto flex flex-col items-center gap-8">
          {layout.pages.map((page, idx) => (
            <div key={idx} id={`preview-page-${idx}`} className="flex flex-col items-center">
              {/* Page label */}
              <div className="mb-2 flex w-full items-center justify-between text-xs text-slate-300" style={{ width: `${layout.paperWidthMm * screenScale}px` }}>
                <span className="font-semibold text-slate-200">Sheet {idx + 1} of {totalPages}</span>
                <span className="text-slate-400">{page.cards.length} card{page.cards.length !== 1 ? 's' : ''} on this sheet · {config.paperSize.toUpperCase()} {layout.orientation}</span>
              </div>
              {/* Physical paper sheet representation */}
              <div
                className="relative bg-white shadow-2xl transition-all"
                style={{
                  width: `${layout.paperWidthMm * screenScale}px`,
                  height: `${layout.paperHeightMm * screenScale}px`,
                }}
              >
                {/* Cards placed at exact physical millimeter positions */}
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
    </div>
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
  onChange: (v: number) => void
  min?: number
  step?: number
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="mt-0.5 flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          step={step}
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none"
        />
        {suffix && <span className="ml-1 text-[10px] text-slate-400">{suffix}</span>}
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
              {/* Print mode (only for double-sided templates) */}
              {isDoubleSided && (
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Print Mode</span>
                  <div className="mt-1 space-y-1.5">
                    {([
                      { value: 'front-only', label: 'Front Only' },
                      { value: 'front-back-together', label: 'Front + Back Together (Side by Side)' },
                      { value: 'duplex', label: 'Duplex Sheets (Interleaved Pages)' },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-1.5 text-xs text-slate-700">
                        <input
                          type="radio"
                          name="printMode"
                          value={value}
                          checked={config.printMode === value}
                          onChange={() => set('printMode', value as PrintMode)}
                          className="h-3.5 w-3.5"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplex flip */}
              {config.printMode === 'duplex' && (
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Duplex Flip Direction</span>
                  <div className="mt-1 flex gap-3">
                    {([
                      { value: 'long-edge', label: 'Flip on Long Edge' },
                      { value: 'short-edge', label: 'Flip on Short Edge' },
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

              {/* Cut guides */}
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={config.showCutGuides}
                  onChange={(e) => set('showCutGuides', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                  <Scissors size={13} />
                  Show Cutting Guides (Dashed Lines)
                </span>
              </label>

              {/* Calculated diagnostic summary */}
              {layout && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-700">Live Layout Diagnostic</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                    <span className="text-slate-500">Paper:</span>
                    <span className="font-semibold text-slate-900">{config.paperSize.toUpperCase()} {layout.orientation}</span>
                    <span className="text-slate-500">Paper Size:</span>
                    <span className="font-medium">{layout.paperWidthMm} × {layout.paperHeightMm} mm</span>
                    <span className="text-slate-500">Card:</span>
                    <span className="font-medium">{layout.cardWidthMm} × {layout.cardHeightMm} mm</span>
                    <span className="text-slate-500">Margins (T/B/L/R):</span>
                    <span className="font-medium">{config.marginTopMm}/{config.marginBottomMm}/{config.marginLeftMm}/{config.marginRightMm} mm</span>
                    <span className="text-slate-500">Gap (H/V):</span>
                    <span className="font-medium">{config.gapHorizontalMm} / {config.gapVerticalMm} mm</span>
                    <span className="text-slate-500">Card Orientation:</span>
                    <span className="font-medium">{layout.cardOrientation}</span>
                    <span className="text-slate-500">Columns:</span>
                    <strong className="text-blue-700">{layout.columns}</strong>
                    <span className="text-slate-500">Rows:</span>
                    <strong className="text-blue-700">{layout.rows}</strong>
                    <span className="text-slate-500">Cards / Sheet:</span>
                    <strong className="text-emerald-700 font-bold text-sm">{layout.cardsPerPage}</strong>
                    <span className="text-slate-500">Selected Cards:</span>
                    <span className="font-medium">{selectedCount}</span>
                    <span className="text-slate-500">Total Sheets:</span>
                    <strong className="text-emerald-700 font-bold text-sm">{layout.totalSheets}</strong>
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
// Status badge
// ────────────────────────────────────────────────────────────────

function StatusBadge({ status, printedAt }: { status?: 'PENDING' | 'SUCCESS' | 'FAILED'; printedAt?: string | null }) {
  if (!status) return <span className="text-xs text-slate-400">Not generated</span>
  if (status === 'SUCCESS' && printedAt) {
    return <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">PRINTED</span>
  }
  const styles = {
    PENDING: 'bg-slate-100 text-slate-600',
    SUCCESS: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{status}</span>
}

// ────────────────────────────────────────────────────────────────
// Main generate page
// ────────────────────────────────────────────────────────────────

export default function IdCardGeneratePage() {
  const { project } = useOutletContext<ProjectContext>()
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [persons, setPersons] = useState<IdCardPerson[]>([])
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
  const [cardImages, setCardImages] = useState<Map<string, string>>(new Map())
  const [loadingImages, setLoadingImages] = useState(false)

  const imageCacheRef = useRef(new CardImageCache())

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
    savePrintConfig(project.id, printConfig)
  }, [printConfig, project.id])

  // Double-sided detection from template
  const isDoubleSided = Boolean(template?.layout?.isDoubleSided && template?.layout?.back)
  const effectiveConfig = useMemo(() => {
    if (!isDoubleSided && printConfig.printMode !== 'front-only') {
      return { ...printConfig, printMode: 'front-only' as PrintMode }
    }
    return printConfig
  }, [printConfig, isDoubleSided])

  // ── Data loading ──────────────────────────────────
  async function load() {
    setState({ kind: 'loading' })
    try {
      const [personsResult, templates, gens] = await Promise.all([
        getIdCardPersons(project.id, { pageSize: 500 }),
        getIdCardTemplates(project.id),
        getIdCardGenerations(project.id),
      ])
      setPersons(personsResult.data)
      setTemplate(templates.find((t) => t.id === project.template_id) ?? templates[0] ?? null)
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
  }, [project.id])

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
  // Loads and caches high-res canvas renders of both front and back
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

          // 2. Render actual BACK face (if template has back, or placeholder if missing)
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

  // ── Generation ────────────────────────────────────
  async function handleGenerate(targets: IdCardPerson[]) {
    if (!template || targets.length === 0) return
    setGenerating(true)
    setProgress({ total: targets.length, completed: 0, succeeded: 0, failed: 0 })
    try {
      await generateCardsForPersons(targets, template, project.id, project.name, project.academic_year, setProgress)
    } finally {
      setGenerating(false)
      imageCacheRef.current.clear()
      const gens = await getIdCardGenerations(project.id)
      setGenerations(gens)
    }
  }

  // ── Print (Browser) ───────────────────────────────
  function handlePrint() {
    if (!layout || !template || cardImages.size === 0) return

    const printableGenIds: string[] = []
    for (const p of actionTargets) {
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
      pagesHtml += `<div class="print-sheet" style="position:relative; width:${paperW}mm; height:${paperH}mm; page-break-after:always; break-after:page; overflow:hidden; background:#fff;">${cardsHtml}</div>`
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
        setShowPrintConfirm(true)
      }
    }

    if (total === 0) {
      onAllLoaded()
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

  // ── Print confirmation ────────────────────────────
  async function confirmPrinted() {
    try {
      await markGenerationsAsPrinted(pendingPrintGenIds)
      const gens = await getIdCardGenerations(project.id)
      setGenerations(gens)
    } catch {
      alert('Failed to update print status. Please try again.')
    } finally {
      setShowPrintConfirm(false)
      setPendingPrintGenIds([])
    }
  }

  function cancelPrintConfirm() {
    setShowPrintConfirm(false)
    setPendingPrintGenIds([])
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
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading...
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
          onClick={() => handleGenerate(selectedPersons)}
          disabled={generating || selectedPersons.length === 0}
          className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          Generate Selected ({selectedPersons.length})
        </button>
        <button
          onClick={() => handleGenerate(persons)}
          disabled={generating || persons.length === 0}
          className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Generate All ({persons.length})
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          onClick={() => setShowPreview(true)}
          disabled={!validation.valid || loadingImages || cardImages.size === 0}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          <Eye size={15} /> {loadingImages ? 'Preparing...' : 'Preview'}
        </button>
        <button
          onClick={handlePrint}
          disabled={!validation.valid || loadingImages || cardImages.size === 0}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          <Printer size={15} /> Print
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={buildingPdf || !validation.valid || loadingImages || cardImages.size === 0}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          <Download size={15} /> {buildingPdf ? 'Building PDF...' : 'Download PDF'}
        </button>
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
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.size === persons.length && persons.length > 0}
                  onChange={() => (selected.size === persons.length ? deselectAll() : selectAll())}
                />
              </th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Student ID</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {persons.map((person) => {
              const gen = latestGenerationFor(person.id)
              return (
                <tr key={person.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(person.id)} onChange={() => toggle(person.id)} />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{person.name}</td>
                  <td className="px-3 py-2 text-slate-600">{person.student_id}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={gen?.status} printedAt={gen?.printed_at} />
                  </td>
                  <td className="px-3 py-2">
                    {gen?.status === 'SUCCESS' && gen.file_url && (
                      <a
                        href={gen.file_url}
                        download={`${person.student_id}.png`}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                    {gen?.status === 'FAILED' && <span className="text-xs text-red-500">{gen.error_message}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Print Preview Modal */}
      {showPreview && layout && (
        <PrintPreviewModal
          layout={layout}
          cardImages={cardImages}
          config={effectiveConfig}
          selectedCount={actionTargets.length}
          onClose={() => setShowPreview(false)}
          onPrint={() => { setShowPreview(false); handlePrint() }}
          onDownloadPdf={() => { setShowPreview(false); handleDownloadPdf() }}
        />
      )}

      {/* Print Confirmation Dialog */}
      {showPrintConfirm && (
        <PrintConfirmDialog
          count={pendingPrintGenIds.length}
          onConfirm={confirmPrinted}
          onCancel={cancelPrintConfirm}
        />
      )}
    </div>
  )
}

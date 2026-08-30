import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Upload,
  Grid,
  Magnet,
  Type,
  QrCode as QrIcon,
  Barcode as BarcodeIcon,
  User as UserIcon,
  Bookmark,
  LayoutTemplate,
  Building2,
  Image as ImageIcon,
  Sliders,
  RotateCcw,
  Sparkles,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  MoveVertical,
  ArrowUpDown,
  Columns,
  Rows,
} from 'lucide-react';
import {
  FIELD_LABELS,
  TEMPLATE_PRESETS,
  formatFieldDisplay,
  getCustomDefaultTemplate,
  saveCustomDefaultTemplate,
  clearCustomDefaultTemplate,
  getDefaultTemplateLayout,
  getDefaultCardDimensions,
  type TemplatePreset,
  type CustomDefaultTemplate,
} from '../../lib/idcard/templatePresets';
import type {
  TemplateField,
  TemplateFieldKey,
  TemplateLayout,
  TemplateSideLayout,
  IdCardTemplate,
} from '../../lib/idcard/types';

// ============================================================
// CONSTANTS & TYPES
// ============================================================

export const DEFAULT_CARD_WIDTH = 54.0;
export const DEFAULT_CARD_HEIGHT = 85.6;

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = TEMPLATE_PRESETS[0].layout;

const IMAGE_FIELDS: TemplateFieldKey[] = ['school_logo', 'student_photo', 'barcode', 'qr_code'];

const FONT_FAMILIES = [
  { value: "'Times New Roman', serif", label: 'Times New Roman (Default)' },
  { value: "'Inter', sans-serif", label: 'Inter (Sans)' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: 'sans-serif', label: 'System Sans' },
  { value: 'serif', label: 'System Serif' },
];

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface HistoryEntry {
  layout: TemplateLayout;
  widthMm: number;
  heightMm: number;
}

export interface GapGuide {
  fromY: number; // mm
  toY: number;   // mm
  x: number;     // mm
  gapMm: number; // exact gap in mm
  isEqual?: boolean;
  label?: string;
}

export interface AlignmentLine {
  type: 'x' | 'y';
  pos: number;
  min: number;
  max: number;
  label?: string;
}

export interface ActiveGuidesState {
  x: number | null;
  y: number | null;
  alignmentLines?: AlignmentLine[];
  gapAbove?: GapGuide | null;
  gapBelow?: GapGuide | null;
  equalGaps?: GapGuide[];
}

// ============================================================
// TEMPLATE EDITOR COMPONENT
// ============================================================

export function TemplateEditor({
  layout,
  onChange,
  widthMm,
  heightMm,
  onDimensionsChange,
  savedTemplates = [],
  onSelectSavedTemplate,
  schoolLogoUrl,
  schoolName,
}: {
  layout: TemplateLayout;
  onChange: (layout: TemplateLayout) => void;
  widthMm: number;
  heightMm: number;
  onDimensionsChange?: (w: number, h: number) => void;
  savedTemplates?: IdCardTemplate[];
  onSelectSavedTemplate?: (template: IdCardTemplate) => void;
  schoolLogoUrl?: string | null;
  schoolName?: string;
}) {
  const effectiveSchoolLogo = schoolLogoUrl || layout.schoolLogoUrl || null;
  // ── State ──────────────────────────────────────────────────
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100); // 50 to 200%
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showSmartGuides, setShowSmartGuides] = useState<boolean>(true);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(false);
  const gridSizeMm = 0.5; // 0.5 mm grid
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [presetTab, setPresetTab] = useState<'saved' | 'presets'>(
    savedTemplates.length > 0 ? 'saved' : 'presets'
  );
  const [showBgFilters, setShowBgFilters] = useState<boolean>(false);
  const [customDefault, setCustomDefault] = useState<CustomDefaultTemplate | null>(() => getCustomDefaultTemplate());
  const [savedDefaultSuccess, setSavedDefaultSuccess] = useState(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<HistoryEntry[]>([
    { layout: structuredClone(layout), widthMm, heightMm },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isInternalHistoryUpdate = useRef(false);

  // Dragging & Resizing interaction state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialFieldProps, setInitialFieldProps] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Smart Guide lines & In-between Vertical Gaps currently active
  const [activeGuides, setActiveGuides] = useState<ActiveGuidesState>({
    x: null,
    y: null,
    alignmentLines: [],
    gapAbove: null,
    gapBelow: null,
    equalGaps: [],
  });

  // Base scale calculation: 100% zoom = 4.2 pixels per mm
  const pxPerMm = (4.2 * zoom) / 100;

  const isDoubleSided = Boolean(
    layout.isDoubleSided || layout.templateType === 'double' || layout.back
  );

  // Ensure every field has a unique id
  useEffect(() => {
    let modified = false;
    const ensureIds = (fields: TemplateField[]) =>
      fields.map((f, i) => {
        if (!f.id) {
          modified = true;
          return { ...f, id: `field-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` };
        }
        return f;
      });

    const frontFieldsWithIds = ensureIds(layout.fields || []);
    const backFieldsWithIds = layout.back ? ensureIds(layout.back.fields || []) : undefined;

    if (modified) {
      onChange({
        ...layout,
        fields: frontFieldsWithIds,
        back: layout.back ? { ...layout.back, fields: backFieldsWithIds || [] } : undefined,
      });
    }
  }, [layout, onChange]);

  // Current side fields and configuration
  const activeFields = currentSide === 'front' ? layout.fields || [] : layout.back?.fields || [];
  const activeBgColor =
    currentSide === 'front'
      ? layout.backgroundColor || '#FFFFFF'
      : layout.back?.backgroundColor || layout.backgroundColor || '#FFFFFF';
  const activeBgImage =
    currentSide === 'front'
      ? layout.backgroundUrl || null
      : layout.back?.backgroundUrl || null;

  // Keyboard shortcut helper: Alt + Enter for new lines in text editing
  const handleAltEnterKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    updateFn: (newVal: string) => void
  ) => {
    if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const val = target.value;
      const nextVal = val.slice(0, start) + '\n' + val.slice(end);
      updateFn(nextVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1;
      }, 0);
    }
  };
  const activeBgFit =
    currentSide === 'front'
      ? layout.backgroundFit || 'fill'
      : layout.back?.backgroundFit || 'fill';
  const activeBgOpacity =
    currentSide === 'front'
      ? (layout.backgroundOpacity ?? 100)
      : (layout.back?.backgroundOpacity ?? 100);
  const activeBgScale =
    currentSide === 'front'
      ? (layout.backgroundScale ?? 100)
      : (layout.back?.backgroundScale ?? 100);
  const activeBgOffsetX =
    currentSide === 'front'
      ? (layout.backgroundOffsetX ?? 0)
      : (layout.back?.backgroundOffsetX ?? 0);
  const activeBgOffsetY =
    currentSide === 'front'
      ? (layout.backgroundOffsetY ?? 0)
      : (layout.back?.backgroundOffsetY ?? 0);
  const activeBgBlur =
    currentSide === 'front'
      ? (layout.backgroundBlur ?? 0)
      : (layout.back?.backgroundBlur ?? 0);
  const activeBgBrightness =
    currentSide === 'front'
      ? (layout.backgroundBrightness ?? 100)
      : (layout.back?.backgroundBrightness ?? 100);
  const activeBgContrast =
    currentSide === 'front'
      ? (layout.backgroundContrast ?? 100)
      : (layout.back?.backgroundContrast ?? 100);
  const activeHeaderSvg =
    currentSide === 'front' ? layout.headerSvg : layout.back?.headerSvg || null;
  const activeFooterSvg =
    currentSide === 'front' ? layout.footerSvg : layout.back?.footerSvg || null;

  // Function to update background adjustments for active side
  function updateActiveBackground(updates: Partial<TemplateSideLayout>) {
    if (currentSide === 'front') {
      const nextLayout: TemplateLayout = {
        ...layout,
        ...updates,
      };
      onChange(nextLayout);
      pushHistory(nextLayout);
    } else {
      const currentBack = layout.back || { backgroundColor: '#FFFFFF', fields: [] };
      const nextLayout: TemplateLayout = {
        ...layout,
        back: {
          ...currentBack,
          ...updates,
        },
      };
      onChange(nextLayout);
      pushHistory(nextLayout);
    }
  }

  // Selected Field object
  const selectedField = activeFields.find((f) => f.id === selectedFieldId) || null;

  // ── History Management (Undo / Redo) ───────────────────────
  const pushHistory = useCallback(
    (newLayout: TemplateLayout, newW: number = widthMm, newH: number = heightMm) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, { layout: structuredClone(newLayout), widthMm: newW, heightMm: newH }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex, widthMm, heightMm]
  );

  function handleUndo() {
    if (historyIndex > 0) {
      isInternalHistoryUpdate.current = true;
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange(structuredClone(target.layout));
      onDimensionsChange?.(target.widthMm, target.heightMm);
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      isInternalHistoryUpdate.current = true;
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChange(structuredClone(target.layout));
      onDimensionsChange?.(target.widthMm, target.heightMm);
    }
  }

  // ── Layout Update Wrappers ─────────────────────────────────
  function updateActiveFields(newFields: TemplateField[], pushToHistory = true) {
    let nextLayout: TemplateLayout;
    if (currentSide === 'front') {
      nextLayout = { ...layout, fields: newFields };
    } else {
      const currentBack = layout.back || { backgroundColor: '#FFFFFF', fields: [] };
      const backLayout: TemplateSideLayout = {
        ...currentBack,
        backgroundColor: currentBack.backgroundColor || layout.backgroundColor || '#FFFFFF',
        fields: newFields,
      };
      nextLayout = { ...layout, back: backLayout };
    }

    onChange(nextLayout);
    if (pushToHistory) pushHistory(nextLayout);
  }

  function updateSelectedField(patch: Partial<TemplateField>, pushToHistory = true) {
    if (!selectedFieldId) return;
    const newFields = activeFields.map((f) =>
      f.id === selectedFieldId ? { ...f, ...patch } : f
    );
    updateActiveFields(newFields, pushToHistory);
  }

  // Detail / body fields (excluding images and fixed header/footer blocks)
  const isDetailField = (f: TemplateField) => {
    return (
      f.visible !== false &&
      !IMAGE_FIELDS.includes(f.key) &&
      f.key !== 'school_name' &&
      f.key !== 'school_subtitle' &&
      f.key !== 'terms'
    );
  };

  // ── Canvas Position Alignment for Selected Element ─────────
  const alignSelectedFieldToCanvas = (
    horizontal?: 'left' | 'center' | 'right',
    vertical?: 'top' | 'center' | 'bottom'
  ) => {
    if (!selectedField) return;
    const patch: Partial<TemplateField> = {};
    if (horizontal === 'left') {
      patch.x = 2.0; // Standard 2mm safe card margin
    } else if (horizontal === 'center') {
      patch.x = Number(((widthMm - selectedField.width) / 2).toFixed(2));
    } else if (horizontal === 'right') {
      patch.x = Number(Math.max(0, widthMm - selectedField.width - 2.0).toFixed(2));
    }

    if (vertical === 'top') {
      patch.y = 2.0; // Standard 2mm top margin
    } else if (vertical === 'center') {
      patch.y = Number(((heightMm - selectedField.height) / 2).toFixed(2));
    } else if (vertical === 'bottom') {
      patch.y = Number(Math.max(0, heightMm - selectedField.height - 2.0).toFixed(2));
    }

    updateSelectedField(patch);
  };

  // ── Vertical Gap & Spacing Helpers ─────────────────────────
  const getFieldGapInfo = useCallback(
    (fieldId: string | null) => {
      if (!fieldId) return { above: null, below: null };
      const current = activeFields.find((f) => f.id === fieldId);
      if (!current) return { above: null, below: null };

      const otherVisible = activeFields.filter(
        (f) => f.id !== fieldId && f.visible !== false
      );

      // Prioritize elements with horizontal overlap / column alignment
      const isColumnMatch = (f: TemplateField) => {
        const overlap =
          Math.min(current.x + current.width, f.x + f.width) -
          Math.max(current.x, f.x);
        return overlap > -2; // overlapping or close horizontal column
      };

      const columnOthers = otherVisible.filter(isColumnMatch);
      const candidates = columnOthers.length > 0 ? columnOthers : otherVisible;

      // Closest element above
      const aboveElems = candidates
        .filter((f) => f.y + f.height <= current.y + 0.5)
        .sort((a, b) => b.y + b.height - (a.y + a.height));
      const aboveElem = aboveElems[0] || null;

      // Closest element below
      const belowElems = candidates
        .filter((f) => f.y >= current.y + current.height - 0.5)
        .sort((a, b) => a.y - b.y);
      const belowElem = belowElems[0] || null;

      const gapAbove = aboveElem
        ? Number((current.y - (aboveElem.y + aboveElem.height)).toFixed(2))
        : null;
      const gapBelow = belowElem
        ? Number((belowElem.y - (current.y + current.height)).toFixed(2))
        : null;

      return {
        above: aboveElem ? { field: aboveElem, gapMm: gapAbove! } : null,
        below: belowElem ? { field: belowElem, gapMm: gapBelow! } : null,
      };
    },
    [activeFields]
  );

  const setGapToAbove = (targetGapMm: number) => {
    if (!selectedField) return;
    const { above } = getFieldGapInfo(selectedField.id || null);
    if (!above) return;
    const rawY = above.field.y + above.field.height + targetGapMm;
    const newY = Math.max(0, Math.min(heightMm - selectedField.height, Number(rawY.toFixed(2))));
    updateSelectedField({ y: newY });
  };

  const setGapToBelow = (targetGapMm: number) => {
    if (!selectedField) return;
    const { below } = getFieldGapInfo(selectedField.id || null);
    if (!below) return;
    const rawY = below.field.y - selectedField.height - targetGapMm;
    const newY = Math.max(0, Math.min(heightMm - selectedField.height, Number(rawY.toFixed(2))));
    updateSelectedField({ y: newY });
  };

  const equalizeInBetweenGap = () => {
    if (!selectedField) return;
    const { above, below } = getFieldGapInfo(selectedField.id || null);
    if (!above || !below) return;
    const targetY = (above.field.y + above.field.height + (below.field.y - selectedField.height)) / 2;
    const newY = Math.max(0, Math.min(heightMm - selectedField.height, Number(targetY.toFixed(2))));
    updateSelectedField({ y: newY });
  };

  // Evenly distribute detail fields vertically
  const distributeDetailFieldsVertically = () => {
    const detailFields = activeFields
      .filter(isDetailField)
      .sort((a, b) => a.y - b.y);

    if (detailFields.length < 3) return;

    const topField = detailFields[0];
    const bottomField = detailFields[detailFields.length - 1];

    const totalHeightOfElements = detailFields.reduce((sum, f) => sum + f.height, 0);
    const totalSpan = bottomField.y + bottomField.height - topField.y;
    const totalGapSpace = totalSpan - totalHeightOfElements;
    const uniformGap = Math.max(0.5, totalGapSpace / (detailFields.length - 1));

    let currentY = topField.y;
    const updatedMap = new Map<string, number>();

    for (let i = 0; i < detailFields.length; i++) {
      const f = detailFields[i];
      if (i === 0) {
        updatedMap.set(f.id!, f.y);
        currentY += f.height + uniformGap;
      } else if (i === detailFields.length - 1) {
        updatedMap.set(f.id!, bottomField.y);
      } else {
        updatedMap.set(f.id!, Number(currentY.toFixed(2)));
        currentY += f.height + uniformGap;
      }
    }

    const newFields = activeFields.map((f) =>
      updatedMap.has(f.id!) ? { ...f, y: updatedMap.get(f.id!)! } : f
    );
    updateActiveFields(newFields, true);
  };

  // Set uniform gap between successive detail fields
  const applyUniformVerticalGap = (gapMm: number) => {
    const detailFields = activeFields
      .filter(isDetailField)
      .sort((a, b) => a.y - b.y);

    if (detailFields.length < 2) return;

    let currentY = detailFields[0].y;
    const updatedMap = new Map<string, number>();

    for (let i = 0; i < detailFields.length; i++) {
      const f = detailFields[i];
      if (i === 0) {
        updatedMap.set(f.id!, f.y);
        currentY += f.height + gapMm;
      } else {
        const nextY = Math.min(heightMm - f.height, Number(currentY.toFixed(2)));
        updatedMap.set(f.id!, nextY);
        currentY += f.height + gapMm;
      }
    }

    const newFields = activeFields.map((f) =>
      updatedMap.has(f.id!) ? { ...f, y: updatedMap.get(f.id!)! } : f
    );
    updateActiveFields(newFields, true);
  };

  // Align detail fields horizontally
  const alignDetailFields = (alignment: 'left' | 'center' | 'right') => {
    const detailFields = activeFields.filter(isDetailField);
    if (detailFields.length === 0) return;

    if (alignment === 'left') {
      const targetX = selectedField ? selectedField.x : Math.min(...detailFields.map((f) => f.x));
      const newFields = activeFields.map((f) => {
        if (detailFields.some((df) => df.id === f.id)) {
          return { ...f, x: targetX };
        }
        return f;
      });
      updateActiveFields(newFields, true);
    } else if (alignment === 'right') {
      const targetRight = selectedField
        ? selectedField.x + selectedField.width
        : Math.max(...detailFields.map((f) => f.x + f.width));
      const newFields = activeFields.map((f) => {
        if (detailFields.some((df) => df.id === f.id)) {
          return { ...f, x: Number((targetRight - f.width).toFixed(2)) };
        }
        return f;
      });
      updateActiveFields(newFields, true);
    } else if (alignment === 'center') {
      const targetCenter = selectedField
        ? selectedField.x + selectedField.width / 2
        : widthMm / 2;
      const newFields = activeFields.map((f) => {
        if (detailFields.some((df) => df.id === f.id)) {
          return { ...f, x: Number((targetCenter - f.width / 2).toFixed(2)) };
        }
        return f;
      });
      updateActiveFields(newFields, true);
    }
  };

  function renderGapGuide(gap: GapGuide, key: string) {
    if (gap.gapMm < 0.2 || gap.fromY >= gap.toY) return null;
    const topPx = gap.fromY * pxPerMm;
    const heightPx = (gap.toY - gap.fromY) * pxPerMm;
    const leftPx = gap.x * pxPerMm;

    return (
      <div
        key={key}
        className="pointer-events-none absolute z-40"
        style={{ left: leftPx, top: topPx, height: heightPx }}
      >
        {/* Top Horizontal T-Tick */}
        <div
          className={`absolute -top-[1px] -left-1.5 w-3 border-t-2 ${
            gap.isEqual ? 'border-emerald-500' : 'border-rose-500'
          }`}
        />

        {/* Vertical Connecting Line */}
        <div
          className={`absolute top-0 bottom-0 left-0 border-l-2 ${
            gap.isEqual
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-rose-500 bg-rose-500/10'
          }`}
        />

        {/* Bottom Horizontal T-Tick */}
        <div
          className={`absolute -bottom-[1px] -left-1.5 w-3 border-b-2 ${
            gap.isEqual ? 'border-emerald-500' : 'border-rose-500'
          }`}
        />

        {/* Gap Distance Badge */}
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-mono font-bold shadow-md ring-1 ring-white/90"
          style={{
            backgroundColor: gap.isEqual ? '#059669' : '#e11d48',
            color: '#ffffff',
          }}
        >
          <span>↕ {gap.gapMm.toFixed(1)} mm</span>
          {gap.isEqual && (
            <span className="rounded bg-white/20 px-1 text-[8px] tracking-tight">EQUAL</span>
          )}
        </div>
      </div>
    );
  }

  // ── Side & Double-Sided Toggles ────────────────────────────
  function setTemplateType(type: 'single' | 'double') {
    if (type === 'double') {
      const defaultBack: TemplateSideLayout = layout.back || {
        backgroundColor: '#FFFFFF',
        fields: [
          {
            id: `field-back-${Date.now()}-1`,
            key: 'student_id',
            x: 4,
            y: 10,
            width: 46,
            height: 3.5,
            fontSize: 7,
            fontWeight: 'bold',
            color: '#1B2A4A',
            visible: true,
            labelPrefix: 'ID:',
          },
          {
            id: `field-back-${Date.now()}-2`,
            key: 'qr_code',
            x: 20,
            y: 35,
            width: 14,
            height: 14,
            visible: true,
          },
          {
            id: `field-back-${Date.now()}-3`,
            key: 'valid_till',
            x: 3,
            y: 60,
            width: 48,
            height: 3.5,
            fontSize: 7,
            fontWeight: 'bold',
            color: '#E74C3C',
            textAlign: 'center',
            visible: true,
            labelPrefix: 'VALID TILL:',
            customText: '30-MAY-26',
          },
        ],
      };
      const nextLayout: TemplateLayout = {
        ...layout,
        isDoubleSided: true,
        templateType: 'double',
        back: defaultBack,
      };
      onChange(nextLayout);
      pushHistory(nextLayout);
    } else {
      const nextLayout: TemplateLayout = {
        ...layout,
        isDoubleSided: false,
        templateType: 'single',
      };
      onChange(nextLayout);
      pushHistory(nextLayout);
      setCurrentSide('front');
    }
  }

  // ── Background Image Upload & Aspect Ratio Check ───────────
  function handleBackgroundUpload(file: File, side: 'front' | 'back') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      if (side === 'front') {
        const nextLayout: TemplateLayout = {
          ...layout,
          backgroundUrl: dataUrl,
          backgroundFit: 'fill',
          headerSvg: null,
          footerSvg: null,
          headerGradientColors: null,
          footerGradientColors: null,
        };
        onChange(nextLayout);
        pushHistory(nextLayout);
      } else {
        const nextBack: TemplateSideLayout = {
          ...(layout.back || { backgroundColor: '#FFFFFF', fields: [] }),
          backgroundUrl: dataUrl,
          backgroundFit: 'fill',
          headerSvg: null,
          footerSvg: null,
          headerGradientColors: null,
          footerGradientColors: null,
        };
        const nextLayout: TemplateLayout = {
          ...layout,
          back: nextBack,
        };
        onChange(nextLayout);
        pushHistory(nextLayout);
      }
    };
    reader.readAsDataURL(file);
  }

  function removeBackground(side: 'front' | 'back') {
    if (side === 'front') {
      const nextLayout: TemplateLayout = {
        ...layout,
        backgroundUrl: null,
      };
      onChange(nextLayout);
      pushHistory(nextLayout);
    } else if (layout.back) {
      const nextLayout: TemplateLayout = {
        ...layout,
        back: { ...layout.back, backgroundUrl: null },
      };
      onChange(nextLayout);
      pushHistory(nextLayout);
    }
  }

  // ── Element Actions (Add, Duplicate, Lock, Delete) ─────────
  function addField(key: TemplateFieldKey = 'custom_text', options?: Partial<TemplateField>) {
    const isLogo = key === 'school_logo';
    const isImg = IMAGE_FIELDS.includes(key);
    const isMultiLine = key === 'address' || key === 'terms';
    const isBarcode = key === 'barcode';
    const isPhoto = key === 'student_photo';

    const defaultW = isBarcode
      ? Math.min(widthMm - 10, 35.0)
      : isPhoto
      ? 22.0
      : isLogo
      ? 14.0
      : isImg
      ? 16.0
      : Math.min(widthMm - 10, 40.0);

    const defaultH = isBarcode
      ? 7.0
      : isPhoto
      ? 26.0
      : isLogo
      ? 14.0
      : isImg
      ? 16.0
      : isMultiLine
      ? 10.0
      : 4.5;

    // Determine default source
    const defaultSource: TemplateField['source'] =
      isBarcode || key === 'qr_code'
        ? 'system'
        : [
            'student_name',
            'student_id',
            'student_photo',
            'class',
            'section',
            'roll_number',
            'date_of_birth',
            'blood_group',
            'father_name',
            'mother_name',
            'phone',
            'emergency_no',
            'address',
          ].includes(key)
        ? 'dynamic'
        : 'static';

    const newField: TemplateField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key,
      label: options?.label || FIELD_LABELS[key] || key,
      source: options?.source || defaultSource,
      x: 5.0,
      y: Math.min(heightMm - 10, Math.max(5.0, activeFields.length * 4 + 5)),
      width: defaultW,
      height: defaultH,
      fontSize: key === 'school_name' ? 10.0 : key === 'school_subtitle' ? 6.5 : 8.0,
      fontFamily: "'Times New Roman', serif",
      fontWeight: key === 'school_name' ? 'bold' : 'normal',
      color: '#1B2A4A',
      textAlign: key === 'school_name' || key === 'school_subtitle' ? 'center' : 'left',
      photoFit: isLogo ? 'contain' : isPhoto ? 'cover' : undefined,
      photoShape: isLogo ? 'rectangle' : isPhoto ? 'circle' : undefined,
      borderRadius: isLogo ? 0 : undefined,
      borderWidth: isLogo ? 0 : undefined,
      visible: true,
      locked: false,
      overflowStrategy: 'wrap',
      customText:
        options?.customText !== undefined
          ? options.customText
          : key === 'school_logo'
          ? effectiveSchoolLogo || undefined
          : key === 'school_name'
          ? (schoolName || 'SPARKNEST ACADEMY')
          : key === 'school_subtitle'
          ? 'Affiliated to CBSE, New Delhi'
          : key === 'custom_text'
          ? 'Custom Text'
          : key === 'terms'
          ? 'If found, please return to school office. Card is property of institution.'
          : key === 'emergency_no'
          ? '+91 9876543210'
          : key === 'valid_till'
          ? '31-03-2027'
          : undefined,
      ...options,
    };

    const newFields = [...activeFields, newField];
    updateActiveFields(newFields);
    setSelectedFieldId(newField.id || null);
  }

  function duplicateSelectedField() {
    if (!selectedField) return;
    const duplicated: TemplateField = {
      ...structuredClone(selectedField),
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: Math.min(widthMm - selectedField.width, selectedField.x + 2.0),
      y: Math.min(heightMm - selectedField.height, selectedField.y + 2.0),
      locked: false,
    };
    const newFields = [...activeFields, duplicated];
    updateActiveFields(newFields);
    setSelectedFieldId(duplicated.id || null);
  }

  function deleteSelectedField() {
    if (!selectedFieldId) return;
    const newFields = activeFields.filter((f) => f.id !== selectedFieldId);
    updateActiveFields(newFields);
    setSelectedFieldId(null);
  }

  function toggleLockSelectedField() {
    if (!selectedField) return;
    updateSelectedField({ locked: !selectedField.locked });
  }

  // ── Snapping & Alignment Helpers ───────────────────────────
  function applySnap(valMm: number, stepMm: number = gridSizeMm): number {
    if (!snapToGrid) return Number(valMm.toFixed(2));
    return Number((Math.round(valMm / stepMm) * stepMm).toFixed(2));
  }

  // ── Keyboard Arrow Precision Positioning ───────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Shortcuts when no input is focused
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea') {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!selectedField || selectedField.locked) return;

      // Duplicate: Ctrl + D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedField();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedField();
        return;
      }

      // Arrow movement: Arrow = 0.10 mm, Shift + Arrow = 1.00 mm
      const step = e.shiftKey ? 1.0 : 0.1;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();

      const nextX = Math.max(0, Math.min(widthMm - selectedField.width, selectedField.x + dx));
      const nextY = Math.max(0, Math.min(heightMm - selectedField.height, selectedField.y + dy));

      updateSelectedField({
        x: Number(nextX.toFixed(2)),
        y: Number(nextY.toFixed(2)),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedField, widthMm, heightMm, historyIndex, history]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Mouse Drag & Resize Handlers ───────────────────────────
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).getAttribute('data-element-id') === null) {
      setSelectedFieldId(null);
    }
  }

  function handleElementMouseDown(e: React.MouseEvent, field: TemplateField) {
    e.stopPropagation();
    setSelectedFieldId(field.id || null);

    if (field.locked) return;

    setIsDragging(true);
    setActiveHandle(null);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialFieldProps({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    });
  }

  function handleResizeMouseDown(e: React.MouseEvent, handle: ResizeHandle, field: TemplateField) {
    e.stopPropagation();
    if (field.locked) return;

    setIsDragging(true);
    setActiveHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialFieldProps({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    });
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartPos || !initialFieldProps || !selectedField) return;

      const deltaXScreen = e.clientX - dragStartPos.x;
      const deltaYScreen = e.clientY - dragStartPos.y;

      const deltaXMm = deltaXScreen / pxPerMm;
      const deltaYMm = deltaYScreen / pxPerMm;

      let nextX = initialFieldProps.x;
      let nextY = initialFieldProps.y;
      let nextW = initialFieldProps.width;
      let nextH = initialFieldProps.height;

      if (!activeHandle) {
        // Dragging position
        let rawX = initialFieldProps.x + deltaXMm;
        let rawY = initialFieldProps.y + deltaYMm;

        // Grid Snapping
        rawX = applySnap(rawX);
        rawY = applySnap(rawY);

        let guideX: number | null = null;
        let guideY: number | null = null;
        let gapAboveGuide: GapGuide | null = null;
        let gapBelowGuide: GapGuide | null = null;
        const alignLines: AlignmentLine[] = [];
        const equalGapsList: GapGuide[] = [];

        if (showSmartGuides) {
          const snapThreshold = 0.65; // mm

          // Other visible fields on the canvas (excluding current)
          const otherFields = activeFields.filter(
            (f) => f.id !== selectedField.id && f.visible !== false
          );

          // 1. Card Center Snapping
          const cardCenterX = widthMm / 2;
          const cardCenterY = heightMm / 2;
          const elemCenterX = rawX + nextW / 2;
          const elemCenterY = rawY + nextH / 2;

          if (Math.abs(elemCenterX - cardCenterX) < snapThreshold) {
            rawX = Number((cardCenterX - nextW / 2).toFixed(2));
            guideX = cardCenterX;
          }
          if (Math.abs(elemCenterY - cardCenterY) < snapThreshold) {
            rawY = Number((cardCenterY - nextH / 2).toFixed(2));
            guideY = cardCenterY;
          }

          // 2. Element-to-Element Edge & Center Snapping (X & Y Axis)
          for (const other of otherFields) {
            const otherCenterX = other.x + other.width / 2;
            const curCenterX = rawX + nextW / 2;

            // Left to Left
            if (Math.abs(rawX - other.x) < snapThreshold) {
              rawX = other.x;
              alignLines.push({
                type: 'x',
                pos: other.x,
                min: Math.min(rawY, other.y),
                max: Math.max(rawY + nextH, other.y + other.height),
                label: 'Left',
              });
            }
            // Center to Center
            else if (Math.abs(curCenterX - otherCenterX) < snapThreshold) {
              rawX = Number((otherCenterX - nextW / 2).toFixed(2));
              alignLines.push({
                type: 'x',
                pos: otherCenterX,
                min: Math.min(rawY, other.y),
                max: Math.max(rawY + nextH, other.y + other.height),
                label: 'Center',
              });
            }
            // Right to Right
            else if (Math.abs(rawX + nextW - (other.x + other.width)) < snapThreshold) {
              rawX = Number((other.x + other.width - nextW).toFixed(2));
              alignLines.push({
                type: 'x',
                pos: other.x + other.width,
                min: Math.min(rawY, other.y),
                max: Math.max(rawY + nextH, other.y + other.height),
                label: 'Right',
              });
            }

            // Top to Top
            if (Math.abs(rawY - other.y) < snapThreshold) {
              rawY = other.y;
              alignLines.push({
                type: 'y',
                pos: other.y,
                min: Math.min(rawX, other.x),
                max: Math.max(rawX + nextW, other.x + other.width),
                label: 'Top',
              });
            }
            // Bottom to Bottom
            else if (Math.abs(rawY + nextH - (other.y + other.height)) < snapThreshold) {
              rawY = Number((other.y + other.height - nextH).toFixed(2));
              alignLines.push({
                type: 'y',
                pos: other.y + other.height,
                min: Math.min(rawX, other.x),
                max: Math.max(rawX + nextW, other.x + other.width),
                label: 'Bottom',
              });
            }
          }

          // 3. IN-BETWEEN VERTICAL GAP & SPACING CALCULATIONS
          const elementsAbove = otherFields
            .filter((f) => f.y + f.height <= rawY + 1.0)
            .sort((a, b) => b.y + b.height - (a.y + a.height));
          const aboveElem = elementsAbove[0] || null;
          const aboveAboveElem = elementsAbove[1] || null;

          const elementsBelow = otherFields
            .filter((f) => f.y >= rawY + nextH - 1.0)
            .sort((a, b) => a.y - b.y);
          const belowElem = elementsBelow[0] || null;
          const belowBelowElem = elementsBelow[1] || null;

          let isEqualGapSnapped = false;

          // A. Equal Spacing between aboveElem and belowElem:
          if (aboveElem && belowElem) {
            const availableSpace = belowElem.y - (aboveElem.y + aboveElem.height) - nextH;
            if (availableSpace >= 0) {
              const equalGap = availableSpace / 2;
              const targetY = aboveElem.y + aboveElem.height + equalGap;
              if (Math.abs(rawY - targetY) < snapThreshold * 1.2) {
                rawY = Number(targetY.toFixed(2));
                isEqualGapSnapped = true;
              }
            }
          }

          // B. Match spacing to the gap above (if aboveAboveElem exists):
          if (!isEqualGapSnapped && aboveElem && aboveAboveElem) {
            const refGap = aboveElem.y - (aboveAboveElem.y + aboveAboveElem.height);
            if (refGap > 0.5) {
              const targetY = aboveElem.y + aboveElem.height + refGap;
              if (Math.abs(rawY - targetY) < snapThreshold * 1.2) {
                rawY = Number(targetY.toFixed(2));
                isEqualGapSnapped = true;
                equalGapsList.push({
                  fromY: aboveAboveElem.y + aboveAboveElem.height,
                  toY: aboveElem.y,
                  x: Math.min(aboveElem.x + aboveElem.width / 2, aboveAboveElem.x + aboveAboveElem.width / 2),
                  gapMm: Number(refGap.toFixed(1)),
                  isEqual: true,
                  label: `${refGap.toFixed(1)} mm`,
                });
              }
            }
          }

          // C. Match spacing to the gap below (if belowBelowElem exists):
          if (!isEqualGapSnapped && belowElem && belowBelowElem) {
            const refGap = belowBelowElem.y - (belowElem.y + belowElem.height);
            if (refGap > 0.5) {
              const targetY = belowElem.y - nextH - refGap;
              if (Math.abs(rawY - targetY) < snapThreshold * 1.2) {
                rawY = Number(targetY.toFixed(2));
                isEqualGapSnapped = true;
                equalGapsList.push({
                  fromY: belowElem.y + belowElem.height,
                  toY: belowBelowElem.y,
                  x: Math.min(belowElem.x + belowElem.width / 2, belowBelowElem.x + belowBelowElem.width / 2),
                  gapMm: Number(refGap.toFixed(1)),
                  isEqual: true,
                  label: `${refGap.toFixed(1)} mm`,
                });
              }
            }
          }

          // Build Gap Guide Objects
          if (aboveElem) {
            const curGapAbove = rawY - (aboveElem.y + aboveElem.height);
            if (curGapAbove >= 0 && curGapAbove <= 40) {
              gapAboveGuide = {
                fromY: aboveElem.y + aboveElem.height,
                toY: rawY,
                x: Math.max(
                  Math.min(rawX + nextW / 2, aboveElem.x + aboveElem.width / 2),
                  Math.min(rawX, aboveElem.x) + 4
                ),
                gapMm: Number(curGapAbove.toFixed(1)),
                isEqual: isEqualGapSnapped,
                label: FIELD_LABELS[aboveElem.key] || aboveElem.key,
              };
            }
          }

          if (belowElem) {
            const curGapBelow = belowElem.y - (rawY + nextH);
            if (curGapBelow >= 0 && curGapBelow <= 40) {
              gapBelowGuide = {
                fromY: rawY + nextH,
                toY: belowElem.y,
                x: Math.max(
                  Math.min(rawX + nextW / 2, belowElem.x + belowElem.width / 2),
                  Math.min(rawX, belowElem.x) + 4
                ),
                gapMm: Number(curGapBelow.toFixed(1)),
                isEqual: isEqualGapSnapped,
                label: FIELD_LABELS[belowElem.key] || belowElem.key,
              };
            }
          }
        }

        setActiveGuides({
          x: guideX,
          y: guideY,
          alignmentLines: alignLines,
          gapAbove: gapAboveGuide,
          gapBelow: gapBelowGuide,
          equalGaps: equalGapsList,
        });

        nextX = Math.max(0, Math.min(widthMm - nextW, rawX));
        nextY = Math.max(0, Math.min(heightMm - nextH, rawY));

        updateSelectedField({ x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) }, false);
      } else {
        // Resizing with handle
        const minSize = 2.0;
        const isShiftPressed = Boolean(e.shiftKey || lockAspectRatio);
        const initialW = initialFieldProps.width;
        const initialH = initialFieldProps.height;
        const initialRatio = initialW / (initialH || 1);

        if (isShiftPressed) {
          // PROPORTIONAL / LOCKED ASPECT RATIO RESIZE (Preserve image / element ratio)
          if (activeHandle === 'se') {
            const change = Math.abs(deltaXMm) > Math.abs(deltaYMm) ? deltaXMm : deltaYMm * initialRatio;
            let proposedW = Math.max(minSize, initialW + change);
            let proposedH = proposedW / initialRatio;
            if (nextX + proposedW > widthMm) {
              proposedW = widthMm - nextX;
              proposedH = proposedW / initialRatio;
            }
            if (nextY + proposedH > heightMm) {
              proposedH = heightMm - nextY;
              proposedW = proposedH * initialRatio;
            }
            nextW = Math.max(minSize, proposedW);
            nextH = Math.max(minSize, proposedH);
          } else if (activeHandle === 'sw') {
            const change = Math.abs(-deltaXMm) > Math.abs(deltaYMm) ? -deltaXMm : deltaYMm * initialRatio;
            let proposedW = Math.max(minSize, initialW + change);
            let proposedH = proposedW / initialRatio;
            let proposedX = initialFieldProps.x + (initialW - proposedW);
            if (proposedX < 0) {
              proposedW = initialFieldProps.x + initialW;
              proposedH = proposedW / initialRatio;
              proposedX = 0;
            }
            if (nextY + proposedH > heightMm) {
              proposedH = heightMm - nextY;
              proposedW = proposedH * initialRatio;
              proposedX = initialFieldProps.x + (initialW - proposedW);
            }
            nextX = Math.max(0, proposedX);
            nextW = Math.max(minSize, proposedW);
            nextH = Math.max(minSize, proposedH);
          } else if (activeHandle === 'ne') {
            const change = Math.abs(deltaXMm) > Math.abs(-deltaYMm) ? deltaXMm : -deltaYMm * initialRatio;
            let proposedW = Math.max(minSize, initialW + change);
            let proposedH = proposedW / initialRatio;
            let proposedY = initialFieldProps.y + (initialH - proposedH);
            if (nextX + proposedW > widthMm) {
              proposedW = widthMm - nextX;
              proposedH = proposedW / initialRatio;
              proposedY = initialFieldProps.y + (initialH - proposedH);
            }
            if (proposedY < 0) {
              proposedH = initialFieldProps.y + initialH;
              proposedW = proposedH * initialRatio;
              proposedY = 0;
            }
            nextY = Math.max(0, proposedY);
            nextW = Math.max(minSize, proposedW);
            nextH = Math.max(minSize, proposedH);
          } else if (activeHandle === 'nw') {
            const change = Math.abs(-deltaXMm) > Math.abs(-deltaYMm) ? -deltaXMm : -deltaYMm * initialRatio;
            let proposedW = Math.max(minSize, initialW + change);
            let proposedH = proposedW / initialRatio;
            let proposedX = initialFieldProps.x + (initialW - proposedW);
            let proposedY = initialFieldProps.y + (initialH - proposedH);
            if (proposedX < 0) {
              proposedW = initialFieldProps.x + initialW;
              proposedH = proposedW / initialRatio;
              proposedX = 0;
              proposedY = initialFieldProps.y + (initialH - proposedH);
            }
            if (proposedY < 0) {
              proposedH = initialFieldProps.y + initialH;
              proposedW = proposedH * initialRatio;
              proposedY = 0;
              proposedX = initialFieldProps.x + (initialW - proposedW);
            }
            nextX = Math.max(0, proposedX);
            nextY = Math.max(0, proposedY);
            nextW = Math.max(minSize, proposedW);
            nextH = Math.max(minSize, proposedH);
          } else if (activeHandle === 'e' || activeHandle === 'w') {
            const rawDeltaW = activeHandle === 'e' ? deltaXMm : -deltaXMm;
            let proposedW = Math.max(minSize, initialW + rawDeltaW);
            let proposedH = proposedW / initialRatio;
            let proposedX = activeHandle === 'w' ? initialFieldProps.x + (initialW - proposedW) : initialFieldProps.x;
            let proposedY = initialFieldProps.y + (initialH - proposedH) / 2;
            if (proposedX < 0) proposedX = 0;
            if (proposedY < 0) proposedY = 0;
            if (proposedX + proposedW > widthMm) { proposedW = widthMm - proposedX; proposedH = proposedW / initialRatio; }
            if (proposedY + proposedH > heightMm) { proposedH = heightMm - proposedY; proposedW = proposedH * initialRatio; }
            nextX = Math.max(0, proposedX);
            nextY = Math.max(0, proposedY);
            nextW = Math.max(minSize, proposedW);
            nextH = Math.max(minSize, proposedH);
          } else if (activeHandle === 's' || activeHandle === 'n') {
            const rawDeltaH = activeHandle === 's' ? deltaYMm : -deltaYMm;
            let proposedH = Math.max(minSize, initialH + rawDeltaH);
            let proposedW = proposedH * initialRatio;
            let proposedY = activeHandle === 'n' ? initialFieldProps.y + (initialH - proposedH) : initialFieldProps.y;
            let proposedX = initialFieldProps.x + (initialW - proposedW) / 2;
            if (proposedX < 0) proposedX = 0;
            if (proposedY < 0) proposedY = 0;
            if (proposedX + proposedW > widthMm) { proposedW = widthMm - proposedX; proposedH = proposedW / initialRatio; }
            if (proposedY + proposedH > heightMm) { proposedH = heightMm - proposedY; proposedW = proposedH * initialRatio; }
            nextX = Math.max(0, proposedX);
            nextY = Math.max(0, proposedY);
            nextW = Math.max(minSize, proposedW);
            nextH = Math.max(minSize, proposedH);
          }
        } else {
          // Free / Unconstrained resize (Snapping applied)
          if (activeHandle.includes('e')) {
            nextW = Math.max(minSize, applySnap(initialFieldProps.width + deltaXMm));
            nextW = Math.min(widthMm - nextX, nextW);
          }
          if (activeHandle.includes('s')) {
            nextH = Math.max(minSize, applySnap(initialFieldProps.height + deltaYMm));
            nextH = Math.min(heightMm - nextY, nextH);
          }
          if (activeHandle.includes('w')) {
            const proposedW = Math.max(minSize, applySnap(initialFieldProps.width - deltaXMm));
            const proposedX = initialFieldProps.x + (initialFieldProps.width - proposedW);
            if (proposedX >= 0) {
              nextX = proposedX;
              nextW = proposedW;
            }
          }
          if (activeHandle.includes('n')) {
            const proposedH = Math.max(minSize, applySnap(initialFieldProps.height - deltaYMm));
            const proposedY = initialFieldProps.y + (initialFieldProps.height - proposedH);
            if (proposedY >= 0) {
              nextY = proposedY;
              nextH = proposedH;
            }
          }
        }

        updateSelectedField(
          {
            x: Number(nextX.toFixed(2)),
            y: Number(nextY.toFixed(2)),
            width: Number(nextW.toFixed(2)),
            height: Number(nextH.toFixed(2)),
          },
          false
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDragging, dragStartPos, initialFieldProps, selectedField, pxPerMm, snapToGrid, showSmartGuides, lockAspectRatio, widthMm, heightMm]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setActiveHandle(null);
      setDragStartPos(null);
      setInitialFieldProps(null);
      setActiveGuides({
        x: null,
        y: null,
        alignmentLines: [],
        gapAbove: null,
        gapBelow: null,
        equalGaps: [],
      });
      // Push history state at completion of mouse gesture
      pushHistory(layout);
    }
  }, [isDragging, pushHistory, layout]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Apply preset template
  function applyPreset(preset: TemplatePreset) {
    onChange(structuredClone(preset.layout));
    onDimensionsChange?.(preset.cardWidthMm, preset.cardHeightMm);
    setShowPresets(false);
    setSelectedFieldId(null);
    setCurrentSide('front');
    pushHistory(preset.layout, preset.cardWidthMm, preset.cardHeightMm);
  }

  // Apply saved template
  function applySavedTemplate(saved: IdCardTemplate) {
    if (onSelectSavedTemplate) {
      onSelectSavedTemplate(saved);
    } else {
      onChange(structuredClone(saved.layout));
      onDimensionsChange?.(saved.card_width_mm, saved.card_height_mm);
      pushHistory(saved.layout, saved.card_width_mm, saved.card_height_mm);
    }
    setShowPresets(false);
    setSelectedFieldId(null);
    setCurrentSide('front');
  }

  // Save current design as global default for new templates
  function handleSaveCurrentAsDefault() {
    saveCustomDefaultTemplate(layout, widthMm, heightMm);
    setCustomDefault(getCustomDefaultTemplate());
    setSavedDefaultSuccess(true);
    setTimeout(() => setSavedDefaultSuccess(false), 3500);
  }

  // Apply custom default template
  function handleApplyCustomDefault() {
    const def = getCustomDefaultTemplate();
    if (def) {
      onChange(structuredClone(def.layout));
      onDimensionsChange?.(def.cardWidthMm, def.cardHeightMm);
      setShowPresets(false);
      setSelectedFieldId(null);
      setCurrentSide('front');
      pushHistory(def.layout, def.cardWidthMm, def.cardHeightMm);
    }
  }

  // Clear custom default template (reset back to system standard)
  function handleClearCustomDefault() {
    clearCustomDefaultTemplate();
    setCustomDefault(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top Toolbar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Template Type & Side Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTemplateType('single')}
              className={`rounded-md px-3 py-1.5 transition ${
                !isDoubleSided
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Side
            </button>
            <button
              type="button"
              onClick={() => setTemplateType('double')}
              className={`rounded-md px-3 py-1.5 transition ${
                isDoubleSided
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Double Side (Dual)
            </button>
          </div>

          {isDoubleSided && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setCurrentSide('front');
                  setSelectedFieldId(null);
                }}
                className={`rounded px-3 py-1.5 transition ${
                  currentSide === 'front'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentSide('back');
                  setSelectedFieldId(null);
                }}
                className={`rounded px-3 py-1.5 transition ${
                  currentSide === 'back'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Back Side
              </button>
            </div>
          )}
        </div>

        {/* Undo / Redo & Zoom & Snap Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* History */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Undo (Ctrl+Z)"
              className="rounded p-1.5 text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 cursor-pointer"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="rounded p-1.5 text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 cursor-pointer"
            >
              <Redo2 size={15} />
            </button>
          </div>

          {/* Grid Snap & Guides */}
          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            title={`Snap to Grid: ${snapToGrid ? 'ON (0.5mm)' : 'OFF'}`}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              snapToGrid
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid size={13} /> Snap ({gridSizeMm}mm)
          </button>

          <button
            type="button"
            onClick={() => setShowSmartGuides(!showSmartGuides)}
            title="Smart Center & Edge Guides"
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              showSmartGuides
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Magnet size={13} /> Guides
          </button>

          {/* Quick Layout & Spacing Tools */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={distributeDetailFieldsVertically}
              title="Evenly distribute vertical gaps across all detail fields"
              className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-white hover:shadow-xs font-medium cursor-pointer"
            >
              <Rows size={12} className="text-blue-600" /> Distribute Details
            </button>
            <button
              type="button"
              onClick={() => alignDetailFields('center')}
              title="Center all detail fields horizontally in card"
              className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-white hover:shadow-xs font-medium cursor-pointer"
            >
              <AlignHorizontalDistributeCenter size={12} className="text-indigo-600" /> Center Details
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              title="Zoom out"
              className="rounded p-1 text-slate-700 hover:bg-white hover:shadow-xs cursor-pointer"
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-11 text-center font-bold text-slate-700">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom(Math.min(250, zoom + 25))}
              title="Zoom in"
              className="rounded p-1 text-slate-700 hover:bg-white hover:shadow-xs cursor-pointer"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              title="Reset Zoom to 100%"
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-white"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Editor Work Area ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Canvas Area */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-100/80 p-8 shadow-inner min-h-[520px] overflow-auto">
          {/* Card Dimensions & Side Tag */}
          <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-600" style={{ width: widthMm * pxPerMm }}>
            <span className="font-semibold text-slate-800">
              {currentSide === 'front' ? 'FRONT SIDE DESIGN' : 'BACK SIDE DESIGN'}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {widthMm.toFixed(1)} × {heightMm.toFixed(1)} mm
            </span>
          </div>

          {/* Precision Physical Card Canvas */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            className="relative select-none rounded-md bg-white shadow-xl transition-all overflow-hidden"
            style={{
              width: widthMm * pxPerMm,
              height: heightMm * pxPerMm,
              backgroundColor: activeBgColor,
            }}
          >
            {/* Background Image Layer with full Adjustments */}
            {activeBgImage && (
              <div
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                style={{
                  backgroundImage: `url(${activeBgImage})`,
                  backgroundSize:
                    activeBgFit === 'fill' ? '100% 100%' : activeBgFit === 'fit' ? 'contain' : 'cover',
                  backgroundPosition: `${50 + activeBgOffsetX}% ${50 + activeBgOffsetY}%`,
                  backgroundRepeat: 'no-repeat',
                  opacity: activeBgOpacity / 100,
                  transform: `scale(${activeBgScale / 100})`,
                  transformOrigin: 'center center',
                  filter: `blur(${activeBgBlur}px) brightness(${activeBgBrightness / 100}) contrast(${activeBgContrast / 100})`,
                }}
              />
            )}

            {/* Locked Background Indicator */}
            {activeBgImage && (
              <div className="pointer-events-none absolute bottom-1 right-1 z-0 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-xs shadow-2xs flex items-center gap-1">
                <span>BG: {activeBgFit}</span>
                {activeBgOpacity < 100 && <span>· {activeBgOpacity}%</span>}
                {activeBgScale !== 100 && <span>· {activeBgScale}% zoom</span>}
              </div>
            )}

            {/* Smart Center Guides */}
            {activeGuides.x !== null && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 border-l border-dashed border-indigo-500"
                style={{ left: activeGuides.x * pxPerMm }}
              />
            )}
            {activeGuides.y !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-30 border-t border-dashed border-indigo-500"
                style={{ top: activeGuides.y * pxPerMm }}
              />
            )}

            {/* Smart Alignment Lines (Edge & Center) */}
            {showSmartGuides &&
              activeGuides.alignmentLines?.map((line, idx) => {
                if (line.type === 'x') {
                  return (
                    <div
                      key={`align-x-${idx}`}
                      className="pointer-events-none absolute z-35 border-l border-dashed border-rose-500"
                      style={{
                        left: line.pos * pxPerMm,
                        top: line.min * pxPerMm,
                        height: Math.max(6, (line.max - line.min) * pxPerMm),
                      }}
                    />
                  );
                }
                return (
                  <div
                    key={`align-y-${idx}`}
                    className="pointer-events-none absolute z-35 border-t border-dashed border-rose-500"
                    style={{
                      top: line.pos * pxPerMm,
                      left: line.min * pxPerMm,
                      width: Math.max(6, (line.max - line.min) * pxPerMm),
                    }}
                  />
                );
              })}

            {/* In-Between Vertical Gap Guides & Distance Badges */}
            {showSmartGuides && (
              <>
                {/* 1. Dragging Gap Guides */}
                {activeGuides.gapAbove && renderGapGuide(activeGuides.gapAbove, 'gap-drag-above')}
                {activeGuides.gapBelow && renderGapGuide(activeGuides.gapBelow, 'gap-drag-below')}
                {activeGuides.equalGaps?.map((eg, idx) =>
                  renderGapGuide(eg, `gap-drag-equal-${idx}`)
                )}

                {/* 2. Idle Selected Field Gap Indicators */}
                {!isDragging && selectedField && (
                  <>
                    {(() => {
                      const gapInfo = getFieldGapInfo(selectedField.id || null);
                      return (
                        <>
                          {gapInfo.above &&
                            renderGapGuide(
                              {
                                fromY: gapInfo.above.field.y + gapInfo.above.field.height,
                                toY: selectedField.y,
                                x: Math.max(
                                  Math.min(
                                    selectedField.x + selectedField.width / 2,
                                    gapInfo.above.field.x + gapInfo.above.field.width / 2
                                  ),
                                  Math.min(selectedField.x, gapInfo.above.field.x) + 4
                                ),
                                gapMm: gapInfo.above.gapMm,
                                label:
                                  FIELD_LABELS[gapInfo.above.field.key] ||
                                  gapInfo.above.field.key,
                              },
                              'idle-gap-above'
                            )}
                          {gapInfo.below &&
                            renderGapGuide(
                              {
                                fromY: selectedField.y + selectedField.height,
                                toY: gapInfo.below.field.y,
                                x: Math.max(
                                  Math.min(
                                    selectedField.x + selectedField.width / 2,
                                    gapInfo.below.field.x + gapInfo.below.field.width / 2
                                  ),
                                  Math.min(selectedField.x, gapInfo.below.field.x) + 4
                                ),
                                gapMm: gapInfo.below.gapMm,
                                label:
                                  FIELD_LABELS[gapInfo.below.field.key] ||
                                  gapInfo.below.field.key,
                              },
                              'idle-gap-below'
                            )}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            {/* SVG Wave Decorations (Preset compatibility) */}
            {activeHeaderSvg && !activeBgImage && (
              <div
                className="pointer-events-none absolute left-0 top-0 w-full z-0"
                style={{ height: 18 * pxPerMm }}
                dangerouslySetInnerHTML={{ __html: activeHeaderSvg }}
              />
            )}
            {activeFooterSvg && !activeBgImage && (
              <div
                className="pointer-events-none absolute bottom-0 left-0 w-full z-0"
                style={{ height: 14 * pxPerMm }}
                dangerouslySetInnerHTML={{ __html: activeFooterSvg }}
              />
            )}

            {/* Dynamic Elements */}
            {activeFields
              .filter((f) => f.visible)
              .map((field) => {
                const isSelected = selectedFieldId === field.id;
                const isImg = IMAGE_FIELDS.includes(field.key);

                const fieldDefaultText =
                  field.key === 'school_name'
                    ? (schoolName || 'SPARKNEST ACADEMY')
                    : field.key === 'school_subtitle'
                    ? 'Affiliated to CBSE, New Delhi'
                    : (FIELD_LABELS[field.key] || field.key);

                const rawText =
                  field.customText !== undefined && field.customText !== ''
                    ? field.customText
                    : fieldDefaultText;

                const displayText = formatFieldDisplay(field.labelPrefix, rawText);

                return (
                  <div
                    key={field.id}
                    data-element-id={field.id}
                    onMouseDown={(e) => handleElementMouseDown(e, field)}
                    className={`group absolute cursor-move transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-1 z-20 shadow-md'
                        : 'hover:ring-1 hover:ring-blue-300 z-10'
                    } ${field.locked ? 'cursor-not-allowed opacity-90' : ''}`}
                    style={{
                      left: field.x * pxPerMm,
                      top: field.y * pxPerMm,
                      width: field.width * pxPerMm,
                      height: field.height * pxPerMm,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Render Image or Text */}
                    {isImg ? (
                      <div
                        className="flex h-full w-full items-center justify-center overflow-hidden"
                        style={{
                          borderRadius:
                            field.key === 'school_logo'
                              ? field.photoShape === 'circle'
                                ? '50%'
                                : field.borderRadius
                                ? `${field.borderRadius}%`
                                : undefined
                              : field.photoShape === 'circle' || (field.borderRadius ?? 0) >= 45
                              ? '50%'
                              : field.borderRadius
                              ? `${field.borderRadius}%`
                              : undefined,
                          border: field.borderWidth
                            ? `${field.borderWidth * (pxPerMm / 3.78)}px solid ${
                                field.borderColor || '#cbd5e1'
                              }`
                            : field.key === 'school_logo'
                            ? undefined
                            : '1px dashed #cbd5e1',
                          backgroundColor:
                            field.key === 'student_photo'
                              ? '#e2e8f0'
                              : field.key === 'school_logo'
                              ? 'transparent'
                              : '#f1f5f9',
                        }}
                      >
                        {field.key === 'school_logo' ? (
                          (() => {
                            const logoSrc = field.customText || effectiveSchoolLogo || null;
                            return logoSrc ? (
                              <img
                                src={logoSrc}
                                alt="School Logo"
                                className={`h-full w-full pointer-events-none ${field.photoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                                style={{ background: 'transparent' }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-amber-600 bg-amber-50/60 h-full w-full border border-dashed border-amber-300 rounded">
                                <Building2 size={Math.max(12, field.height * pxPerMm * 0.4)} />
                                <span className="text-[7.5px] font-bold text-amber-800 uppercase">
                                  Logo
                                </span>
                              </div>
                            );
                          })()
                        ) : field.key === 'student_photo' ? (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <UserIcon size={Math.max(12, field.height * pxPerMm * 0.4)} />
                            <span className="text-[7.5px] font-semibold text-slate-500 uppercase">
                              Photo
                            </span>
                          </div>
                        ) : field.key === 'qr_code' ? (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            <QrIcon size={Math.max(12, field.height * pxPerMm * 0.5)} />
                            <span className="text-[7px] font-bold">QR</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            <BarcodeIcon size={Math.max(12, field.height * pxPerMm * 0.5)} />
                            <span className="text-[7px] font-bold">BARCODE</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="h-full w-full overflow-hidden leading-tight whitespace-pre-line"
                        style={{
                          fontSize: (field.fontSize ?? 10) * (pxPerMm / 2.835),
                          fontWeight:
                            field.fontWeight === 'bold' ? 700 : field.fontWeight || 400,
                          fontStyle: field.fontStyle === 'italic' ? 'italic' : undefined,
                          fontFamily: field.fontFamily || "'Times New Roman', serif",
                          color: field.color ?? '#1B2A4A',
                          textAlign: field.textAlign ?? 'left',
                          lineHeight: field.lineHeight || 1.2,
                        }}
                      >
                        {displayText}
                      </div>
                    )}

                    {/* Resize Handles (8 points) when selected and not locked */}
                    {isSelected && !field.locked && (
                      <>
                        {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map(
                          (handle) => {
                            const handleClasses: Record<ResizeHandle, string> = {
                              nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
                              n: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                              ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
                              e: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize',
                              se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
                              s: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                              sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
                              w: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize',
                            };

                            return (
                              <div
                                key={handle}
                                onMouseDown={(e) => handleResizeMouseDown(e, handle, field)}
                                className={`absolute h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-white shadow-xs z-30 ${handleClasses[handle]}`}
                              />
                            );
                          }
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>

          <p className="mt-4 text-[11px] text-slate-500 font-medium">
            Click to select · Drag to move · <strong>Hold Shift while resizing to preserve aspect ratio</strong> · Arrow keys: 0.1mm · Shift + Arrow: 1.0mm
          </p>
        </div>

        {/* ── Properties & Element Inspector Sidebar ─────────────── */}
        <div className="flex flex-col gap-4 max-h-[720px] overflow-y-auto pr-1">
          {/* Card Dimensions & Background Upload */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Card Dimensions & Background
              </h3>
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                {showPresets ? 'Close Presets' : 'Presets'}
              </button>
            </div>

            {/* Presets and Saved Templates dropdown */}
            {showPresets && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                <div className="flex items-center gap-1 rounded-md bg-slate-200/70 p-0.5 text-[11px] font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setPresetTab('saved')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded transition ${
                      presetTab === 'saved'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bookmark size={11} /> Saved Templates ({savedTemplates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTab('presets')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded transition ${
                      presetTab === 'presets'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutTemplate size={11} /> Standard Presets ({TEMPLATE_PRESETS.length})
                  </button>
                </div>

                {/* Global Custom Default Setting Bar */}
                <div className="pt-1 pb-1 border-b border-slate-200/80">
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsDefault}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 border border-amber-300 py-1.5 px-2 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                    title="Make this exact layout the default whenever you create a new template"
                  >
                    <Star size={12} className="text-amber-600 fill-amber-500" />
                    Set Current as Default for New Templates
                  </button>
                  {savedDefaultSuccess && (
                    <p className="text-[10px] font-semibold text-emerald-700 text-center mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 size={11} /> Saved as your default template!
                    </p>
                  )}
                </div>

                {presetTab === 'saved' && (
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                    {savedTemplates.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400 italic">
                        No saved templates yet for this project. Save your design to see it here!
                      </p>
                    ) : (
                      savedTemplates.map((saved) => (
                        <button
                          key={saved.id}
                          type="button"
                          onClick={() => applySavedTemplate(saved)}
                          className="w-full text-left rounded-md p-2 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 transition group"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900">{saved.name}</p>
                            <span className="text-[10px] font-semibold text-blue-600">Load →</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {saved.card_width_mm} × {saved.card_height_mm} mm · {saved.layout?.isDoubleSided || saved.layout?.back ? 'Both Sides' : 'Single Side'}
                            {saved.layout?.backgroundUrl ? ' · Custom BG' : ''}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {presetTab === 'presets' && (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                    {/* If user has a custom default template saved */}
                    {customDefault && (
                      <div className="rounded-lg border-2 border-amber-300 bg-amber-50/70 p-2 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-amber-600 fill-amber-500" />
                            <p className="text-xs font-bold text-amber-950">My Custom Default Template</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyCustomDefault}
                            className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-700 transition cursor-pointer shadow-2xs"
                          >
                            Apply →
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-amber-900">
                          <span>
                            {customDefault.cardWidthMm} × {customDefault.cardHeightMm} mm · {customDefault.layout?.isDoubleSided || customDefault.layout?.back ? 'Dual-Sided' : 'Single Side'}
                          </span>
                          <button
                            type="button"
                            onClick={handleClearCustomDefault}
                            className="text-amber-700 hover:text-red-700 underline font-medium cursor-pointer"
                            title="Reset to system preset"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}

                    {TEMPLATE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="w-full text-left rounded-md p-2 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 transition group"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900">{preset.name}</p>
                          <span className="text-[10px] font-semibold text-blue-600">Apply →</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {preset.cardWidthMm} × {preset.cardHeightMm} mm · {preset.isDoubleSided ? 'Both Sides' : 'Single Side'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Card Physical Width & Height in mm */}
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-600">
                <span className="font-semibold">Width (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  value={widthMm}
                  onChange={(e) => onDimensionsChange?.(Number(e.target.value), heightMm)}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                />
              </label>
              <label className="block text-xs text-slate-600">
                <span className="font-semibold">Height (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  value={heightMm}
                  onChange={(e) => onDimensionsChange?.(widthMm, Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                />
              </label>
            </div>

            {/* Upload & Adjust Design Background Image */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders size={13} className="text-indigo-600" />
                  {currentSide === 'front' ? 'Front Background Image' : 'Back Background Image'}
                </p>
                {activeBgImage && (
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveBackground({
                        backgroundFit: 'fill',
                        backgroundOpacity: 100,
                        backgroundScale: 100,
                        backgroundOffsetX: 0,
                        backgroundOffsetY: 0,
                        backgroundBlur: 0,
                        backgroundBrightness: 100,
                        backgroundContrast: 100,
                      });
                    }}
                    title="Reset all background adjustments"
                    className="text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                )}
              </div>

              {activeBgImage ? (
                <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5">
                  {/* Thumbnail & Actions */}
                  <div className="flex items-center justify-between gap-2 rounded-md bg-white p-2 border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={activeBgImage}
                        alt="Background preview"
                        className="h-10 w-14 rounded object-cover border border-slate-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">
                          {currentSide === 'front' ? 'Front Side BG' : 'Back Side BG'}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium">Active Background</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded cursor-pointer transition border border-indigo-200/60">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBackgroundUpload(file, currentSide);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeBackground(currentSide)}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded cursor-pointer transition border border-rose-200/60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* 1. Sizing / Fit Mode */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fitting Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => updateActiveBackground({ backgroundFit: 'fill' })}
                        className={`rounded px-1.5 py-1 text-center font-semibold transition cursor-pointer ${
                          activeBgFit === 'fill'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Stretch (Fill)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveBackground({ backgroundFit: 'crop' })}
                        className={`rounded px-1.5 py-1 text-center font-semibold transition cursor-pointer ${
                          activeBgFit === 'crop'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Cover (Crop)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveBackground({ backgroundFit: 'fit' })}
                        className={`rounded px-1.5 py-1 text-center font-semibold transition cursor-pointer ${
                          activeBgFit === 'fit'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Contain (Fit)
                      </button>
                    </div>
                  </div>

                  {/* 2. Opacity / Watermark Control */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 mb-1">
                      <span className="font-bold">Opacity / Watermark</span>
                      <span className="font-mono font-bold text-indigo-700">{activeBgOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={activeBgOpacity}
                      onChange={(e) => updateActiveBackground({ backgroundOpacity: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex items-center gap-1 mt-1">
                      {[100, 75, 50, 20].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateActiveBackground({ backgroundOpacity: val })}
                          className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                            activeBgOpacity === val
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val === 100 ? '100% Solid' : val === 20 ? '20% Watermark' : `${val}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Zoom & Scale */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 mb-1">
                      <span className="font-bold">Zoom & Scale</span>
                      <span className="font-mono font-bold text-indigo-700">{activeBgScale}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="1"
                      value={activeBgScale}
                      onChange={(e) => updateActiveBackground({ backgroundScale: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* 4. Position Offset X & Y */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-700">
                      <span className="font-bold flex items-center gap-1">
                        <Move size={11} className="text-indigo-600" /> Position Alignment
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateActiveBackground({ backgroundOffsetX: 0, backgroundOffsetY: 0 })}
                          className="text-[9.5px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
                        >
                          Center
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveBackground({ backgroundOffsetX: 0, backgroundOffsetY: -25 })}
                          className="text-[9.5px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
                        >
                          Top
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveBackground({ backgroundOffsetX: 0, backgroundOffsetY: 25 })}
                          className="text-[9.5px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
                        >
                          Bottom
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-[10px] text-slate-600">
                        <span>Horiz Offset ({activeBgOffsetX > 0 ? `+${activeBgOffsetX}` : activeBgOffsetX}%)</span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          step="1"
                          value={activeBgOffsetX}
                          onChange={(e) => updateActiveBackground({ backgroundOffsetX: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
                        />
                      </label>
                      <label className="block text-[10px] text-slate-600">
                        <span>Vert Offset ({activeBgOffsetY > 0 ? `+${activeBgOffsetY}` : activeBgOffsetY}%)</span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          step="1"
                          value={activeBgOffsetY}
                          onChange={(e) => updateActiveBackground({ backgroundOffsetY: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 5. Advanced Image Filters (Blur, Brightness, Contrast) */}
                  <div className="border-t border-indigo-100 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBgFilters(!showBgFilters)}
                      className="flex items-center justify-between w-full text-[11px] font-semibold text-indigo-800 hover:text-indigo-950 cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} /> Filters & Effects (Blur, Brightness)
                      </span>
                      <span className="text-[10px]">{showBgFilters ? '▲ Hide' : '▼ Adjust'}</span>
                    </button>

                    {showBgFilters && (
                      <div className="mt-2 space-y-2 rounded-md bg-white p-2 border border-slate-200">
                        {/* Blur */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
                            <span>Blur Effect</span>
                            <span className="font-mono">{activeBgBlur}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={activeBgBlur}
                            onChange={(e) => updateActiveBackground({ backgroundBlur: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        {/* Brightness */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
                            <span>Brightness</span>
                            <span className="font-mono">{activeBgBrightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="150"
                            step="1"
                            value={activeBgBrightness}
                            onChange={(e) => updateActiveBackground({ backgroundBrightness: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        {/* Contrast */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
                            <span>Contrast</span>
                            <span className="font-mono">{activeBgContrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="150"
                            step="1"
                            value={activeBgContrast}
                            onChange={(e) => updateActiveBackground({ backgroundContrast: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-3 hover:bg-slate-100 transition">
                  <Upload size={18} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">
                    Upload {currentSide === 'front' ? 'Front' : 'Back'} Design (PNG/JPG)
                  </span>
                  <span className="text-[10px] text-slate-400">Becomes customizable background image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBackgroundUpload(file, currentSide);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* ── Selected Element Inspector ─────────────────────── */}
          {selectedField ? (
            <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    {FIELD_LABELS[selectedField.key] || selectedField.label || selectedField.key}
                  </span>

                  {/* Field Source Classification Badge */}
                  {(() => {
                    const isSystem = selectedField.key === 'qr_code' || selectedField.key === 'barcode' || selectedField.source === 'system';
                    const isDynamic = selectedField.source === 'dynamic' || (!selectedField.source && (
                      ['student_name', 'student_id', 'student_photo', 'class', 'section', 'roll_number', 'date_of_birth', 'blood_group', 'father_name', 'mother_name', 'phone', 'emergency_no', 'address'].includes(selectedField.key)
                    ));

                    return (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                          isSystem
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : isDynamic
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isSystem ? 'System (Auto)' : isDynamic ? 'Dynamic (Student)' : 'Static (Template)'}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleLockSelectedField}
                    title={selectedField.locked ? 'Unlock element' : 'Lock element'}
                    className={`rounded p-1 ${
                      selectedField.locked
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {selectedField.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={duplicateSelectedField}
                    title="Duplicate element (Ctrl+D)"
                    className="rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedField}
                    title="Delete element"
                    className="rounded p-1 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Classification & Requirement Settings */}
              {selectedField.key !== 'qr_code' && selectedField.key !== 'barcode' && selectedField.key !== 'school_logo' && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-700">Data Source:</label>
                    <select
                      value={selectedField.source || (['student_name', 'student_id', 'student_photo', 'class', 'section', 'roll_number', 'date_of_birth', 'blood_group', 'father_name', 'mother_name', 'phone', 'emergency_no', 'address'].includes(selectedField.key) ? 'dynamic' : 'static')}
                      onChange={(e) => updateSelectedField({ source: e.target.value as any })}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800"
                    >
                      <option value="dynamic">Dynamic (From Student / Excel)</option>
                      <option value="static">Static (Template / Fixed Value)</option>
                    </select>
                  </div>

                  {(selectedField.source === 'dynamic' || ['student_name', 'student_id', 'student_photo', 'class', 'section', 'roll_number', 'date_of_birth', 'blood_group', 'father_name', 'mother_name', 'phone', 'emergency_no', 'address'].includes(selectedField.key)) && (
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.required ?? (selectedField.key === 'student_name' || selectedField.key === 'student_id')}
                        onChange={(e) => updateSelectedField({ required: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Required</span>
                    </label>
                  )}
                </div>
              )}

              {/* Exact Physical Coordinates (X, Y, W, H in mm) */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Physical Position & Size (mm)
                  </p>
                  <button
                    type="button"
                    onClick={() => setLockAspectRatio(!lockAspectRatio)}
                    title={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio (or hold Shift while resizing)'}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                      lockAspectRatio
                        ? 'bg-blue-100 text-blue-800 border border-blue-200 font-bold'
                        : 'text-slate-500 hover:text-slate-800 bg-slate-100'
                    }`}
                  >
                    {lockAspectRatio ? <Lock size={10} className="text-blue-700" /> : <Unlock size={10} />}
                    <span>Ratio Lock</span>
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  <label className="block text-[10px] text-slate-500">
                    <span>X (mm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedField.x}
                      onChange={(e) => updateSelectedField({ x: Number(e.target.value) })}
                      className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-mono"
                    />
                  </label>
                  <label className="block text-[10px] text-slate-500">
                    <span>Y (mm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedField.y}
                      onChange={(e) => updateSelectedField({ y: Number(e.target.value) })}
                      className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-mono"
                    />
                  </label>
                  <label className="block text-[10px] text-slate-500">
                    <span>Width</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedField.width}
                      onChange={(e) => {
                        const newW = Number(e.target.value);
                        if (lockAspectRatio && selectedField.width > 0 && selectedField.height > 0) {
                          const ratio = selectedField.width / selectedField.height;
                          const newH = Number((newW / ratio).toFixed(2));
                          updateSelectedField({ width: newW, height: newH });
                        } else {
                          updateSelectedField({ width: newW });
                        }
                      }}
                      className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-mono"
                    />
                  </label>
                  <label className="block text-[10px] text-slate-500">
                    <span>Height</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedField.height}
                      onChange={(e) => {
                        const newH = Number(e.target.value);
                        if (lockAspectRatio && selectedField.height > 0 && selectedField.width > 0) {
                          const ratio = selectedField.width / selectedField.height;
                          const newW = Number((newH * ratio).toFixed(2));
                          updateSelectedField({ width: newW, height: newH });
                        } else {
                          updateSelectedField({ height: newH });
                        }
                      }}
                      className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-mono"
                    />
                  </label>
                </div>
              </div>

              {/* Canvas Position Alignment (Align Element to Card Canvas) */}
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Canvas Position Alignment
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">Card Bounds</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Horizontal Canvas Align */}
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => alignSelectedFieldToCanvas('left')}
                      title="Align to Left (2mm margin)"
                      className="flex-1 flex items-center justify-center gap-1 rounded py-1 text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-xs transition cursor-pointer"
                    >
                      <AlignHorizontalJustifyStart size={11} /> Left
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedFieldToCanvas('center')}
                      title="Center Horizontally in Card"
                      className="flex-1 flex items-center justify-center gap-1 rounded py-1 text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-xs transition cursor-pointer"
                    >
                      <AlignHorizontalJustifyCenter size={11} /> Center
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedFieldToCanvas('right')}
                      title="Align to Right (2mm margin)"
                      className="flex-1 flex items-center justify-center gap-1 rounded py-1 text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-xs transition cursor-pointer"
                    >
                      <AlignHorizontalJustifyEnd size={11} /> Right
                    </button>
                  </div>

                  {/* Vertical Canvas Align */}
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => alignSelectedFieldToCanvas(undefined, 'top')}
                      title="Align to Top (2mm margin)"
                      className="flex-1 flex items-center justify-center gap-1 rounded py-1 text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-xs transition cursor-pointer"
                    >
                      <AlignVerticalJustifyStart size={11} /> Top
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedFieldToCanvas(undefined, 'center')}
                      title="Center Vertically in Card"
                      className="flex-1 flex items-center justify-center gap-1 rounded py-1 text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-xs transition cursor-pointer"
                    >
                      <AlignVerticalJustifyCenter size={11} /> Center
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedFieldToCanvas(undefined, 'bottom')}
                      title="Align to Bottom (2mm margin)"
                      className="flex-1 flex items-center justify-center gap-1 rounded py-1 text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-xs transition cursor-pointer"
                    >
                      <AlignVerticalJustifyEnd size={11} /> Bottom
                    </button>
                  </div>
                </div>
              </div>

              {/* In-Between Spacing & Vertical Gap Controls */}
              {(() => {
                const gapInfo = getFieldGapInfo(selectedField.id || null);
                return (
                  <div className="space-y-2 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        In-Between Spacing & Vertical Gap
                      </p>
                      <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                        <MoveVertical size={11} /> Smart Spacing
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Gap Above Element */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-600">
                          <span
                            className="truncate"
                            title={
                              gapInfo.above
                                ? FIELD_LABELS[gapInfo.above.field.key] || gapInfo.above.field.key
                                : 'Top Edge'
                            }
                          >
                            ⬆️ Above: {gapInfo.above ? (FIELD_LABELS[gapInfo.above.field.key] || gapInfo.above.field.key) : 'None'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {gapInfo.above ? `${gapInfo.above.gapMm.toFixed(1)} mm` : '-'}
                          </span>
                        </div>
                        {gapInfo.above && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <input
                              type="number"
                              step="0.2"
                              min="0"
                              value={gapInfo.above.gapMm}
                              onChange={(e) => setGapToAbove(Number(e.target.value))}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">mm</span>
                          </div>
                        )}
                      </div>

                      {/* Gap Below Element */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-600">
                          <span
                            className="truncate"
                            title={
                              gapInfo.below
                                ? FIELD_LABELS[gapInfo.below.field.key] || gapInfo.below.field.key
                                : 'Bottom Edge'
                            }
                          >
                            ⬇️ Below: {gapInfo.below ? (FIELD_LABELS[gapInfo.below.field.key] || gapInfo.below.field.key) : 'None'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {gapInfo.below ? `${gapInfo.below.gapMm.toFixed(1)} mm` : '-'}
                          </span>
                        </div>
                        {gapInfo.below && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <input
                              type="number"
                              step="0.2"
                              min="0"
                              value={gapInfo.below.gapMm}
                              onChange={(e) => setGapToBelow(Number(e.target.value))}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">mm</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Equalize Button */}
                    {gapInfo.above && gapInfo.below && (
                      <button
                        type="button"
                        onClick={equalizeInBetweenGap}
                        className="w-full rounded border border-indigo-200 bg-indigo-50/60 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <ArrowUpDown size={12} /> Equalize In-Between Gap (Center Vertically)
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Batch / Multi-Field Detail Alignment & Spacing */}
              <div className="space-y-2 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Detail Fields Alignment & Spacing
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">Batch Column</span>
                </div>

                {/* Column Horizontal Align */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => alignDetailFields('left')}
                    title="Align all detail text fields to this element's left edge"
                    className="flex-1 flex items-center justify-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Columns size={11} className="text-slate-500" /> Match Left
                  </button>
                  <button
                    type="button"
                    onClick={() => alignDetailFields('center')}
                    title="Center all detail text fields horizontally in card"
                    className="flex-1 flex items-center justify-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <AlignHorizontalDistributeCenter size={11} className="text-slate-500" /> Center Details
                  </button>
                  <button
                    type="button"
                    onClick={() => alignDetailFields('right')}
                    title="Align all detail text fields to this element's right edge"
                    className="flex-1 flex items-center justify-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <AlignRight size={11} className="text-slate-500" /> Match Right
                  </button>
                </div>

                {/* Vertical Spacing & Distribution */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Vertical Distribution & Gaps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={distributeDetailFieldsVertically}
                      title="Evenly distribute vertical gaps across detail fields between top and bottom"
                      className="flex-1 rounded border border-blue-200 bg-blue-50/80 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Rows size={11} /> Auto-Distribute
                    </button>
                    <button
                      type="button"
                      onClick={() => applyUniformVerticalGap(1.5)}
                      title="Set 1.5mm uniform vertical gap"
                      className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer font-mono"
                    >
                      1.5mm
                    </button>
                    <button
                      type="button"
                      onClick={() => applyUniformVerticalGap(2.0)}
                      title="Set 2.0mm uniform vertical gap"
                      className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer font-mono"
                    >
                      2.0mm
                    </button>
                    <button
                      type="button"
                      onClick={() => applyUniformVerticalGap(2.5)}
                      title="Set 2.5mm uniform vertical gap"
                      className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer font-mono"
                    >
                      2.5mm
                    </button>
                    <button
                      type="button"
                      onClick={() => applyUniformVerticalGap(3.0)}
                      title="Set 3.0mm uniform vertical gap"
                      className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer font-mono"
                    >
                      3.0mm
                    </button>
                  </div>
                </div>
              </div>

              {/* Typography Controls for Text Fields */}
              {!IMAGE_FIELDS.includes(selectedField.key) && (
                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Typography & Styling
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-600">
                      <span>Font Family</span>
                      <select
                        value={selectedField.fontFamily || "'Times New Roman', serif"}
                        onChange={(e) => updateSelectedField({ fontFamily: e.target.value })}
                        className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        {FONT_FAMILIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs text-slate-600">
                      <span>Size (pt)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedField.fontSize ?? 10}
                        onChange={(e) => updateSelectedField({ fontSize: Number(e.target.value) })}
                        className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="block text-xs text-slate-600">
                      <span>Weight</span>
                      <select
                        value={selectedField.fontWeight ?? 'normal'}
                        onChange={(e) => updateSelectedField({ fontWeight: e.target.value as any })}
                        className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">SemiBold (600)</option>
                      </select>
                    </label>

                    <label className="block text-xs text-slate-600">
                      <span>Text Align</span>
                      <div className="mt-0.5 flex items-center rounded border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateSelectedField({ textAlign: 'left' })}
                          title="Text Left"
                          className={`flex-1 flex justify-center items-center py-1 rounded cursor-pointer ${
                            (selectedField.textAlign ?? 'left') === 'left'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <AlignLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedField({ textAlign: 'center' })}
                          title="Text Center"
                          className={`flex-1 flex justify-center items-center py-1 rounded cursor-pointer ${
                            selectedField.textAlign === 'center'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <AlignCenter size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedField({ textAlign: 'right' })}
                          title="Text Right"
                          className={`flex-1 flex justify-center items-center py-1 rounded cursor-pointer ${
                            selectedField.textAlign === 'right'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <AlignRight size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedField({ textAlign: 'justify' })}
                          title="Text Justify"
                          className={`flex-1 flex justify-center items-center py-1 rounded cursor-pointer ${
                            selectedField.textAlign === 'justify'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <AlignJustify size={12} />
                        </button>
                      </div>
                    </label>

                    <label className="block text-xs text-slate-600">
                      <span>Color</span>
                      <input
                        type="color"
                        value={selectedField.color ?? '#1B2A4A'}
                        onChange={(e) => updateSelectedField({ color: e.target.value })}
                        className="mt-0.5 h-7 w-full cursor-pointer rounded border border-slate-200"
                      />
                    </label>
                  </div>

                  {/* Label Prefix & Content */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    {/* School Name Editable Text */}
                    {selectedField.key === 'school_name' && (
                      <div className="space-y-1.5 rounded-lg bg-amber-50/60 p-2.5 border border-amber-200">
                        <label className="block text-xs font-bold text-amber-950">
                          <div className="flex items-center justify-between mb-1">
                            <span>School / Institution Name (Editable Text)</span>
                            <span className="text-[9.5px] font-mono font-medium text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                              Alt + Enter ↵ for new line
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={
                              selectedField.customText !== undefined
                                ? selectedField.customText
                                : schoolName || 'SPARKNEST ACADEMY'
                            }
                            onChange={(e) => updateSelectedField({ customText: e.target.value })}
                            onKeyDown={(e) =>
                              handleAltEnterKeyDown(e, (val) => updateSelectedField({ customText: val }))
                            }
                            placeholder={schoolName || 'e.g. SPARKNEST ACADEMY'}
                            className="mt-0.5 w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none resize-y min-h-[48px]"
                          />
                        </label>
                        {schoolName &&
                          selectedField.customText &&
                          selectedField.customText !== schoolName && (
                            <button
                              type="button"
                              onClick={() => updateSelectedField({ customText: schoolName })}
                              className="text-[10.5px] font-medium text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              ↺ Reset to Project Name: <strong>"{schoolName}"</strong>
                            </button>
                          )}
                      </div>
                    )}

                    {/* School Subtitle / Title Editable Text */}
                    {selectedField.key === 'school_subtitle' && (
                      <div className="space-y-1.5 rounded-lg bg-amber-50/60 p-2.5 border border-amber-200">
                        <label className="block text-xs font-bold text-amber-950">
                          <div className="flex items-center justify-between mb-1">
                            <span>School Title / Subtitle (Editable Text)</span>
                            <span className="text-[9.5px] font-mono font-medium text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                              Alt + Enter ↵ for new line
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={
                              selectedField.customText !== undefined
                                ? selectedField.customText
                                : 'Affiliated to CBSE, New Delhi'
                            }
                            onChange={(e) => updateSelectedField({ customText: e.target.value })}
                            onKeyDown={(e) =>
                              handleAltEnterKeyDown(e, (val) => updateSelectedField({ customText: val }))
                            }
                            placeholder="e.g. Affiliated to CBSE, New Delhi / Motihari, Bihar"
                            className="mt-0.5 w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none resize-y min-h-[48px]"
                          />
                        </label>
                        <p className="text-[10px] text-amber-700">
                          Used for affiliation details, branch, or location tagline.
                        </p>
                      </div>
                    )}

                    {/* Other Custom / Static Text Fields */}
                    {(selectedField.key === 'custom_text' ||
                      selectedField.key === 'designation' ||
                      selectedField.key === 'valid_till' ||
                      selectedField.key === 'terms' ||
                      selectedField.key === 'website' ||
                      selectedField.key === 'academic_year' ||
                      selectedField.key === 'batch' ||
                      selectedField.source === 'static') && (
                      <label className="block text-xs text-slate-600">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-700">Static / Custom Text Content</span>
                          <span className="text-[9.5px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Alt + Enter ↵ for new line
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={selectedField.customText ?? ''}
                          onChange={(e) => updateSelectedField({ customText: e.target.value })}
                          onKeyDown={(e) =>
                            handleAltEnterKeyDown(e, (val) => updateSelectedField({ customText: val }))
                          }
                          placeholder="Enter text (Alt + Enter for new line)..."
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none resize-y min-h-[58px]"
                        />
                      </label>
                    )}

                    {/* Prefix for Dynamic Student Fields */}
                    {selectedField.key !== 'school_name' &&
                      selectedField.key !== 'school_subtitle' &&
                      selectedField.key !== 'custom_text' &&
                      selectedField.key !== 'designation' &&
                      selectedField.key !== 'valid_till' &&
                      selectedField.key !== 'terms' &&
                      selectedField.key !== 'website' && (
                        <label className="block text-xs text-slate-600">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-700">
                              Label Prefix (e.g. "EMERGENCY NO:" or "ID:")
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Alt + Enter ↵ for new line
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={selectedField.labelPrefix ?? ''}
                            onChange={(e) => updateSelectedField({ labelPrefix: e.target.value })}
                            onKeyDown={(e) =>
                              handleAltEnterKeyDown(e, (val) => updateSelectedField({ labelPrefix: val }))
                            }
                            placeholder='e.g. "EMERGENCY NO:" or "ID:" (Alt + Enter for new line)'
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none resize-y min-h-[44px]"
                          />
                        </label>
                      )}
                  </div>
                </div>
              )}

              {/* Photo & Image Controls */}
              {IMAGE_FIELDS.includes(selectedField.key) && (
                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Photo & Shape Settings
                  </p>

                  {selectedField.key === 'school_logo' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Logo Image</span>
                        <label className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs">
                          <Upload size={11} />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const dataUrl = ev.target?.result as string;
                                if (dataUrl) {
                                  const newFields = activeFields.map((f) =>
                                    f.id === selectedFieldId || f.key === 'school_logo'
                                      ? { ...f, customText: dataUrl }
                                      : f
                                  );
                                  let nextLayout: TemplateLayout;
                                  if (currentSide === 'front') {
                                    nextLayout = {
                                      ...layout,
                                      schoolLogoUrl: dataUrl,
                                      fields: newFields,
                                    };
                                  } else {
                                    nextLayout = {
                                      ...layout,
                                      schoolLogoUrl: dataUrl,
                                      back: {
                                        ...(layout.back || { backgroundColor: '#FFFFFF', fields: [] }),
                                        fields: newFields,
                                      },
                                    };
                                  }
                                  onChange(nextLayout);
                                  pushHistory(nextLayout);
                                }
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <label className="block text-xs text-slate-600">
                        <span>Logo URL / Path</span>
                        <input
                          type="text"
                          value={selectedField.customText ?? effectiveSchoolLogo ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSelectedField({ customText: val });
                            onChange({ ...layout, schoolLogoUrl: val || null });
                          }}
                          placeholder={effectiveSchoolLogo || 'https://.../school-logo.png'}
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                        />
                      </label>

                      {effectiveSchoolLogo && selectedField.customText !== effectiveSchoolLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedField({ customText: effectiveSchoolLogo });
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                        >
                          Use Project School Logo
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <label className="block text-xs text-slate-600">
                          <span>Shape</span>
                          <select
                            value={
                              selectedField.photoShape ||
                              ((selectedField.borderRadius ?? 0) >= 45 ? 'circle' : 'rectangle')
                            }
                            onChange={(e) => {
                              const shape = e.target.value as 'rectangle' | 'rounded' | 'circle';
                              const radius = shape === 'circle' ? 50 : shape === 'rounded' ? 15 : 0;
                              updateSelectedField({ photoShape: shape, borderRadius: radius });
                            }}
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                          >
                            <option value="rectangle">Square / Rectangle</option>
                            <option value="rounded">Rounded</option>
                            <option value="circle">Circular Emblem</option>
                          </select>
                        </label>

                        <label className="block text-xs text-slate-600">
                          <span>Fit</span>
                          <select
                            value={selectedField.photoFit || 'contain'}
                            onChange={(e) => updateSelectedField({ photoFit: e.target.value as any })}
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                          >
                            <option value="contain">Contain (Full Logo)</option>
                            <option value="cover">Cover (Fill Box)</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedField.key === 'student_photo' && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs text-slate-600">
                        <span>Shape</span>
                        <select
                          value={
                            selectedField.photoShape ||
                            ((selectedField.borderRadius ?? 0) >= 45 ? 'circle' : 'rectangle')
                          }
                          onChange={(e) => {
                            const shape = e.target.value as 'rectangle' | 'rounded' | 'circle';
                            const radius = shape === 'circle' ? 50 : shape === 'rounded' ? 15 : 0;
                            updateSelectedField({ photoShape: shape, borderRadius: radius });
                          }}
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="rectangle">Rectangle</option>
                          <option value="rounded">Rounded Rectangle</option>
                          <option value="circle">Circle</option>
                        </select>
                      </label>

                      <label className="block text-xs text-slate-600">
                        <span>Fit</span>
                        <select
                          value={selectedField.photoFit || 'cover'}
                          onChange={(e) => updateSelectedField({ photoFit: e.target.value as any })}
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="cover">Cover (Fill)</option>
                          <option value="contain">Contain (Full Image)</option>
                        </select>
                      </label>
                    </div>
                  )}

                  {/* Border Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-600">
                      <span>Border Width (mm)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedField.borderWidth ?? 0}
                        onChange={(e) =>
                          updateSelectedField({ borderWidth: Number(e.target.value) })
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                      />
                    </label>

                    <label className="block text-xs text-slate-600">
                      <span>Border Color</span>
                      <input
                        type="color"
                        value={selectedField.borderColor ?? '#E69526'}
                        onChange={(e) => updateSelectedField({ borderColor: e.target.value })}
                        className="mt-0.5 h-7 w-full cursor-pointer rounded border border-slate-200"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
              Select an element on the canvas to inspect and fine-tune its properties.
            </div>
          )}

          {/* ── Add New Field & Layers List ─────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {currentSide === 'front' ? 'Front Side Elements' : 'Back Side Elements'} (
                {activeFields.length})
              </h3>
            </div>

            {/* Quick Add Elements Palette */}
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Building2 size={11} /> Institution & Branding
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => addField('school_logo')}
                    className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 border border-amber-300 shadow-2xs cursor-pointer"
                    title="Add School / Institution Logo to card"
                  >
                    <ImageIcon size={12} className="text-amber-600" /> + School Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('school_name')}
                    className="flex items-center gap-1 rounded-md bg-amber-50/70 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                    title="Add School Name"
                  >
                    <Type size={11} /> + School Name
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('school_subtitle')}
                    className="flex items-center gap-1 rounded-md bg-amber-50/70 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                    title="Add School Subtitle or Branch"
                  >
                    + Subtitle
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Student & Academic
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => addField('student_name')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Type size={11} /> + Name
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('student_id')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Type size={11} /> + ID
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('student_photo')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <UserIcon size={11} /> + Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('class')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    + Class
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('roll_number')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    + Roll No
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('date_of_birth')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    + DOB
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('blood_group')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    + Blood
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">
                  Contact & Back Details
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => addField('father_name')}
                    className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.8 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                  >
                    + Father's Name
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('phone')}
                    className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.8 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                  >
                    + Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('address')}
                    className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.8 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                  >
                    + Address
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('emergency_no')}
                    className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.8 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                  >
                    + Emergency No
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('valid_till')}
                    className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.8 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                  >
                    + Valid Till
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('terms')}
                    className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.8 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                  >
                    + Terms / Notice
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Codes & Custom
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => addField('qr_code')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <QrIcon size={11} /> + QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('barcode')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.8 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <BarcodeIcon size={11} /> + Barcode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const label = window.prompt('Enter Custom Dynamic Field Label (e.g. Transport Route, House, Blood Group, Course):', 'Transport Route');
                      if (!label || !label.trim()) return;
                      const slugKey = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                      addField(slugKey as any, {
                        label: label.trim(),
                        customKey: slugKey,
                        source: 'dynamic',
                        dataType: 'text',
                        required: false,
                        labelPrefix: `${label.trim()}: `,
                      });
                    }}
                    className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.8 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                    title="Add a custom dynamic field (e.g. House, Route) that will appear in Add Student and Excel import"
                  >
                    + Custom Dynamic Field
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('custom_text', { source: 'static', customText: 'Static Notice' })}
                    className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.8 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    + Custom Static Text
                  </button>
                </div>
              </div>
            </div>

            {/* Elements List */}
            <div className="mt-2 space-y-1 max-h-[220px] overflow-y-auto">
              {activeFields.map((field) => {
                const isSelected = selectedFieldId === field.id;
                return (
                  <div
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id || null)}
                    className={`flex items-center justify-between rounded-lg p-2 text-xs transition cursor-pointer ${
                      isSelected
                        ? 'border border-blue-400 bg-blue-50/60 font-semibold text-blue-900'
                        : 'border border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate min-w-0 pr-2">
                      <span className="font-medium">{FIELD_LABELS[field.key] || field.key}</span>
                      {field.customText && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1 truncate">
                          ({field.customText})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      <span className="font-mono text-[10px]">
                        {field.x.toFixed(1)}, {field.y.toFixed(1)} mm
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFields = activeFields.map((f) =>
                            f.id === field.id ? { ...f, visible: !f.visible } : f
                          );
                          updateActiveFields(newFields);
                        }}
                        className="p-0.5 hover:text-slate-700"
                      >
                        {field.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  AlertTriangle,
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
} from 'lucide-react';
import {
  FIELD_LABELS,
  TEMPLATE_PRESETS,
  type TemplatePreset,
} from '../../lib/idcard/templatePresets';
import type {
  TemplateField,
  TemplateFieldKey,
  TemplateLayout,
  TemplateSideLayout,
  IdCardTemplate,
} from '../../lib/idcard/types';
import { business } from '../../config/business';

// ============================================================
// CONSTANTS
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
}: {
  layout: TemplateLayout;
  onChange: (layout: TemplateLayout) => void;
  widthMm: number;
  heightMm: number;
  onDimensionsChange?: (w: number, h: number) => void;
  savedTemplates?: IdCardTemplate[];
  onSelectSavedTemplate?: (template: IdCardTemplate) => void;
}) {
  // ── State ──────────────────────────────────────────────────
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100); // 50 to 200%
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showSmartGuides, setShowSmartGuides] = useState<boolean>(true);
  const gridSizeMm = 0.5; // 0.5 mm grid
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [presetTab, setPresetTab] = useState<'saved' | 'presets'>(
    savedTemplates.length > 0 ? 'saved' : 'presets'
  );
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);

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

  // Smart Guide lines currently active
  const [activeGuides, setActiveGuides] = useState<{
    x: number | null;
    y: number | null;
  }>({ x: null, y: null });

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
  const activeBgFit =
    currentSide === 'front'
      ? layout.backgroundFit || 'fill'
      : layout.back?.backgroundFit || 'fill';
  const activeHeaderSvg =
    currentSide === 'front' ? layout.headerSvg : layout.back?.headerSvg || null;
  const activeFooterSvg =
    currentSide === 'front' ? layout.footerSvg : layout.back?.footerSvg || null;

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
      const backLayout: TemplateSideLayout = {
        backgroundColor: layout.back?.backgroundColor || layout.backgroundColor,
        backgroundUrl: layout.back?.backgroundUrl,
        backgroundFit: layout.back?.backgroundFit,
        headerGradientColors: layout.back?.headerGradientColors || layout.headerGradientColors,
        footerGradientColors: layout.back?.footerGradientColors || layout.footerGradientColors,
        headerSvg: layout.back?.headerSvg,
        footerSvg: layout.back?.footerSvg,
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

      // Check image aspect ratio vs card dimensions
      const img = new Image();
      img.onload = () => {
        const imgAspect = img.width / img.height;
        const cardAspect = widthMm / heightMm;
        const aspectDiff = Math.abs(imgAspect - cardAspect) / cardAspect;

        if (aspectDiff > 0.05) {
          setAspectWarning(
            `Uploaded ${side} image aspect ratio (${imgAspect.toFixed(2)}) differs from card dimensions (${cardAspect.toFixed(2)}). You can adjust background fit or set matching dimensions below.`
          );
        } else {
          setAspectWarning(null);
        }

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
      img.src = dataUrl;
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
    setAspectWarning(null);
  }

  // ── Element Actions (Add, Duplicate, Lock, Delete) ─────────
  function addField(key: TemplateFieldKey = 'custom_text') {
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

    const newField: TemplateField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key,
      label: FIELD_LABELS[key] || key,
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
      photoShape: isLogo ? 'rounded' : isPhoto ? 'circle' : undefined,
      borderRadius: isLogo ? 10 : undefined,
      visible: true,
      locked: false,
      overflowStrategy: 'wrap',
      customText:
        key === 'school_logo'
          ? layout.schoolLogoUrl || business.logoPath
          : key === 'school_name'
          ? 'SPARKNEST ACADEMY'
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

        // Snapping
        rawX = applySnap(rawX);
        rawY = applySnap(rawY);

        // Smart center guides
        let guideX: number | null = null;
        let guideY: number | null = null;

        if (showSmartGuides) {
          const cardCenterX = widthMm / 2;
          const cardCenterY = heightMm / 2;
          const elementCenterX = rawX + nextW / 2;
          const elementCenterY = rawY + nextH / 2;

          if (Math.abs(elementCenterX - cardCenterX) < 0.8) {
            rawX = Number((cardCenterX - nextW / 2).toFixed(2));
            guideX = cardCenterX;
          }
          if (Math.abs(elementCenterY - cardCenterY) < 0.8) {
            rawY = Number((cardCenterY - nextH / 2).toFixed(2));
            guideY = cardCenterY;
          }
        }

        setActiveGuides({ x: guideX, y: guideY });

        nextX = Math.max(0, Math.min(widthMm - nextW, rawX));
        nextY = Math.max(0, Math.min(heightMm - nextH, rawY));

        updateSelectedField({ x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) }, false);
      } else {
        // Resizing with handle
        const minSize = 2.0;

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
    [isDragging, dragStartPos, initialFieldProps, selectedField, pxPerMm, snapToGrid, showSmartGuides, widthMm, heightMm]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setActiveHandle(null);
      setDragStartPos(null);
      setInitialFieldProps(null);
      setActiveGuides({ x: null, y: null });
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

      {/* Aspect Ratio Warning Alert */}
      {aspectWarning && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600 shrink-0" size={16} />
            <span>{aspectWarning}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (currentSide === 'front') {
                  onChange({ ...layout, backgroundFit: 'crop' });
                } else if (layout.back) {
                  onChange({ ...layout, back: { ...layout.back, backgroundFit: 'crop' } });
                }
              }}
              className="rounded bg-amber-200 px-2 py-1 font-semibold hover:bg-amber-300"
            >
              Crop
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentSide === 'front') {
                  onChange({ ...layout, backgroundFit: 'fit' });
                } else if (layout.back) {
                  onChange({ ...layout, back: { ...layout.back, backgroundFit: 'fit' } });
                }
              }}
              className="rounded bg-amber-200 px-2 py-1 font-semibold hover:bg-amber-300"
            >
              Fit
            </button>
          </div>
        </div>
      )}

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
            className="relative select-none rounded-md bg-white shadow-xl transition-all"
            style={{
              width: widthMm * pxPerMm,
              height: heightMm * pxPerMm,
              backgroundColor: activeBgColor,
              backgroundImage: activeBgImage ? `url(${activeBgImage})` : undefined,
              backgroundSize:
                activeBgFit === 'fill' ? '100% 100%' : activeBgFit === 'fit' ? 'contain' : 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Locked Background Indicator */}
            {activeBgImage && (
              <div className="pointer-events-none absolute bottom-1 right-1 z-0 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white/80 backdrop-blur-xs">
                Background Locked
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

                const displayText = field.labelPrefix
                  ? `${field.labelPrefix} ${field.customText || FIELD_LABELS[field.key] || field.key}`
                  : field.customText || FIELD_LABELS[field.key] || field.key;

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
                            field.photoShape === 'circle' || (field.borderRadius ?? 0) >= 45
                              ? '50%'
                              : field.borderRadius
                              ? `${field.borderRadius}%`
                              : undefined,
                          border: field.borderWidth
                            ? `${field.borderWidth * (pxPerMm / 3.78)}px solid ${
                                field.borderColor || '#cbd5e1'
                              }`
                            : '1px dashed #cbd5e1',
                          backgroundColor:
                            field.key === 'student_photo'
                              ? '#e2e8f0'
                              : field.key === 'school_logo'
                              ? '#ffffff'
                              : '#f1f5f9',
                        }}
                      >
                        {field.key === 'school_logo' ? (
                          (field.customText || layout.schoolLogoUrl || business.logoPath) ? (
                            <img
                              src={field.customText || layout.schoolLogoUrl || business.logoPath}
                              alt="School Logo"
                              className={`h-full w-full ${field.photoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-amber-600 bg-amber-50/70 h-full w-full">
                              <Building2 size={Math.max(12, field.height * pxPerMm * 0.4)} />
                              <span className="text-[7.5px] font-bold text-amber-800 uppercase">
                                Logo
                              </span>
                            </div>
                          )
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
                        className="h-full w-full overflow-hidden leading-tight"
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
            Click to select · Drag to move · Arrow keys: <strong>0.1mm</strong> · Shift + Arrow: <strong>1.0mm</strong>
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
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
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

            {/* Upload Design Background Image */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                {currentSide === 'front' ? 'Front Design Image' : 'Back Design Image'}
              </p>

              {activeBgImage ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={activeBgImage}
                      alt="Background preview"
                      className="h-10 w-14 rounded object-cover border border-slate-300"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 truncate">
                        {currentSide === 'front' ? 'Front Background' : 'Back Background'}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">Locked & Active</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBackground(currentSide)}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-3 hover:bg-slate-100 transition">
                  <Upload size={18} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">
                    Upload {currentSide === 'front' ? 'Front' : 'Back'} Design (PNG/JPG)
                  </span>
                  <span className="text-[10px] text-slate-400">Becomes immutable locked background</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  {FIELD_LABELS[selectedField.key] || selectedField.key}
                </span>
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

              {/* Exact Physical Coordinates (X, Y, W, H in mm) */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Physical Position & Size (mm)
                </p>
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
                      onChange={(e) => updateSelectedField({ width: Number(e.target.value) })}
                      className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-mono"
                    />
                  </label>
                  <label className="block text-[10px] text-slate-500">
                    <span>Height</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedField.height}
                      onChange={(e) => updateSelectedField({ height: Number(e.target.value) })}
                      className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs font-mono"
                    />
                  </label>
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
                      <span>Align</span>
                      <select
                        value={selectedField.textAlign ?? 'left'}
                        onChange={(e) => updateSelectedField({ textAlign: e.target.value as any })}
                        className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
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
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs text-slate-600">
                      <span>Label Prefix (e.g. "BLOOD GROUP:")</span>
                      <input
                        type="text"
                        value={selectedField.labelPrefix ?? ''}
                        onChange={(e) => updateSelectedField({ labelPrefix: e.target.value })}
                        placeholder='e.g. "ID:" or "ROLL:"'
                        className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      />
                    </label>

                    {(selectedField.key === 'custom_text' ||
                      selectedField.key === 'designation' ||
                      selectedField.key === 'emergency_no' ||
                      selectedField.key === 'valid_till' ||
                      selectedField.key === 'terms' ||
                      selectedField.key === 'website') && (
                      <label className="block text-xs text-slate-600">
                        <span>Static Text Content</span>
                        <input
                          type="text"
                          value={selectedField.customText ?? ''}
                          onChange={(e) => updateSelectedField({ customText: e.target.value })}
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
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
                      <label className="block text-xs text-slate-600">
                        <span>Logo Image URL / Path</span>
                        <input
                          type="text"
                          value={selectedField.customText || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSelectedField({ customText: val });
                          }}
                          placeholder="https://.../logo.png"
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </label>
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
                    onClick={() => addField('custom_text')}
                    className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.8 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    + Custom Text
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
                      {FIELD_LABELS[field.key] || field.key}
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

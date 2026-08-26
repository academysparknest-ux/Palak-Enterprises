import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, LayoutTemplate, Layers } from 'lucide-react';
import { FIELD_LABELS, TEMPLATE_PRESETS, makeHeaderSvg, makeFooterSvg, type TemplatePreset } from '../../lib/idcard/templatePresets';
import type { TemplateField, TemplateFieldKey, TemplateLayout, TemplateSideLayout } from '../../lib/idcard/types';

// ============================================================
// DEFAULT TEMPLATE (Sparknest Academy Dual-Sided preset)
// ============================================================

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = TEMPLATE_PRESETS[0].layout;
export const DEFAULT_CARD_WIDTH = TEMPLATE_PRESETS[0].cardWidthMm;
export const DEFAULT_CARD_HEIGHT = TEMPLATE_PRESETS[0].cardHeightMm;

// ============================================================
// CONSTANTS
// ============================================================

const IMAGE_FIELDS: TemplateFieldKey[] = ['school_logo', 'student_photo', 'barcode', 'qr_code'];

const FONT_FAMILIES = [
  { value: "'Times New Roman', serif", label: 'Times New Roman (Default)' },
  { value: '', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: "'Arial', sans-serif", label: 'Arial' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export function TemplateEditor({
  layout,
  onChange,
  widthMm,
  heightMm,
  onDimensionsChange,
}: {
  layout: TemplateLayout;
  onChange: (layout: TemplateLayout) => void;
  widthMm: number;
  heightMm: number;
  onDimensionsChange?: (w: number, h: number) => void;
}) {
  const scale = 5; // px per mm for the editor preview
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const isDoubleSided = !!layout.isDoubleSided;
  const activeFields = currentSide === 'front' ? layout.fields : layout.back?.fields || [];
  const activeHeaderSvg = currentSide === 'front' ? layout.headerSvg : layout.back?.headerSvg || layout.headerSvg;
  const activeFooterSvg = currentSide === 'front' ? layout.footerSvg : layout.back?.footerSvg || layout.footerSvg;
  const activeBgColor = currentSide === 'front' ? layout.backgroundColor : layout.back?.backgroundColor || layout.backgroundColor;

  function updateActiveFields(newFields: TemplateField[]) {
    if (currentSide === 'front') {
      onChange({ ...layout, fields: newFields });
    } else {
      const back: TemplateSideLayout = {
        backgroundColor: layout.back?.backgroundColor || layout.backgroundColor,
        headerGradientColors: layout.back?.headerGradientColors || layout.headerGradientColors,
        footerGradientColors: layout.back?.footerGradientColors || layout.footerGradientColors,
        headerSvg: layout.back?.headerSvg || layout.headerSvg,
        footerSvg: layout.back?.footerSvg || layout.footerSvg,
        fields: newFields,
      };
      onChange({ ...layout, back });
    }
  }

  function updateField(index: number, patch: Partial<TemplateField>) {
    const newFields = activeFields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    updateActiveFields(newFields);
  }

  function toggleDoubleSided(enabled: boolean) {
    if (enabled && !layout.back) {
      // Initialize back side
      const defaultBack: TemplateSideLayout = {
        backgroundColor: '#FFFFFF',
        headerGradientColors: layout.headerGradientColors,
        footerGradientColors: layout.footerGradientColors,
        headerSvg: layout.headerSvg,
        footerSvg: layout.footerSvg,
        fields: [
          { key: 'student_id', x: 4, y: 10, width: 46, height: 3.5, fontSize: 6.5, fontWeight: 'bold', color: '#1B2A4A', visible: true, labelPrefix: 'ID:' },
          { key: 'qr_code', x: 20, y: 40, width: 14, height: 14, visible: true },
          { key: 'barcode', x: 13, y: 56, width: 28, height: 6, visible: true },
          { key: 'valid_till', x: 3, y: 64, width: 48, height: 3.5, fontSize: 6.5, fontWeight: 'bold', color: '#E74C3C', textAlign: 'center', visible: true, labelPrefix: 'VALID TILL:', customText: '30-MAY-26' },
        ],
      };
      onChange({ ...layout, isDoubleSided: true, back: defaultBack });
    } else {
      onChange({ ...layout, isDoubleSided: enabled });
      if (!enabled) setCurrentSide('front');
    }
  }

  function applyPreset(preset: TemplatePreset) {
    onChange(structuredClone(preset.layout));
    onDimensionsChange?.(preset.cardWidthMm, preset.cardHeightMm);
    setShowPresets(false);
    setExpandedField(null);
    setCurrentSide('front');
  }

  function addField() {
    const usedKeys = new Set(activeFields.map((f) => f.key));
    const allKeys: TemplateFieldKey[] = Object.keys(FIELD_LABELS) as TemplateFieldKey[];
    const available = allKeys.find((k) => !usedKeys.has(k));
    const key = available ?? 'custom_text';
    const newField: TemplateField = {
      key,
      x: 3,
      y: Math.max(...activeFields.map((f) => f.y + f.height), 5) + 2,
      width: 30,
      height: 5,
      fontSize: 12,
      fontFamily: "'Times New Roman', serif",
      visible: true,
    };
    updateActiveFields([...activeFields, newField]);
    setExpandedField(activeFields.length);
  }

  function removeField(index: number) {
    const newFields = activeFields.filter((_, i) => i !== index);
    updateActiveFields(newFields);
    setExpandedField(null);
  }

  const isImage = (key: TemplateFieldKey) => IMAGE_FIELDS.includes(key);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_1fr]">
      {/* ── Live Preview ────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            Preview: {currentSide === 'front' ? 'Front Side' : 'Back Side'}
          </p>
          {isDoubleSided && (
            <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
              <button
                onClick={() => {
                  setCurrentSide('front');
                  setExpandedField(null);
                }}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  currentSide === 'front' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Front Side
              </button>
              <button
                onClick={() => {
                  setCurrentSide('back');
                  setExpandedField(null);
                }}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  currentSide === 'back' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Back Side
              </button>
            </div>
          )}
        </div>

        <div
          className="relative overflow-hidden rounded-md border border-slate-300 shadow-md transition-all"
          style={{
            width: widthMm * scale,
            height: heightMm * scale,
            backgroundColor: activeBgColor,
          }}
        >
          {/* Header SVG decoration */}
          {activeHeaderSvg && (
            <div
              className="absolute left-0 top-0 w-full"
              style={{ height: 18 * scale }}
              dangerouslySetInnerHTML={{ __html: activeHeaderSvg }}
            />
          )}

          {/* Footer SVG decoration */}
          {activeFooterSvg && (
            <div
              className="absolute bottom-0 left-0 w-full"
              style={{ height: 14 * scale }}
              dangerouslySetInnerHTML={{ __html: activeFooterSvg }}
            />
          )}

          {/* Fields */}
          {activeFields
            .filter((f) => f.visible)
            .map((field) => {
              const actualIdx = activeFields.findIndex((f) => f === field);
              const isSelected = expandedField === actualIdx;

              if (isImage(field.key)) {
                return (
                  <div
                    key={actualIdx}
                    onClick={() => setExpandedField(isSelected ? null : actualIdx)}
                    className={`absolute flex cursor-pointer items-center justify-center overflow-hidden transition ${
                      isSelected ? 'ring-2 ring-blue-500 shadow-sm' : ''
                    }`}
                    style={{
                      left: field.x * scale,
                      top: field.y * scale,
                      width: field.width * scale,
                      height: field.height * scale,
                      borderRadius: field.borderRadius ? `${field.borderRadius}%` : undefined,
                      border: field.borderWidth
                        ? `${field.borderWidth}px solid ${field.borderColor || '#ccc'}`
                        : '1px dashed #cbd5e1',
                      backgroundColor: field.key === 'student_photo' ? '#e2e8f0' : '#f1f5f9',
                    }}
                  >
                    {field.key === 'school_logo' && field.customText ? (
                      <img src={field.customText} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-center text-[8.5px] font-medium text-slate-500">
                        {FIELD_LABELS[field.key] ?? field.key}
                      </span>
                    )}
                  </div>
                );
              }

              const displayText = field.labelPrefix
                ? `${field.labelPrefix} ${field.customText || FIELD_LABELS[field.key] || field.key}`
                : field.customText || FIELD_LABELS[field.key] || field.key;

              return (
                <div
                  key={actualIdx}
                  onClick={() => setExpandedField(isSelected ? null : actualIdx)}
                  className={`absolute cursor-pointer overflow-hidden leading-tight transition ${
                    isSelected ? 'ring-2 ring-blue-500 rounded-xs' : ''
                  }`}
                  style={{
                    left: field.x * scale,
                    top: field.y * scale,
                    width: field.width * scale,
                    height: field.height * scale,
                    fontSize: (field.fontSize ?? 10) * 0.9,
                    fontWeight: field.fontWeight === 'bold' ? 700 : 400,
                    fontStyle: field.fontStyle === 'italic' ? 'italic' : undefined,
                    fontFamily: field.fontFamily || undefined,
                    color: field.color ?? '#000',
                    textAlign: field.textAlign ?? 'left',
                  }}
                >
                  {displayText}
                </div>
              );
            })}
        </div>

        {/* Side switcher indicator under preview */}
        {isDoubleSided && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Layers size={13} />
            <span>Editing {currentSide === 'front' ? 'Front Side' : 'Back Side'}</span>
          </div>
        )}
      </div>

      {/* ── Properties Panel ────────────────────────────── */}
      <div className="min-w-0">
        {/* Preset selector */}
        <div className="mb-4">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <LayoutTemplate size={16} />
              Choose Template Preset (Single or Both Sides)
            </span>
            {showPresets ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showPresets && (
            <div className="mt-2 space-y-2">
              {TEMPLATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition ${
                    layout.presetId === preset.id
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{preset.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        preset.isDoubleSided ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {preset.isDoubleSided ? 'Both Sides (Dual)' : 'Single Side'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{preset.description}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {preset.cardWidthMm}×{preset.cardHeightMm}mm · {preset.orientation}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global / Side configuration bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isDoubleSided}
              onChange={(e) => toggleDoubleSided(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Enable Double-Sided (Both Sides)
          </label>

          {isDoubleSided && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentSide('front');
                  setExpandedField(null);
                }}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  currentSide === 'front'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Edit Front Side
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentSide('back');
                  setExpandedField(null);
                }}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  currentSide === 'back'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Edit Back Side
              </button>
            </div>
          )}
        </div>

        {/* Colors for waves and background */}
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 p-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Background</label>
            <input
              type="color"
              value={activeBgColor}
              onChange={(e) => {
                if (currentSide === 'front') {
                  onChange({ ...layout, backgroundColor: e.target.value });
                } else if (layout.back) {
                  onChange({ ...layout, back: { ...layout.back, backgroundColor: e.target.value } });
                }
              }}
              className="mt-1 h-7 w-full cursor-pointer rounded"
            />
          </div>
          {layout.headerGradientColors && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500">Header Navy</label>
                <input
                  type="color"
                  value={layout.headerGradientColors[0]}
                  onChange={(e) => {
                    const colors: [string, string] = [e.target.value, layout.headerGradientColors![1]];
                    const headerSvg = makeHeaderSvg(colors[0], colors[1]);
                    const footerSvg = makeFooterSvg(colors[0], colors[1]);
                    onChange({
                      ...layout,
                      headerGradientColors: colors,
                      footerGradientColors: colors,
                      headerSvg,
                      footerSvg,
                      back: layout.back ? { ...layout.back, headerGradientColors: colors, footerGradientColors: colors, headerSvg, footerSvg } : undefined,
                    });
                  }}
                  className="mt-1 h-7 w-full cursor-pointer rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Accent Gold</label>
                <input
                  type="color"
                  value={layout.headerGradientColors[1]}
                  onChange={(e) => {
                    const colors: [string, string] = [layout.headerGradientColors![0], e.target.value];
                    const headerSvg = makeHeaderSvg(colors[0], colors[1]);
                    const footerSvg = makeFooterSvg(colors[0], colors[1]);
                    onChange({
                      ...layout,
                      headerGradientColors: colors,
                      footerGradientColors: colors,
                      headerSvg,
                      footerSvg,
                      back: layout.back ? { ...layout.back, headerGradientColors: colors, footerGradientColors: colors, headerSvg, footerSvg } : undefined,
                    });
                  }}
                  className="mt-1 h-7 w-full cursor-pointer rounded"
                />
              </div>
            </>
          )}
        </div>

        {/* Field list for the active side */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {currentSide === 'front' ? 'Front Side Fields' : 'Back Side Fields'} ({activeFields.length})
          </p>
          <button
            onClick={addField}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            + Add Field
          </button>
        </div>

        <div className="mt-2 max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
          {activeFields.map((field, idx) => {
            const isExpanded = expandedField === idx;
            return (
              <div
                key={idx}
                className={`rounded-lg border transition ${
                  isExpanded ? 'border-blue-400 bg-blue-50/40 shadow-xs' : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpandedField(isExpanded ? null : idx)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {FIELD_LABELS[field.key] ?? field.key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {field.x},{field.y} mm
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateField(idx, { visible: !field.visible });
                      }}
                      className="text-slate-400 hover:text-slate-600"
                      title={field.visible ? 'Hide field' : 'Show field'}
                    >
                      {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </button>

                {/* Expanded properties */}
                {isExpanded && (
                  <div className="border-t border-slate-200 px-3 pb-3 pt-2">
                    {/* Position */}
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Position (mm)
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <NumberInput label="X" value={field.x} onChange={(v) => updateField(idx, { x: v })} />
                      <NumberInput label="Y" value={field.y} onChange={(v) => updateField(idx, { y: v })} />
                      <NumberInput label="W" value={field.width} onChange={(v) => updateField(idx, { width: v })} />
                      <NumberInput label="H" value={field.height} onChange={(v) => updateField(idx, { height: v })} />
                    </div>

                    {/* Text properties (only for non-image fields) */}
                    {!isImage(field.key) && (
                      <>
                        <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Typography
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <NumberInput
                            label="Size"
                            value={field.fontSize ?? 12}
                            onChange={(v) => updateField(idx, { fontSize: v })}
                          />
                          <SelectInput
                            label="Weight"
                            value={field.fontWeight ?? 'normal'}
                            options={[
                              { value: 'normal', label: 'Normal' },
                              { value: 'bold', label: 'Bold' },
                            ]}
                            onChange={(v) => updateField(idx, { fontWeight: v as 'normal' | 'bold' })}
                          />
                          <SelectInput
                            label="Style"
                            value={field.fontStyle ?? 'normal'}
                            options={[
                              { value: 'normal', label: 'Normal' },
                              { value: 'italic', label: 'Italic' },
                            ]}
                            onChange={(v) => updateField(idx, { fontStyle: v as 'normal' | 'italic' })}
                          />
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <SelectInput
                            label="Font"
                            value={field.fontFamily ?? "'Times New Roman', serif"}
                            options={FONT_FAMILIES}
                            onChange={(v) => updateField(idx, { fontFamily: v })}
                          />
                          <SelectInput
                            label="Align"
                            value={field.textAlign ?? 'left'}
                            options={[
                              { value: 'left', label: 'Left' },
                              { value: 'center', label: 'Center' },
                              { value: 'right', label: 'Right' },
                            ]}
                            onChange={(v) => updateField(idx, { textAlign: v as 'left' | 'center' | 'right' })}
                          />
                        </div>

                        {/* Colour */}
                        <div className="mt-1.5">
                          <label className="flex items-center gap-2 text-xs text-slate-500">
                            Color
                            <input
                              type="color"
                              value={field.color ?? '#000000'}
                              onChange={(e) => updateField(idx, { color: e.target.value })}
                              className="h-6 w-10 cursor-pointer rounded border border-slate-200"
                            />
                          </label>
                        </div>

                        {/* Label prefix */}
                        <div className="mt-1.5">
                          <label className="text-xs text-slate-500">Label Prefix</label>
                          <input
                            type="text"
                            value={field.labelPrefix ?? ''}
                            placeholder='e.g. "BLOOD GROUP:"'
                            onChange={(e) => updateField(idx, { labelPrefix: e.target.value })}
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                          />
                        </div>

                        {/* Custom text */}
                        {(field.key === 'custom_text' ||
                          field.key === 'designation' ||
                          field.key === 'emergency_no' ||
                          field.key === 'valid_till' ||
                          field.key === 'school_subtitle' ||
                          field.key === 'terms' ||
                          field.key === 'website') && (
                          <div className="mt-1.5">
                            <label className="text-xs text-slate-500">Text Content / Value</label>
                            <input
                              type="text"
                              value={field.customText ?? ''}
                              onChange={(e) => updateField(idx, { customText: e.target.value })}
                              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Border properties (for image fields) */}
                    {isImage(field.key) && (
                      <>
                        {field.key === 'school_logo' && (
                          <div className="mb-3 mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                              School / Org Logo Image
                            </p>
                            {field.customText ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={field.customText}
                                  alt="School Logo"
                                  className="h-10 w-10 rounded border border-indigo-200 bg-white object-contain p-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-medium text-slate-700 truncate">Custom Logo Active</p>
                                  <button
                                    type="button"
                                    onClick={() => updateField(idx, { customText: '' })}
                                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                                  >
                                    Reset to Default Shield
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-indigo-300 bg-white py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                                  <span>Choose Logo Image (PNG, JPG, SVG)</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                          updateField(idx, { customText: reader.result as string });
                                        };
                                        reader.readAsDataURL(f);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                            <div>
                              <label className="text-[10px] text-slate-500 font-medium">Or Paste Image URL</label>
                              <input
                                type="text"
                                placeholder="https://example.com/logo.png"
                                value={field.customText ?? ''}
                                onChange={(e) => updateField(idx, { customText: e.target.value })}
                                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Border & Shape
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <NumberInput
                            label="Radius %"
                            value={field.borderRadius ?? 0}
                            onChange={(v) => updateField(idx, { borderRadius: v })}
                          />
                          <NumberInput
                            label="Width px"
                            value={field.borderWidth ?? 0}
                            onChange={(v) => updateField(idx, { borderWidth: v })}
                          />
                          <label className="flex flex-col text-xs text-slate-500">
                            Color
                            <input
                              type="color"
                              value={field.borderColor ?? '#cccccc'}
                              onChange={(e) => updateField(idx, { borderColor: e.target.value })}
                              className="mt-0.5 h-6 w-full cursor-pointer rounded border border-slate-200"
                            />
                          </label>
                        </div>
                      </>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="mt-3 text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Remove field
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-slate-500">
      {label}
      <input
        type="number"
        step="0.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

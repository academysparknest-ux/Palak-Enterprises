import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Layers,
  Sparkles,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  Briefcase,
  GraduationCap,
  BadgeAlert,
  Calendar,
  Wand2,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  TEMPLATE_PRESETS,
  LANDSCAPE_STUDENT_LAYOUT,
  createBlankTemplateLayout,
} from '../../lib/idcard/templatePresets';
import type { IdCardTemplate, TemplateLayout } from '../../lib/idcard/types';
import { useScrollLock } from '../../hooks/useScrollLock';

export type CardTypeOption =
  | 'student'
  | 'staff'
  | 'employee'
  | 'faculty'
  | 'visitor'
  | 'event'
  | 'custom';

export interface WizardResult {
  name: string;
  cardType: CardTypeOption;
  orientation: 'portrait' | 'landscape';
  isDoubleSided: boolean;
  layout: TemplateLayout;
  cardWidthMm: number;
  cardHeightMm: number;
}

interface CreateIdCardWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: WizardResult) => void;
  savedTemplates?: IdCardTemplate[];
  projectName?: string;
}

const CARD_TYPES: Array<{
  id: CardTypeOption;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'student',
    label: 'Student ID',
    description: 'School, College & University student identity card with roll, class & parent details',
    icon: GraduationCap,
  },
  {
    id: 'staff',
    label: 'Staff / Faculty ID',
    description: 'Academic institution teachers, professors & administrative staff badge',
    icon: User,
  },
  {
    id: 'employee',
    label: 'Corporate Employee ID',
    description: 'Company workplace access pass with employee code, department & designation',
    icon: Briefcase,
  },
  {
    id: 'visitor',
    label: 'Visitor / Temporary Pass',
    description: 'Single-day visitor badge with host information, pass number & validity',
    icon: BadgeAlert,
  },
  {
    id: 'event',
    label: 'Event / Delegate Pass',
    description: 'Conference, seminar, sports or exhibition participant credential',
    icon: Calendar,
  },
  {
    id: 'custom',
    label: 'Custom ID Card',
    description: 'Blank slate with fully customized dynamic fields and arbitrary artwork',
    icon: CreditCard,
  },
];

export function CreateIdCardWizardModal({
  isOpen,
  onClose,
  onComplete,
  savedTemplates = [],
  projectName = 'Sparknest Academy',
}: CreateIdCardWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Wizard selections
  const [cardType, setCardType] = useState<CardTypeOption>('student');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isDoubleSided, setIsDoubleSided] = useState<boolean>(true);
  const [templateName, setTemplateName] = useState<string>('');

  // Step 4 starting setup choices
  const [startMode, setStartMode] = useState<
    'reference' | 'preset' | 'existing' | 'blank_white' | 'blank_plain' | 'upload'
  >('reference');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('landscape-student');
  const [selectedSavedId, setSelectedSavedId] = useState<string>('');

  // Uploaded artwork state for Step 4
  const [frontBgDataUrl, setFrontBgDataUrl] = useState<string | null>(null);
  const [backBgDataUrl, setBackBgDataUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTemplateName(`${projectName} ${orientation === 'landscape' ? 'Landscape' : 'Portrait'} Design`);
    }
  }, [isOpen, projectName, orientation]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cardWidthMm = orientation === 'landscape' ? 85.6 : 54.0;
  const cardHeightMm = orientation === 'landscape' ? 54.0 : 85.6;

  // Filter presets matching current orientation
  const matchingPresets = TEMPLATE_PRESETS.filter((p) => p.orientation === orientation);

  // Handle Image Upload Helper
  const handleImageFile = (file: File, side: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB. Please use a compressed file.');
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (side === 'front') {
        setFrontBgDataUrl(dataUrl);
      } else {
        setBackBgDataUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinish = () => {
    let finalLayout: TemplateLayout;
    const effectiveName = templateName.trim() || `${projectName} ${orientation === 'landscape' ? 'Landscape' : 'Portrait'} Card`;

    if (startMode === 'reference' && orientation === 'landscape') {
      finalLayout = structuredClone(LANDSCAPE_STUDENT_LAYOUT);
      finalLayout.isDoubleSided = isDoubleSided;
      finalLayout.templateType = isDoubleSided ? 'double' : 'single';
      if (!isDoubleSided) {
        delete finalLayout.back;
      }
    } else if (startMode === 'preset') {
      const preset = TEMPLATE_PRESETS.find((p) => p.id === selectedPresetId) || matchingPresets[0] || TEMPLATE_PRESETS[0];
      finalLayout = structuredClone(preset.layout);
      finalLayout.isDoubleSided = isDoubleSided;
      finalLayout.templateType = isDoubleSided ? 'double' : 'single';
      if (!isDoubleSided && finalLayout.back) {
        delete finalLayout.back;
      }
    } else if (startMode === 'existing' && selectedSavedId) {
      const saved = savedTemplates.find((t) => t.id === selectedSavedId);
      if (saved) {
        finalLayout = structuredClone(saved.layout);
      } else {
        finalLayout = createBlankTemplateLayout(orientation, isDoubleSided, cardType).layout;
      }
    } else if (startMode === 'upload') {
      const blank = createBlankTemplateLayout(orientation, isDoubleSided, cardType);
      finalLayout = blank.layout;
      if (frontBgDataUrl) {
        finalLayout.backgroundUrl = frontBgDataUrl;
        finalLayout.backgroundFit = 'fill';
      }
      if (isDoubleSided && backBgDataUrl && finalLayout.back) {
        finalLayout.back.backgroundUrl = backBgDataUrl;
        finalLayout.back.backgroundFit = 'fill';
      }
    } else {
      // blank_white or blank_plain
      const blank = createBlankTemplateLayout(orientation, isDoubleSided, cardType);
      finalLayout = blank.layout;
    }

    // Set layout orientation & dimensions explicitly
    finalLayout.orientation = orientation;
    finalLayout.cardType = cardType;
    finalLayout.widthMm = cardWidthMm;
    finalLayout.heightMm = cardHeightMm;
    finalLayout.isDoubleSided = isDoubleSided;
    finalLayout.templateType = isDoubleSided ? 'double' : 'single';

    onComplete({
      name: effectiveName,
      cardType,
      orientation,
      isDoubleSided,
      layout: finalLayout,
      cardWidthMm,
      cardHeightMm,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {step}
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {step === 1 && 'Step 1: Choose ID Card Type'}
                {step === 2 && 'Step 2: Choose Card Orientation'}
                {step === 3 && 'Step 3: Choose Single or Double Side'}
                {step === 4 && 'Step 4: Choose Starting Background & Layout'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">
              {step === 1 && 'Select the purpose and category of this identity credential'}
              {step === 2 && 'Pick between standard horizontal landscape or vertical portrait layout'}
              {step === 3 && 'Configure single-side printing or dual-sided (front & back) layout'}
              {step === 4 && 'Select reference artwork, blank canvas, or custom background image'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition cursor-pointer"
            title="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-100/50 text-[11px] font-semibold text-slate-500">
          <div className={`py-2 px-3 text-center border-r border-slate-200 transition ${step === 1 ? 'bg-blue-50 text-blue-700 font-bold border-b-2 border-b-blue-600' : step > 1 ? 'text-emerald-700' : ''}`}>
            1. Card Type {step > 1 && '✓'}
          </div>
          <div className={`py-2 px-3 text-center border-r border-slate-200 transition ${step === 2 ? 'bg-blue-50 text-blue-700 font-bold border-b-2 border-b-blue-600' : step > 2 ? 'text-emerald-700' : ''}`}>
            2. Orientation {step > 2 && '✓'}
          </div>
          <div className={`py-2 px-3 text-center border-r border-slate-200 transition ${step === 3 ? 'bg-blue-50 text-blue-700 font-bold border-b-2 border-b-blue-600' : step > 3 ? 'text-emerald-700' : ''}`}>
            3. Sides {step > 3 && '✓'}
          </div>
          <div className={`py-2 px-3 text-center transition ${step === 4 ? 'bg-blue-50 text-blue-700 font-bold border-b-2 border-b-blue-600' : ''}`}>
            4. Layout & BG
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ──────────────────────────────────────────────────────────── */}
          {/* STEP 1: Card Type Selection */}
          {/* ──────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CARD_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = cardType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCardType(type.id)}
                      className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {type.label}
                          </h4>
                          {isSelected && <CheckCircle2 size={16} className="text-blue-600 shrink-0" />}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Sparknest Academy Landscape ID"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* STEP 2: Orientation Picker */}
          {/* ──────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Landscape Option */}
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex flex-col items-center rounded-2xl border-2 p-6 text-center transition cursor-pointer ${
                    orientation === 'landscape'
                      ? 'border-blue-600 bg-blue-50/60 shadow-md ring-4 ring-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {/* Landscape Card Miniature Visual */}
                  <div className="relative mb-4 flex h-28 w-44 items-center justify-center rounded-lg border-2 border-slate-400 bg-slate-100 p-2 shadow-xs">
                    <div className="absolute top-1.5 left-2 right-2 h-3.5 rounded-xs bg-blue-600" />
                    <div className="absolute top-7 left-2 h-14 w-12 rounded bg-slate-300 border border-slate-400 flex items-center justify-center">
                      <User size={16} className="text-slate-500" />
                    </div>
                    <div className="absolute top-7 left-16 right-2 space-y-1.5">
                      <div className="h-2 w-full rounded-xs bg-slate-300" />
                      <div className="h-1.5 w-3/4 rounded-xs bg-slate-300" />
                      <div className="h-1.5 w-1/2 rounded-xs bg-slate-300" />
                    </div>
                    <div className="absolute bottom-1.5 left-2 h-2.5 w-16 rounded-xs bg-slate-400" />
                    <div className="absolute bottom-1.5 right-2 h-3.5 w-6 rounded-xs bg-slate-300" />
                  </div>

                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Landscape (Horizontal)</h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs font-bold text-blue-700">85.6 × 54.0 mm</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Standard horizontal ID card format with photo on the left and full details on the right.
                  </p>
                </button>

                {/* Portrait Option */}
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex flex-col items-center rounded-2xl border-2 p-6 text-center transition cursor-pointer ${
                    orientation === 'portrait'
                      ? 'border-blue-600 bg-blue-50/60 shadow-md ring-4 ring-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {/* Portrait Card Miniature Visual */}
                  <div className="relative mb-4 flex h-36 w-24 flex-col items-center rounded-lg border-2 border-slate-400 bg-slate-100 p-2 shadow-xs">
                    <div className="h-3 w-full rounded-xs bg-indigo-600 mb-2" />
                    <div className="h-10 w-10 rounded-full bg-slate-300 border border-slate-400 flex items-center justify-center mb-2">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <div className="w-full space-y-1">
                      <div className="h-1.5 w-full rounded-xs bg-slate-300" />
                      <div className="h-1.5 w-3/4 mx-auto rounded-xs bg-slate-300" />
                      <div className="h-1.5 w-1/2 mx-auto rounded-xs bg-slate-300" />
                    </div>
                    <div className="mt-auto h-2 w-14 rounded-xs bg-slate-400" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">Portrait (Vertical)</h3>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-700">54.0 × 85.6 mm</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Traditional vertical lanyard ID format with centered photo and top emblem banner.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* STEP 3: Single vs Double Side */}
          {/* ──────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Double Side */}
                <button
                  type="button"
                  onClick={() => setIsDoubleSided(true)}
                  className={`flex flex-col items-start rounded-2xl border-2 p-5 text-left transition cursor-pointer ${
                    isDoubleSided
                      ? 'border-blue-600 bg-blue-50/60 shadow-md ring-4 ring-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <Layers size={16} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Double Sided (Dual)</h4>
                    </div>
                    {isDoubleSided && <CheckCircle2 size={18} className="text-blue-600" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Includes both <strong>Front Side</strong> (Photo, Name, ID, Course/Designation) and <strong>Back Side</strong> (Contact, Address, QR verification, Barcode, Return Terms).
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                    <span>Duplex print sheet alignment supported</span>
                  </div>
                </button>

                {/* Single Side */}
                <button
                  type="button"
                  onClick={() => setIsDoubleSided(false)}
                  className={`flex flex-col items-start rounded-2xl border-2 p-5 text-left transition cursor-pointer ${
                    !isDoubleSided
                      ? 'border-blue-600 bg-blue-50/60 shadow-md ring-4 ring-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white">
                        <CreditCard size={16} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Single Side (Front Only)</h4>
                    </div>
                    {!isDoubleSided && <CheckCircle2 size={18} className="text-blue-600" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Generates and prints <strong>Front Side only</strong>. No back side layout is created internally, conserving print sheets and processing.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    <span>Front only generation</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* STEP 4: Starting Background & Layout */}
          {/* ──────────────────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {orientation === 'landscape' && (
                  <button
                    type="button"
                    onClick={() => setStartMode('reference')}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                      startMode === 'reference'
                        ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wand2 size={20} className="text-blue-600 mb-1.5" />
                    <span>Reference Design</span>
                    <span className="text-[10px] text-slate-500 font-normal">Ready artwork</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStartMode('preset')}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                    startMode === 'preset'
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles size={20} className="text-amber-600 mb-1.5" />
                  <span>Choose Preset</span>
                  <span className="text-[10px] text-slate-500 font-normal">Prebuilt themes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStartMode('upload')}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                    startMode === 'upload'
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Upload size={20} className="text-indigo-600 mb-1.5" />
                  <span>Upload Artwork</span>
                  <span className="text-[10px] text-slate-500 font-normal">Custom PNG/JPG</span>
                </button>

                {savedTemplates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStartMode('existing')}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                      startMode === 'existing'
                        ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers size={20} className="text-purple-600 mb-1.5" />
                    <span>Saved Templates</span>
                    <span className="text-[10px] text-slate-500 font-normal">{savedTemplates.length} saved</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStartMode('blank_white')}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                    startMode === 'blank_white'
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="h-5 w-5 rounded border border-slate-300 bg-white mb-1.5 shadow-2xs" />
                  <span>Blank White</span>
                  <span className="text-[10px] text-slate-500 font-normal">Pure canvas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStartMode('blank_plain')}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                    startMode === 'blank_plain'
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="h-5 w-5 rounded border border-dashed border-slate-400 bg-slate-50 mb-1.5" />
                  <span>Blank Plain</span>
                  <span className="text-[10px] text-slate-500 font-normal">No backgrounds</span>
                </button>
              </div>

              {/* Sub-panels for Step 4 selection */}
              {startMode === 'reference' && orientation === 'landscape' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Wand2 size={16} className="text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Standard Reference Landscape Template
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Includes official blue banner front artwork, student photo placeholder, scannable Code 128 barcode, valid till date, signature box, and comprehensive back details with QR code.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="rounded bg-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                      85.6 × 54.0 mm Landscape
                    </span>
                    <span className="rounded bg-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                      {isDoubleSided ? 'Dual-Sided Layout' : 'Front Only'}
                    </span>
                  </div>
                </div>
              )}

              {startMode === 'preset' && (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {matchingPresets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`flex items-start justify-between rounded-lg border p-3 cursor-pointer transition ${
                        selectedPresetId === preset.id
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{preset.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{preset.description}</p>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700 shrink-0">
                        {preset.cardWidthMm}×{preset.cardHeightMm}mm
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {startMode === 'existing' && savedTemplates.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {savedTemplates.map((saved) => (
                    <div
                      key={saved.id}
                      onClick={() => setSelectedSavedId(saved.id)}
                      className={`flex items-start justify-between rounded-lg border p-3 cursor-pointer transition ${
                        selectedSavedId === saved.id
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{saved.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {saved.card_width_mm} × {saved.card_height_mm} mm · {saved.layout?.isDoubleSided || saved.layout?.back ? 'Dual-Sided' : 'Single-Sided'}
                        </p>
                      </div>
                      <span className="rounded bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
                        Clone Design →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {startMode === 'upload' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Front Upload */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">Front Background</label>
                        {frontBgDataUrl && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Loaded ✓
                          </span>
                        )}
                      </div>
                      <label className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white hover:bg-blue-50/40 cursor-pointer transition">
                        <Upload size={16} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-700">
                          {frontBgDataUrl ? 'Change Front Image' : 'Select Front PNG/JPG'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageFile(f, 'front');
                          }}
                        />
                      </label>
                      {frontBgDataUrl && (
                        <div className="h-14 w-full rounded border border-slate-300 overflow-hidden">
                          <img src={frontBgDataUrl} alt="Front preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Back Upload (if Double-sided) */}
                    {isDoubleSided ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">Back Background</label>
                          {backBgDataUrl && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Loaded ✓
                            </span>
                          )}
                        </div>
                        <label className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white hover:bg-blue-50/40 cursor-pointer transition">
                          <Upload size={16} className="text-slate-400 mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">
                            {backBgDataUrl ? 'Change Back Image' : 'Select Back PNG/JPG'}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageFile(f, 'back');
                            }}
                          />
                        </label>
                        {backBgDataUrl && (
                          <div className="h-14 w-full rounded border border-slate-300 overflow-hidden">
                            <img src={backBgDataUrl} alt="Back preview" className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 flex flex-col items-center justify-center text-center text-xs text-slate-400">
                        <span>Single-side selected.</span>
                        <span className="text-[11px]">No back background needed.</span>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-xs text-red-600 font-medium">{uploadError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
              >
                <Check size={14} />
                <span>Create & Open Template Designer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

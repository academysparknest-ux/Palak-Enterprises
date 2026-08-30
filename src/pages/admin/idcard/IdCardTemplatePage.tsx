import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Sparkles,
  Layers,
  Info,
  Bookmark,
  Plus,
  Copy,
  Trash2,
  Check,
  Star,
  Edit3,
  Upload,
  Image as ImageIcon,
  Building2,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import {
  getIdCardTemplates,
  createIdCardTemplate,
  updateIdCardTemplate,
  deleteIdCardTemplate,
  updateIdCardProject,
  getAllIdCardPersons,
  uploadSchoolLogo,
} from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import { validateLogoFile } from '../../../lib/idcard/logoUpload';
import { validateIdCardTemplate } from '../../../lib/idcard/templateValidation';
import { clearCardDataUrlCache } from '../../../lib/idcard/generation';
import {
  extractTemplateFieldSchema,
  detectTemplateSchemaDiff,
  validatePersonForTemplate,
} from '../../../lib/idcard/templateFieldSchema';
import {
  TemplateEditor,
  DEFAULT_TEMPLATE_LAYOUT,
  DEFAULT_CARD_WIDTH,
  DEFAULT_CARD_HEIGHT,
} from '../../../components/idcard/TemplateEditor';
import {
  saveCustomDefaultTemplate,
  getDefaultTemplateLayout,
  getDefaultCardDimensions,
  LANDSCAPE_STUDENT_LAYOUT,
} from '../../../lib/idcard/templatePresets';
import {
  CreateIdCardWizardModal,
  type WizardResult,
} from '../../../components/idcard/CreateIdCardWizardModal';
import type { IdCardProject, IdCardTemplate, TemplateLayout, TemplateField, IdCardPerson } from '../../../lib/idcard/types';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

type ProjectContext = { project: IdCardProject; reloadProject: () => void | Promise<void> };

type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export default function IdCardTemplatePage() {
  const { project, reloadProject } = useOutletContext<ProjectContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryTemplateId = searchParams.get('templateId');

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [template, setTemplate] = useState<IdCardTemplate | null>(null);
  const [name, setName] = useState('Sparknest Academy');
  const [layout, setLayout] = useState<TemplateLayout>(DEFAULT_TEMPLATE_LAYOUT);
  const [projectPersons, setProjectPersons] = useState<IdCardPerson[]>([]);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [cardWidth, setCardWidth] = useState(DEFAULT_CARD_WIDTH);
  const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_HEIGHT);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [schemaChangeNotice, setSchemaChangeNotice] = useState<{
    addedCount: number;
    addedLabels: string[];
    affectedStudentsCount: number;
    removedLabels: string[];
  } | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadLogoError, setUploadLogoError] = useState<string | null>(null);

  // Unsaved changes tracking (Fix H2)
  const lastSavedSnapshotRef = useRef<string>('');
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({ name, layout, cardWidth, cardHeight });
  }, [name, layout, cardWidth, cardHeight]);

  const isDirty = useMemo(() => {
    return Boolean(lastSavedSnapshotRef.current && lastSavedSnapshotRef.current !== currentSnapshot);
  }, [currentSnapshot]);

  useUnsavedChanges(isDirty, 'You have unsaved ID card template modifications. Are you sure you want to leave?');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__ID_CARD_TEMPLATE__ = { name, cardWidth, cardHeight, layout };
    }
  }, [name, cardWidth, cardHeight, layout]);

  // School / Institution Details (Configured once by admin and synced across ID card templates)
  const [showSchoolDetails, setShowSchoolDetails] = useState(true);
  const [schoolSubtitle, setSchoolSubtitle] = useState('Affiliated to CBSE, New Delhi');
  const [schoolAddress, setSchoolAddress] = useState('Society Area, Clement Town, Dehradun (UTTARAKHAND)');
  const [schoolWebsite, setSchoolWebsite] = useState('www.geu.ac.in || Tollfree: 1800 270 1280');
  const [schoolTerms, setSchoolTerms] = useState(
    'In case of theft or loss it is mandatory for the Student to inform the Administration Office. If found abandoned, may please be returned to Graphic Era (Deemed to be) University, Dehradun.'
  );
  const [syncedDetailsSuccess, setSyncedDetailsSuccess] = useState(false);

  // Keyboard shortcut helper: Alt + Enter for new lines
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

  const handleSyncSchoolDetails = () => {
    // 1. Update front fields
    const updatedFront = layout.fields.map((f) => {
      if (f.key === 'school_name') return { ...f, customText: project.name };
      if (f.key === 'school_subtitle') return { ...f, customText: schoolSubtitle };
      return f;
    });

    // 2. Update back fields
    let updatedBack = layout.back ? { ...layout.back } : undefined;
    if (updatedBack) {
      updatedBack.fields = updatedBack.fields.map((f) => {
        if (f.key === 'terms') return { ...f, customText: schoolTerms };
        if (f.key === 'website') return { ...f, customText: schoolWebsite };
        if (f.key === 'address' && f.customText && (f.customText.toLowerCase().includes('dehradun') || f.customText.toLowerCase().includes('society') || f.customText.toLowerCase().includes('area'))) {
          return { ...f, customText: schoolAddress };
        }
        return f;
      });
    }

    setLayout((prev) => ({
      ...prev,
      fields: updatedFront,
      back: updatedBack,
    }));

    setSyncedDetailsSuccess(true);
    setTimeout(() => setSyncedDetailsSuccess(false), 3500);
  };

  // Derive dynamic template field schema in real-time
  const fieldSchema = useMemo(() => extractTemplateFieldSchema(layout), [layout]);

  const canvasLogoField = layout.fields.find((f) => f.key === 'school_logo');
  const currentSchoolLogo =
    layout.schoolLogoUrl ||
    (canvasLogoField?.customText && canvasLogoField.customText !== '/logo.webp' && canvasLogoField.customText !== '/images/palak-logo-ram-hanuman.jpeg'
      ? canvasLogoField.customText
      : null) ||
    project.logo_url ||
    template?.logo_url ||
    null;
  const hasLogoFieldOnCanvas = Boolean(canvasLogoField);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate before upload
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      setUploadLogoError(validation.error || 'Invalid logo file');
      e.target.value = '';
      return;
    }

    setUploadLogoError(null);
    setUploadingLogo(true);
    let previewUrl: string | null = null;
    const backupLayout = layout;

    try {
      // 1. Instant local Object URL preview (0ms UI latency)
      previewUrl = URL.createObjectURL(file);

      const frontFields = [...layout.fields];
      const hasLogo = frontFields.some((f) => f.key === 'school_logo');

      const updatedFrontFields = hasLogo
        ? frontFields.map((f) =>
            f.key === 'school_logo' ? { ...f, customText: previewUrl!, visible: true } : f
          )
        : [
            {
              id: `logo-auto-${Date.now()}`,
              key: 'school_logo' as const,
              x: 5.5,
              y: 4.5,
              width: 14.0,
              height: 14.0,
              visible: true,
              customText: previewUrl!,
            },
            ...frontFields,
          ];

      // Apply optimistic update immediately
      const initialLayout: TemplateLayout = {
        ...layout,
        schoolLogoUrl: previewUrl,
        fields: updatedFrontFields,
        back: layout.back
          ? {
              ...layout.back,
              fields: layout.back.fields.map((f) =>
                f.key === 'school_logo' ? { ...f, customText: previewUrl!, visible: true } : f
              ),
            }
          : undefined,
      };
      setLayout(initialLayout);

      // 2. Upload, optimize, and atomically persist to idcard_projects.logo_url
      const publicUrl = await uploadSchoolLogo(project.id, file);

      // 3. Finalize with storage public URL
      const finalLayout: TemplateLayout = {
        ...initialLayout,
        schoolLogoUrl: publicUrl,
        fields: updatedFrontFields.map((f) =>
          f.key === 'school_logo' ? { ...f, customText: publicUrl, visible: true } : f
        ),
        back: layout.back
          ? {
              ...layout.back,
              fields: layout.back.fields.map((f) =>
                f.key === 'school_logo' ? { ...f, customText: publicUrl, visible: true } : f
              ),
            }
          : undefined,
      };
      setLayout(finalLayout);

      // 4. Update template layout in DB if editing an existing template
      if (template?.id) {
        try {
          await updateIdCardTemplate(template.id, { layout: finalLayout });
          setTemplates((prev) =>
            prev.map((t) => (t.id === template.id ? { ...t, layout: finalLayout } : t))
          );
          setTemplate((prev) => (prev ? { ...prev, layout: finalLayout } : null));
        } catch (autoSaveErr) {
          console.warn('Auto-save of logo to DB layout:', autoSaveErr);
        }
      }

      // 5. Synchronize parent project context state without reloading page
      await reloadProject();

      setSaveSuccess('School / Institution logo uploaded and saved successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      const appErr = classifySupabaseError(err);
      const msg = errorCodeToUserMessage(appErr.code, appErr.message);
      setUploadLogoError(msg);
      // Revert layout on failure to backup state
      setLayout(backupLayout);
    } finally {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleLogoUrlChange = async (url: string) => {
    const trimmed = url.trim();
    const frontFields = [...layout.fields];
    const hasLogo = frontFields.some((f) => f.key === 'school_logo');

    let updatedFrontFields: TemplateField[];
    if (hasLogo) {
      updatedFrontFields = frontFields.map((f) =>
        f.key === 'school_logo' ? { ...f, customText: trimmed || undefined } : f
      );
    } else if (trimmed) {
      updatedFrontFields = [
        {
          id: `logo-auto-${Date.now()}`,
          key: 'school_logo',
          x: 5.5,
          y: 4.5,
          width: 14.0,
          height: 14.0,
          visible: true,
          customText: trimmed,
        },
        ...frontFields,
      ];
    } else {
      updatedFrontFields = frontFields;
    }

    const updatedLayout: TemplateLayout = {
      ...layout,
      schoolLogoUrl: trimmed || null,
      fields: updatedFrontFields,
      back: layout.back
        ? {
            ...layout.back,
            fields: layout.back.fields.map((f) =>
              f.key === 'school_logo' ? { ...f, customText: trimmed || undefined } : f
            ),
          }
        : undefined,
    };
    setLayout(updatedLayout);

    try {
      await updateIdCardProject(project.id, { logo_url: trimmed || null });
      if (template?.id) {
        await updateIdCardTemplate(template.id, { layout: updatedLayout });
      }
      await reloadProject();
    } catch (err) {
      console.warn('Error saving logo URL to project:', err);
    }
  };

  const handleRemoveLogo = async () => {
    const updatedLayout: TemplateLayout = {
      ...layout,
      schoolLogoUrl: null,
      fields: layout.fields.map((f) =>
        f.key === 'school_logo' ? { ...f, customText: undefined } : f
      ),
      back: layout.back
        ? {
            ...layout.back,
            fields: layout.back.fields.map((f) =>
              f.key === 'school_logo' ? { ...f, customText: undefined } : f
            ),
          }
        : undefined,
    };
    setLayout(updatedLayout);

    try {
      await updateIdCardProject(project.id, { logo_url: null });
      if (template?.id) {
        await updateIdCardTemplate(template.id, { layout: updatedLayout });
      }
      await reloadProject();
      setSaveSuccess('School logo removed from project.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      const appErr = classifySupabaseError(err);
      alert(errorCodeToUserMessage(appErr.code, appErr.message));
    }
  };

  const handleAddLogoToCanvas = () => {
    if (hasLogoFieldOnCanvas) return;
    const newLogoField = {
      id: `logo_${Date.now()}`,
      key: 'school_logo' as const,
      label: 'School Logo',
      x: 4,
      y: 4,
      width: 14,
      height: 14,
      visible: true,
      customText: currentSchoolLogo || undefined,
      photoFit: 'contain' as const,
      photoShape: 'rectangle' as const,
      borderRadius: 0,
      borderWidth: 0,
    };
    setLayout({
      ...layout,
      fields: [newLogoField, ...layout.fields],
    });
  };

  const loadTemplates = useCallback(async (targetId?: string | null) => {
    setState({ kind: 'loading' });
    try {
      const [list, personsList] = await Promise.all([
        getIdCardTemplates(project.id),
        getAllIdCardPersons(project.id).catch(() => []),
      ]);
      setTemplates(list);
      setProjectPersons(personsList);

      const activeTargetId = targetId !== undefined ? targetId : (queryTemplateId || project.template_id);
      const existing = activeTargetId ? (list.find((t) => t.id === activeTargetId) ?? null) : (list[0] ?? null);

      const resolvedLogo = existing?.layout?.schoolLogoUrl || existing?.logo_url || project.logo_url || null;

      if (existing) {
        setTemplate(existing);
        setName(existing.name);

        // Sanitize layout to clean up any stale /logo.webp and attach resolved school logo
        const sanitizedLayout: TemplateLayout = {
          ...existing.layout,
          schoolLogoUrl: resolvedLogo,
          fields: existing.layout.fields.map((f) =>
            f.key === 'school_logo' && (!f.customText || f.customText === '/logo.webp' || f.customText === '/images/palak-logo-ram-hanuman.jpeg')
              ? { ...f, customText: resolvedLogo || undefined, borderRadius: f.borderRadius ?? 0 }
              : f
          ),
          back: existing.layout.back
            ? {
                ...existing.layout.back,
                fields: existing.layout.back.fields.map((f) =>
                  f.key === 'school_logo' && (!f.customText || f.customText === '/logo.webp' || f.customText === '/images/palak-logo-ram-hanuman.jpeg')
                    ? { ...f, customText: resolvedLogo || undefined, borderRadius: f.borderRadius ?? 0 }
                    : f
                ),
              }
            : undefined,
        };

        setLayout(sanitizedLayout);
        setCardWidth(existing.card_width_mm);
        setCardHeight(existing.card_height_mm);
        lastSavedSnapshotRef.current = JSON.stringify({
          name: existing.name,
          layout: sanitizedLayout,
          cardWidth: existing.card_width_mm,
          cardHeight: existing.card_height_mm,
        });
      } else {
        // No templates exist yet: use custom default or standard preset layout
        const defaultLayout = getDefaultTemplateLayout();
        const defaultDimensions = getDefaultCardDimensions();
        const initialName = `${project.name} Template`;
        const initialLayout = {
          ...defaultLayout,
          schoolLogoUrl: resolvedLogo,
          fields: defaultLayout.fields.map((f) =>
            f.key === 'school_logo'
              ? { ...f, customText: resolvedLogo || undefined, borderRadius: 0 }
              : f
          ),
        };
        setTemplate(null);
        setName(initialName);
        setLayout(initialLayout);
        setCardWidth(defaultDimensions.cardWidthMm);
        setCardHeight(defaultDimensions.cardHeightMm);
        lastSavedSnapshotRef.current = JSON.stringify({
          name: initialName,
          layout: initialLayout,
          cardWidth: defaultDimensions.cardWidthMm,
          cardHeight: defaultDimensions.cardHeightMm,
        });
      }
      setState({ kind: 'ready' });
    } catch (err) {
      const appErr = classifySupabaseError(err);
      setState({ kind: 'error', message: errorCodeToUserMessage(appErr.code, appErr.message) });
    }
  }, [project.id, project.name, project.logo_url, project.template_id, queryTemplateId]);

  const hasInitializedRef = useRef(false);
  const prevQueryTemplateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasInitializedRef.current || prevQueryTemplateIdRef.current !== queryTemplateId) {
      hasInitializedRef.current = true;
      prevQueryTemplateIdRef.current = queryTemplateId;
      loadTemplates(queryTemplateId);
    }
  }, [loadTemplates, queryTemplateId]);

  function handleSelectTemplate(target: IdCardTemplate) {
    setTemplate(target);
    setName(target.name);
    setLayout(target.layout);
    setCardWidth(target.card_width_mm);
    setCardHeight(target.card_height_mm);
    setSearchParams({ templateId: target.id });
    setSaveSuccess(null);
  }

  function handleNewTemplate() {
    setShowCreateWizard(true);
  }

  function handleWizardComplete(result: WizardResult) {
    setShowCreateWizard(false);
    setTemplate(null);
    setName(result.name);
    setLayout(result.layout);
    setCardWidth(result.cardWidthMm);
    setCardHeight(result.cardHeightMm);
    lastSavedSnapshotRef.current = '';
    setSearchParams({});
    setSaveSuccess(
      `Configured "${result.name}" (${result.orientation.toUpperCase()} ${result.cardWidthMm} × ${result.cardHeightMm} mm). Customize fields and click "Save Template".`
    );
    setTimeout(() => setSaveSuccess(null), 5000);
  }

  function handleImportReferenceDesign() {
    setTemplate(null);
    const newName = `${project.name} Landscape Student ID`;
    setName(newName);
    setLayout(structuredClone(LANDSCAPE_STUDENT_LAYOUT));
    setCardWidth(85.6);
    setCardHeight(54.0);
    lastSavedSnapshotRef.current = '';
    setSearchParams({});
    setSaveSuccess('Imported Landscape Reference Design (85.6 × 54.0 mm). Ready to customize and save!');
    setTimeout(() => setSaveSuccess(null), 5000);
  }

  function handleSetAsDefaultDesign() {
    saveCustomDefaultTemplate(layout, cardWidth, cardHeight);
    setSaveSuccess('Current design saved as default for all new templates!');
    setTimeout(() => setSaveSuccess(null), 4000);
  }

  async function handleSetActive(target: IdCardTemplate) {
    try {
      await updateIdCardProject(project.id, { template_id: target.id });
      await reloadProject();
      setSaveSuccess(`"${target.name}" is now set as the active template for this project.`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      const appErr = classifySupabaseError(err);
      alert(errorCodeToUserMessage(appErr.code, appErr.message));
    }
  }

  async function handleDuplicate(target: IdCardTemplate) {
    setSaving(true);
    try {
      const duplicated = await createIdCardTemplate({
        project_id: project.id,
        name: `${target.name} (Copy)`,
        layout: target.layout,
        card_width_mm: target.card_width_mm,
        card_height_mm: target.card_height_mm,
        background_url: target.background_url,
      });

      // Update state and select the new copy
      setTemplates((prev) => [duplicated, ...prev]);
      handleSelectTemplate(duplicated);
      setSaveSuccess(`Duplicated "${target.name}" successfully!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      const appErr = classifySupabaseError(err);
      alert(errorCodeToUserMessage(appErr.code, appErr.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(target: IdCardTemplate) {
    if (!confirm(`Are you sure you want to delete template "${target.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteIdCardTemplate(target.id);
      const remaining = templates.filter((t) => t.id !== target.id);
      setTemplates(remaining);

      // If active project template was deleted, reassign or clear
      if (project.template_id === target.id) {
        const nextActiveId = remaining[0]?.id || null;
        await updateIdCardProject(project.id, { template_id: nextActiveId });
        await reloadProject();
      }

      // If currently editing this template, switch to another or reset
      if (template?.id === target.id) {
        if (remaining.length > 0) {
          handleSelectTemplate(remaining[0]);
        } else {
          handleNewTemplate();
        }
      }

      setSaveSuccess(`Template "${target.name}" deleted.`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      const appErr = classifySupabaseError(err);
      alert(errorCodeToUserMessage(appErr.code, appErr.message));
    }
  }

  async function handleSave(saveAsNew = false) {
    // 1. Pre-save validation
    const validation = validateIdCardTemplate({
      name,
      card_width_mm: cardWidth,
      card_height_mm: cardHeight,
      background_url: layout.backgroundUrl || null,
      layout,
    });

    if (!validation.valid) {
      alert(`Cannot save template:\n\n• ${validation.errors.join('\n• ')}`);
      return;
    }

    setValidationWarnings(validation.warnings);
    setSaving(true);
    setSaveSuccess(null);
    setSchemaChangeNotice(null);

    const backgroundUrl = layout.backgroundUrl || null;

    // Attach extracted fieldSchema to layout
    const extractedSchema = extractTemplateFieldSchema(layout);
    const layoutWithSchema: TemplateLayout = {
      ...layout,
      fieldSchema: extractedSchema.items,
    };

    try {
      // Check for template schema differences with existing student records
      const existingPersons = await getAllIdCardPersons(project.id).catch(() => []);
      const diff = detectTemplateSchemaDiff(template?.layout, layoutWithSchema);

      let affectedStudentsCount = 0;
      if (existingPersons.length > 0 && diff.addedRequiredFields.length > 0) {
        for (const p of existingPersons) {
          const val = validatePersonForTemplate(p, extractedSchema);
          if (!val.valid) affectedStudentsCount++;
        }
      }

      let savedTemplate: IdCardTemplate;
      const isCreating = saveAsNew || !template;

      if (!isCreating && template) {
        savedTemplate = await updateIdCardTemplate(template.id, {
          name,
          layout: layoutWithSchema,
          card_width_mm: cardWidth,
          card_height_mm: cardHeight,
          background_url: backgroundUrl,
          logo_url: currentSchoolLogo,
        });

        // Update list in state
        setTemplates((prev) => prev.map((t) => (t.id === savedTemplate.id ? savedTemplate : t)));
      } else {
        savedTemplate = await createIdCardTemplate({
          project_id: project.id,
          name,
          layout: layoutWithSchema,
          card_width_mm: cardWidth,
          card_height_mm: cardHeight,
          background_url: backgroundUrl,
          logo_url: currentSchoolLogo,
        });

        // Add to list in state
        setTemplates((prev) => [savedTemplate, ...prev.filter((t) => t.id !== savedTemplate.id)]);
      }

      // Always set the saved template as state source of truth
      setTemplate(savedTemplate);
      setName(savedTemplate.name);
      setLayout(savedTemplate.layout);
      setCardWidth(savedTemplate.card_width_mm);
      setCardHeight(savedTemplate.card_height_mm);
      lastSavedSnapshotRef.current = JSON.stringify({
        name: savedTemplate.name,
        layout: savedTemplate.layout,
        cardWidth: savedTemplate.card_width_mm,
        cardHeight: savedTemplate.card_height_mm,
      });
      setSearchParams({ templateId: savedTemplate.id });

      // Always ensure the project points to this active saved template ID
      await updateIdCardProject(project.id, { template_id: savedTemplate.id });

      // Clear any cached canvas renders to prevent stale preview/print images
      clearCardDataUrlCache();

      // Refresh parent project state so other tabs immediately see the updated template_id
      await reloadProject();

      if (diff.addedRequiredFields.length > 0 || diff.removedFields.length > 0) {
        setSchemaChangeNotice({
          addedCount: diff.addedRequiredFields.length,
          addedLabels: diff.addedRequiredFields.map((f) => f.label),
          affectedStudentsCount,
          removedLabels: diff.removedFields.map((f) => f.label),
        });
      }

      setSaveSuccess(`Template "${savedTemplate.name}" saved successfully and added to list!`);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err) {
      const appErr = classifySupabaseError(err);
      alert(errorCodeToUserMessage(appErr.code, appErr.message));
    } finally {
      setSaving(false);
    }
  }

  function handleDimensionsChange(w: number, h: number) {
    setCardWidth(w);
    setCardHeight(h);
  }

  function handleGoToPreview() {
    const activeId = template?.id || project.template_id;
    if (activeId) {
      navigate(`../preview?templateId=${activeId}`);
    } else {
      navigate('../preview');
    }
  }

  function handleGoToStudents() {
    navigate('../persons');
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading templates...
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        Unable to load template: {state.message}
      </div>
    );
  }

  const isEditingExisting = Boolean(template);

  return (
    <div className="space-y-4">
      {/* ── Saved Templates Gallery & List ─────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Saved Templates ({templates.length})
              </h2>
              <p className="text-xs text-slate-500">
                Select a saved template to edit or assign it as the active design for this project.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImportReferenceDesign}
              title="Load standard Landscape reference design with front/back artwork"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200"
            >
              <Wand2 size={14} className="text-emerald-600" /> Import Reference Design
            </button>
            <button
              type="button"
              onClick={handleNewTemplate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-2xs cursor-pointer"
            >
              <Plus size={14} /> + Create New Template
            </button>
          </div>
        </div>

        {/* Templates List Cards */}
        {templates.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No templates saved for this project yet. Click <strong className="text-slate-700 font-semibold">+ Create New Template</strong> or <strong className="text-emerald-700 font-semibold">Import Reference Design</strong> to get started.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const isSelected = template?.id === t.id;
              const isActive = project.template_id === t.id;
              const isDouble = Boolean(t.layout?.isDoubleSided || t.layout?.back);
              const isLandscape = t.card_width_mm > t.card_height_mm;

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`relative flex flex-col justify-between rounded-lg border p-3 transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div>
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Star size={10} className="fill-emerald-600 text-emerald-600" /> Active Project
                        </span>
                      )}
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          <Edit3 size={10} /> Editing Now
                        </span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 font-bold text-[10px] ${isLandscape ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
                        {isLandscape ? 'Landscape' : 'Portrait'} ({t.card_width_mm}×{t.card_height_mm}mm)
                      </span>
                      <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-700">
                        {isDouble ? 'Dual-Sided' : 'Single-Sided'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-bold text-slate-900 truncate" title={t.name}>
                      {t.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {t.layout?.backgroundUrl ? '🎨 Custom Artwork BG' : '📄 Color / Clean Template'}
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetActive(t);
                          }}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                          title="Set as active template for this project"
                        >
                          <Check size={12} /> Set Active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(t);
                        }}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 transition"
                        title="Duplicate template"
                      >
                        <Copy size={11} /> Clone
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Delete template"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top Header & Actions Bar ───────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">Template Name:</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-slate-400 focus:outline-none min-w-[200px]"
            placeholder="e.g. Sparknest Academy Standard"
          />
          <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
            {cardWidth} × {cardHeight} mm
          </span>

          {template && (
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              Editing: {template.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 size={14} /> {saveSuccess}
            </span>
          )}

          <button
            type="button"
            onClick={handleGoToStudents}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <FileText size={14} /> Go to Students
          </button>
          <button
            type="button"
            onClick={handleGoToPreview}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <Eye size={14} /> Preview Design
          </button>

          <button
            type="button"
            onClick={handleSetAsDefaultDesign}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-100 cursor-pointer transition"
            title="Make this current layout the default design whenever you click '+ New Template' or create a new project"
          >
            <Star size={13} className="text-amber-600 fill-amber-500" /> Set as Default for New Templates
          </button>

          {isEditingExisting && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              title="Save current layout as a new template in the list"
            >
              <Copy size={13} /> Save as New
            </button>
          )}

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Saving...' : isEditingExisting ? 'Save Changes' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* ── School / Institution Logo Configuration Panel (Always Asked / Configurable) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-2xs">
              <Building2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  School / Institution Logo
                </h3>
                {currentSchoolLogo ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 size={11} /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Required for Digital Verification
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official logo for <strong>{project.name}</strong>. Used across the Online Digital ID Verification portal (`/verify/:id`), student records, and ID card designs.
              </p>
            </div>
          </div>

          {/* Canvas Placement Badge / Quick Add */}
          <div className="flex items-center gap-2">
            {hasLogoFieldOnCanvas ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                <Check size={12} /> Placed on Canvas
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAddLogoToCanvas}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md border border-slate-200 transition cursor-pointer"
                title="Place a school logo element onto the card design"
              >
                <Plus size={12} /> Add Logo to ID Card Design
              </button>
            )}
          </div>
        </div>

        {/* Logo Upload & Preview Controls */}
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Preview Thumbnail */}
          <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            {currentSchoolLogo ? (
              <img
                src={currentSchoolLogo}
                alt={project.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                <ImageIcon size={20} />
                <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">No Logo</span>
              </div>
            )}
          </div>

          {/* Action Buttons & Direct Input */}
          <div className="flex-1 w-full space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition ${
                  uploadingLogo ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                <span>{uploadingLogo ? 'Uploading Logo...' : currentSchoolLogo ? 'Change School Logo' : 'Upload School Logo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>

              {currentSchoolLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition cursor-pointer"
                >
                  <Trash2 size={12} /> Remove Logo
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="url"
                disabled={uploadingLogo}
                value={currentSchoolLogo || ''}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                placeholder="Or enter direct image URL (e.g. https://.../school-logo.png)"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
              />
            </div>

            {uploadLogoError && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 mt-1">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0 text-red-600" />
                  <span>{uploadLogoError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadLogoError(null)}
                  className="rounded px-1 text-[11px] font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── School / Institution Details & Card Back Defaults Panel (Admin Configuration) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700 shadow-2xs">
              <Building2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  School / Institution Details & Card Back Defaults
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                  Configured Once by Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set institution info, campus return address, website/helpline, and lost card return terms once. Applied automatically across templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncSchoolDetails}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <RefreshCw size={13} /> Sync to ID Card Elements
            </button>
            <button
              type="button"
              onClick={() => setShowSchoolDetails((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              {showSchoolDetails ? 'Hide Details' : 'Edit Details'}
            </button>
          </div>
        </div>

        {syncedDetailsSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>Successfully updated school name, subtitle, terms, website, and address in card layout!</span>
          </div>
        )}

        {showSchoolDetails && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                School / Institution Name (Front Side Header)
              </label>
              <input
                type="text"
                value={project.name}
                disabled
                className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-600 font-semibold cursor-not-allowed"
                title="Project school name"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  School Subtitle / Affiliation / Tagline (Front Side)
                </label>
                <span className="text-[9.5px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Alt + Enter ↵
                </span>
              </div>
              <textarea
                rows={2}
                value={schoolSubtitle}
                onChange={(e) => setSchoolSubtitle(e.target.value)}
                onKeyDown={(e) => handleAltEnterKeyDown(e, (val) => setSchoolSubtitle(val))}
                placeholder="e.g. Affiliated to CBSE, New Delhi"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none resize-y min-h-[44px]"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Lost Card Notice & Return Policy (Card Back Side Terms)
                </label>
                <span className="text-[9.5px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Alt + Enter ↵
                </span>
              </div>
              <textarea
                rows={2}
                value={schoolTerms}
                onChange={(e) => setSchoolTerms(e.target.value)}
                onKeyDown={(e) => handleAltEnterKeyDown(e, (val) => setSchoolTerms(val))}
                placeholder="e.g. In case of theft or loss it is mandatory for the Student to inform the Administration Office. If found abandoned, may please be returned to..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none resize-y min-h-[50px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  School / Campus Address (Card Back Return Address)
                </label>
                <span className="text-[9.5px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Alt + Enter ↵
                </span>
              </div>
              <textarea
                rows={2}
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                onKeyDown={(e) => handleAltEnterKeyDown(e, (val) => setSchoolAddress(val))}
                placeholder="e.g. Society Area, Clement Town, Dehradun (UTTARAKHAND)"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none resize-y min-h-[44px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Website & Tollfree Helpline (Card Back Footer)
                </label>
                <span className="text-[9.5px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Alt + Enter ↵
                </span>
              </div>
              <textarea
                rows={2}
                value={schoolWebsite}
                onChange={(e) => setSchoolWebsite(e.target.value)}
                onKeyDown={(e) => handleAltEnterKeyDown(e, (val) => setSchoolWebsite(val))}
                placeholder="e.g. www.geu.ac.in || Tollfree: 1800 270 1280"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none resize-y min-h-[44px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Template Dynamic Fields Requirement Summary Panel ──────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Template Fields Requirement Summary
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            These dynamic fields determine what student information will be collected for this project.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          {/* 1. Student Data Requirements */}
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-2.5">
            <span className="font-bold text-blue-950 block mb-1.5">
              Student Data ({fieldSchema.studentInputFields.length + fieldSchema.assetFields.length}):
            </span>
            {fieldSchema.studentInputFields.length === 0 && fieldSchema.assetFields.length === 0 ? (
              <span className="text-slate-400 italic text-[11px]">No student dynamic fields added yet.</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {[...fieldSchema.studentInputFields, ...fieldSchema.assetFields].map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center gap-1 rounded bg-blue-100/80 px-2 py-0.5 text-[11px] font-medium text-blue-900"
                  >
                    ✓ {f.label} {f.required && <strong className="text-blue-600">*</strong>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. Auto-Generated Fields */}
          <div className="rounded-lg bg-purple-50/60 border border-purple-100 p-2.5">
            <span className="font-bold text-purple-950 block mb-1.5">
              Auto Generated ({fieldSchema.autoGeneratedFields.length}):
            </span>
            {fieldSchema.autoGeneratedFields.length === 0 ? (
              <span className="text-slate-400 italic text-[11px]">No barcodes / QR codes configured.</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {fieldSchema.autoGeneratedFields.map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center gap-1 rounded bg-purple-100/80 px-2 py-0.5 text-[11px] font-medium text-purple-900"
                  >
                    <Sparkles size={11} className="text-purple-600" /> {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. Static Template Elements */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
            <span className="font-bold text-slate-700 block mb-1.5">
              Static / Preset ({fieldSchema.staticFields.length}):
            </span>
            {fieldSchema.staticFields.length === 0 ? (
              <span className="text-slate-400 italic text-[11px]">None</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {fieldSchema.staticFields.slice(0, 4).map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-700"
                  >
                    {f.label}
                  </span>
                ))}
                {fieldSchema.staticFields.length > 4 && (
                  <span className="text-[10px] text-slate-500 self-center">
                    +{fieldSchema.staticFields.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schema Change Notice / Impact Banner */}
      {schemaChangeNotice && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-900 space-y-1">
          {schemaChangeNotice.addedLabels.length > 0 && (
            <div className="flex items-start gap-2">
              <Info size={15} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-indigo-950">
                  Template adds required field(s): {schemaChangeNotice.addedLabels.join(', ')}
                </p>
                {schemaChangeNotice.affectedStudentsCount > 0 ? (
                  <p className="text-slate-600 text-[11px]">
                    {schemaChangeNotice.affectedStudentsCount} existing student(s) are missing this information. You can edit them in the Students tab.
                  </p>
                ) : (
                  <p className="text-slate-600 text-[11px]">
                    All existing student records already meet the updated template requirements.
                  </p>
                )}
              </div>
            </div>
          )}

          {schemaChangeNotice.removedLabels.length > 0 && (
            <div className="flex items-start gap-2 pt-1 border-t border-indigo-100 text-[11px] text-slate-600">
              <span>
                ℹ️ Fields no longer required by template: <strong>{schemaChangeNotice.removedLabels.join(', ')}</strong>. Existing student data is safely preserved in the database.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Warnings List if any */}
      {validationWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <AlertCircle size={14} className="text-amber-600" />
            <span>Template Advisory Warnings:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Visual Template Editor */}
      <div>
        <TemplateEditor
          layout={layout}
          onChange={setLayout}
          widthMm={cardWidth}
          heightMm={cardHeight}
          onDimensionsChange={handleDimensionsChange}
          savedTemplates={templates}
          onSelectSavedTemplate={handleSelectTemplate}
          schoolLogoUrl={currentSchoolLogo}
          schoolName={project.name}
          persons={projectPersons}
        />
      </div>

      {/* Create New ID Card Step-by-Step Wizard Modal */}
      {showCreateWizard && (
        <CreateIdCardWizardModal
          isOpen={showCreateWizard}
          onClose={() => setShowCreateWizard(false)}
          onComplete={handleWizardComplete}
          savedTemplates={templates}
          projectName={project.name}
        />
      )}
    </div>
  );
}

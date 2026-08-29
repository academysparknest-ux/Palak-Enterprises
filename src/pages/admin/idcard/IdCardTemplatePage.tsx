import { useEffect, useMemo, useState, useCallback } from 'react';
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
} from 'lucide-react';
import {
  getIdCardTemplates,
  createIdCardTemplate,
  updateIdCardTemplate,
  deleteIdCardTemplate,
  updateIdCardProject,
  getAllIdCardPersons,
} from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
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
import type { IdCardProject, IdCardTemplate, TemplateLayout } from '../../../lib/idcard/types';

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

  // Derive dynamic template field schema in real-time
  const fieldSchema = useMemo(() => extractTemplateFieldSchema(layout), [layout]);

  const loadTemplates = useCallback(async (targetId?: string | null) => {
    setState({ kind: 'loading' });
    try {
      const list = await getIdCardTemplates(project.id);
      setTemplates(list);

      const activeTargetId = targetId !== undefined ? targetId : (queryTemplateId || project.template_id);
      const existing = activeTargetId ? (list.find((t) => t.id === activeTargetId) ?? null) : (list[0] ?? null);

      if (existing) {
        setTemplate(existing);
        setName(existing.name);
        setLayout(existing.layout);
        setCardWidth(existing.card_width_mm);
        setCardHeight(existing.card_height_mm);
      } else {
        // No templates exist yet: default editor layout
        setTemplate(null);
        setName(`${project.name} Template`);
        setLayout(DEFAULT_TEMPLATE_LAYOUT);
        setCardWidth(DEFAULT_CARD_WIDTH);
        setCardHeight(DEFAULT_CARD_HEIGHT);
      }
      setState({ kind: 'ready' });
    } catch (err) {
      const appErr = classifySupabaseError(err);
      setState({ kind: 'error', message: errorCodeToUserMessage(appErr.code, appErr.message) });
    }
  }, [project.id, project.name, project.template_id, queryTemplateId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
    setTemplate(null);
    setName(`${project.name} New Design`);
    setLayout(DEFAULT_TEMPLATE_LAYOUT);
    setCardWidth(DEFAULT_CARD_WIDTH);
    setCardHeight(DEFAULT_CARD_HEIGHT);
    setSearchParams({});
    setSaveSuccess(null);
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

          <button
            type="button"
            onClick={handleNewTemplate}
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
          >
            <Plus size={14} /> Create New Template
          </button>
        </div>

        {/* Templates List Cards */}
        {templates.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No templates saved for this project yet. Customize the design below and click{' '}
            <strong className="text-slate-700 font-semibold">Save Template</strong>.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const isSelected = template?.id === t.id;
              const isActive = project.template_id === t.id;
              const isDouble = Boolean(t.layout?.isDoubleSided || t.layout?.back);

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
                      <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                        {t.card_width_mm}×{t.card_height_mm}mm
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
                      {t.layout?.backgroundUrl ? '🎨 Custom Artwork BG' : '📄 Color / SVG Template'}
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
        />
      </div>
    </div>
  );
}

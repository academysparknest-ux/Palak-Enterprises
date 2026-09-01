import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Loader2, LayoutTemplate, User, AlertCircle } from 'lucide-react';
import { getIdCardPersons, getIdCardTemplates, getIdCardTemplate } from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import { validatePersonForTemplate } from '../../../lib/idcard/templateFieldSchema';
import { IdCardPreview } from '../../../components/idcard/IdCardPreview';
import { sanitizeStudentId } from '../../../lib/idcard/validation';
import type { IdCardProject, IdCardPerson, IdCardTemplate } from '../../../lib/idcard/types';

type ProjectContext = { project: IdCardProject };
type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export default function IdCardPreviewPage() {
  const { project } = useOutletContext<ProjectContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTemplateId = searchParams.get('templateId');

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [persons, setPersons] = useState<IdCardPerson[]>([]);
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [template, setTemplate] = useState<IdCardTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const targetTemplateId = queryTemplateId || project.template_id;

    Promise.all([
      getIdCardPersons(project.id, { pageSize: 100 }),
      getIdCardTemplates(project.id),
      targetTemplateId ? getIdCardTemplate(targetTemplateId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([personsResult, projectTemplates, explicitTemplate]) => {
        if (cancelled) return;
        setPersons(personsResult.data);
        setTemplates(projectTemplates);

        // Authoritative template resolution:
        // 1. Direct fetch of target template (queryParam or project.template_id)
        // 2. Lookup in projectTemplates by queryTemplateId
        // 3. Lookup in projectTemplates by project.template_id
        // (Do NOT silently fall back to an arbitrary template)
        const resolvedTemplate =
          explicitTemplate ??
          (queryTemplateId ? projectTemplates.find((t) => t.id === queryTemplateId) : null) ??
          (project.template_id ? projectTemplates.find((t) => t.id === project.template_id) : null) ??
          null;

        if (import.meta.env.DEV) {
          console.debug('[ID CARD DEBUG]', {
            'Preview Template ID': resolvedTemplate?.id || '(none)',
            'Project Template ID': project.template_id || '(none)',
            'URL Template ID': queryTemplateId || '(none)',
            'Front Background': resolvedTemplate?.layout?.backgroundUrl ? 'Present (Custom)' : 'None (Color/Default)',
            'Back Background': resolvedTemplate?.layout?.back?.backgroundUrl ? 'Present (Custom)' : 'None (Color/Default)',
            'Header SVG': resolvedTemplate?.layout?.headerSvg ? 'Present (Preset)' : 'None (Null/Suppressed)',
            'Footer SVG': resolvedTemplate?.layout?.footerSvg ? 'Present (Preset)' : 'None (Null/Suppressed)',
            'Updated At': resolvedTemplate?.updated_at,
          });
        }

        setTemplate(resolvedTemplate);

        if (personsResult.data[0]) {
          setSelectedId((prev) => (prev && personsResult.data.some((p) => p.id === prev) ? prev : personsResult.data[0].id));
        }

        if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            if (!cancelled) setState({ kind: 'ready' });
          }).catch(() => {
            if (!cancelled) setState({ kind: 'ready' });
          });
        } else {
          setState({ kind: 'ready' });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ kind: 'error', message: errorCodeToUserMessage(classifySupabaseError(err).code) });
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, project.template_id, queryTemplateId]);

  function handleTemplateSelect(templateId: string) {
    const selected = templates.find((t) => t.id === templateId);
    if (selected) {
      setTemplate(selected);
      setSearchParams({ templateId: selected.id });
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading preview...
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        Unable to load preview: {state.message}
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-slate-400">
        No template configured yet. Set one up in the Template tab first.
      </div>
    );
  }

  if (persons.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-slate-400">
        No students to preview yet. Add students first.
      </div>
    );
  }

  const selectedPerson = persons.find((p) => p.id === selectedId) ?? persons[0];
  const personValidation = validatePersonForTemplate(selectedPerson, template);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Student Selector */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <User size={14} className="text-slate-400" />
            Student:
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-400 focus:outline-none"
          >
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({sanitizeStudentId(p.student_id)})
              </option>
            ))}
          </select>
        </div>

        {/* Template Selector (if multiple templates exist) */}
        {templates.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <LayoutTemplate size={14} className="text-slate-400" />
              Template:
            </label>
            <select
              value={template.id}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-400 focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.card_width_mm}×{t.card_height_mm}mm)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active Template Meta */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{template.name}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
            {template.card_width_mm} × {template.card_height_mm} mm
          </span>
        </div>
      </div>

      {/* Validation Alert if Student is missing template required fields */}
      {!personValidation.valid && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Incomplete Student Record for Selected Template</p>
            <p className="text-slate-700 text-[11px] mt-0.5">
              Missing required field(s): <span className="font-semibold text-red-600">{personValidation.missingFields.join(', ')}</span>.
            </p>
          </div>
        </div>
      )}

      <div>
        <IdCardPreview
          key={`${template.id}-${template.updated_at || ''}-${selectedPerson.id}`}
          person={selectedPerson}
          template={template}
          schoolName={project.name}
          academicYear={project.academic_year}
        />
      </div>
    </div>
  );
}

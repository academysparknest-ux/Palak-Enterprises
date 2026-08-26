import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  getIdCardTemplates,
  createIdCardTemplate,
  updateIdCardTemplate,
  updateIdCardProject,
} from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import {
  TemplateEditor,
  DEFAULT_TEMPLATE_LAYOUT,
  DEFAULT_CARD_WIDTH,
  DEFAULT_CARD_HEIGHT,
} from '../../../components/idcard/TemplateEditor';
import type { IdCardProject, IdCardTemplate, TemplateLayout } from '../../../lib/idcard/types';

type ProjectContext = { project: IdCardProject; reloadProject: () => void };

type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export default function IdCardTemplatePage() {
  const { project, reloadProject } = useOutletContext<ProjectContext>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [template, setTemplate] = useState<IdCardTemplate | null>(null);
  const [name, setName] = useState('Sparknest Academy');
  const [layout, setLayout] = useState<TemplateLayout>(DEFAULT_TEMPLATE_LAYOUT);
  const [cardWidth, setCardWidth] = useState(DEFAULT_CARD_WIDTH);
  const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_HEIGHT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    getIdCardTemplates(project.id)
      .then((templates) => {
        if (cancelled) return;
        const existing = templates.find((t) => t.id === project.template_id) ?? templates[0] ?? null;
        if (existing) {
          setTemplate(existing);
          setName(existing.name);
          setLayout(existing.layout);
          setCardWidth(existing.card_width_mm);
          setCardHeight(existing.card_height_mm);
        }
        setState({ kind: 'ready' });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ kind: 'error', message: errorCodeToUserMessage(classifySupabaseError(err).code) });
      });
    return () => {
      cancelled = true;
    };
  }, [project.id, project.template_id]);

  async function handleSave() {
    setSaving(true);
    try {
      if (template) {
        const updated = await updateIdCardTemplate(template.id, {
          name,
          layout,
          card_width_mm: cardWidth,
          card_height_mm: cardHeight,
        });
        setTemplate(updated);
      } else {
        const created = await createIdCardTemplate({
          project_id: project.id,
          name,
          layout,
          card_width_mm: cardWidth,
          card_height_mm: cardHeight,
          background_url: null,
        });
        setTemplate(created);
        await updateIdCardProject(project.id, { template_id: created.id });
        reloadProject();
      }
    } catch (err) {
      alert(errorCodeToUserMessage(classifySupabaseError(err).code));
    } finally {
      setSaving(false);
    }
  }

  function handleDimensionsChange(w: number, h: number) {
    setCardWidth(w);
    setCardHeight(h);
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading template...
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium"
          />
          <span className="text-xs text-slate-400">
            {cardWidth}×{cardHeight}mm
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      <div className="mt-5">
        <TemplateEditor
          layout={layout}
          onChange={setLayout}
          widthMm={cardWidth}
          heightMm={cardHeight}
          onDimensionsChange={handleDimensionsChange}
        />
      </div>
    </div>
  );
}

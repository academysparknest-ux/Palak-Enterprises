import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getIdCardPersons, getIdCardTemplates } from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import { IdCardPreview } from '../../../components/idcard/IdCardPreview';
import type { IdCardProject, IdCardPerson, IdCardTemplate } from '../../../lib/idcard/types';

type ProjectContext = { project: IdCardProject };
type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export default function IdCardPreviewPage() {
  const { project } = useOutletContext<ProjectContext>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [persons, setPersons] = useState<IdCardPerson[]>([]);
  const [template, setTemplate] = useState<IdCardTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    Promise.all([getIdCardPersons(project.id, { pageSize: 100 }), getIdCardTemplates(project.id)])
      .then(([personsResult, templates]) => {
        if (cancelled) return;
        setPersons(personsResult.data);
        const activeTemplate = templates.find((t) => t.id === project.template_id) ?? templates[0] ?? null;
        setTemplate(activeTemplate);
        if (personsResult.data[0]) setSelectedId(personsResult.data[0].id);
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

  return (
    <div>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
      >
        {persons.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.student_id})
          </option>
        ))}
      </select>

      <div className="mt-5">
        <IdCardPreview person={selectedPerson} template={template} schoolName={project.name} academicYear={project.academic_year} />
      </div>
    </div>
  );
}

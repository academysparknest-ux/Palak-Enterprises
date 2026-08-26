import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getIdCardProject, updateIdCardProject } from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import type { IdCardProject, ProjectStatus } from '../../../lib/idcard/types';

type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; project: IdCardProject };

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'persons', label: 'Students' },
  { to: 'template', label: 'Template' },
  { to: 'preview', label: 'Preview' },
  { to: 'generate', label: 'Generate' },
];

const STATUS_OPTIONS: ProjectStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

export default function IdCardProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!projectId) return;
    setState({ kind: 'loading' });
    try {
      const project = await getIdCardProject(projectId);
      setState({ kind: 'ready', project });
    } catch (err) {
      setState({ kind: 'error', message: errorCodeToUserMessage(classifySupabaseError(err).code) });
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: ProjectStatus) {
    if (!projectId) return;
    try {
      const updated = await updateIdCardProject(projectId, { status });
      setState({ kind: 'ready', project: updated });
    } catch (err) {
      alert(errorCodeToUserMessage(classifySupabaseError(err).code));
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading project...
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">Unable to load project: {state.message}</p>
        <button onClick={load} className="mt-2 text-sm font-medium text-red-800 underline">
          Retry
        </button>
      </div>
    );
  }

  const { project } = state;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{project.academic_year}</p>
        </div>
        <select
          value={project.status}
          onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm font-medium ${
                isActive ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet context={{ project, reloadProject: load }} />
      </div>
    </div>
  );
}

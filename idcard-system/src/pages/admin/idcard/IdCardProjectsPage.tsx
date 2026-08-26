import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { getIdCardProjects, createIdCardProject } from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import { projectSchema } from '../../../lib/idcard/validation';
import type { IdCardProject } from '../../../lib/idcard/types';
import { ProjectCard } from '../../../components/idcard/ProjectCard';

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; projects: IdCardProject[] };

export default function IdCardProjectsPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [search, setSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);

  const load = useCallback(async (searchTerm?: string) => {
    setState({ kind: 'loading' });
    try {
      const projects = await getIdCardProjects(searchTerm ? { search: searchTerm } : undefined);
      setState({ kind: 'ready', projects });
    } catch (err) {
      const appError = classifySupabaseError(err);
      setState({ kind: 'error', message: errorCodeToUserMessage(appError.code) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">ID Card Projects</h1>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="relative mt-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div className="mt-6">
        {state.kind === 'loading' && (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={18} /> Loading projects...
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">Unable to load projects: {state.message}</p>
            <button onClick={() => load(search || undefined)} className="mt-2 text-sm font-medium text-red-800 underline">
              Retry
            </button>
          </div>
        )}

        {state.kind === 'ready' && state.projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-slate-400">
            No ID card projects yet.
          </div>
        )}

        {state.kind === 'ready' && state.projects.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => {
            setShowNewProject(false);
            load(search || undefined);
          }}
        />
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = projectSchema.safeParse({ name, academic_year: academicYear, description });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createIdCardProject(result.data);
      onCreated();
    } catch (err) {
      const appError = classifySupabaseError(err);
      setSubmitError(errorCodeToUserMessage(appError.code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">New ID Card Project</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Academic Year</label>
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-27"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            {errors.academic_year && <p className="mt-1 text-xs text-red-600">{errors.academic_year}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

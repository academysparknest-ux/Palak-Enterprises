import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { getIdCardProjects, createIdCardProject, deleteIdCardProject } from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import { projectSchema } from '../../../lib/idcard/validation';
import type { IdCardProject, AppErrorCode } from '../../../lib/idcard/types';
import { ProjectCard } from '../../../components/idcard/ProjectCard';
import { useAuth } from '../../../context/AuthContext';
import { Modal, ConfirmModal } from '../../../components/ui/Modal';

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; code: AppErrorCode }
  | { kind: 'ready'; projects: IdCardProject[] };

export default function IdCardProjectsPage() {
  const { loading: authLoading, isAuthenticated, refreshSession } = useAuth();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [search, setSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState<IdCardProject | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const load = useCallback(async (searchTerm?: string) => {
    setState({ kind: 'loading' });
    try {
      if (import.meta.env.DEV) {
        console.debug('[IDCardProjects] Fetching projects...', { search: searchTerm });
      }
      const projects = await getIdCardProjects(searchTerm ? { search: searchTerm } : undefined);
      setState({ kind: 'ready', projects });
    } catch (err) {
      const appError = classifySupabaseError(err);
      if (import.meta.env.DEV) {
        console.warn('[IDCardProjects] Project load error:', appError);
      }
      setState({
        kind: 'error',
        message: errorCodeToUserMessage(appError.code),
        code: appError.code,
      });
    }
  }, []);

  // Single unified debounced effect: waits for auth loading before firing
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setState({
        kind: 'error',
        message: 'Your session has expired. Please sign in again.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const timeout = setTimeout(() => {
      load(search || undefined);
    }, search ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [authLoading, isAuthenticated, search, load]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (state.kind === 'error' && state.code === 'AUTH_REQUIRED') {
        await refreshSession();
      }
      await load(search || undefined);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDeleteProject = (project: IdCardProject) => {
    setDeletingProject(project);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setDeletingLoading(true);
    try {
      await deleteIdCardProject(deletingProject.id);
      setDeletingProject(null);
      await load(search || undefined);
    } catch (err) {
      const appError = classifySupabaseError(err);
      alert(`Failed to delete project: ${errorCodeToUserMessage(appError.code, appError.message)}`);
    } finally {
      setDeletingLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="mr-2 animate-spin text-[#123B70]" size={22} />
          <span className="text-sm font-medium text-slate-600">Initializing ID Card Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">ID Card Projects</h1>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6">
        {state.kind === 'loading' && (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={18} /> Loading projects...
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
            <p className="text-sm font-medium text-red-800">{state.message}</p>
            {state.code === 'AUTH_REQUIRED' ? (
              <Link
                to="/admin"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700"
              >
                <LogIn size={14} /> Sign In
              </Link>
            ) : (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isRetrying && <Loader2 className="animate-spin" size={14} />}
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        )}

        {state.kind === 'ready' && state.projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center text-slate-400">
            No ID card projects found. Create one to get started.
          </div>
        )}

        {state.kind === 'ready' && state.projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.projects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
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

      {deletingProject && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingProject(null)}
          onConfirm={handleConfirmDelete}
          title="Delete ID Card Project?"
          message={
            <span>
              Are you sure you want to delete <strong className="text-slate-900">{deletingProject.name}</strong> ({deletingProject.academic_year})?
              <br /><br />
              This will permanently delete this project, all associated student records, uploaded photos, and templates. This action cannot be undone.
            </span>
          }
          confirmText="Yes, Delete Project"
          isDestructive={true}
          loading={deletingLoading}
        />
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = projectSchema.safeParse({
      name: name.trim(),
      academic_year: academicYear.trim(),
      description: description.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
    });
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
      setSubmitError(errorCodeToUserMessage(appError.code, appError.message));
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-project-form"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-2xs"
      >
        {submitting ? 'Creating...' : 'Create Project'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="New ID Card Project"
      subtitle="Create a new student ID card project for an institution or academic batch."
      size="md"
      footer={footer}
      closeOnBackdropClick={false}
      preventEscapeClose={submitting}
    >
      <form id="new-project-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs font-bold text-slate-700">School / Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Roshani Public School"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
          />
          {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">Academic Year</label>
          <input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2026-27"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
          />
          {errors.academic_year && <p className="mt-1 text-[11px] text-red-600">{errors.academic_year}</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">School / Institution Logo URL (optional)</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://.../logo.png (or upload later in Template)"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
          />
        </div>

        {submitError && (
          <p className="rounded-lg bg-red-50 p-2 text-xs font-medium text-red-600 border border-red-200">
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}

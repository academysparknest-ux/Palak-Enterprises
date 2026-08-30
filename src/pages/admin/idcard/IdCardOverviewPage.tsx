import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteIdCardProject } from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import type { IdCardProject } from '../../../lib/idcard/types';

type ProjectContext = { project: IdCardProject; reloadProject: () => void };

export default function IdCardOverviewPage() {
  const { project } = useOutletContext<ProjectContext>();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteProject() {
    const ok = window.confirm(
      `Are you sure you want to permanently delete "${project.name}"?\n\nThis will remove all students, uploaded photos, and generated cards associated with this project. This action cannot be undone.`
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteIdCardProject(project.id);
      navigate('/admin/id-cards', { replace: true });
    } catch (err) {
      setIsDeleting(false);
      const appError = classifySupabaseError(err);
      alert(`Failed to delete project: ${errorCodeToUserMessage(appError.code, appError.message)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-500">Description</h2>
        <p className="mt-1 text-slate-700">{project.description || 'No description provided.'}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Status" value={project.status} />
        <Stat label="Academic Year" value={project.academic_year} />
        <Stat label="Created" value={new Date(project.created_at).toLocaleDateString()} />
        <Stat label="Updated" value={new Date(project.updated_at).toLocaleDateString()} />
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50/40 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-900">
              <AlertTriangle size={16} className="text-red-600" /> Danger Zone
            </h3>
            <p className="mt-1 text-xs text-red-700">
              Permanently delete this ID card project, including all student records, photo assets, and template settings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteProject}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-md bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

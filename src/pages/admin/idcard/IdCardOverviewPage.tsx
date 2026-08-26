import { useOutletContext } from 'react-router-dom';
import type { IdCardProject } from '../../../lib/idcard/types';

type ProjectContext = { project: IdCardProject; reloadProject: () => void };

export default function IdCardOverviewPage() {
  const { project } = useOutletContext<ProjectContext>();

  return (
    <div className="space-y-4">
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

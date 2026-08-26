import { Link } from 'react-router-dom';
import type { IdCardProject } from '../../lib/idcard/types';

const STATUS_STYLES: Record<IdCardProject['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
};

export function ProjectCard({ project }: { project: IdCardProject }) {
  return (
    <Link
      to={`/admin/id-cards/${project.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-900">{project.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{project.academic_year}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}>
          {project.status}
        </span>
      </div>
      {project.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{project.description}</p>}
    </Link>
  );
}

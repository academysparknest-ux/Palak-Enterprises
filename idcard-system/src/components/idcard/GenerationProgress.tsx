import type { GenerationProgress as Progress } from '../../lib/idcard/generation';

export function GenerationProgressBar({ progress }: { progress: Progress }) {
  const pct = progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100);

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-sm text-slate-500">
        <span>
          {progress.completed} / {progress.total} processed
        </span>
        <span className="flex gap-3">
          <span className="text-emerald-600">{progress.succeeded} succeeded</span>
          {progress.failed > 0 && <span className="text-red-600">{progress.failed} failed</span>}
        </span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Search, Calendar, FileSpreadsheet, Eye, CheckCircle2,
  AlertTriangle, Clock, User, Layers,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { PrintSession } from '../../lib/idcard/printSessionManager';
import { getProjectPrintSessions, exportPrintSessionReport } from '../../lib/idcard/printSessionManager';

export interface PrintSessionsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSelectSessionForView: (session: PrintSession) => void;
}

export function PrintSessionsHistoryModal({
  isOpen,
  onClose,
  projectId,
  onSelectSessionForView,
}: PrintSessionsHistoryModalProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'INTERRUPTED'>('ALL');

  if (!isOpen) return null;

  const sessions = getProjectPrintSessions(projectId);

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = s.sessionId.toLowerCase().includes(q);
      const matchOp = s.operator.toLowerCase().includes(q);
      const matchTmpl = s.templateName.toLowerCase().includes(q);
      const matchStudent = s.items.some(
        (i) => i.studentName.toLowerCase().includes(q) || i.studentId.toLowerCase().includes(q)
      );
      if (!matchId && !matchOp && !matchTmpl && !matchStudent) return false;
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Sessions & Production Audit History"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-slate-500">
            Total Saved Sessions: <strong>{sessions.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search session ID, operator, template, student..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Outcomes ({sessions.length})</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIALLY_FAILED">With Failures</option>
              <option value="INTERRUPTED">Interrupted</option>
            </select>
          </div>
        </div>

        {/* Sessions List */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 rounded-xl border border-dashed border-slate-200">
              No print sessions recorded matching your criteria.
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="space-y-1 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">{session.sessionId}</span>
                    {session.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 size={11} /> Completed
                      </span>
                    )}
                    {session.status === 'PARTIALLY_FAILED' && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        <AlertTriangle size={11} /> {session.failedCount} Failed
                      </span>
                    )}
                    {session.status === 'INTERRUPTED' && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        <Clock size={11} /> Interrupted
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(session.createdAt).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} /> {session.operator}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={12} /> {session.templateName}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="flex items-center gap-3 text-center text-[11px]">
                  <div className="px-2 py-1 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Req</span>
                    <strong className="text-slate-700">{session.requestedCount}</strong>
                  </div>
                  <div className="px-2 py-1 bg-emerald-50 rounded border border-emerald-100 text-emerald-800">
                    <span className="text-emerald-500 block text-[10px]">Printed</span>
                    <strong>{session.successfulCount}</strong>
                  </div>
                  {session.failedCount > 0 && (
                    <div className="px-2 py-1 bg-rose-50 rounded border border-rose-100 text-rose-800">
                      <span className="text-rose-500 block text-[10px]">Failed</span>
                      <strong>{session.failedCount}</strong>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportPrintSessionReport(session)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    title="Export session report to Excel (.xlsx)"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600" /> Export
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSessionForView(session)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                  >
                    <Eye size={13} /> View Session
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

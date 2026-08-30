import { CheckCircle2, XCircle, Pencil, AlertCircle } from 'lucide-react';
import type { IdCardPerson, IdCardTemplate, TemplateFieldSchema } from '../../lib/idcard/types';
import { validateStudentForIdCard } from '../../lib/idcard/statusEngine';
import { sanitizeStudentId } from '../../lib/idcard/validation';
import { Modal } from '../ui/Modal';

export function StudentMissingInfoModal({
  person,
  template,
  schema,
  isOpen,
  onClose,
  onEdit,
}: {
  person: IdCardPerson | null;
  template?: IdCardTemplate | null;
  schema?: TemplateFieldSchema | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (person: IdCardPerson) => void;
}) {
  if (!person) return null;

  const val = validateStudentForIdCard(person, schema, template);

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-slate-500">
        {val.ready ? (
          <span className="font-semibold text-emerald-700">✓ All requirements complete</span>
        ) : (
          <span className="font-semibold text-amber-700">
            {val.missingFields.length} required field(s) missing
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit(person);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs cursor-pointer"
        >
          <Pencil size={13} /> Fix Student Information
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={val.ready ? 'Student Information Complete' : 'Missing Information Details'}
      subtitle={`Review ID card template requirements for ${person.name}`}
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Student Profile Card */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {person.photo_url ? (
              <img src={person.photo_url} alt={person.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 h-full w-full flex items-center justify-center">
                No Photo
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 truncate">{person.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono">{sanitizeStudentId(person.student_id)}</span>
              {person.class && <span>· Class {person.class}</span>}
              {person.roll_number && <span>· Roll {person.roll_number}</span>}
            </div>
          </div>
          <div>
            {val.ready ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                <CheckCircle2 size={12} /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                <AlertCircle size={12} /> Not Ready
              </span>
            )}
          </div>
        </div>

        {/* Template Requirements Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Template Requirements Checklist
            </h5>
            {template && (
              <span className="text-[11px] text-slate-400 font-medium">{template.name}</span>
            )}
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {val.checklist.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  {item.complete ? (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle size={15} className="text-rose-600 shrink-0" />
                  )}
                  <span className={item.complete ? 'font-medium text-slate-800' : 'font-bold text-rose-900'}>
                    {item.label}
                  </span>
                </div>

                <div className="text-right">
                  {item.complete ? (
                    <span className="text-slate-600 font-mono text-[11px] max-w-[180px] truncate inline-block">
                      {item.key === 'student_photo' ? 'Uploaded' : item.value || 'Provided'}
                    </span>
                  ) : (
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200">
                      Required & Missing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { SortRule, StudentSortField } from '../../lib/idcard/studentSort';

const SORT_FIELD_OPTIONS: Array<{ value: StudentSortField; label: string }> = [
  { value: 'class', label: 'Class & Section (Intelligent Grade Order)' },
  { value: 'roll_number', label: 'Roll Number (Numeric Order)' },
  { value: 'student_id', label: 'Student ID (Numeric Order)' },
  { value: 'name', label: 'Student Name (A → Z)' },
  { value: 'status', label: 'ID Card Status Priority' },
  { value: 'information', label: 'Information Completeness' },
  { value: 'photo', label: 'Photo Availability' },
  { value: 'generated', label: 'Generated Status' },
  { value: 'printed', label: 'Printed Status' },
  { value: 'print_count', label: 'Print Count' },
  { value: 'father_name', label: "Father / Parent Name" },
  { value: 'phone', label: 'Phone Number' },
];

export function MultiSortModal({
  isOpen,
  initialRules,
  onApply,
  onClose,
}: {
  isOpen: boolean;
  initialRules: SortRule[];
  onApply: (rules: SortRule[]) => void;
  onClose: () => void;
}) {
  const [rules, setRules] = useState<SortRule[]>(() =>
    initialRules.length > 0 ? initialRules : [{ field: 'class', ascending: true }, { field: 'roll_number', ascending: true }]
  );

  function addRule() {
    if (rules.length >= 4) return;
    const availableFields = SORT_FIELD_OPTIONS.map((f) => f.value).filter(
      (f) => !rules.some((r) => r.field === f)
    );
    const nextField = availableFields[0] || 'student_id';
    setRules([...rules, { field: nextField, ascending: true }]);
  }

  function removeRule(index: number) {
    const next = rules.filter((_, i) => i !== index);
    setRules(next.length > 0 ? next : [{ field: 'student_id', ascending: true }]);
  }

  function updateField(index: number, field: StudentSortField) {
    const next = [...rules];
    next[index] = { ...next[index], field };
    setRules(next);
  }

  function toggleDirection(index: number) {
    const next = [...rules];
    next[index] = { ...next[index], ascending: !next[index].ascending };
    setRules(next);
  }

  function applyPreset(preset: SortRule[]) {
    setRules(preset);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Column Sorting"
      subtitle="Arrange multiple sorting rules to organize production print batches (e.g. Class then Roll Number)"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => setRules([{ field: 'student_id', ascending: true }])}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Reset to Student ID
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(rules);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
            >
              <Check size={14} /> Apply Multi-Sort
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Quick Presets */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Sorting Presets</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                applyPreset([
                  { field: 'class', ascending: true },
                  { field: 'roll_number', ascending: true },
                  { field: 'student_id', ascending: true },
                ])
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              🏫 Class → Roll Number → ID
            </button>
            <button
              type="button"
              onClick={() => applyPreset([{ field: 'student_id', ascending: true }])}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              🔢 Numeric Student ID
            </button>
            <button
              type="button"
              onClick={() => applyPreset([{ field: 'name', ascending: true }, { field: 'student_id', ascending: true }])}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              🔤 Student Name (A → Z)
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset([
                  { field: 'status', ascending: true },
                  { field: 'class', ascending: true },
                  { field: 'roll_number', ascending: true },
                ])
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              ⚡ Status Priority → Class
            </button>
          </div>
        </div>

        {/* Sort Rules Stack */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Custom Priority Hierarchy</span>

          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  {idx + 1}
                </span>

                <span className="text-xs font-medium text-slate-500 shrink-0">
                  {idx === 0 ? 'Sort by' : 'Then by'}
                </span>

                <select
                  value={rule.field}
                  onChange={(e) => updateField(idx, e.target.value as StudentSortField)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {SORT_FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => toggleDirection(idx)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Toggle ascending / descending"
                >
                  {rule.ascending ? (
                    <>
                      <ArrowUp size={13} className="text-blue-600" /> Ascending
                    </>
                  ) : (
                    <>
                      <ArrowDown size={13} className="text-purple-600" /> Descending
                    </>
                  )}
                </button>

                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                    title="Remove rule"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {rules.length < 4 && (
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
            >
              <Plus size={13} /> Add Next Sort Level
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

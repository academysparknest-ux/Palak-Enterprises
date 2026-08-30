import { RotateCcw, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import {
  type ColumnVisibilityMap,
  DEFAULT_COLUMN_VISIBILITY,
} from '../../lib/idcard/exportUtils';

const COLUMN_DEFINITIONS: Array<{ key: keyof ColumnVisibilityMap; label: string; description: string }> = [
  { key: 'primary', label: 'Primary (Selection Checkbox)', description: 'Row selector for bulk production actions' },
  { key: 'student_id', label: 'Student ID', description: 'Unique identification number with numeric sorting' },
  { key: 'class', label: 'Class & Section', description: 'Intelligent academic grade and section sorting' },
  { key: 'roll', label: 'Roll Number', description: 'Numeric roll number ranking' },
  { key: 'student_name', label: 'Student Name', description: 'Full name with alphabetical sorting' },
  { key: 'photo', label: 'Student Photo', description: 'Photo thumbnail & missing indicator' },
  { key: 'information', label: 'Information & Validation', description: 'Completeness check against active template' },
  { key: 'status', label: 'ID Card Status', description: 'Strict 7-state production workflow badge' },
  { key: 'generated', label: 'Generated Status', description: 'Card rendering generation flag and date' },
  { key: 'printed', label: 'Printed Status', description: 'Physical print confirmation and date' },
  { key: 'print_count', label: 'Print Count', description: 'Print cycle counter for duplicate prevention' },
  { key: 'actions', label: 'Actions', description: 'Context-sensitive inline action buttons' },
];

export function ColumnVisibilityModal({
  isOpen,
  preferences,
  onChange,
  onClose,
}: {
  isOpen: boolean;
  preferences: ColumnVisibilityMap;
  onChange: (updated: ColumnVisibilityMap) => void;
  onClose: () => void;
}) {
  function toggleColumn(key: keyof ColumnVisibilityMap) {
    onChange({
      ...preferences,
      [key]: !preferences[key],
    });
  }

  function handleReset() {
    onChange({ ...DEFAULT_COLUMN_VISIBILITY });
  }

  function handleSelectAll() {
    const allTrue: ColumnVisibilityMap = {
      primary: true,
      student_id: true,
      class: true,
      roll: true,
      student_name: true,
      photo: true,
      information: true,
      status: true,
      generated: true,
      printed: true,
      print_count: true,
      actions: true,
    };
    onChange(allTrue);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Table Columns"
      subtitle="Show or hide spreadsheet columns to optimize your production view"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw size={13} /> Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
            >
              <Check size={14} /> Done
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-2">
          {COLUMN_DEFINITIONS.map((col) => {
            const isChecked = preferences[col.key];
            return (
              <label
                key={col.key}
                className={`flex items-start gap-3 rounded-lg border p-2.5 transition cursor-pointer ${
                  isChecked
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleColumn(col.key)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{col.label}</p>
                  <p className="text-[11px] text-slate-500">{col.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

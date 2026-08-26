import { useState } from 'react';
import { personSchema, bloodGroups, type PersonFormInput } from '../../lib/idcard/validation';
import type { IdCardPerson } from '../../lib/idcard/types';

const FIELDS: { key: keyof PersonFormInput; label: string; required?: boolean }[] = [
  { key: 'student_id', label: 'Student ID', required: true },
  { key: 'name', label: 'Full Name', required: true },
  { key: 'class', label: 'Class' },
  { key: 'section', label: 'Section' },
  { key: 'roll_number', label: 'Roll Number' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'mother_name', label: "Mother's Name" },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
];

export function PersonForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<IdCardPerson>;
  onSubmit: (data: PersonFormInput) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    student_id: initial?.student_id ?? '',
    name: initial?.name ?? '',
    class: initial?.class ?? '',
    section: initial?.section ?? '',
    roll_number: initial?.roll_number ?? '',
    date_of_birth: initial?.date_of_birth ?? '',
    blood_group: initial?.blood_group ?? '',
    father_name: initial?.father_name ?? '',
    mother_name: initial?.mother_name ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = personSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <div key={field.key} className={field.key === 'address' ? 'col-span-2' : ''}>
            <label className="text-sm font-medium text-slate-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              value={values[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            {errors[field.key] && <p className="mt-1 text-xs text-red-600">{errors[field.key]}</p>}
          </div>
        ))}

        <div>
          <label className="text-sm font-medium text-slate-700">Date of Birth</label>
          <input
            type="date"
            value={values.date_of_birth}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Blood Group</label>
          <select
            value={values.blood_group}
            onChange={(e) => handleChange('blood_group', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="">-</option>
            {bloodGroups.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

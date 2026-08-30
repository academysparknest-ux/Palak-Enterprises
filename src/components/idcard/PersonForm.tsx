import { useState, useEffect } from 'react';
import { User, AlertCircle } from 'lucide-react';
import { bloodGroups, normalizeDate, normalizeBloodGroup, normalizePhone, sanitizeStudentId } from '../../lib/idcard/validation';
import type { IdCardPerson, TemplateFieldSchema, TemplateFieldSchemaItem } from '../../lib/idcard/types';
import { extractTemplateFieldSchema } from '../../lib/idcard/templateFieldSchema';

export function PersonForm({
  initial,
  schema,
  serverError,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<IdCardPerson>;
  schema?: TemplateFieldSchema | null;
  serverError?: string | null;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const effectiveSchema = schema || extractTemplateFieldSchema(null);

  // Active dynamic fields from the selected template
  const dynamicFields: TemplateFieldSchemaItem[] =
    effectiveSchema.studentInputFields.length > 0
      ? effectiveSchema.studentInputFields
      : [
          { key: 'student_name', label: 'Student Name', type: 'text', required: true, category: 'student_input', modelKey: 'name' },
          { key: 'student_id', label: 'Student ID', type: 'text', required: true, category: 'student_input', modelKey: 'student_id' },
          { key: 'class', label: 'Class', type: 'text', required: false, category: 'student_input', modelKey: 'class' },
          { key: 'roll_number', label: 'Roll Number', type: 'text', required: false, category: 'student_input', modelKey: 'roll_number' },
        ];

  // Initialize values state for all active dynamic fields
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    for (const field of dynamicFields) {
      const modelK = String(field.modelKey || field.key);
      const val =
        (initial as any)?.[modelK] ??
        (initial as any)?.[field.key] ??
        initial?.custom_fields?.[field.key] ??
        '';
      initialMap[field.key] = val ? String(val) : '';
    }
    return initialMap;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync server error to appropriate field
  useEffect(() => {
    if (!serverError) return;
    const lower = serverError.toLowerCase();
    if (lower.includes('student id') || lower.includes('student_id') || lower.includes('admission no')) {
      setErrors((prev) => ({ ...prev, student_id: serverError }));
    } else if (lower.includes('date of birth') || lower.includes('date')) {
      setErrors((prev) => ({ ...prev, date_of_birth: serverError }));
    } else if (lower.includes('emergency')) {
      setErrors((prev) => ({ ...prev, emergency_no: serverError, emergency_number: serverError }));
    } else if (lower.includes('phone') || lower.includes('mobile')) {
      setErrors((prev) => ({ ...prev, phone: serverError }));
    } else if (lower.includes('name') && !lower.includes('father') && !lower.includes('mother')) {
      setErrors((prev) => ({ ...prev, student_name: serverError, name: serverError }));
    }
  }, [serverError]);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};

    // Validate each template dynamic field
    for (const field of dynamicFields) {
      const val = (values[field.key] || '').trim();

      if (field.required && !val) {
        const sideNote = field.side ? ` (${field.side} side)` : '';
        fieldErrors[field.key] = `${field.label} is required by template${sideNote}`;
      }

      // Phone format check if provided
      if (
        (field.key === 'phone' || field.key === 'emergency_no' || field.key === 'emergency_number') &&
        val &&
        !/^[\+0-9\-\s\(\)]{6,20}$/.test(val)
      ) {
        fieldErrors[field.key] = 'Invalid phone number format';
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    // Separate standard person model fields from custom dynamic fields
    const customFieldsData: Record<string, any> = {};
    const sanitizedData: Record<string, any> = {
      student_id: sanitizeStudentId(values.student_id || (initial?.student_id ?? '')) || '',
      name: values.student_name?.trim() || values.name?.trim() || (initial?.name ?? ''),
      class: values.class?.trim() ?? initial?.class ?? null,
      section: values.section?.trim() ?? initial?.section ?? null,
      roll_number: values.roll_number?.trim() ?? initial?.roll_number ?? null,
      date_of_birth: values.date_of_birth ? normalizeDate(values.date_of_birth) : (initial?.date_of_birth ?? null),
      blood_group: values.blood_group ? normalizeBloodGroup(values.blood_group) : (initial?.blood_group ?? null),
      father_name: values.father_name?.trim() ?? initial?.father_name ?? null,
      mother_name: values.mother_name?.trim() ?? initial?.mother_name ?? null,
      phone: values.phone ? normalizePhone(values.phone) : (initial?.phone ?? null),
      emergency_number: (values.emergency_no || values.emergency_number)
        ? normalizePhone(values.emergency_no || values.emergency_number)
        : (initial?.emergency_number ?? null),
      address: values.address?.trim() ?? initial?.address ?? null,
    };

    // Populate custom dynamic fields
    for (const field of dynamicFields) {
      const stdKeys = [
        'student_id',
        'student_name',
        'name',
        'class',
        'section',
        'roll_number',
        'date_of_birth',
        'blood_group',
        'father_name',
        'mother_name',
        'parent_info',
        'phone',
        'emergency_no',
        'emergency_number',
        'address',
      ];
      if (!stdKeys.includes(field.key)) {
        const val = values[field.key]?.trim();
        if (val !== undefined && val !== '') {
          customFieldsData[field.key] = val;
          sanitizedData[field.key] = val;
        }
      }
    }

    if (Object.keys(customFieldsData).length > 0 || initial?.custom_fields) {
      sanitizedData.custom_fields = {
        ...(initial?.custom_fields || {}),
        ...customFieldsData,
      };
    }

    onSubmit(sanitizedData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <User size={15} className="text-blue-600" />
            <span>Required Student Information ({dynamicFields.length} field{dynamicFields.length === 1 ? '' : 's'})</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Driven by active ID Card Template
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dynamicFields.map((field) => {
            const isRequired = field.required;
            const side = field.side;
            const isTextarea = field.key === 'address' || field.type === ('textarea' as any);
            const val = values[field.key] ?? '';
            const errorMsg = errors[field.key] || errors[String(field.modelKey)];

            return (
              <div
                key={field.key}
                className={isTextarea ? 'sm:col-span-2' : ''}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    {field.label}
                    {isRequired && <span className="text-red-500 font-bold">*</span>}
                  </label>

                  {side && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                        side === 'front'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : side === 'back'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {side === 'front' ? 'Front Side' : side === 'back' ? 'Back Side' : 'Both Sides'}
                    </span>
                  )}
                </div>

                {field.key === 'blood_group' || field.type === 'select' ? (
                  <select
                    value={val}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
                      errorMsg
                        ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                    }`}
                  >
                    <option value="">- Select {field.label} -</option>
                    {(field.options && field.options.length > 0 ? field.options : bloodGroups).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={val}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
                      errorMsg
                        ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                    }`}
                  />
                ) : isTextarea ? (
                  <textarea
                    rows={2}
                    value={val}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
                      errorMsg
                        ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                    }`}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={val}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
                      errorMsg
                        ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                    }`}
                  />
                )}

                {errorMsg && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {errorMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {submitting ? 'Saving...' : initial ? 'Update Student Record' : 'Add Student to Project'}
        </button>
      </div>
    </form>
  );
}

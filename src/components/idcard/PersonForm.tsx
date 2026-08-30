import { useState, useMemo, useEffect } from 'react';
import { User, GraduationCap, Users, Phone, AlertCircle } from 'lucide-react';
import { bloodGroups, normalizeDate, normalizeBloodGroup, normalizePhone, sanitizeStudentId } from '../../lib/idcard/validation';
import type { IdCardPerson, TemplateFieldSchema, TemplateFieldSchemaItem } from '../../lib/idcard/types';
import { extractTemplateFieldSchema } from '../../lib/idcard/templateFieldSchema';

interface FieldConfig {
  key: string;
  modelKey: keyof IdCardPerson;
  label: string;
  placeholder?: string;
  type: 'text' | 'date' | 'select' | 'textarea';
  section: 'personal' | 'academic' | 'parent' | 'contact';
}

const ALL_STANDARD_FIELDS: FieldConfig[] = [
  // 1. Personal & Identity
  { key: 'student_name', modelKey: 'name', label: 'Full Name', placeholder: 'e.g. Rahul Kumar', type: 'text', section: 'personal' },
  { key: 'student_id', modelKey: 'student_id', label: 'Student ID / Admission No', placeholder: 'e.g. STU-2026-001', type: 'text', section: 'personal' },
  { key: 'date_of_birth', modelKey: 'date_of_birth', label: 'Date of Birth', type: 'date', section: 'personal' },
  { key: 'blood_group', modelKey: 'blood_group', label: 'Blood Group', type: 'select', section: 'personal' },

  // 2. Academic
  { key: 'class', modelKey: 'class', label: 'Class / Standard', placeholder: 'e.g. 10th Standard', type: 'text', section: 'academic' },
  { key: 'section', modelKey: 'section', label: 'Section', placeholder: 'e.g. A', type: 'text', section: 'academic' },
  { key: 'roll_number', modelKey: 'roll_number', label: 'Roll Number', placeholder: 'e.g. 24', type: 'text', section: 'academic' },

  // 3. Parent & Guardian
  { key: 'father_name', modelKey: 'father_name', label: "Father's / Guardian Name", placeholder: "e.g. Suresh Kumar", type: 'text', section: 'parent' },
  { key: 'mother_name', modelKey: 'mother_name', label: "Mother's Name", placeholder: "e.g. Sunita Devi", type: 'text', section: 'parent' },

  // 4. Contact & Address (Common on back side)
  { key: 'phone', modelKey: 'phone', label: 'Contact Phone / Mobile', placeholder: 'e.g. +91 9876543210', type: 'text', section: 'contact' },
  { key: 'address', modelKey: 'address', label: 'Residential Address', placeholder: 'e.g. 136-Anandpuri, Station Road, Motihari, Bihar', type: 'textarea', section: 'contact' },
];

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

  // Build lookup of fields present in active template layout
  const templateFieldMap = useMemo(() => {
    const map = new Map<string, TemplateFieldSchemaItem>();
    for (const item of [...effectiveSchema.studentInputFields, ...effectiveSchema.assetFields]) {
      map.set(item.key, item);
      if (item.modelKey && typeof item.modelKey === 'string') {
        map.set(item.modelKey, item);
      }
    }
    return map;
  }, [effectiveSchema]);

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

  // Sync server error to appropriate field
  useEffect(() => {
    if (!serverError) return;
    const lower = serverError.toLowerCase();
    if (lower.includes('student id') || lower.includes('student_id') || lower.includes('admission no')) {
      setErrors((prev) => ({ ...prev, student_id: serverError }));
    } else if (lower.includes('date of birth') || lower.includes('date')) {
      setErrors((prev) => ({ ...prev, date_of_birth: serverError }));
    } else if (lower.includes('phone') || lower.includes('mobile')) {
      setErrors((prev) => ({ ...prev, phone: serverError }));
    } else if (lower.includes('name') && !lower.includes('father') && !lower.includes('mother')) {
      setErrors((prev) => ({ ...prev, name: serverError }));
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

    // 1. Mandatory core field checks
    if (!values.student_id?.trim()) {
      fieldErrors.student_id = 'Student ID is required';
    }
    if (!values.name?.trim()) {
      fieldErrors.name = 'Full Name is required';
    }

    // 2. Validate template-required fields (front & back side)
    for (const field of effectiveSchema.studentInputFields) {
      const modelKey = field.modelKey as string;
      const val = (values[modelKey] || '').trim();
      if (field.required && !val) {
        const sideNote = field.side ? ` (${field.side} side)` : '';
        fieldErrors[modelKey] = `${field.label} is required by template${sideNote}`;
      }
    }

    // 3. Phone format validation if entered
    if (values.phone && values.phone.trim() && !/^[\+0-9\-\s\(\)]{6,20}$/.test(values.phone.trim())) {
      fieldErrors.phone = 'Invalid phone number format';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const sanitizedData: Record<string, any> = {
      ...values,
      student_id: sanitizeStudentId(values.student_id),
      name: values.name?.trim() || '',
      date_of_birth: values.date_of_birth ? normalizeDate(values.date_of_birth) : null,
      blood_group: values.blood_group ? normalizeBloodGroup(values.blood_group) : null,
      phone: values.phone ? normalizePhone(values.phone) : null,
      class: values.class?.trim() || null,
      section: values.section?.trim() || null,
      roll_number: values.roll_number?.trim() || null,
      father_name: values.father_name?.trim() || null,
      mother_name: values.mother_name?.trim() || null,
      address: values.address?.trim() || null,
    };

    onSubmit(sanitizedData);
  }

  // Render a field item with side badge and validation
  function renderField(config: FieldConfig) {
    const templateItem = templateFieldMap.get(config.key) || templateFieldMap.get(config.modelKey);
    const isRequired = config.modelKey === 'student_id' || config.modelKey === 'name' || Boolean(templateItem?.required);
    const side = templateItem?.side;
    const isPresentInTemplate = Boolean(templateItem);

    return (
      <div key={config.key} className={config.type === 'textarea' ? 'sm:col-span-2' : ''}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            {config.label}
            {isRequired && <span className="text-red-500 font-bold">*</span>}
          </label>

          {/* Location / Side Badge */}
          {isPresentInTemplate && side && (
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
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

        {config.type === 'select' && config.modelKey === 'blood_group' ? (
          <select
            value={values.blood_group}
            onChange={(e) => handleChange('blood_group', e.target.value)}
            className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
              errors[config.modelKey]
                ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                : isPresentInTemplate
                ? 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                : 'border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400'
            }`}
          >
            <option value="">- Select Blood Group -</option>
            {bloodGroups.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        ) : config.type === 'date' ? (
          <input
            type="date"
            value={values[config.modelKey] ?? ''}
            onChange={(e) => handleChange(config.modelKey, e.target.value)}
            className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
              errors[config.modelKey]
                ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                : isPresentInTemplate
                ? 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                : 'border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400'
            }`}
          />
        ) : config.type === 'textarea' ? (
          <textarea
            rows={2}
            value={values[config.modelKey] ?? ''}
            onChange={(e) => handleChange(config.modelKey, e.target.value)}
            placeholder={config.placeholder}
            className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
              errors[config.modelKey]
                ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                : isPresentInTemplate
                ? 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                : 'border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400'
            }`}
          />
        ) : (
          <input
            type="text"
            value={values[config.modelKey] ?? ''}
            onChange={(e) => handleChange(config.modelKey, e.target.value)}
            placeholder={config.placeholder}
            className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none ${
              errors[config.modelKey]
                ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500'
                : isPresentInTemplate
                ? 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                : 'border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400'
            }`}
          />
        )}

        {errors[config.modelKey] && (
          <p className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> {errors[config.modelKey]}
          </p>
        )}
      </div>
    );
  }

  const personalFields = ALL_STANDARD_FIELDS.filter((f) => f.section === 'personal');
  const academicFields = ALL_STANDARD_FIELDS.filter((f) => f.section === 'academic');
  const parentFields = ALL_STANDARD_FIELDS.filter((f) => f.section === 'parent');
  const contactFields = ALL_STANDARD_FIELDS.filter((f) => f.section === 'contact');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* ── Section 1: Identification & Personal Info ───────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200/70 pb-1.5">
          <User size={14} className="text-blue-600" />
          <span>Identification & Personal Details</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {personalFields.map(renderField)}
        </div>
      </div>

      {/* ── Section 2: Academic Information ──────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200/70 pb-1.5">
          <GraduationCap size={14} className="text-indigo-600" />
          <span>Academic Information</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {academicFields.map(renderField)}
        </div>
      </div>

      {/* ── Section 3: Parent & Family Details ───────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200/70 pb-1.5">
          <Users size={14} className="text-emerald-600" />
          <span>Parent & Guardian Information</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {parentFields.map(renderField)}
        </div>
      </div>

      {/* ── Section 4: Contact & Residential Address (Back Side) ──────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
            <Phone size={14} className="text-purple-600" />
            <span>Contact & Residential Address (Back Side Details)</span>
          </div>
          <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Card Back Details
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {contactFields.map(renderField)}
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

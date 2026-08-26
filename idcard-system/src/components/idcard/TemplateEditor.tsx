import type { TemplateField, TemplateFieldKey, TemplateLayout } from '../../lib/idcard/types';

const FIELD_LABELS: Record<TemplateFieldKey, string> = {
  school_logo: 'School Logo',
  school_name: 'School Name',
  student_photo: 'Student Photo',
  student_name: 'Student Name',
  student_id: 'Student ID',
  class: 'Class',
  section: 'Section',
  roll_number: 'Roll Number',
  date_of_birth: 'Date of Birth',
  blood_group: 'Blood Group',
  parent_info: 'Parent Info',
  address: 'Address',
  academic_year: 'Academic Year',
  custom_text: 'Custom Text',
};

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  backgroundColor: '#ffffff',
  fields: [
    { key: 'school_name', x: 4, y: 3, width: 78, height: 6, fontSize: 12, fontWeight: 'bold', textAlign: 'center', visible: true },
    { key: 'student_photo', x: 4, y: 12, width: 22, height: 26, visible: true },
    { key: 'student_name', x: 30, y: 14, width: 52, height: 6, fontSize: 10, fontWeight: 'bold', visible: true },
    { key: 'student_id', x: 30, y: 21, width: 52, height: 5, fontSize: 8, visible: true },
    { key: 'class', x: 30, y: 27, width: 25, height: 5, fontSize: 8, visible: true },
    { key: 'section', x: 57, y: 27, width: 25, height: 5, fontSize: 8, visible: true },
    { key: 'blood_group', x: 30, y: 33, width: 52, height: 5, fontSize: 8, visible: true },
    { key: 'academic_year', x: 4, y: 46, width: 78, height: 5, fontSize: 7, textAlign: 'center', visible: true },
  ],
};

export function TemplateEditor({
  layout,
  onChange,
  widthMm,
  heightMm,
}: {
  layout: TemplateLayout;
  onChange: (layout: TemplateLayout) => void;
  widthMm: number;
  heightMm: number;
}) {
  const scale = 5; // px per mm for the editor preview

  function updateField(index: number, patch: Partial<TemplateField>) {
    const fields = layout.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange({ ...layout, fields });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Live Preview</p>
        <div
          className="relative border border-slate-300 shadow-sm"
          style={{ width: widthMm * scale, height: heightMm * scale, backgroundColor: layout.backgroundColor }}
        >
          {layout.fields
            .filter((f) => f.visible)
            .map((field, idx) => (
              <div
                key={idx}
                className="absolute overflow-hidden border border-dashed border-slate-300/60 text-slate-700"
                style={{
                  left: field.x * scale,
                  top: field.y * scale,
                  width: field.width * scale,
                  height: field.height * scale,
                  fontSize: (field.fontSize ?? 10) * 0.9,
                  fontWeight: field.fontWeight === 'bold' ? 700 : 400,
                  color: field.color ?? '#000',
                  textAlign: field.textAlign ?? 'left',
                  backgroundColor: field.key === 'student_photo' ? '#e2e8f0' : undefined,
                }}
              >
                {field.key === 'student_photo' ? 'Photo' : field.key === 'custom_text' ? field.customText || 'Custom text' : FIELD_LABELS[field.key]}
              </div>
            ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Fields</p>
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {layout.fields.map((field, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 p-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={field.visible}
                    onChange={(e) => updateField(idx, { visible: e.target.checked })}
                  />
                  {FIELD_LABELS[field.key]}
                </label>
              </div>
              {field.visible && (
                <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
                  <NumberInput label="X" value={field.x} onChange={(v) => updateField(idx, { x: v })} />
                  <NumberInput label="Y" value={field.y} onChange={(v) => updateField(idx, { y: v })} />
                  <NumberInput label="W" value={field.width} onChange={(v) => updateField(idx, { width: v })} />
                  <NumberInput label="H" value={field.height} onChange={(v) => updateField(idx, { height: v })} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-slate-700">Background Color</label>
          <input
            type="color"
            value={layout.backgroundColor}
            onChange={(e) => onChange({ ...layout, backgroundColor: e.target.value })}
            className="mt-1 h-8 w-16"
          />
        </div>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col text-slate-500">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-slate-200 px-1 py-0.5"
      />
    </label>
  );
}

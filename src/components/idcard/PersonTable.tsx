import { Pencil, Trash2, Phone, Check } from 'lucide-react';
import type { IdCardPerson } from '../../lib/idcard/types';
import { sanitizeStudentId } from '../../lib/idcard/validation';

export function PersonTable({
  persons,
  onEdit,
  onDelete,
  selected,
  onToggleSelect,
}: {
  persons: IdCardPerson[];
  onEdit: (person: IdCardPerson) => void;
  onDelete: (person: IdCardPerson) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
          <tr>
            <th className="w-9 px-3 py-2.5">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-3 py-2.5 font-semibold text-slate-800">Student & ID</th>
            <th className="px-3 py-2.5 font-semibold text-slate-700">Academic (Class / Roll)</th>
            <th className="px-3 py-2.5 font-semibold text-slate-700">Parent Info</th>
            <th className="px-3 py-2.5 font-semibold text-slate-700">Contact & Address (Back)</th>
            <th className="px-3 py-2.5 font-semibold text-slate-700">DOB & Blood</th>
            <th className="px-3 py-2.5 font-semibold text-slate-700 text-center">Photo</th>
            <th className="w-16 px-3 py-2.5 text-right font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {persons.map((person) => {
            const hasPhoto = Boolean(person.photo_url);
            const classRoll = [person.class, person.section ? `Sec ${person.section}` : null, person.roll_number ? `Roll: ${person.roll_number}` : null]
              .filter(Boolean)
              .join(' · ');

            return (
              <tr key={person.id} className="hover:bg-slate-50/80 transition">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(person.id)}
                    onChange={() => onToggleSelect(person.id)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />
                </td>

                {/* Name & ID */}
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-slate-900">{person.name}</p>
                  <p className="font-mono text-[11px] text-slate-500">{sanitizeStudentId(person.student_id)}</p>
                </td>

                {/* Academic */}
                <td className="px-3 py-2.5 text-slate-700">
                  {classRoll ? (
                    <span>{classRoll}</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                {/* Parent */}
                <td className="px-3 py-2.5 text-slate-700">
                  {person.father_name ? (
                    <div>
                      <p className="font-medium text-slate-800">{person.father_name}</p>
                      {person.mother_name && (
                        <p className="text-[10px] text-slate-400">M: {person.mother_name}</p>
                      )}
                    </div>
                  ) : person.mother_name ? (
                    <p className="font-medium text-slate-800">{person.mother_name}</p>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                {/* Contact & Address (Back) */}
                <td className="px-3 py-2.5 max-w-[200px]">
                  {person.phone && (
                    <p className="font-mono text-[11px] text-purple-700 font-medium flex items-center gap-1">
                      <Phone size={10} /> {person.phone}
                    </p>
                  )}
                  {person.address ? (
                    <p className="text-[11px] text-slate-500 truncate" title={person.address}>
                      {person.address}
                    </p>
                  ) : !person.phone ? (
                    <span className="text-slate-300">-</span>
                  ) : null}
                </td>

                {/* DOB & Blood */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {person.blood_group && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                        {person.blood_group}
                      </span>
                    )}
                    {person.date_of_birth && (
                      <span className="text-[11px] text-slate-600 font-mono">
                        {person.date_of_birth}
                      </span>
                    )}
                    {!person.blood_group && !person.date_of_birth && (
                      <span className="text-slate-300">-</span>
                    )}
                  </div>
                </td>

                {/* Photo Status */}
                <td className="px-3 py-2.5 text-center">
                  {hasPhoto ? (
                    <span
                      title="Photo uploaded"
                      className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200"
                    >
                      <Check size={10} /> Ready
                    </span>
                  ) : (
                    <span
                      title="No photo uploaded"
                      className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200"
                    >
                      Missing
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(person)}
                      title="Edit student"
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(person)}
                      title="Delete student"
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

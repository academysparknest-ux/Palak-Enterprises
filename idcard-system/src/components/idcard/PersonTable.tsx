import { Pencil, Trash2 } from 'lucide-react';
import type { IdCardPerson } from '../../lib/idcard/types';

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
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="w-10 px-3 py-2"></th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Student ID</th>
            <th className="px-3 py-2 font-medium">Class</th>
            <th className="px-3 py-2 font-medium">Section</th>
            <th className="px-3 py-2 font-medium">Roll No.</th>
            <th className="w-20 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {persons.map((person) => (
            <tr key={person.id} className="hover:bg-slate-50">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(person.id)}
                  onChange={() => onToggleSelect(person.id)}
                />
              </td>
              <td className="px-3 py-2 font-medium text-slate-900">{person.name}</td>
              <td className="px-3 py-2 text-slate-600">{person.student_id}</td>
              <td className="px-3 py-2 text-slate-600">{person.class ?? '-'}</td>
              <td className="px-3 py-2 text-slate-600">{person.section ?? '-'}</td>
              <td className="px-3 py-2 text-slate-600">{person.roll_number ?? '-'}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(person)} className="text-slate-400 hover:text-slate-700">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(person)} className="text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

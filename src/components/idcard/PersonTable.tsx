import { useEffect, useRef } from 'react';
import {
  Pencil,
  Trash2,
  Phone,
  RotateCcw,
  History,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Camera,
} from 'lucide-react';
import type {
  IdCardPerson,
  IdCardTemplate,
  IdCardGeneration,
  TemplateFieldSchema,
  StudentIdCardStatusInfo,
} from '../../lib/idcard/types';
import type { StudentSortField } from '../../lib/idcard/studentSort';
import { sanitizeStudentId } from '../../lib/idcard/validation';
import { computeStudentIdCardStatus } from '../../lib/idcard/statusEngine';
import { IdCardStatusBadge } from './IdCardStatusBadge';

export function PersonTable({
  persons,
  schema,
  template,
  generations = [],
  onEdit,
  onDelete,
  selected,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onViewMissing,
  onViewHistory,
  onRequestReprint,
  sortField,
  sortAsc,
  onSort,
}: {
  persons: IdCardPerson[];
  schema?: TemplateFieldSchema | null;
  template?: IdCardTemplate | null;
  generations?: IdCardGeneration[];
  onEdit: (person: IdCardPerson) => void;
  onDelete: (person: IdCardPerson) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onViewMissing?: (person: IdCardPerson) => void;
  onViewHistory?: (person: IdCardPerson) => void;
  onRequestReprint?: (person: IdCardPerson) => void;
  sortField: StudentSortField;
  sortAsc: boolean;
  onSort: (field: StudentSortField) => void;
}) {
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allVisibleSelected = persons.length > 0 && persons.every((p) => selected.has(p.id));
  const someVisibleSelected = persons.some((p) => selected.has(p.id)) && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  function handleSelectAllChange() {
    if (allVisibleSelected) {
      onDeselectAll?.();
    } else {
      onSelectAll?.();
    }
  }

  const renderSortIndicator = (field: StudentSortField) => {
    if (sortField === field) {
      return sortAsc ? (
        <span className="inline-flex items-center text-blue-600 font-bold ml-1 text-xs" title="Sorted Ascending">
          <ArrowUp size={13} className="stroke-[2.5]" />
        </span>
      ) : (
        <span className="inline-flex items-center text-blue-600 font-bold ml-1 text-xs" title="Sorted Descending">
          <ArrowDown size={13} className="stroke-[2.5]" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-slate-300 group-hover/col:text-slate-500 ml-1 text-xs transition">
        <ArrowUpDown size={12} />
      </span>
    );
  };

  return (
    <div className="relative max-h-[calc(100vh-270px)] min-h-[380px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full min-w-[1100px] text-left text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-20 bg-slate-50 font-semibold text-slate-700 shadow-xs select-none">
          <tr className="divide-x divide-slate-200/60 border-b border-slate-200">
            {/* 1. Sticky Checkbox Header */}
            <th
              className="sticky left-0 top-0 z-30 w-10 min-w-[40px] max-w-[40px] bg-slate-50 px-3 py-3 border-b border-r border-slate-200 text-center"
              scope="col"
            >
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={handleSelectAllChange}
                aria-label="Select all students in visible list"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
              />
            </th>

            {/* 2. Sticky Student & ID Header */}
            <th
              className="sticky left-10 top-0 z-30 min-w-[240px] max-w-[280px] bg-slate-50 px-3.5 py-2.5 border-b border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)]"
              scope="col"
              aria-sort={sortField === 'student_id' || sortField === 'name' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Student & ID
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSort('student_id')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'student_id'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Student ID"
                  >
                    ID {renderSortIndicator('student_id')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSort('name')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'name'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Student Name"
                  >
                    Name {renderSortIndicator('name')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSort('photo')}
                    className={`inline-flex items-center p-1 rounded text-[10px] cursor-pointer transition ${
                      sortField === 'photo'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Photo Available/Missing"
                  >
                    <Camera size={11} />
                    {sortField === 'photo' && renderSortIndicator('photo')}
                  </button>
                </div>
              </div>
            </th>

            {/* 3. ID Card Status Header */}
            <th
              onClick={() => onSort('status')}
              className="px-3.5 py-3 min-w-[150px] cursor-pointer border-b border-slate-200 group/col hover:bg-slate-100/80 transition"
              scope="col"
              aria-sort={sortField === 'status' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  ID Card Status
                </span>
                {renderSortIndicator('status')}
              </div>
            </th>

            {/* 4. Academic (Class / Roll) Header */}
            <th
              className="px-3.5 py-2.5 min-w-[170px] border-b border-slate-200 bg-slate-50"
              scope="col"
              aria-sort={sortField === 'class' || sortField === 'roll_number' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Academic
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSort('class')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'class'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Class"
                  >
                    Class {renderSortIndicator('class')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSort('roll_number')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'roll_number'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Roll Number"
                  >
                    Roll {renderSortIndicator('roll_number')}
                  </button>
                </div>
              </div>
            </th>

            {/* 5. Parent Info Header */}
            <th
              onClick={() => onSort('father_name')}
              className="px-3.5 py-3 min-w-[160px] cursor-pointer border-b border-slate-200 group/col hover:bg-slate-100/80 transition"
              scope="col"
              aria-sort={sortField === 'father_name' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Parent Info
                </span>
                {renderSortIndicator('father_name')}
              </div>
            </th>

            {/* 6. Contact & Address Header */}
            <th
              className="px-3.5 py-2.5 min-w-[200px] border-b border-slate-200 bg-slate-50"
              scope="col"
              aria-sort={sortField === 'phone' || sortField === 'address' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Contact & Address
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSort('phone')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'phone'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Phone Number"
                  >
                    Phone {renderSortIndicator('phone')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSort('address')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'address'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Address"
                  >
                    Address {renderSortIndicator('address')}
                  </button>
                </div>
              </div>
            </th>

            {/* 7. DOB & Blood Header */}
            <th
              className="px-3.5 py-2.5 min-w-[170px] border-b border-slate-200 bg-slate-50"
              scope="col"
              aria-sort={sortField === 'date_of_birth' || sortField === 'blood_group' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  DOB & Blood
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSort('date_of_birth')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'date_of_birth'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Date of Birth"
                  >
                    DOB {renderSortIndicator('date_of_birth')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSort('blood_group')}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                      sortField === 'blood_group'
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title="Sort by Blood Group"
                  >
                    Blood {renderSortIndicator('blood_group')}
                  </button>
                </div>
              </div>
            </th>

            {/* 8. Actions (Non-sortable) */}
            <th
              className="w-24 min-w-[96px] px-3.5 py-3 text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200"
              scope="col"
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {persons.map((person) => {
            const latestGen = generations.find((g) => g.person_id === person.id);
            const statusInfo: StudentIdCardStatusInfo = computeStudentIdCardStatus({
              person,
              schema,
              template,
              latestGen,
            });

            const isRowSelected = selected.has(person.id);

            const classRoll = [
              person.class,
              person.section ? `Sec ${person.section}` : null,
              person.roll_number ? `Roll: ${person.roll_number}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            const rowBgClass = isRowSelected
              ? 'bg-blue-50/70 hover:bg-blue-50'
              : statusInfo.status === 'NOT_READY'
              ? 'bg-amber-50/30 hover:bg-amber-50/60'
              : statusInfo.status === 'OUTDATED'
              ? 'bg-orange-50/30 hover:bg-orange-50/60'
              : 'bg-white hover:bg-slate-50/90';

            return (
              <tr
                key={person.id}
                className={`group transition-colors ${rowBgClass}`}
              >
                {/* 1. Sticky Checkbox */}
                <td
                  className={`sticky left-0 z-10 w-10 min-w-[40px] max-w-[40px] px-3 py-2.5 text-center border-r border-slate-100 ${rowBgClass}`}
                >
                  <input
                    type="checkbox"
                    checked={isRowSelected}
                    onChange={() => onToggleSelect(person.id)}
                    aria-label={`Select student ${person.name}`}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                  />
                </td>

                {/* 2. Sticky Name & ID + Photo thumbnail */}
                <td
                  className={`sticky left-10 z-10 min-w-[240px] max-w-[280px] px-3.5 py-2.5 border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] ${rowBgClass}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {person.photo_url ? (
                        <img
                          src={person.photo_url}
                          alt={person.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 h-full w-full flex items-center justify-center">
                          No Pic
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate text-[12px]">{person.name}</p>
                      <p className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="font-semibold text-slate-700">{sanitizeStudentId(person.student_id)}</span>
                      </p>
                    </div>
                  </div>
                </td>

                {/* 3. ID Card Status Column */}
                <td className="px-3.5 py-2.5">
                  <IdCardStatusBadge
                    statusInfo={statusInfo}
                    onMissingClick={() => onViewMissing?.(person)}
                    onHistoryClick={() => onViewHistory?.(person)}
                    onReprintClick={() => onRequestReprint?.(person)}
                  />
                  {statusInfo.status === 'NOT_READY' && statusInfo.missingFields.length > 0 && (
                    <p
                      onClick={() => onViewMissing?.(person)}
                      className="mt-0.5 text-[10px] text-amber-700 truncate max-w-[170px] cursor-pointer hover:underline"
                      title={`Missing: ${statusInfo.missingFields.join(', ')}`}
                    >
                      Missing: {statusInfo.missingFields.join(', ')}
                    </p>
                  )}
                </td>

                {/* 4. Academic */}
                <td className="px-3.5 py-2.5 text-slate-700">
                  {classRoll ? (
                    <span className="font-medium text-slate-800">{classRoll}</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                {/* 5. Parent */}
                <td className="px-3.5 py-2.5 text-slate-700">
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

                {/* 6. Contact & Address (Back) */}
                <td className="px-3.5 py-2.5 max-w-[220px]">
                  {person.phone && (
                    <p className="font-mono text-[11px] text-purple-700 font-medium flex items-center gap-1">
                      <Phone size={10} /> {person.phone}
                    </p>
                  )}
                  {person.emergency_number && (
                    <p
                      className="font-mono text-[10px] text-amber-700 font-medium flex items-center gap-1"
                      title="Emergency Contact"
                    >
                      <span className="font-bold text-[9px] bg-amber-100 px-1 py-0.2 rounded text-amber-800">
                        EMG
                      </span>{' '}
                      {person.emergency_number}
                    </p>
                  )}
                  {person.address ? (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5" title={person.address}>
                      {person.address}
                    </p>
                  ) : !person.phone && !person.emergency_number ? (
                    <span className="text-slate-300">-</span>
                  ) : null}
                </td>

                {/* 7. DOB & Blood */}
                <td className="px-3.5 py-2.5">
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

                {/* 8. Actions */}
                <td className="px-3.5 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {statusInfo.status === 'NOT_READY' && (
                      <button
                        type="button"
                        onClick={() => (onViewMissing ? onViewMissing(person) : onEdit(person))}
                        title="Fix missing information"
                        className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-200 cursor-pointer transition shadow-2xs"
                      >
                        <AlertCircle size={10} /> Fix
                      </button>
                    )}

                    {statusInfo.status === 'PRINTED' && (
                      <button
                        type="button"
                        onClick={() => onRequestReprint?.(person)}
                        title="Request card reprint"
                        className="p-1.5 rounded text-purple-600 hover:bg-purple-50 cursor-pointer transition"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onViewHistory?.(person)}
                      title="View print & generation history"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition"
                    >
                      <History size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(person)}
                      title="Edit student record"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(person)}
                      title="Delete student"
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition"
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

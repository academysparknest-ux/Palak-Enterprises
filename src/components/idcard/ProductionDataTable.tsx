import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Printer,
  RotateCcw,
  History,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileEdit,
} from 'lucide-react';
import type {
  IdCardPerson,
  IdCardTemplate,
  StudentIdCardStatusInfo,
} from '../../lib/idcard/types';
import type { ColumnVisibilityMap } from '../../lib/idcard/exportUtils';
import type { StudentSortField } from '../../lib/idcard/studentSort';
import { sanitizeStudentId } from '../../lib/idcard/validation';
import { IdCardStatusBadge } from './IdCardStatusBadge';

export function ProductionDataTable({
  persons,
  totalCount,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onDeselectAll,
  statusMap,
  columnPrefs,
  activeSort,
  onSortToggle,
  onFixInformation,
  onGenerateSingle,
  onPrintSingle,
  onPreviewSingle,
  onReprintRequest,
  onViewHistory,
  onDownloadPng,
}: {
  persons: IdCardPerson[];
  totalCount: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: () => void;
  onDeselectAll: () => void;
  statusMap: Map<string, StudentIdCardStatusInfo>;
  columnPrefs: ColumnVisibilityMap;
  activeSort: { field: StudentSortField; ascending: boolean };
  onSortToggle: (field: StudentSortField) => void;
  onFixInformation: (person: IdCardPerson) => void;
  onGenerateSingle: (person: IdCardPerson) => void;
  onPrintSingle: (person: IdCardPerson) => void;
  onPreviewSingle: (person: IdCardPerson) => void;
  onReprintRequest: (person: IdCardPerson) => void;
  onViewHistory: (person: IdCardPerson) => void;
  onDownloadPng: (person: IdCardPerson, url: string) => void;
  template?: IdCardTemplate | null;
}) {

  const allVisibleSelected =
    persons.length > 0 && persons.every((p) => selectedIds.has(p.id));
  const someVisibleSelected =
    persons.some((p) => selectedIds.has(p.id)) && !allVisibleSelected;

  function renderSortIndicator(field: StudentSortField) {
    if (activeSort.field !== field) {
      return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-80 transition shrink-0" />;
    }
    return activeSort.ascending ? (
      <ArrowUp size={13} className="text-blue-600 font-extrabold shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-purple-600 font-extrabold shrink-0" />
    );
  }

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Continuous Scroll Container with Frozen Sticky Left Columns & Sticky Top Header */}
      <div className="max-h-[68vh] overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <tr className="border-b border-slate-200">
              {/* 1. Primary Checkbox (Frozen Left) */}
              {columnPrefs.primary && (
                <th className="sticky left-0 z-30 w-11 bg-slate-100 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={() => {
                      if (allVisibleSelected) onDeselectAll();
                      else onSelectAllVisible();
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                    title="Select All Visible Records"
                  />
                </th>
              )}

              {/* 2. Student ID (Frozen Left) */}
              {columnPrefs.student_id && (
                <th
                  className={`sticky ${
                    columnPrefs.primary ? 'left-11' : 'left-0'
                  } z-30 bg-slate-100 px-3 py-2.5 font-bold text-slate-900 cursor-pointer group select-none shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`}
                  onClick={() => onSortToggle('student_id')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student ID</span>
                    {renderSortIndicator('student_id')}
                  </div>
                </th>
              )}

              {/* 3. Class */}
              {columnPrefs.class && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('class')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Class</span>
                    {renderSortIndicator('class')}
                  </div>
                </th>
              )}

              {/* 4. Roll Number */}
              {columnPrefs.roll && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('roll_number')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Roll</span>
                    {renderSortIndicator('roll_number')}
                  </div>
                </th>
              )}

              {/* 5. Student Name */}
              {columnPrefs.student_name && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>
              )}

              {/* 6. Photo */}
              {columnPrefs.photo && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('photo')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Photo</span>
                    {renderSortIndicator('photo')}
                  </div>
                </th>
              )}

              {/* 7. Information */}
              {columnPrefs.information && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('information')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Information</span>
                    {renderSortIndicator('information')}
                  </div>
                </th>
              )}

              {/* 8. ID Card Status */}
              {columnPrefs.status && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('status')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID Card Status</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>
              )}

              {/* 9. Generated */}
              {columnPrefs.generated && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('generated')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Generated</span>
                    {renderSortIndicator('generated')}
                  </div>
                </th>
              )}

              {/* 10. Printed */}
              {columnPrefs.printed && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900"
                  onClick={() => onSortToggle('printed')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Printed</span>
                    {renderSortIndicator('printed')}
                  </div>
                </th>
              )}

              {/* 11. Print Count */}
              {columnPrefs.print_count && (
                <th
                  className="px-3 py-2.5 font-semibold text-slate-700 cursor-pointer group select-none hover:text-slate-900 text-center"
                  onClick={() => onSortToggle('print_count')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Print Count</span>
                    {renderSortIndicator('print_count')}
                  </div>
                </th>
              )}

              {/* 12. Actions */}
              {columnPrefs.actions && (
                <th className="px-3 py-2.5 font-semibold text-slate-700 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {persons.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="py-12 text-center text-slate-400 text-xs"
                >
                  No student records match the active search or filters.
                </td>
              </tr>
            ) : (
              persons.map((person) => {
                const isSelected = selectedIds.has(person.id);
                const statusInfo = statusMap.get(person.id);
                const isReady = statusInfo?.ready ?? false;
                const gen = statusInfo?.lastGeneration;
                const hasGen = gen?.status === 'SUCCESS';
                const hasPhoto = Boolean(person.photo_url && person.photo_url.trim().length > 0);

                return (
                  <tr
                    key={person.id}
                    className={`transition-colors hover:bg-blue-50/30 ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {/* 1. Primary Checkbox (Frozen Left) */}
                    {columnPrefs.primary && (
                      <td
                        className={`sticky left-0 z-10 px-3 py-2.5 ${
                          isSelected ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(person.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {/* 2. Student ID (Frozen Left) */}
                    {columnPrefs.student_id && (
                      <td
                        className={`sticky ${
                          columnPrefs.primary ? 'left-11' : 'left-0'
                        } z-10 px-3 py-2.5 font-mono text-xs font-bold text-slate-900 whitespace-nowrap shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] ${
                          isSelected ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        {sanitizeStudentId(person.student_id)}
                      </td>
                    )}

                    {/* 3. Class */}
                    {columnPrefs.class && (
                      <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                        <span className="font-semibold">{person.class || '—'}</span>
                        {person.section && (
                          <span className="ml-1 text-[11px] text-slate-500">
                            ({person.section})
                          </span>
                        )}
                      </td>
                    )}

                    {/* 4. Roll Number */}
                    {columnPrefs.roll && (
                      <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                        {person.roll_number || '—'}
                      </td>
                    )}

                    {/* 5. Student Name */}
                    {columnPrefs.student_name && (
                      <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {person.name}
                      </td>
                    )}

                    {/* 6. Photo */}
                    {columnPrefs.photo && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {hasPhoto ? (
                          <div
                            onClick={() => onFixInformation(person)}
                            className="group relative h-8 w-8 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 cursor-pointer"
                            title="Click to view/edit student photo"
                          >
                            <img
                              src={person.photo_url!}
                              alt={person.name}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye size={12} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onFixInformation(person)}
                            className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100 cursor-pointer"
                            title="Photo missing - click to upload"
                          >
                            <AlertTriangle size={11} /> Missing
                          </button>
                        )}
                      </td>
                    )}

                    {/* 7. Information */}
                    {columnPrefs.information && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Complete
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onFixInformation(person)}
                            className="group text-left cursor-pointer"
                            title="Incomplete data - click to view and fix missing fields"
                          >
                            <div className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100">
                              <AlertCircle size={11} className="text-amber-600" />
                              <span>Incomplete</span>
                              {statusInfo?.missingFields && statusInfo.missingFields.length > 0 && (
                                <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[9px] font-extrabold text-amber-950">
                                  {statusInfo.missingFields.length}
                                </span>
                              )}
                            </div>
                            {statusInfo?.missingFields && statusInfo.missingFields.length > 0 && (
                              <p className="mt-0.5 text-[9px] text-slate-400 max-w-[120px] truncate">
                                {statusInfo.missingFields.join(', ')}
                              </p>
                            )}
                          </button>
                        )}
                      </td>
                    )}

                    {/* 8. ID Card Status */}
                    {columnPrefs.status && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {statusInfo && (
                          <IdCardStatusBadge
                            statusInfo={statusInfo}
                            onMissingClick={() => onFixInformation(person)}
                            onHistoryClick={() => onViewHistory(person)}
                            onReprintClick={() => onReprintRequest(person)}
                          />
                        )}
                      </td>
                    )}

                    {/* 9. Generated */}
                    {columnPrefs.generated && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {hasGen ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                              <CheckCircle2 size={12} className="text-blue-600" /> Yes
                            </span>
                            {gen?.created_at && (
                              <p className="text-[10px] text-slate-400 font-mono">
                                {new Date(gen.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No</span>
                        )}
                      </td>
                    )}

                    {/* 10. Printed */}
                    {columnPrefs.printed && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {statusInfo?.lastPrintedAt ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                              <CheckCircle2 size={12} className="text-teal-600" /> Printed
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {new Date(statusInfo.lastPrintedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No</span>
                        )}
                      </td>
                    )}

                    {/* 11. Print Count */}
                    {columnPrefs.print_count && (
                      <td className="px-3 py-2.5 text-center font-mono text-xs whitespace-nowrap">
                        {statusInfo && statusInfo.printCount > 0 ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              statusInfo.printCount > 1
                                ? 'bg-purple-100 text-purple-800 font-extrabold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {statusInfo.printCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                    )}

                    {/* 12. Actions */}
                    {columnPrefs.actions && (
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* NOT_READY -> Fix Information */}
                          {statusInfo?.status === 'NOT_READY' && (
                            <button
                              type="button"
                              onClick={() => onFixInformation(person)}
                              className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                            >
                              <FileEdit size={11} /> Fix Info
                            </button>
                          )}

                          {/* READY_TO_GENERATE -> Generate */}
                          {statusInfo?.status === 'READY_TO_GENERATE' && (
                            <button
                              type="button"
                              onClick={() => onGenerateSingle(person)}
                              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
                            >
                              <Sparkles size={11} /> Generate
                            </button>
                          )}

                          {/* READY_TO_PRINT -> Preview & Print */}
                          {statusInfo?.status === 'READY_TO_PRINT' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onPreviewSingle(person)}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                              >
                                <Eye size={11} /> Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => onPrintSingle(person)}
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-2xs"
                              >
                                <Printer size={11} /> Print
                              </button>
                            </>
                          )}

                          {/* PRINTED -> View & Reprint */}
                          {statusInfo?.status === 'PRINTED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onPreviewSingle(person)}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                              >
                                <Eye size={11} /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => onReprintRequest(person)}
                                className="inline-flex items-center gap-1 rounded bg-purple-100 border border-purple-200 px-2 py-1 text-[10px] font-bold text-purple-800 hover:bg-purple-200 cursor-pointer shadow-2xs"
                              >
                                <RotateCcw size={11} /> Reprint
                              </button>
                            </>
                          )}

                          {/* PRINT_FAILED -> Retry Print */}
                          {statusInfo?.status === 'PRINT_FAILED' && (
                            <button
                              type="button"
                              onClick={() => onPrintSingle(person)}
                              className="inline-flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-rose-700 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw size={11} /> Retry Print
                            </button>
                          )}

                          {/* OUTDATED -> Regenerate */}
                          {statusInfo?.status === 'OUTDATED' && (
                            <button
                              type="button"
                              onClick={() => onGenerateSingle(person)}
                              className="inline-flex items-center gap-1 rounded bg-orange-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-orange-700 cursor-pointer shadow-2xs"
                            >
                              <Sparkles size={11} /> Regenerate
                            </button>
                          )}

                          {/* Audit History Log */}
                          <button
                            type="button"
                            onClick={() => onViewHistory(person)}
                            title="View audit & print history"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            <History size={13} />
                          </button>

                          {/* Download PNG (if available) */}
                          {hasGen && gen?.file_url && (
                            <button
                              type="button"
                              onClick={() => onDownloadPng(person, gen.file_url!)}
                              title="Download High-Res ID Card PNG"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              <Download size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Bar */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <span>
          Showing <strong>{persons.length}</strong> of <strong>{totalCount}</strong> students
        </span>
        <span className="text-[11px] text-slate-400">
          Continuous scroll enabled · Frozen Student ID · Real-time status engine
        </span>
      </div>
    </div>
  );
}

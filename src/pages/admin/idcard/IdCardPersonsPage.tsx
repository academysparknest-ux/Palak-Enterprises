import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  Plus,
  Upload,
  Loader2,
  Search,
  Images,
  LayoutTemplate,
  RotateCcw,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import {
  getAllIdCardPersons,
  getIdCardTemplates,
  getIdCardGenerations,
  createIdCardPerson,
  updateIdCardPerson,
  deleteIdCardPerson,
  uploadPersonPhoto,
} from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import type {
  IdCardPerson,
  IdCardTemplate,
  IdCardProject,
  IdCardGeneration,
  IdCardStatus,
} from '../../../lib/idcard/types';
import { extractTemplateFieldSchema } from '../../../lib/idcard/templateFieldSchema';
import { computeStudentIdCardStatus } from '../../../lib/idcard/statusEngine';
import { sortStudentRecords, type StudentSortField } from '../../../lib/idcard/studentSort';
import { PersonTable } from '../../../components/idcard/PersonTable';
import { PersonForm } from '../../../components/idcard/PersonForm';
import { PhotoUpload } from '../../../components/idcard/PhotoUpload';
import { CsvImportModal } from '../../../components/idcard/CsvImportModal';
import { BulkPhotoUploadModal } from '../../../components/idcard/BulkPhotoUploadModal';
import { StatusSummaryDashboard } from '../../../components/idcard/StatusSummaryDashboard';
import { StudentMissingInfoModal } from '../../../components/idcard/StudentMissingInfoModal';
import { StudentPrintHistoryModal } from '../../../components/idcard/StudentPrintHistoryModal';
import { ReprintRequestModal } from '../../../components/idcard/ReprintRequestModal';
import { Modal, ConfirmModal } from '../../../components/ui/Modal';

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      persons: IdCardPerson[];
      template: IdCardTemplate | null;
      generations: IdCardGeneration[];
    };

export default function IdCardPersonsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingPerson, setEditingPerson] = useState<IdCardPerson | 'new' | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkPhotos, setShowBulkPhotos] = useState(false);

  // Status & history inspection modals
  const [statusFilter, setStatusFilter] = useState<'ALL' | IdCardStatus>('ALL');
  const [selectedPersonForMissing, setSelectedPersonForMissing] = useState<IdCardPerson | null>(null);
  const [selectedPersonForHistory, setSelectedPersonForHistory] = useState<IdCardPerson | null>(null);
  const [selectedPersonForReprint, setSelectedPersonForReprint] = useState<IdCardPerson | null>(null);

  // Deletion modal state
  const [deletingPerson, setDeletingPerson] = useState<IdCardPerson | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Sorting state - Default is Student ID ↑ (Ascending)
  const [sortField, setSortField] = useState<StudentSortField>('student_id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const activeTemplate = state.kind === 'ready' ? state.template : null;
  const generations = state.kind === 'ready' ? state.generations : [];
  const fieldSchema = useMemo(() => extractTemplateFieldSchema(activeTemplate?.layout), [activeTemplate]);
  const requiredFields = useMemo(
    () => [...fieldSchema.studentInputFields, ...fieldSchema.assetFields].filter((f) => f.required),
    [fieldSchema]
  );

  const { project } = useOutletContext<{ project?: IdCardProject }>() || {};

  const load = useCallback(async () => {
    if (!projectId) return;
    setState({ kind: 'loading' });
    try {
      const [persons, templates, gens] = await Promise.all([
        getAllIdCardPersons(projectId),
        getIdCardTemplates(projectId),
        getIdCardGenerations(projectId),
      ]);

      const targetTemplateId = project?.template_id;
      const activeTemplate =
        (targetTemplateId ? templates.find((t) => t.id === targetTemplateId) : null) ??
        (templates.length > 0 ? templates[0] : null);

      setState({
        kind: 'ready',
        persons,
        template: activeTemplate,
        generations: gens,
      });
    } catch (err) {
      const appError = classifySupabaseError(err);
      setState({ kind: 'error', message: errorCodeToUserMessage(appError.code) });
    }
  }, [projectId, project?.template_id]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute status info map for all records in the project
  const studentStatusMap = useMemo(() => {
    if (state.kind !== 'ready') return new Map();
    const map = new Map<string, ReturnType<typeof computeStudentIdCardStatus>>();
    for (const person of state.persons) {
      const latestGen = generations.find((g) => g.person_id === person.id);
      const info = computeStudentIdCardStatus({
        person,
        schema: fieldSchema,
        template: activeTemplate,
        latestGen,
      });
      map.set(person.id, info);
    }
    return map;
  }, [state, generations, fieldSchema, activeTemplate]);

  // Real-time Status Counts for Dashboard across entire dataset
  const statusCounts = useMemo(() => {
    if (state.kind !== 'ready') {
      return {
        total: 0,
        notReady: 0,
        readyToGenerate: 0,
        readyToPrint: 0,
        printed: 0,
        printFailed: 0,
        reprintRequired: 0,
        outdated: 0,
      };
    }

    let notReady = 0;
    let readyToGenerate = 0;
    let readyToPrint = 0;
    let printed = 0;
    let printFailed = 0;
    let reprintRequired = 0;
    let outdated = 0;

    for (const person of state.persons) {
      const info = studentStatusMap.get(person.id);
      if (!info) continue;
      switch (info.status) {
        case 'NOT_READY':
          notReady++;
          break;
        case 'READY_TO_GENERATE':
          readyToGenerate++;
          break;
        case 'READY_TO_PRINT':
          readyToPrint++;
          break;
        case 'PRINTED':
          printed++;
          break;
        case 'PRINT_FAILED':
          printFailed++;
          break;
        case 'REPRINT_REQUIRED':
          reprintRequired++;
          break;
        case 'OUTDATED':
          outdated++;
          break;
      }
    }

    return {
      total: state.persons.length,
      notReady,
      readyToGenerate,
      readyToPrint,
      printed,
      printFailed,
      reprintRequired,
      outdated,
    };
  }, [state, studentStatusMap]);

  // Search -> Filter -> Sort Data Pipeline
  const displayedPersons = useMemo(() => {
    if (state.kind !== 'ready') return [];
    let list = state.persons;

    // 1. Search Query filtering (across name, student_id, roll_number, class, section, phone, parent, address)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const idMatch = p.student_id?.toLowerCase().includes(q);
        const nameMatch = p.name?.toLowerCase().includes(q);
        const rollMatch = p.roll_number?.toLowerCase().includes(q);
        const classMatch = `${p.class || ''} ${p.section || ''}`.toLowerCase().includes(q);
        const phoneMatch = `${p.phone || ''} ${p.emergency_number || ''}`.includes(q);
        const parentMatch = `${p.father_name || ''} ${p.mother_name || ''}`.toLowerCase().includes(q);
        const addressMatch = p.address?.toLowerCase().includes(q);
        const bloodMatch = p.blood_group?.toLowerCase().includes(q);

        return (
          idMatch ||
          nameMatch ||
          rollMatch ||
          classMatch ||
          phoneMatch ||
          parentMatch ||
          addressMatch ||
          bloodMatch
        );
      });
    }

    // 2. ID Card status filtering
    if (statusFilter !== 'ALL') {
      list = list.filter((p) => {
        const info = studentStatusMap.get(p.id);
        return info?.status === statusFilter;
      });
    }

    // 3. Intelligent multi-type sorting on entire student objects
    return sortStudentRecords(list, {
      field: sortField,
      ascending: sortAsc,
      statusMap: studentStatusMap,
    });
  }, [state, search, statusFilter, studentStatusMap, sortField, sortAsc]);

  // Handle column header clicks to toggle sort
  function handleSort(field: StudentSortField) {
    if (sortField === field) {
      // Toggle Ascending <-> Descending
      setSortAsc((prev) => !prev);
    } else {
      // Set new sort field with Ascending default
      setSortField(field);
      setSortAsc(true);
    }
  }

  // Reset to default sort (Student ID ↑)
  function handleResetSort() {
    setSortField('student_id');
    setSortAsc(true);
  }

  // Selection toggle
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Select all visible students in current filtered view
  function selectAllVisible() {
    setSelected(new Set(displayedPersons.map((p) => p.id)));
  }

  // Deselect all
  function deselectAll() {
    setSelected(new Set());
  }

  async function handleConfirmDelete() {
    if (!deletingPerson) return;
    setDeletingLoading(true);
    try {
      await deleteIdCardPerson(deletingPerson.id);
      setDeletingPerson(null);
      // Remove deleted person from selection if present
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deletingPerson.id);
        return next;
      });
      load();
    } catch (err) {
      alert(errorCodeToUserMessage(classifySupabaseError(err).code));
    } finally {
      setDeletingLoading(false);
    }
  }

  if (!projectId) return null;

  if (state.kind === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={20} /> Loading complete student database & readiness...
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">Unable to load students: {state.message}</p>
        <button onClick={load} className="mt-2 text-sm font-medium text-red-800 underline cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  // Workflow enforcement: If no template is configured, prompt to create template first
  if (!activeTemplate) {
    return (
      <div className="mx-auto max-w-xl my-10 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-10 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <LayoutTemplate size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No ID-card template configured</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Please create or select an ID-card template first. The template determines which student information is required for this project.
        </p>
        <Link
          to="../template"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
        >
          <LayoutTemplate size={15} /> Create Template
        </Link>
      </div>
    );
  }

  const totalStudents = state.persons.length;
  const isFilteredOrSearched = search.trim().length > 0 || statusFilter !== 'ALL';
  const isDefaultSort = sortField === 'student_id' && sortAsc;

  return (
    <div className="space-y-3.5">
      {/* 1. Top Status Summary Dashboard */}
      <StatusSummaryDashboard
        counts={statusCounts}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* 2. Active Template Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <LayoutTemplate size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{activeTemplate.name}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                {activeTemplate.card_width_mm} × {activeTemplate.card_height_mm} mm
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Required Fields ({requiredFields.length}):{' '}
              <span className="font-semibold text-slate-700">
                {requiredFields.map((f) => f.label).join(', ') || 'None required'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="../generate"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
          >
            Go to Print Center ({statusCounts.readyToPrint} ready to print) →
          </Link>
          <Link
            to="../template"
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-2"
          >
            Edit Template →
          </Link>
        </div>
      </div>

      {/* 3. Action Controls & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-lg font-bold text-slate-900">Student Dataset</h1>

          {/* Record Count Badge */}
          <span className="rounded-md bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {isFilteredOrSearched
              ? `Showing ${displayedPersons.length} of ${totalStudents} students`
              : `Showing ${totalStudents} student${totalStudents === 1 ? '' : 's'}`}
          </span>

          {statusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer transition"
            >
              Filter: {statusFilter.replace(/_/g, ' ')} <X size={11} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {fieldSchema.assetFields.some((f) => f.key === 'student_photo') && (
            <button
              onClick={() => setShowBulkPhotos(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
            >
              <Images size={14} /> Bulk Upload Photos
            </button>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <Upload size={14} /> Import CSV / Excel
          </button>
          <button
            onClick={() => setEditingPerson('new')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-2xs cursor-pointer"
          >
            <Plus size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* 4. Search, Selection Toolbar, and Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 border border-slate-200 p-2.5 rounded-xl">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, roll no, class, phone, address..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs focus:border-slate-400 focus:outline-none placeholder:text-slate-400 shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right: Selection status & Sort controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Selection quick actions */}
          {displayedPersons.length > 0 && (
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 mr-1 text-slate-600">
              <button
                type="button"
                onClick={selectAllVisible}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <CheckSquare size={13} /> Select All ({displayedPersons.length})
              </button>
              {selected.size > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    <Square size={13} /> Deselect All
                  </button>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 ml-0.5">
                    {selected.size} selected
                  </span>
                </>
              )}
            </div>
          )}

          {/* Active Sort indicator pill */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Sorted by:</span>
            <span className="text-[11px] font-bold text-slate-900 capitalize">
              {sortField.replace(/_/g, ' ')} {sortAsc ? '↑ (ASC)' : '↓ (DESC)'}
            </span>
          </div>

          {/* Reset Sort Button */}
          {!isDefaultSort && (
            <button
              type="button"
              onClick={handleResetSort}
              title="Reset sorting to Student ID Ascending"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs transition"
            >
              <RotateCcw size={11} /> Reset Sort
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Continuous Scrollable Student Table */}
      <div>
        {displayedPersons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400 bg-white">
            {search.trim().length > 0
              ? `No students matching "${search}".`
              : statusFilter !== 'ALL'
              ? `No students found matching status "${statusFilter.replace(/_/g, ' ')}".`
              : 'No students yet. Add one or import an Excel / CSV spreadsheet.'}
          </div>
        ) : (
          <PersonTable
            persons={displayedPersons}
            schema={fieldSchema}
            template={activeTemplate}
            generations={generations}
            selected={selected}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAllVisible}
            onDeselectAll={deselectAll}
            onEdit={(p) => setEditingPerson(p)}
            onDelete={(p) => setDeletingPerson(p)}
            onViewMissing={(p) => setSelectedPersonForMissing(p)}
            onViewHistory={(p) => setSelectedPersonForHistory(p)}
            onRequestReprint={(p) => setSelectedPersonForReprint(p)}
            sortField={sortField}
            sortAsc={sortAsc}
            onSort={handleSort}
          />
        )}
      </div>

      {/* 6. Modals for Missing Info, History, Reprint, Edit, Import, Bulk Photos, Delete */}
      {selectedPersonForMissing && (
        <StudentMissingInfoModal
          person={selectedPersonForMissing}
          template={activeTemplate}
          schema={fieldSchema}
          isOpen={true}
          onClose={() => setSelectedPersonForMissing(null)}
          onEdit={(person) => {
            setSelectedPersonForMissing(null);
            setEditingPerson(person);
          }}
        />
      )}

      {selectedPersonForHistory && (
        <StudentPrintHistoryModal
          person={selectedPersonForHistory}
          generations={generations}
          projectId={projectId}
          isOpen={true}
          onClose={() => setSelectedPersonForHistory(null)}
          onRequestReprint={(person) => {
            setSelectedPersonForHistory(null);
            setSelectedPersonForReprint(person);
          }}
        />
      )}

      {selectedPersonForReprint && (
        <ReprintRequestModal
          person={selectedPersonForReprint}
          projectId={projectId}
          isOpen={true}
          onClose={() => setSelectedPersonForReprint(null)}
          onRequested={() => {
            setSelectedPersonForReprint(null);
            load();
          }}
        />
      )}

      {editingPerson && (
        <PersonEditModal
          projectId={projectId}
          template={activeTemplate}
          person={editingPerson === 'new' ? null : editingPerson}
          onClose={() => setEditingPerson(null)}
          onSaved={() => {
            setEditingPerson(null);
            load();
          }}
        />
      )}

      {showImport && (
        <CsvImportModal
          projectId={projectId}
          template={activeTemplate}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            load();
          }}
        />
      )}

      {showBulkPhotos && (
        <BulkPhotoUploadModal
          projectId={projectId}
          onClose={() => setShowBulkPhotos(false)}
          onUploaded={() => {
            setShowBulkPhotos(false);
            load();
          }}
        />
      )}

      {deletingPerson && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingPerson(null)}
          onConfirm={handleConfirmDelete}
          title="Remove Student?"
          message={
            <span>
              Are you sure you want to remove <strong className="text-slate-900">{deletingPerson.name}</strong> ({deletingPerson.student_id}) from this project? This action cannot be undone.
            </span>
          }
          confirmText="Yes, Remove Student"
          isDestructive={true}
          loading={deletingLoading}
        />
      )}
    </div>
  );
}

function PersonEditModal({
  projectId,
  template,
  person,
  onClose,
  onSaved,
}: {
  projectId: string;
  template: IdCardTemplate | null;
  person: IdCardPerson | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(person?.photo_url ?? null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const fieldSchema = useMemo(() => extractTemplateFieldSchema(template?.layout), [template]);
  const hasPhotoField = fieldSchema.assetFields.some((f) => f.key === 'student_photo');
  const isPhotoRequired = fieldSchema.assetFields.find((f) => f.key === 'student_photo')?.required ?? false;

  const isEditing = Boolean(person);

  async function handleFormSubmit(values: Record<string, any>) {
    setSubmitting(true);
    setError(null);
    try {
      let finalPhotoUrl = photoPath;

      const standardKeys = [
        'student_id',
        'name',
        'class',
        'section',
        'roll_number',
        'date_of_birth',
        'blood_group',
        'father_name',
        'mother_name',
        'phone',
        'emergency_number',
        'address',
      ];

      const standardData: Record<string, any> = {
        project_id: projectId,
        student_id: values.student_id?.trim(),
        name: values.name?.trim(),
        class: values.class?.trim() || null,
        section: values.section?.trim() || null,
        roll_number: values.roll_number?.trim() || null,
        date_of_birth: values.date_of_birth?.trim() || null,
        blood_group: values.blood_group?.trim() || null,
        father_name: values.father_name?.trim() || null,
        mother_name: values.mother_name?.trim() || null,
        phone: values.phone?.trim() || null,
        emergency_number: values.emergency_number?.trim() || null,
        address: values.address?.trim() || null,
        photo_url: finalPhotoUrl || null,
      };

      const customFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(values)) {
        if (!standardKeys.includes(k) && k !== 'student_photo') {
          customFields[k] = v;
        }
      }

      if (person) {
        if (pendingPhotoFile) {
          finalPhotoUrl = await uploadPersonPhoto(person.id, pendingPhotoFile);
        }
        if (isPhotoRequired && !finalPhotoUrl) {
          throw new Error('Student photo is required for this ID card template.');
        }
        await updateIdCardPerson(person.id, {
          ...standardData,
          photo_url: finalPhotoUrl || null,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : person.custom_fields || null,
        });
      } else {
        if (isPhotoRequired && !pendingPhotoFile && !finalPhotoUrl) {
          throw new Error('Student photo is required for this ID card template.');
        }
        const created = await createIdCardPerson({
          ...standardData,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
        } as any);
        if (pendingPhotoFile && created) {
          finalPhotoUrl = await uploadPersonPhoto(created.id, pendingPhotoFile);
          await updateIdCardPerson(created.id, { photo_url: finalPhotoUrl });
        }
      }
      onSaved();
    } catch (err) {
      const appError = classifySupabaseError(err);
      setError(errorCodeToUserMessage(appError.code, appError.message));
    } finally {
      setSubmitting(false);
    }
  }

  const initialValues = useMemo(() => {
    if (!person) return {};
    return {
      ...person,
      ...(person.custom_fields || {}),
    };
  }, [person]);

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="person-edit-form"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-2xs"
      >
        {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Student'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? `Edit ${person?.name || 'Student'}` : 'Add Student'}
      subtitle={
        template
          ? `Fields configured according to active template: ${template.name}`
          : 'Enter student details for ID card generation'
      }
      size="lg"
      footer={footer}
      closeOnBackdropClick={false}
      preventEscapeClose={submitting}
    >
      <div className="space-y-4">
        {hasPhotoField && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Student Photo {isPhotoRequired ? <span className="text-rose-500">*</span> : '(Optional)'}
            </h4>
            <div className="mt-2.5">
              <PhotoUpload
                photoPath={photoPath}
                initialPreviewUrl={pendingPreviewUrl || photoPath}
                onFileSelect={(file: File | null, previewUrl: string | null) => {
                  setPendingPhotoFile(file);
                  setPendingPreviewUrl(previewUrl);
                  if (!file && !previewUrl) {
                    setPhotoPath(null);
                  }
                }}
                onChange={(path) => setPhotoPath(path)}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <PersonForm
          schema={fieldSchema}
          initial={initialValues}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          serverError={error}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}

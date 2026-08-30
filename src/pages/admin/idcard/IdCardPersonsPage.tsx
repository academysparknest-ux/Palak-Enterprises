import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  Plus,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Images,
  LayoutTemplate,
  AlertCircle,
  Pencil,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import {
  getIdCardPersons,
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
  PaginatedResult,
} from '../../../lib/idcard/types';
import { extractTemplateFieldSchema } from '../../../lib/idcard/templateFieldSchema';
import { computeStudentIdCardStatus, validateStudentForIdCard } from '../../../lib/idcard/statusEngine';
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
      result: PaginatedResult<IdCardPerson>;
      template: IdCardTemplate | null;
      generations: IdCardGeneration[];
    };

const PAGE_SIZE = 25;

export default function IdCardPersonsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'student_id' | 'class' | 'status' | 'updated_at'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const activeTemplate = state.kind === 'ready' ? state.template : null;
  const generations = state.kind === 'ready' ? state.generations : [];
  const fieldSchema = useMemo(() => extractTemplateFieldSchema(activeTemplate?.layout), [activeTemplate]);
  const requiredFields = useMemo(() => [...fieldSchema.studentInputFields, ...fieldSchema.assetFields].filter((f) => f.required), [fieldSchema]);

  const { project } = useOutletContext<{ project?: IdCardProject }>() || {};

  const load = useCallback(async () => {
    if (!projectId) return;
    setState({ kind: 'loading' });
    try {
      const [personsResult, templates, gens] = await Promise.all([
        getIdCardPersons(projectId, { search: search || undefined, page, pageSize: PAGE_SIZE }),
        getIdCardTemplates(projectId),
        getIdCardGenerations(projectId),
      ]);

      const targetTemplateId = project?.template_id;
      const activeTemplate =
        (targetTemplateId ? templates.find((t) => t.id === targetTemplateId) : null) ??
        (templates.length > 0 ? templates[0] : null);

      setState({
        kind: 'ready',
        result: personsResult,
        template: activeTemplate,
        generations: gens,
      });
    } catch (err) {
      const appError = classifySupabaseError(err);
      setState({ kind: 'error', message: errorCodeToUserMessage(appError.code) });
    }
  }, [projectId, search, page, project?.template_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Compute status info map for current records
  const studentStatusMap = useMemo(() => {
    if (state.kind !== 'ready') return new Map();
    const map = new Map<string, ReturnType<typeof computeStudentIdCardStatus>>();
    for (const person of state.result.data) {
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

  // Real-time Status Counts for Dashboard
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

    for (const person of state.result.data) {
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
      total: state.result.total,
      notReady,
      readyToGenerate,
      readyToPrint,
      printed,
      printFailed,
      reprintRequired,
      outdated,
    };
  }, [state, studentStatusMap]);

  // Filtered & Sorted Displayed Students
  const displayedPersons = useMemo(() => {
    if (state.kind !== 'ready') return [];
    let list = [...state.result.data];

    // Filter by ID Card status
    if (statusFilter !== 'ALL') {
      list = list.filter((p) => {
        const info = studentStatusMap.get(p.id);
        return info?.status === statusFilter;
      });
    }

    // Sort list
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'student_id') {
        valA = a.student_id;
        valB = b.student_id;
      } else if (sortField === 'class') {
        valA = `${a.class || ''}-${a.section || ''}`;
        valB = `${b.class || ''}-${b.section || ''}`;
      } else if (sortField === 'status') {
        valA = studentStatusMap.get(a.id)?.status || '';
        valB = studentStatusMap.get(b.id)?.status || '';
      } else if (sortField === 'updated_at') {
        valA = a.updated_at || '';
        valB = b.updated_at || '';
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [state, statusFilter, studentStatusMap, sortField, sortAsc]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!deletingPerson) return;
    setDeletingLoading(true);
    try {
      await deleteIdCardPerson(deletingPerson.id);
      setDeletingPerson(null);
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
      <div className="flex h-48 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading students & ID card readiness...
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

  return (
    <div className="space-y-4">
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
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

      {/* 3. Action Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Student Records</h1>
          {statusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Filter: {statusFilter.replace(/_/g, ' ')} ✕
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {fieldSchema.assetFields.some((f) => f.key === 'student_photo') && (
            <button
              onClick={() => setShowBulkPhotos(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
            >
              <Images size={14} /> Bulk Upload Photos
            </button>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <Upload size={14} /> Import Excel / CSV
          </button>
          <button
            onClick={() => setEditingPerson('new')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-2xs cursor-pointer"
          >
            <Plus size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* 4. Search and Sorting Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, student ID, roll number..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <ArrowUpDown size={14} className="text-slate-400" />
          <span className="font-medium">Sort:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
          >
            <option value="name">Name</option>
            <option value="student_id">Student ID</option>
            <option value="class">Class</option>
            <option value="status">ID Card Status</option>
            <option value="updated_at">Last Updated</option>
          </select>
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {sortAsc ? 'ASC ↑' : 'DESC ↓'}
          </button>
        </div>
      </div>

      {/* 5. Main Student Records Table */}
      <div>
        {displayedPersons.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
            {statusFilter !== 'ALL'
              ? `No students found matching status "${statusFilter.replace(/_/g, ' ')}".`
              : 'No students yet. Add one or import an Excel / CSV spreadsheet.'}
          </div>
        )}

        {displayedPersons.length > 0 && (
          <>
            <PersonTable
              persons={displayedPersons}
              schema={fieldSchema}
              template={activeTemplate}
              generations={generations}
              selected={selected}
              onToggleSelect={toggleSelect}
              onEdit={(p) => setEditingPerson(p)}
              onDelete={(p) => setDeletingPerson(p)}
              onViewMissing={(p) => setSelectedPersonForMissing(p)}
              onViewHistory={(p) => setSelectedPersonForHistory(p)}
              onRequestReprint={(p) => setSelectedPersonForReprint(p)}
            />

            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>
                Showing {displayedPersons.length} of {state.result.total} student
                {state.result.total === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>
                  Page {page} of {Math.max(1, Math.ceil(state.result.total / PAGE_SIZE))}
                </span>
                <button
                  disabled={page * PAGE_SIZE >= state.result.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
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
      if (pendingPhotoFile && values.student_id) {
        finalPhotoUrl = await uploadPersonPhoto(projectId, values.student_id, pendingPhotoFile);
      }

      if (isPhotoRequired && !finalPhotoUrl) {
        throw new Error('Student photo is required for this ID card template.');
      }

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
        await updateIdCardPerson(person.id, {
          ...standardData,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : person.custom_fields || null,
        });
      } else {
        await createIdCardPerson({
          ...standardData,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
        } as any);
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
                currentPhotoUrl={pendingPreviewUrl || photoPath}
                onPhotoSelected={(file, previewUrl) => {
                  setPendingPhotoFile(file);
                  setPendingPreviewUrl(previewUrl);
                }}
                onPhotoRemoved={() => {
                  setPendingPhotoFile(null);
                  setPendingPreviewUrl(null);
                  setPhotoPath(null);
                }}
                disabled={submitting}
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
          id="person-edit-form"
          schema={fieldSchema}
          initialValues={initialValues}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          submitLabel={isEditing ? 'Save Changes' : 'Create Student'}
          onCancel={onClose}
          hideActions={true}
        />
      </div>
    </Modal>
  );
}

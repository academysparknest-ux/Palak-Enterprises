import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Plus, Upload, Loader2, ChevronLeft, ChevronRight, Search, Images, LayoutTemplate, AlertCircle, Pencil } from 'lucide-react';
import {
  getIdCardPersons,
  getIdCardTemplates,
  createIdCardPerson,
  updateIdCardPerson,
  deleteIdCardPerson,
  uploadPersonPhoto,
} from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import type { IdCardPerson, IdCardTemplate, IdCardProject, PaginatedResult } from '../../../lib/idcard/types';
import {
  extractTemplateFieldSchema,
  validatePersonForTemplate,
} from '../../../lib/idcard/templateFieldSchema';
import { PersonTable } from '../../../components/idcard/PersonTable';
import { PersonForm } from '../../../components/idcard/PersonForm';
import { PhotoUpload } from '../../../components/idcard/PhotoUpload';
import { CsvImportModal } from '../../../components/idcard/CsvImportModal';
import { BulkPhotoUploadModal } from '../../../components/idcard/BulkPhotoUploadModal';
import { Modal, ConfirmModal } from '../../../components/ui/Modal';

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; result: PaginatedResult<IdCardPerson>; template: IdCardTemplate | null };

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
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<IdCardPerson | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const activeTemplate = state.kind === 'ready' ? state.template : null;
  const fieldSchema = useMemo(() => extractTemplateFieldSchema(activeTemplate?.layout), [activeTemplate]);

  const requiredFields = [...fieldSchema.studentInputFields, ...fieldSchema.assetFields].filter((f) => f.required);
  const studentsWithMissingData = useMemo(() => {
    if (state.kind !== 'ready') return [];
    return state.result.data
      .map((p) => ({ person: p, validation: validatePersonForTemplate(p, fieldSchema) }))
      .filter((item) => !item.validation.valid);
  }, [state, fieldSchema]);

  const missingPhotosCount = useMemo(() => {
    if (state.kind !== 'ready') return 0;
    return state.result.data.filter((p) => !p.photo_url || !p.photo_url.trim()).length;
  }, [state]);

  const displayedPersons = useMemo(() => {
    if (state.kind !== 'ready') return [];
    if (!filterIncompleteOnly) return state.result.data;
    return state.result.data.filter((p) => !validatePersonForTemplate(p, fieldSchema).valid);
  }, [state, filterIncompleteOnly, fieldSchema]);

  const { project } = useOutletContext<{ project?: IdCardProject }>() || {};

  const load = useCallback(async () => {
    if (!projectId) return;
    setState({ kind: 'loading' });
    try {
      const [personsResult, templates] = await Promise.all([
        getIdCardPersons(projectId, { search: search || undefined, page, pageSize: PAGE_SIZE }),
        getIdCardTemplates(projectId),
      ]);

      const targetTemplateId = project?.template_id;
      const activeTemplate =
        (targetTemplateId ? templates.find((t) => t.id === targetTemplateId) : null) ??
        (templates.length > 0 ? templates[0] : null);

      setState({ kind: 'ready', result: personsResult, template: activeTemplate });
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
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading students...
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
      {/* Template Requirement Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
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
              Required Student Fields ({requiredFields.length}):{' '}
              <span className="font-semibold text-slate-700">
                {requiredFields.map((f) => f.label).join(', ') || 'None required'}
              </span>
            </p>
          </div>
        </div>

        <Link
          to="../template"
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Edit Template Fields →
        </Link>
      </div>

      {/* Missing Required Data Alert with Action Buttons */}
      {studentsWithMissingData.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950 text-sm">
                  {studentsWithMissingData.length} student(s) on this page are missing required template information.
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  The active template requires fields that are not filled in for these student records.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMissingModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-2xs cursor-pointer transition"
              >
                <AlertCircle size={13} /> View Missing Details ({studentsWithMissingData.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterIncompleteOnly(!filterIncompleteOnly)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer transition ${
                  filterIncompleteOnly
                    ? 'border-amber-600 bg-amber-200 text-amber-950 font-bold'
                    : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100/60'
                }`}
              >
                {filterIncompleteOnly ? 'Show All Students' : 'Filter Incomplete Only'}
              </button>

              {missingPhotosCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBulkPhotos(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 shadow-2xs cursor-pointer transition"
                >
                  <Images size={13} /> Upload Photos ({missingPhotosCount})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          {filterIncompleteOnly && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
              Showing Incomplete Only ({displayedPersons.length})
            </span>
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

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, student ID, or roll number..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        {displayedPersons.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
            {filterIncompleteOnly
              ? 'All students on this page have complete information!'
              : 'No students yet. Add one or import an Excel / CSV spreadsheet.'}
          </div>
        )}

        {displayedPersons.length > 0 && (
          <>
            <PersonTable
              persons={displayedPersons}
              schema={fieldSchema}
              selected={selected}
              onToggleSelect={toggleSelect}
              onEdit={(p) => setEditingPerson(p)}
              onDelete={(p) => setDeletingPerson(p)}
            />

            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>
                {filterIncompleteOnly ? `${displayedPersons.length} incomplete of ` : ''}
                {state.result.total} student{state.result.total === 1 ? '' : 's'} total
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

      {showMissingModal && (
        <MissingDetailsModal
          students={studentsWithMissingData}
          onClose={() => setShowMissingModal(false)}
          onEditStudent={(person) => {
            setShowMissingModal(false);
            setEditingPerson(person);
          }}
          onOpenBulkPhotos={() => {
            setShowMissingModal(false);
            setShowBulkPhotos(true);
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

  async function handleSubmit(data: Record<string, any>) {
    setSubmitting(true);
    setError(null);

    // Validate photo if required by template
    if (hasPhotoField && isPhotoRequired && !photoPath && !pendingPhotoFile) {
      setError('Student photo is required by the active template.');
      setSubmitting(false);
      return;
    }

    try {
      if (person) {
        await updateIdCardPerson(person.id, data as Partial<IdCardPerson>);
      } else {
        const created = await createIdCardPerson({
          ...(data as Partial<IdCardPerson>),
          project_id: projectId,
        } as Parameters<typeof createIdCardPerson>[0]);

        // If a photo was selected and cropped during Add Student, upload it now
        if (pendingPhotoFile && created?.id) {
          try {
            await uploadPersonPhoto(created.id, pendingPhotoFile);
          } catch (uploadErr) {
            console.error('Failed to upload photo for created student:', uploadErr);
          }
        }
      }
      onSaved();
    } catch (err) {
      const appErr = classifySupabaseError(err);
      setError(appErr.message || errorCodeToUserMessage(appErr.code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={person ? 'Edit Student' : 'Add New Student'}
      subtitle={
        person
          ? 'Update student details and profile photo for ID cards.'
          : `Enter required student information according to ${template?.name || 'template'}.`
      }
      size="lg"
      closeOnBackdropClick={false}
      preventEscapeClose={submitting}
    >
      <div className="space-y-4">
        {/* Photo Upload Section (Rendered when Photo is in template) */}
        {hasPhotoField && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Student Photo {isPhotoRequired && <span className="text-red-500">*</span>}
            </label>
            <PhotoUpload
              personId={person?.id ?? null}
              photoPath={photoPath}
              initialPreviewUrl={pendingPreviewUrl}
              onChange={(newPath) => {
                setPhotoPath(newPath);
                setPendingPhotoFile(null);
              }}
              onFileSelect={(file, url) => {
                setPendingPhotoFile(file);
                setPendingPreviewUrl(url);
              }}
              shape="circle"
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-600 border border-red-200">
            {error}
          </p>
        )}

        <div>
          <PersonForm
            initial={person ?? undefined}
            schema={fieldSchema}
            serverError={error}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitting={submitting}
          />
        </div>
      </div>
    </Modal>
  );
}

function MissingDetailsModal({
  students,
  onClose,
  onEditStudent,
  onOpenBulkPhotos,
}: {
  students: Array<{ person: IdCardPerson; validation: { valid: boolean; missingFields: string[] } }>;
  onClose: () => void;
  onEditStudent: (person: IdCardPerson) => void;
  onOpenBulkPhotos: () => void;
}) {
  const [modalSearch, setModalSearch] = useState('');

  const filtered = useMemo(() => {
    if (!modalSearch.trim()) return students;
    const q = modalSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.person.name.toLowerCase().includes(q) ||
        s.person.student_id.toLowerCase().includes(q) ||
        (s.person.roll_number && s.person.roll_number.toLowerCase().includes(q)) ||
        s.validation.missingFields.some((f) => f.toLowerCase().includes(q))
    );
  }, [students, modalSearch]);

  const missingPhotos = students.filter((s) => s.validation.missingFields.includes('Student Photo') || s.validation.missingFields.includes('Photo')).length;

  const footer = (
    <div className="flex w-full items-center justify-between">
      <p className="text-[11px] text-slate-500">
        Click <strong>Edit Student</strong> or upload photos to complete student records for printing.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer transition shadow-2xs"
      >
        Done
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Missing Template Information"
      subtitle={`${students.length} student record${students.length === 1 ? '' : 's'} on this page require additional details.`}
      icon={<AlertCircle size={20} className="text-amber-700" />}
      size="xl"
      footer={footer}
      closeOnBackdropClick={false}
    >
      <div className="space-y-3">
        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Filter by student name, ID, or missing field..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-slate-400 focus:outline-none"
            />
          </div>

          {missingPhotos > 0 && (
            <button
              type="button"
              onClick={onOpenBulkPhotos}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
            >
              <Images size={13} /> Bulk Upload Photos ({missingPhotos})
            </button>
          )}
        </div>

        {/* List of Incomplete Students */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No students match your filter.
            </div>
          ) : (
            filtered.map(({ person, validation }) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/30 p-3 hover:border-amber-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{person.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-600">
                      ID: {person.student_id}
                    </span>
                    {person.class && (
                      <span className="text-[10px] text-slate-500">
                        {person.class} {person.section ? `(${person.section})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-semibold text-amber-900">Missing:</span>
                    {validation.missingFields.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300"
                      >
                        {f === 'Student Photo' || f === 'Photo' ? '📷 ' : '⚠️ '}
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onEditStudent(person)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                >
                  <Pencil size={12} /> Edit Student
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

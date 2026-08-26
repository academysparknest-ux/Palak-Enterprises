import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Upload, Loader2, ChevronLeft, ChevronRight, Search, Images } from 'lucide-react';
import {
  getIdCardPersons,
  createIdCardPerson,
  updateIdCardPerson,
  deleteIdCardPerson,
  uploadPersonPhoto,
} from '../../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../../lib/idcard/errors';
import type { IdCardPerson, PaginatedResult } from '../../../lib/idcard/types';
import { PersonTable } from '../../../components/idcard/PersonTable';
import { PersonForm } from '../../../components/idcard/PersonForm';
import { PhotoUpload } from '../../../components/idcard/PhotoUpload';
import { CsvImportModal } from '../../../components/idcard/CsvImportModal';
import { BulkPhotoUploadModal } from '../../../components/idcard/BulkPhotoUploadModal';

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; result: PaginatedResult<IdCardPerson> };

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

  const load = useCallback(async () => {
    if (!projectId) return;
    setState({ kind: 'loading' });
    try {
      const result = await getIdCardPersons(projectId, { search: search || undefined, page, pageSize: PAGE_SIZE });
      setState({ kind: 'ready', result });
    } catch (err) {
      const appError = classifySupabaseError(err);
      setState({ kind: 'error', message: errorCodeToUserMessage(appError.code) });
    }
  }, [projectId, search, page]);

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

  async function handleDelete(person: IdCardPerson) {
    if (!confirm(`Remove ${person.name} from this project?`)) return;
    try {
      await deleteIdCardPerson(person.id);
      load();
    } catch (err) {
      alert(errorCodeToUserMessage(classifySupabaseError(err).code));
    }
  }

  if (!projectId) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBulkPhotos(true)}
            className="flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 transition shadow-2xs"
          >
            <Images size={15} /> Bulk Upload Photos
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Upload size={15} /> Import Excel / CSV
          </button>
          <button
            onClick={() => setEditingPerson('new')}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition shadow-2xs"
          >
            <Plus size={15} /> Add Student
          </button>
        </div>
      </div>

      <div className="relative mt-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, student ID, or roll number..."
          className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div className="mt-4">
        {state.kind === 'loading' && (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={18} /> Loading students...
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">Unable to load students: {state.message}</p>
            <button onClick={load} className="mt-2 text-sm font-medium text-red-800 underline">
              Retry
            </button>
          </div>
        )}

        {state.kind === 'ready' && state.result.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-slate-400">
            No students yet. Add one or import a CSV.
          </div>
        )}

        {state.kind === 'ready' && state.result.data.length > 0 && (
          <>
            <PersonTable
              persons={state.result.data}
              selected={selected}
              onToggleSelect={toggleSelect}
              onEdit={(p) => setEditingPerson(p)}
              onDelete={handleDelete}
            />

            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>
                {state.result.total} student{state.result.total === 1 ? '' : 's'} total
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>
                  Page {page} of {Math.max(1, Math.ceil(state.result.total / PAGE_SIZE))}
                </span>
                <button
                  disabled={page * PAGE_SIZE >= state.result.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editingPerson && (
        <PersonEditModal
          projectId={projectId}
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
    </div>
  );
}

function PersonEditModal({
  projectId,
  person,
  onClose,
  onSaved,
}: {
  projectId: string;
  person: IdCardPerson | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(person?.photo_url ?? null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  async function handleSubmit(data: Record<string, string>) {
    setSubmitting(true);
    setError(null);
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
      setError(errorCodeToUserMessage(classifySupabaseError(err).code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-2xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{person ? 'Edit Student' : 'Add New Student'}</h2>
          <p className="text-xs text-slate-500">
            {person
              ? 'Update student details and profile photo for ID cards.'
              : 'Enter student information and upload a cropped circular photo.'}
          </p>
        </div>

        {/* Photo Upload & Circular Crop Section (Available for both Add and Edit) */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Student Photo (Circular I-Card Headshot)
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

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-600 border border-red-200">{error}</p>}

        <div className="mt-4">
          <PersonForm initial={person ?? undefined} onSubmit={handleSubmit} onCancel={onClose} submitting={submitting} />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Upload,
  Images,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getAllIdCardPersons, uploadPersonPhoto } from '../../lib/idcard/database';
import { matchPhotoToPerson, type MatchType } from '../../lib/idcard/photoMatcher';
import type { IdCardPerson } from '../../lib/idcard/types';

interface MatchedPhoto {
  file: File;
  previewUrl: string;
  baseName: string;
  person: IdCardPerson | null; // matched person
  status: 'matched' | 'unmatched' | 'manual';
  matchType?: MatchType;
  matchReason?: string;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export function BulkPhotoUploadModal({
  projectId,
  onClose,
  onUploaded,
}: {
  projectId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [step, setStep] = useState<'pick' | 'review' | 'uploading' | 'done'>('pick');
  const [persons, setPersons] = useState<IdCardPerson[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Load all students for this project
  useEffect(() => {
    let cancelled = false;
    getAllIdCardPersons(projectId)
      .then((data) => {
        if (!cancelled) {
          setPersons(data);
          setLoadingPersons(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingPersons(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newPhotos: MatchedPhoto[] = [];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!validExtensions.includes(ext)) continue;

      const lastDot = file.name.lastIndexOf('.');
      const baseName = lastDot > 0 ? file.name.substring(0, lastDot).trim() : file.name.trim();

      // Intelligent multi-layer match
      const match = matchPhotoToPerson(file.name, baseName, persons);

      newPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
        baseName,
        person: match.person,
        status: match.person ? 'matched' : 'unmatched',
        matchType: match.matchType,
        matchReason: match.matchReason,
      });
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setStep('review');
  }

  function handleManualAssign(index: number, personId: string) {
    const selectedPerson = persons.find((p) => p.id === personId) || null;
    setPhotos((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              person: selectedPerson,
              status: selectedPerson ? 'manual' : 'unmatched',
            }
          : item
      )
    );
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleStartUpload() {
    const toUpload = photos.filter((p) => p.person !== null);
    if (toUpload.length === 0) return;

    setStep('uploading');
    let success = 0;
    let failed = 0;

    // Upload in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batchIndices = [];
      for (let j = i; j < Math.min(i + batchSize, photos.length); j++) {
        if (photos[j].person !== null) batchIndices.push(j);
      }

      await Promise.all(
        batchIndices.map(async (idx) => {
          const item = photos[idx];
          if (!item.person) return;

          setPhotos((prev) =>
            prev.map((p, pIdx) => (pIdx === idx ? { ...p, uploadStatus: 'uploading' } : p))
          );

          try {
            await uploadPersonPhoto(item.person.id, item.file);
            success++;
            setUploadedCount(success);
            setPhotos((prev) =>
              prev.map((p, pIdx) => (pIdx === idx ? { ...p, uploadStatus: 'success' } : p))
            );
          } catch (err: any) {
            failed++;
            setFailedCount(failed);
            setPhotos((prev) =>
              prev.map((p, pIdx) =>
                pIdx === idx
                  ? { ...p, uploadStatus: 'error', errorMessage: err?.message || 'Upload failed' }
                  : p
              )
            );
          }
        })
      );
    }

    setStep('done');
  }

  const matchedList = photos.filter((p) => p.person !== null);
  const unmatchedList = photos.filter((p) => p.person === null);
  const displayedPhotos =
    filterTab === 'matched' ? matchedList : filterTab === 'unmatched' ? unmatchedList : photos;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-2xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <Images size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Upload Student Photos</h2>
              <p className="text-xs text-slate-500">
                Matches image file names (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-700">012345678901.jpg</code>) directly with <span className="font-semibold text-slate-800">Student ID</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingPersons ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <p className="text-xs">Loading students list...</p>
            </div>
          ) : step === 'pick' ? (
            <div className="space-y-5">
              {/* How it works info box */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
                <p className="font-bold text-indigo-900 mb-1.5 flex items-center gap-1.5 text-sm">
                  <Sparkles size={16} className="text-indigo-600" />
                  Smart Automatic Photo Matching:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                  <li>
                    <strong className="text-slate-900">Student ID or Roll No:</strong> Name photos with IDs or Roll numbers (e.g. <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-800">0001.jpg</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-800">0034.jpg</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-800">34.jpg</code>).
                  </li>
                  <li>
                    <strong className="text-slate-900">Zero-padding & Prefixes:</strong> Automatically handles leading zeroes (<code className="bg-white px-1 rounded text-indigo-800 font-semibold">0001</code> ↔ <code className="bg-white px-1 rounded text-indigo-800 font-semibold">1</code>) and camera prefixes (<code className="bg-white px-1 rounded text-indigo-800 font-semibold">IMG_0001.jpg</code>, <code className="bg-white px-1 rounded text-indigo-800 font-semibold">DSC_0034.jpg</code>).
                  </li>
                  <li>
                    <strong className="text-slate-900">Student Name & Excel Photos:</strong> Also recognizes student names (e.g. <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-800">Arjun Gupta.jpg</code>) and photo filenames uploaded in Excel.
                  </li>
                  <li className="pt-0.5">
                    Currently ready to match: <strong className="text-indigo-900 font-bold">{persons.length} student records</strong> in this project.
                  </li>
                </ul>
              </div>

              {/* Multi-file dropzone */}
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 py-16 text-slate-400 hover:border-indigo-500 hover:bg-indigo-50/20 transition">
                <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600 shadow-2xs">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Click to choose Multiple Student Photos</p>
                  <p className="text-xs text-slate-400 mt-0.5">Select 10, 50, 100+ photos at once (JPG, PNG, WEBP)</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>
          ) : step === 'review' ? (
            <div className="space-y-4">
              {/* Summary Badges & Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Filter:</span>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setFilterTab('all')}
                      className={`rounded-md px-2.5 py-1 transition ${
                        filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({photos.length})
                    </button>
                    <button
                      onClick={() => setFilterTab('matched')}
                      className={`rounded-md px-2.5 py-1 transition ${
                        filterTab === 'matched' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✅ Matched ({matchedList.length})
                    </button>
                    {unmatchedList.length > 0 && (
                      <button
                        onClick={() => setFilterTab('unmatched')}
                        className={`rounded-md px-2.5 py-1 transition ${
                          filterTab === 'unmatched' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚠️ Unmatched ({unmatchedList.length})
                      </button>
                    )}
                  </div>
                </div>

                <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  + Add More Photos
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photos List */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {displayedPhotos.map((item) => {
                  const originalIndex = photos.indexOf(item);
                  return (
                    <div
                      key={originalIndex}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition ${
                        item.person
                          ? 'border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300'
                          : 'border-amber-200 bg-amber-50/40'
                      }`}
                    >
                      {/* Left: Thumbnail & File name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-12 w-12 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={item.file.name}>
                            {item.file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{(item.file.size / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span>Extracted: <strong className="text-slate-700 font-semibold">"{item.baseName}"</strong></span>
                            {item.matchReason && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100/70 px-1 py-0.2 text-[9px] font-semibold text-emerald-800">
                                  {item.matchReason}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Matched Student or Dropdown */}
                      <div className="flex items-center gap-2 w-80 shrink-0">
                        {item.person ? (
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-900 w-full shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold truncate text-slate-900">{item.person.name}</p>
                                <p className="text-[10px] text-emerald-800 truncate">
                                  ID: <span className="font-semibold text-slate-900">{item.person.student_id}</span>
                                  {item.person.roll_number && <> • Roll: <span className="font-semibold text-slate-900">{item.person.roll_number}</span></>}
                                  {item.person.class && <> • Class: <span className="font-semibold text-slate-900">{item.person.class}{item.person.section ? `-${item.person.section}` : ''}</span></>}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleManualAssign(originalIndex, '')}
                              className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 hover:underline shrink-0 ml-1"
                              title="Change matched student"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div className="w-full">
                            <select
                              value={item.person ? (item.person as IdCardPerson).id : ''}
                              onChange={(e) => handleManualAssign(originalIndex, e.target.value)}
                              className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">⚠️ Select matching student...</option>
                              {persons.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (ID: {p.student_id}{p.roll_number ? `, Roll: ${p.roll_number}` : ''})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Right: Remove button */}
                      <button
                        onClick={() => handleRemovePhoto(originalIndex)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 shrink-0"
                        title="Remove"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : step === 'uploading' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <span className="absolute text-xs font-bold text-slate-700">
                  {Math.round((uploadedCount / Math.max(matchedList.length, 1)) * 100)}%
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Uploading & Attaching Photos...</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Uploaded <span className="font-bold text-slate-900">{uploadedCount}</span> of{' '}
                  <span className="font-bold text-slate-900">{matchedList.length}</span> photos
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Photos Uploaded Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Attached photos to <span className="font-bold text-emerald-700">{uploadedCount}</span> student records.
                </p>
                {failedCount > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {failedCount} photo(s) encountered upload errors.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {step === 'review' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartUpload}
                disabled={matchedList.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40"
              >
                <span>Upload & Attach {matchedList.length} Photos</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === 'done' && (
            <button
              onClick={() => {
                onUploaded();
                onClose();
              }}
              className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Done & Refresh List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

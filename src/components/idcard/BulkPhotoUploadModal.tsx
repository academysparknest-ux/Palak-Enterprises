import { useEffect, useState, useRef } from 'react';
import {
  Upload,
  Images,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Crop,
} from 'lucide-react';
import { getAllIdCardPersons, uploadPersonPhoto } from '../../lib/idcard/database';
import { matchPhotoToPerson, type MatchType } from '../../lib/idcard/photoMatcher';
import {
  validatePhoto,
  formatBytes,
} from '../../lib/idcard/photoValidation';
import { ImageCropModal } from './ImageCropModal';
import type { IdCardPerson } from '../../lib/idcard/types';

export interface BulkPhotoItem {
  id: string; // unique identifier
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  baseName: string;
  dimensions?: { width: number; height: number };
  valid: boolean;
  validationError?: string;
  isRecommendedDim?: boolean;
  person: IdCardPerson | null;
  status: 'matched' | 'unmatched' | 'manual' | 'invalid';
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
  const [step, setStep] = useState<'pick' | 'validating' | 'review' | 'uploading' | 'done'>('pick');
  const [persons, setPersons] = useState<IdCardPerson[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [photos, setPhotos] = useState<BulkPhotoItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'valid_matched' | 'unmatched' | 'invalid' | 'failed'>('all');
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0, failed: 0 });
  const [cropItem, setCropItem] = useState<BulkPhotoItem | null>(null);

  const activeUrlsRef = useRef<Set<string>>(new Set());

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

  // Clean up object URLs on unmount
  useEffect(() => {
    const urls = activeUrlsRef.current;
    return () => {
      urls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;

    setStep('validating');
    setValidationProgress({ current: 0, total: files.length });

    const newItems: BulkPhotoItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lastDot = file.name.lastIndexOf('.');
      const baseName = lastDot > 0 ? file.name.substring(0, lastDot).trim() : file.name.trim();

      // Lightweight validation without canvas or image compression
      const valResult = await validatePhoto(file);

      const previewUrl = URL.createObjectURL(file);
      activeUrlsRef.current.add(previewUrl);

      if (!valResult.valid) {
        newItems.push({
          id: `${file.name}-${file.size}-${Date.now()}-${i}`,
          file,
          previewUrl,
          name: file.name,
          size: file.size,
          baseName,
          valid: false,
          validationError: valResult.error,
          person: null,
          status: 'invalid',
        });
      } else {
        // Intelligent multi-layer match to student record
        const match = matchPhotoToPerson(file.name, baseName, persons);

        newItems.push({
          id: `${file.name}-${file.size}-${Date.now()}-${i}`,
          file,
          previewUrl,
          name: file.name,
          size: file.size,
          baseName,
          dimensions: { width: valResult.width || 0, height: valResult.height || 0 },
          valid: true,
          isRecommendedDim: valResult.isRecommended,
          person: match.person,
          status: match.person ? 'matched' : 'unmatched',
          matchType: match.matchType,
          matchReason: match.matchReason,
        });
      }

      setValidationProgress({ current: i + 1, total: files.length });
    }

    setPhotos((prev) => [...prev, ...newItems]);
    setStep('review');
  }

  function handleManualAssign(itemId: string, personId: string) {
    const selectedPerson = persons.find((p) => p.id === personId) || null;
    setPhotos((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              person: selectedPerson,
              status: selectedPerson ? 'manual' : 'unmatched',
            }
          : item
      )
    );
  }

  function handleRemovePhoto(itemId: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === itemId);
      if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
        activeUrlsRef.current.delete(item.previewUrl);
      }
      return prev.filter((p) => p.id !== itemId);
    });
  }

  async function handleCropComplete(croppedFile: File, newPreviewUrl: string) {
    if (!cropItem) return;
    activeUrlsRef.current.add(newPreviewUrl);

    const validation = await validatePhoto(croppedFile);

    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === cropItem.id) {
          return {
            ...p,
            file: croppedFile,
            previewUrl: newPreviewUrl,
            size: croppedFile.size,
            dimensions:
              validation.width && validation.height
                ? { width: validation.width, height: validation.height }
                : undefined,
            valid: validation.valid,
            validationError: validation.error,
            isRecommendedDim: validation.isRecommended,
          };
        }
        return p;
      })
    );

    setCropItem(null);
  }

  async function handleStartUpload(onlyFailed: boolean = false) {
    const itemsToUpload = photos.filter((p) => {
      if (!p.valid || !p.person) return false;
      if (onlyFailed) return p.uploadStatus === 'error';
      return p.uploadStatus !== 'success';
    });

    if (itemsToUpload.length === 0) return;

    setStep('uploading');
    setUploadProgress({ uploaded: 0, total: itemsToUpload.length, failed: 0 });

    let successful = 0;
    let failed = 0;

    // Concurrently upload in batches of 3 to avoid overloading free Supabase network limits
    const batchSize = 3;
    for (let i = 0; i < itemsToUpload.length; i += batchSize) {
      const batch = itemsToUpload.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (item) => {
          if (!item.person) return;

          setPhotos((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, uploadStatus: 'uploading' } : p))
          );

          try {
            // Direct upload of original unchanged File object
            await uploadPersonPhoto(item.person.id, item.file);
            successful++;
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, uploadStatus: 'success', errorMessage: undefined } : p
              )
            );
          } catch (err: any) {
            failed++;
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, uploadStatus: 'error', errorMessage: err?.message || 'Upload failed' }
                  : p
              )
            );
          }

          setUploadProgress({
            uploaded: successful,
            total: itemsToUpload.length,
            failed,
          });
        })
      );
    }

    setStep('done');
  }

  const validPhotos = photos.filter((p) => p.valid);
  const invalidPhotos = photos.filter((p) => !p.valid);
  const validMatchedPhotos = photos.filter((p) => p.valid && p.person !== null);
  const unmatchedPhotos = photos.filter((p) => p.valid && p.person === null);
  const failedPhotos = photos.filter((p) => p.uploadStatus === 'error');
  const successfulPhotos = photos.filter((p) => p.uploadStatus === 'success');

  const displayedPhotos =
    filterTab === 'valid_matched'
      ? validMatchedPhotos
      : filterTab === 'unmatched'
      ? unmatchedPhotos
      : filterTab === 'invalid'
      ? invalidPhotos
      : filterTab === 'failed'
      ? failedPhotos
      : photos;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-2xs">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <Images size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Upload Student Photos</h2>
              <p className="text-xs text-slate-500">
                Lightweight direct upload (50 KB – 500 KB, min 300×360 px) matched to <span className="font-semibold text-slate-800">Student ID / Roll No</span>
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
              {/* Rules & Requirements Box */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
                <p className="font-bold text-indigo-900 mb-1.5 text-sm">
                  Photo Specifications & Automatic Matching Rules:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 mt-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">📏 Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                      <li><strong>File size:</strong> 50 KB – 500 KB</li>
                      <li><strong>Formats:</strong> JPG, PNG, WebP</li>
                      <li><strong>Resolution:</strong> Min 300×360 px (Rec: 600×720 px, 5:6)</li>
                      <li><strong>No processing:</strong> Uploaded original directly</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">🔍 Smart Matching:</p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                      <li>Matches filename (e.g. <code className="bg-white px-1 py-0.5 rounded text-indigo-800 font-semibold">0001.jpg</code>, <code className="bg-white px-1 py-0.5 rounded text-indigo-800 font-semibold">STU-102.png</code>)</li>
                      <li>Zero-padding agnostic (<code className="bg-white px-1 rounded text-indigo-800 font-semibold">0034</code> ↔ <code className="bg-white px-1 rounded text-indigo-800 font-semibold">34</code>)</li>
                      <li>Prefix removal (<code className="bg-white px-1 rounded text-indigo-800 font-semibold">IMG_0001</code>, <code className="bg-white px-1 rounded text-indigo-800 font-semibold">DSC_0034</code>)</li>
                      <li>Ready to match: <strong className="text-indigo-900 font-bold">{persons.length} students</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Multi-file dropzone */}
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 py-16 text-slate-400 hover:border-indigo-500 hover:bg-indigo-50/20 transition">
                <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600 shadow-2xs">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Select Multiple Student Photos</p>
                  <p className="text-xs text-slate-400 mt-0.5">Choose 10, 50, 100, 500+ photos at once (JPG, PNG, WebP)</p>
                  <p className="text-[11px] text-slate-400 mt-1">50 KB – 500 KB • Min 300×360 px</p>
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
          ) : step === 'validating' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <div>
                <h3 className="text-base font-bold text-slate-900">Validating Selected Photos...</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Checked {validationProgress.current} of {validationProgress.total} photos
                </p>
              </div>
            </div>
          ) : step === 'review' ? (
            <div className="space-y-4">
              {/* Validation Report Summary Banner */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Selected</span>
                  <p className="text-lg font-bold text-slate-900">{photos.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Valid Photos</span>
                  <p className="text-lg font-bold text-emerald-700">{validPhotos.length}</p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${invalidPhotos.length > 0 ? 'border-rose-200 bg-rose-50/50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Invalid Files</span>
                  <p className="text-lg font-bold">{invalidPhotos.length}</p>
                </div>
              </div>

              {/* Filter Tabs & Add more */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Filter:</span>
                  <div className="flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setFilterTab('all')}
                      className={`rounded-md px-2.5 py-1 transition ${
                        filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({photos.length})
                    </button>
                    <button
                      onClick={() => setFilterTab('valid_matched')}
                      className={`rounded-md px-2.5 py-1 transition ${
                        filterTab === 'valid_matched' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✓ Matched ({validMatchedPhotos.length})
                    </button>
                    {unmatchedPhotos.length > 0 && (
                      <button
                        onClick={() => setFilterTab('unmatched')}
                        className={`rounded-md px-2.5 py-1 transition ${
                          filterTab === 'unmatched' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚠️ Unmatched ({unmatchedPhotos.length})
                      </button>
                    )}
                    {invalidPhotos.length > 0 && (
                      <button
                        onClick={() => setFilterTab('invalid')}
                        className={`rounded-md px-2.5 py-1 transition ${
                          filterTab === 'invalid' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ❌ Invalid ({invalidPhotos.length})
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
                {displayedPhotos.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition ${
                      !item.valid
                        ? 'border-rose-200 bg-rose-50/40'
                        : item.person
                        ? 'border-emerald-200/80 bg-emerald-50/20'
                        : 'border-amber-200 bg-amber-50/40'
                    }`}
                  >
                    {/* Left: Thumbnail & File info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span>{formatBytes(item.size)}</span>
                          {item.dimensions && (
                            <>
                              <span>•</span>
                              <span>{item.dimensions.width}×{item.dimensions.height} px</span>
                            </>
                          )}
                          {item.matchReason && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.2 font-semibold text-emerald-800">
                                {item.matchReason}
                              </span>
                            </>
                          )}
                          {!item.valid && item.validationError && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">
                              <AlertCircle size={10} /> {item.validationError}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Match state or Dropdown */}
                    <div className="flex items-center gap-2 w-80 shrink-0">
                      {!item.valid ? (
                        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium px-2 py-1 bg-rose-100/60 rounded-md w-full">
                          <AlertCircle size={14} className="shrink-0 text-rose-600" />
                          <span className="truncate">{item.validationError || 'Invalid image file'}</span>
                        </div>
                      ) : item.person ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-900 w-full shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate text-slate-900">{item.person.name}</p>
                              <p className="text-[10px] text-emerald-800 truncate">
                                ID: <span className="font-semibold text-slate-900">{item.person.student_id}</span>
                                {item.person.roll_number && <> • Roll: <span className="font-semibold text-slate-900">{item.person.roll_number}</span></>}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleManualAssign(item.id, '')}
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
                            onChange={(e) => handleManualAssign(item.id, e.target.value)}
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

                    {/* Right: Actions (Crop & Remove) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCropItem(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-100 hover:text-amber-800 transition"
                        title="Crop & Align Student Photo"
                      >
                        <Crop size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                        title="Remove"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : step === 'uploading' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-5">
              <div className="relative flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={56} />
                <span className="absolute text-xs font-bold text-slate-800">
                  {Math.round(
                    ((uploadProgress.uploaded + uploadProgress.failed) / Math.max(uploadProgress.total, 1)) * 100
                  )}%
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Uploading Photos to Storage</h3>
                <p className="text-xs text-slate-500">
                  {uploadProgress.uploaded + uploadProgress.failed} / {uploadProgress.total} uploaded
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      ((uploadProgress.uploaded + uploadProgress.failed) / Math.max(uploadProgress.total, 1)) * 100
                    )}%`,
                  }}
                />
              </div>

              {/* Real-time stats */}
              <div className="flex items-center gap-6 text-xs text-slate-600">
                <span>Successful: <strong className="text-emerald-600 font-bold">{uploadProgress.uploaded}</strong></span>
                <span>Failed: <strong className="text-rose-600 font-bold">{uploadProgress.failed}</strong></span>
                <span>Remaining: <strong className="text-slate-800 font-bold">{uploadProgress.total - (uploadProgress.uploaded + uploadProgress.failed)}</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${failedPhotos.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {failedPhotos.length > 0 ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {failedPhotos.length > 0 ? 'Upload Completed with Warnings' : 'Upload Complete!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Successfully attached photos to <strong className="text-emerald-700">{successfulPhotos.length}</strong> student records.
                </p>
                {failedPhotos.length > 0 && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    {failedPhotos.length} photo(s) encountered upload errors.
                  </p>
                )}
              </div>

              {failedPhotos.length > 0 && (
                <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-left space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">Failed Photos ({failedPhotos.length})</span>
                    <button
                      onClick={() => handleStartUpload(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-200/80 px-2 py-1 rounded"
                    >
                      <RotateCw size={12} /> Retry Failed
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-rose-900">
                    {failedPhotos.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white/70 px-2 py-1 rounded">
                        <span className="truncate">{item.name}</span>
                        <span className="text-rose-600 font-medium shrink-0 ml-2">{item.errorMessage || 'Failed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                onClick={() => handleStartUpload(false)}
                disabled={validMatchedPhotos.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40"
              >
                <span>Upload {validMatchedPhotos.length} Valid Photos</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex items-center gap-2">
              {failedPhotos.length > 0 && (
                <button
                  onClick={() => handleStartUpload(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCw size={13} /> Retry Failed ({failedPhotos.length})
                </button>
              )}
              <button
                onClick={() => {
                  onUploaded();
                  onClose();
                }}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Done & Refresh List
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single Photo Crop Modal */}
      <ImageCropModal
        isOpen={Boolean(cropItem)}
        imageSrc={cropItem?.previewUrl || null}
        fileName={cropItem?.file.name || 'student-photo.jpg'}
        cropShape="circle"
        title={`Crop Photo for ${cropItem?.person?.name || cropItem?.baseName || 'Student'}`}
        onClose={() => setCropItem(null)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

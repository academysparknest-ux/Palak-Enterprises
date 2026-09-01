import React, { useEffect, useState, useRef } from 'react';
import { Camera, Loader2, X, AlertCircle, CheckCircle2, Crop } from 'lucide-react';
import {
  savePersonPhotoWithCropState,
  deletePersonPhoto,
  getPhotoSignedUrl,
} from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';
import { ImageCropModal } from './ImageCropModal';
import {
  validatePhoto,
  formatBytes,
  type PhotoValidationResult,
} from '../../lib/idcard/photoValidation';
import type { PhotoCropState } from '../../lib/idcard/types';

export interface PhotoUploadProps {
  personId?: string | null;
  photoPath?: string | null;
  originalPhotoPath?: string | null;
  initialPreviewUrl?: string | null;
  initialCropState?: PhotoCropState | null;
  onChange?: (path: string | null, originalPath?: string | null, cropState?: PhotoCropState | null) => void;
  onFileSelect?: (
    file: File | null,
    previewUrl: string | null,
    cropState?: PhotoCropState | null,
    originalFile?: File | null
  ) => void;
  shape?: 'circle' | 'rect';
}

export function PhotoUpload({
  personId,
  photoPath,
  originalPhotoPath,
  initialPreviewUrl,
  initialCropState,
  onChange,
  onFileSelect,
  shape = 'circle',
}: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [originalSourceUrl, setOriginalSourceUrl] = useState<string | null>(null);
  const [cropState, setCropState] = useState<PhotoCropState | null>(initialCropState ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<PhotoValidationResult | null>(null);

  // Authoritative Original Source file reference (kept in memory for current session)
  const originalFileRef = useRef<File | null>(null);
  const rawObjectUrlRef = useRef<string | null>(null);

  // Crop Modal state
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>('student-photo.jpg');
  const [originalFileSize, setOriginalFileSize] = useState<number | undefined>(undefined);
  const tempCropUrlRef = useRef<string | null>(null);

  // Sync with photoPath and originalPhotoPath from server if present
  useEffect(() => {
    let cancelled = false;
    if (!photoPath && !originalPhotoPath) {
      if (!initialPreviewUrl) {
        setPreviewUrl(null);
        setOriginalSourceUrl(null);
        setValidationInfo(null);
      }
      return;
    }

    const effectiveOriginalPath = originalPhotoPath || photoPath;

    // Load optimized derived photo for preview
    if (photoPath) {
      getPhotoSignedUrl(photoPath)
        .then((url) => {
          if (!cancelled) setPreviewUrl(url);
        })
        .catch(() => {
          if (!cancelled) setError('Could not load existing photo');
        });
    }

    // Load original photo source for future non-destructive re-crops
    if (effectiveOriginalPath) {
      getPhotoSignedUrl(effectiveOriginalPath)
        .then((url) => {
          if (!cancelled) setOriginalSourceUrl(url);
        })
        .catch(() => {
          // If original path fails, fallback to photoPath
          if (photoPath && !cancelled) setOriginalSourceUrl(photoPath);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [photoPath, originalPhotoPath, initialPreviewUrl]);

  // Sync initialCropState if updated from parent
  useEffect(() => {
    if (initialCropState) {
      setCropState(initialCropState);
    }
  }, [initialCropState]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    const tempCrop = tempCropUrlRef.current;
    const rawObj = rawObjectUrlRef.current;
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      if (tempCrop && tempCrop.startsWith('blob:')) {
        URL.revokeObjectURL(tempCrop);
      }
      if (rawObj && rawObj.startsWith('blob:')) {
        URL.revokeObjectURL(rawObj);
      }
    };
  }, [previewUrl]);

  // Handle new raw image file selection -> sets as authoritative original and opens ImageCropModal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files (JPG, PNG, WebP) are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Photo file size exceeds maximum limit (Max 15MB).');
      e.target.value = '';
      return;
    }

    // Store raw original File
    originalFileRef.current = file;

    if (rawObjectUrlRef.current && rawObjectUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(rawObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    rawObjectUrlRef.current = objectUrl;
    setOriginalSourceUrl(objectUrl);

    setCropSrc(objectUrl);
    setCropFileName(file.name);
    setOriginalFileSize(file.size);
    setShowCropModal(true);
    e.target.value = '';
  };

  // Called when user completes cropping & client-side optimization in ImageCropModal
  const handleCropComplete = async (
    croppedFile: File,
    newPreviewUrl: string,
    optResult?: any,
    newCropState?: PhotoCropState
  ) => {
    setError(null);

    const savedState = newCropState || cropState;
    if (savedState) {
      setCropState(savedState);
    }

    // Validate cropped photo
    const result = await validatePhoto(croppedFile);
    if (optResult?.originalSizeBytes) {
      (result as any).originalSizeBytes = optResult.originalSizeBytes;
      (result as any).formattedOriginalSize = optResult.formattedOriginalSize;
    }
    setValidationInfo(result);

    if (!result.valid) {
      setError(result.error || 'Invalid photo file.');
      return;
    }

    // Clean previous preview blob if local
    if (previewUrl && previewUrl.startsWith('blob:') && previewUrl !== newPreviewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(newPreviewUrl);
    onFileSelect?.(croppedFile, newPreviewUrl, savedState, originalFileRef.current);

    // If person already exists in DB, persist both original + derived photo + crop state
    if (personId) {
      setBusy(true);
      try {
        const res = await savePersonPhotoWithCropState(personId, {
          originalFile: originalFileRef.current,
          optimizedFile: croppedFile,
          cropState: savedState || { shape, x: 0, y: 0, scale: 1, rotation: 0 },
          existingOriginalPath: originalPhotoPath,
        });
        onChange?.(res.photoUrl, res.originalPhotoUrl, res.cropState);
      } catch (err: any) {
        const appErr = classifySupabaseError(err);
        setError(appErr.message || errorCodeToUserMessage(appErr.code));
      } finally {
        setBusy(false);
      }
    }
  };

  // Open crop modal for current photo using the AUTHORITATIVE ORIGINAL source
  const handleOpenCropExisting = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Prioritize in-memory raw object url, or loaded original source url, or fallback to previewUrl
    const sourceToUse = rawObjectUrlRef.current || originalSourceUrl || previewUrl;
    if (!sourceToUse) return;

    setCropSrc(sourceToUse);
    setCropFileName(originalFileRef.current?.name || 'student-photo.jpg');
    setOriginalFileSize(originalFileRef.current?.size);
    setShowCropModal(true);
  };

  // Remove photo
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setValidationInfo(null);
    originalFileRef.current = null;
    if (rawObjectUrlRef.current && rawObjectUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(rawObjectUrlRef.current);
      rawObjectUrlRef.current = null;
    }
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setOriginalSourceUrl(null);
    setCropState(null);
    onFileSelect?.(null, null, null, null);

    if (personId && (photoPath || originalPhotoPath)) {
      setBusy(true);
      try {
        if (photoPath) await deletePersonPhoto(personId, photoPath);
        if (originalPhotoPath && originalPhotoPath !== photoPath) {
          try {
            await deletePersonPhoto(personId, originalPhotoPath);
          } catch {}
        }
        onChange?.(null, null, null);
      } catch (err: any) {
        const appErr = classifySupabaseError(err);
        setError(appErr.message || errorCodeToUserMessage(appErr.code));
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        {/* Avatar / Photo Placeholder with CSS-based crop/fit */}
        <div
          className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border-2 transition-all ${
            previewUrl
              ? 'border-indigo-400/80 bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
              : 'border-dashed border-slate-300 bg-slate-50 hover:border-[#123B70] hover:bg-blue-50/30'
          } ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}`}
        >
          {busy ? (
            <div className="flex flex-col items-center justify-center gap-1 text-indigo-600">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-[10px] font-semibold">Processing photo...</span>
            </div>
          ) : previewUrl ? (
            <div className="group relative h-full w-full">
              <img
                src={previewUrl}
                alt="Student Photo"
                className="h-full w-full object-cover"
              />

              {/* Hover overlay with Crop & Remove buttons */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/60 opacity-0 backdrop-blur-2xs transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={handleOpenCropExisting}
                  disabled={busy}
                  title="Crop & Align Photo"
                  className="rounded-full bg-amber-500 p-2 text-slate-950 hover:bg-amber-400 shadow-xs transition disabled:opacity-50"
                >
                  <Crop size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  title="Remove Photo"
                  className="rounded-full bg-rose-600 p-2 text-white hover:bg-rose-500 shadow-xs transition disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-[#123B70] transition">
              <Camera size={22} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">Choose Photo</span>
              <span className="text-[9px] text-slate-400">Crop & Align</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={busy}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Info, Requirements & Action Buttons */}
        <div className="space-y-2 min-w-0 flex-1 pt-1">
          {validationInfo ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {validationInfo.valid ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Photo ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                    <AlertCircle size={12} className="text-rose-600" /> Invalid Photo
                  </span>
                )}
                {validationInfo.dimensionsText && (
                  <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                    {validationInfo.dimensionsText}
                  </span>
                )}
                {validationInfo.formattedSize && (
                  <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                    {validationInfo.formattedSize}
                  </span>
                )}
                <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                  JPG
                </span>
              </div>
              {(validationInfo as any).originalSizeBytes && (validationInfo as any).originalSizeBytes > (validationInfo.sizeBytes || 0) && (
                <p className="text-[10px] text-emerald-700 font-medium">
                  Original: {(validationInfo as any).formattedOriginalSize || formatBytes((validationInfo as any).originalSizeBytes)} → Optimized: {validationInfo.formattedSize}
                </p>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 space-y-0.5 leading-tight">
              <p className="font-medium text-slate-700">
                File size: <span className="font-semibold text-slate-900">50 KB – 250 KB</span>
              </p>
              <p className="text-[10px] text-slate-500">
                Recommended: <span className="font-semibold text-slate-800">600 × 600 px or higher</span>
              </p>
              <p className="text-[10px] text-slate-400">Formats: JPG, PNG • Integrated portrait/headshot cropper</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition">
              <Camera size={13} />
              <span>{previewUrl ? 'Change Photo' : 'Choose Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {previewUrl && (
              <button
                type="button"
                onClick={handleOpenCropExisting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                title="Crop and position student face"
              >
                <Crop size={13} className="text-amber-700" />
                <span>Crop Photo</span>
              </button>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
              >
                <X size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
          <AlertCircle size={15} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Student Photo Crop & Alignment Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={cropSrc}
        initialCropState={cropState}
        fileName={cropFileName}
        cropShape={shape}
        originalSizeBytes={originalFileSize}
        title="Crop & Align Student Photo"
        onClose={() => {
          setShowCropModal(false);
          setCropSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

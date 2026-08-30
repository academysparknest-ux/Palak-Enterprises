import React, { useEffect, useState } from 'react';
import { Camera, Loader2, X, AlertCircle, CheckCircle2, AlertTriangle, Crop } from 'lucide-react';
import { uploadPersonPhoto, deletePersonPhoto, getPhotoSignedUrl } from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';
import {
  validatePhoto,
  MIN_PHOTO_BYTES,
  MAX_PHOTO_BYTES,
  MIN_PHOTO_WIDTH,
  MIN_PHOTO_HEIGHT,
  RECOMMENDED_PHOTO_WIDTH,
  RECOMMENDED_PHOTO_HEIGHT,
  formatBytes,
  type PhotoValidationResult,
} from '../../lib/idcard/photoValidation';
import { ImageCropModal } from './ImageCropModal';

export interface PhotoUploadProps {
  personId?: string | null;
  photoPath?: string | null;
  initialPreviewUrl?: string | null;
  onChange?: (path: string | null) => void;
  onFileSelect?: (file: File | null, previewUrl: string | null) => void;
  shape?: 'circle' | 'rect';
}

export function PhotoUpload({
  personId,
  photoPath,
  initialPreviewUrl,
  onChange,
  onFileSelect,
  shape = 'circle',
}: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<PhotoValidationResult | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawFileName, setRawFileName] = useState<string>('photo.jpg');

  // Sync with photoPath from server if present
  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      if (!initialPreviewUrl) {
        setPreviewUrl(null);
        setValidationInfo(null);
      }
      return;
    }
    getPhotoSignedUrl(photoPath)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load existing photo');
      });
    return () => {
      cancelled = true;
    };
  }, [photoPath, initialPreviewUrl]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle image file selection & lightweight browser validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setValidationInfo(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setRawFileName(file.name);

    // Validate (type, 50KB-500KB, min 300x360 dimensions) without image processing
    const result = await validatePhoto(file);

    if (!result.valid) {
      setError(result.error || 'Invalid photo file.');
      e.target.value = '';
      return;
    }

    setValidationInfo(result);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Notify parent component for new student state
    onFileSelect?.(file, objectUrl);

    // If person already exists in DB, upload immediately to Supabase Storage
    if (personId) {
      setBusy(true);
      try {
        const path = await uploadPersonPhoto(personId, file);
        onChange?.(path);
      } catch (err: any) {
        const appErr = classifySupabaseError(err);
        setError(appErr.message || errorCodeToUserMessage(appErr.code));
      } finally {
        setBusy(false);
      }
    }

    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile: File, newPreviewUrl: string) => {
    setError(null);
    setPreviewUrl(newPreviewUrl);
    setRawFileName(croppedFile.name);

    // Re-validate photo dimensions & size
    const result = await validatePhoto(croppedFile);
    if (result.valid) {
      setValidationInfo(result);
    }

    onFileSelect?.(croppedFile, newPreviewUrl);

    if (personId) {
      setBusy(true);
      try {
        const path = await uploadPersonPhoto(personId, croppedFile);
        onChange?.(path);
      } catch (err: any) {
        const appErr = classifySupabaseError(err);
        setError(appErr.message || errorCodeToUserMessage(appErr.code));
      } finally {
        setBusy(false);
      }
    }
  };

  // Remove photo
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setValidationInfo(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onFileSelect?.(null, null);

    if (personId && photoPath) {
      setBusy(true);
      try {
        await deletePersonPhoto(personId, photoPath);
        onChange?.(null);
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
              <span className="text-[10px] font-semibold">Uploading...</span>
            </div>
          ) : previewUrl ? (
            <div className="group relative h-full w-full">
              <img
                src={previewUrl}
                alt="Student Photo"
                className="h-full w-full object-cover cursor-pointer"
                onClick={() => setIsCropOpen(true)}
                title="Click to crop photo"
              />

              {/* Hover overlay with Crop & Remove buttons */}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-950/60 opacity-0 backdrop-blur-2xs transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setIsCropOpen(true)}
                  title="Crop Photo"
                  className="rounded-full bg-amber-500 p-2 text-slate-950 hover:bg-amber-400 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Crop size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  title="Remove Photo"
                  className="rounded-full bg-rose-600 p-2 text-white hover:bg-rose-500 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-[#123B70] transition">
              <Camera size={22} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">Choose Photo</span>
              <span className="text-[9px] text-slate-400">50 KB – 500 KB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
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
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  <CheckCircle2 size={12} className="text-emerald-600" /> Valid Photo
                </span>
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
              </div>
              {!validationInfo.isRecommended && (
                <p className="text-[10px] text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={11} className="shrink-0" /> Recommended resolution: {RECOMMENDED_PHOTO_WIDTH}×{RECOMMENDED_PHOTO_HEIGHT} px
                </p>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 space-y-0.5 leading-tight">
              <p className="font-medium text-slate-700">
                Size: <span className="font-semibold text-slate-900">{formatBytes(MIN_PHOTO_BYTES)} – {formatBytes(MAX_PHOTO_BYTES)}</span>
              </p>
              <p className="text-[10px] text-slate-500">
                Minimum: <span className="font-semibold text-slate-800">{MIN_PHOTO_WIDTH}×{MIN_PHOTO_HEIGHT} px</span> • Recommended: <span className="font-semibold text-slate-800">{RECOMMENDED_PHOTO_WIDTH}×{RECOMMENDED_PHOTO_HEIGHT} px</span> (5:6)
              </p>
              <p className="text-[10px] text-slate-400">Supported Formats: JPG, PNG, WebP</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95">
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
              <>
                <button
                  type="button"
                  onClick={() => setIsCropOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Crop size={13} className="text-amber-700" />
                  <span>Crop</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
                >
                  <X size={13} />
                  <span>Remove</span>
                </button>
              </>
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

      {/* Crop Modal */}
      {previewUrl && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageSrc={previewUrl}
          fileName={rawFileName}
          cropShape={shape === 'circle' ? 'circle' : 'passport'}
          title="Crop & Align Photo"
          onClose={() => setIsCropOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

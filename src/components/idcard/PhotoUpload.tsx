import React, { useEffect, useState } from 'react';
import { Camera, Loader2, X, Crop, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadPersonPhoto, deletePersonPhoto, getPhotoSignedUrl } from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';
import { ImageCropModal } from './ImageCropModal';

// Validation Constants
export const MIN_PHOTO_BYTES = 10 * 1024; // 10 KB
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MIN_DIMENSION_PX = 100;
export const MAX_DIMENSION_PX = 8000;

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
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [rawFileName, setRawFileName] = useState<string>('student-photo.jpg');
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with photoPath from server if present
  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      if (!initialPreviewUrl) {
        setPreviewUrl(null);
      }
      return;
    }
    getPhotoSignedUrl(photoPath)
      .then((url) => !cancelled && setPreviewUrl(url))
      .catch(() => !cancelled && setError('Could not load existing photo'));
    return () => {
      cancelled = true;
    };
  }, [photoPath, initialPreviewUrl]);

  // Handle image file selection & min/max validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Type
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP photo formats are allowed.');
      e.target.value = '';
      return;
    }

    // 2. Validate Min & Max File Size
    if (file.size < MIN_PHOTO_BYTES) {
      setError(`Photo size is too small (Min: 10 KB). Selected file is ${(file.size / 1024).toFixed(1)} KB.`);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError(`Photo exceeds maximum allowed limit (Max: 10 MB). Selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
      e.target.value = '';
      return;
    }

    // 3. Validate Dimensions
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width < MIN_DIMENSION_PX || img.height < MIN_DIMENSION_PX) {
        setError(`Photo resolution too low (Min: ${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX}px).`);
        URL.revokeObjectURL(tempUrl);
        return;
      }
      if (img.width > MAX_DIMENSION_PX || img.height > MAX_DIMENSION_PX) {
        setError(`Photo resolution too large (Max: ${MAX_DIMENSION_PX}×${MAX_DIMENSION_PX}px).`);
        URL.revokeObjectURL(tempUrl);
        return;
      }

      setRawImageForCrop(tempUrl);
      setRawFileName(file.name);
      setShowCropModal(true);
    };
    img.onerror = () => {
      setError('Corrupted or unreadable image file.');
      URL.revokeObjectURL(tempUrl);
    };
    img.src = tempUrl;

    e.target.value = '';
  };

  // Called when image cropping finishes
  const handleCropComplete = async (croppedFile: File, newPreviewUrl: string) => {
    setPreviewUrl(newPreviewUrl);
    setError(null);

    // Notify parent component for new student state
    onFileSelect?.(croppedFile, newPreviewUrl);

    // If person already exists in DB, upload immediately
    if (personId) {
      setBusy(true);
      try {
        const path = await uploadPersonPhoto(personId, croppedFile);
        onChange?.(path);
      } catch (err: any) {
        setError(errorCodeToUserMessage(classifySupabaseError(err).code));
      } finally {
        setBusy(false);
      }
    }
  };

  // Remove photo
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setPreviewUrl(null);
    setRawImageForCrop(null);
    onFileSelect?.(null, null);

    if (personId && photoPath) {
      setBusy(true);
      try {
        await deletePersonPhoto(personId, photoPath);
        onChange?.(null);
      } catch (err: any) {
        setError(errorCodeToUserMessage(classifySupabaseError(err).code));
      } finally {
        setBusy(false);
      }
    }
  };

  // Open crop modal with current image for re-editing
  const handleOpenRecrop = () => {
    if (previewUrl) {
      setRawImageForCrop(previewUrl);
      setShowCropModal(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        {/* Avatar / Crop Box */}
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
              <span className="text-[10px] font-semibold">Saving...</span>
            </div>
          ) : previewUrl ? (
            <div className="group relative h-full w-full">
              <img
                src={previewUrl}
                alt="Student Photo"
                className="h-full w-full object-cover"
              />

              {/* Hover overlay with Edit Crop and Delete */}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-950/60 opacity-0 backdrop-blur-2xs transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={handleOpenRecrop}
                  title="Crop / Align Photo"
                  className="rounded-full bg-amber-500 p-1.5 text-slate-950 hover:bg-amber-400 shadow-xs transition"
                >
                  <Crop size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  title="Remove Photo"
                  className="rounded-full bg-rose-600 p-1.5 text-white hover:bg-rose-500 shadow-xs transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-[#123B70] transition">
              <Camera size={22} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
              <span className="text-[9px] text-slate-400">Circle Crop</span>
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
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {shape === 'circle' ? '⭕ Circular I-Card Headshot' : '🔲 Card Headshot'}
            </span>
            {previewUrl && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 size={11} /> Photo Attached
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 space-y-0.5 leading-tight">
            <p className="font-medium text-slate-700">
              Requirement: <span className="font-semibold text-slate-900">Min 10 KB</span> (100×100px) • <span className="font-semibold text-slate-900">Max 10 MB</span>
            </p>
            <p className="text-[10px] text-slate-400">Supported Formats: JPG, JPEG, PNG, WEBP</p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition">
              <Camera size={13} />
              <span>{previewUrl ? 'Change Photo' : 'Choose File & Crop'}</span>
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
                onClick={handleOpenRecrop}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
              >
                <Crop size={13} />
                <span>Adjust Crop</span>
              </button>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
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

      {/* Interactive Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={rawImageForCrop}
        fileName={rawFileName}
        cropShape={shape}
        title="Crop & Align I-Card Headshot"
        onClose={() => {
          setShowCropModal(false);
          setRawImageForCrop(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { Camera, Loader2, X, Crop } from 'lucide-react';
import { uploadPersonPhoto, deletePersonPhoto, getPhotoSignedUrl } from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';
import { ImageCropModal } from './ImageCropModal';

export function PhotoUpload({
  personId,
  photoPath,
  onChange,
}: {
  personId: string;
  photoPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>('student-photo.jpg');
  const tempCropUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      setPreviewUrl(null);
      return;
    }
    getPhotoSignedUrl(photoPath)
      .then((url) => !cancelled && setPreviewUrl(url))
      .catch(() => !cancelled && setError('Could not load photo'));
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  useEffect(() => {
    return () => {
      if (tempCropUrlRef.current && tempCropUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(tempCropUrlRef.current);
      }
    };
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Only image files (JPG, PNG, WebP) are allowed.');
      e.target.value = '';
      return;
    }

    if (tempCropUrlRef.current && tempCropUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(tempCropUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    tempCropUrlRef.current = objectUrl;
    setCropSrc(objectUrl);
    setCropFileName(file.name);
    setShowCropModal(true);
    e.target.value = '';
  }

  async function handleCropComplete(croppedFile: File, newPreviewUrl: string) {
    setBusy(true);
    setError(null);
    try {
      const path = await uploadPersonPhoto(personId, croppedFile);
      onChange(path);
      setPreviewUrl(newPreviewUrl);
    } catch (err) {
      setError(errorCodeToUserMessage(classifySupabaseError(err).code));
    } finally {
      setBusy(false);
    }
  }

  function handleOpenCrop(e: React.MouseEvent) {
    e.stopPropagation();
    if (!previewUrl) return;
    setCropSrc(previewUrl);
    setCropFileName('student-photo.jpg');
    setShowCropModal(true);
  }

  async function handleRemove() {
    if (!photoPath) return;
    setBusy(true);
    setError(null);
    try {
      await deletePersonPhoto(personId, photoPath);
      onChange(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(errorCodeToUserMessage(classifySupabaseError(err).code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="relative group flex h-28 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        {busy ? (
          <Loader2 className="animate-spin text-slate-400" size={18} />
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt="Student" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleOpenCrop}
                title="Crop & Align Photo"
                className="rounded-full bg-amber-500 p-1 text-slate-950 hover:bg-amber-400"
              >
                <Crop size={12} />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                title="Remove Photo"
                className="rounded-full bg-rose-600 p-1 text-white hover:bg-rose-500"
              >
                <X size={12} />
              </button>
            </div>
          </>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
            <Camera size={18} />
            <span className="text-[10px] font-bold">Crop & Upload</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
      {error && <p className="mt-1 max-w-24 text-[11px] text-red-600">{error}</p>}

      {/* Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={cropSrc}
        fileName={cropFileName}
        cropShape="circle"
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

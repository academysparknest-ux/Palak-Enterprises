import { useEffect, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { uploadPersonPhoto, deletePersonPhoto, getPhotoSignedUrl } from '../../lib/idcard/database';
import { classifySupabaseError, errorCodeToUserMessage } from '../../lib/idcard/errors';

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const path = await uploadPersonPhoto(personId, file);
      onChange(path);
      const url = await getPhotoSignedUrl(path);
      setPreviewUrl(url);
    } catch (err) {
      setError(errorCodeToUserMessage(classifySupabaseError(err).code));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
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
      <div className="relative flex h-28 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        {busy ? (
          <Loader2 className="animate-spin text-slate-400" size={18} />
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt="Student" className="h-full w-full object-cover" />
            <button
              onClick={handleRemove}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1 text-slate-400">
            <Camera size={18} />
            <span className="text-[10px]">Upload</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
      {error && <p className="mt-1 max-w-24 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

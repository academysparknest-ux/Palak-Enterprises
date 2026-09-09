import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { validateAdminImage } from '../../lib/image/imageValidation';
import { optimizeAdminImage, type OptimizedImageMetadata } from '../../lib/image/adminImageOptimizer';
import { ADMIN_IMAGE_CONFIG } from '../../lib/image/imageConfig';

export interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload?: (file: File) => Promise<void>;
  onOptimizedUpload?: (result: { file: File; url?: string; metadata: OptimizedImageMetadata }) => Promise<void>;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
  folder?: string;
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onOptimizedUpload,
  onRemove,
  accept = "image/jpeg, image/png, image/webp, image/gif, image/svg+xml",
  maxSizeMB = ADMIN_IMAGE_CONFIG.maxUploadSizeMB,
  label = "Upload Image",
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStage, setProcessStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [optimizationStats, setOptimizationStats] = useState<OptimizedImageMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndProcess = async (file: File) => {
    setError(null);
    setOptimizationStats(null);

    // 1. Authoritative client-side validation
    setProcessStage('Validating image...');
    const validation = await validateAdminImage(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid image file.');
      return;
    }

    try {
      setIsProcessing(true);

      // 2. WebP Optimization
      setProcessStage('Converting to WebP & optimizing...');
      const optimized = await optimizeAdminImage(file);
      setOptimizationStats(optimized.metadata);

      // 3. Trigger upload callback
      setProcessStage('Saving...');
      if (onOptimizedUpload) {
        await onOptimizedUpload({
          file: optimized.file,
          url: optimized.previewUrl,
          metadata: optimized.metadata,
        });
      } else if (onUpload) {
        // Fallback to standard onUpload with the optimized WebP File
        await onUpload(optimized.file);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
      setProcessStage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const formatKB = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}

      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-4 transition-colors duration-200 flex flex-col items-center justify-center text-center",
          isDragging ? "border-[#123B70] bg-[#123B70]/5" : "border-slate-300 hover:border-[#123B70] bg-slate-50",
          currentImageUrl && !isProcessing ? "p-1.5" : "min-h-[120px]"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleChange}
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center text-[#123B70] py-4">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs font-semibold">{processStage || 'Processing WebP...'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Optimizing & converting image</p>
          </div>
        ) : currentImageUrl ? (
          <div className="relative w-full h-full min-h-[120px] rounded-lg overflow-hidden group">
            <img
              src={currentImageUrl}
              alt="Uploaded preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
                >
                  Change Image
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="bg-rose-600 text-white p-1.5 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-black/40 px-2 py-0.5 rounded">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                WebP Optimized
              </span>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center cursor-pointer w-full py-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-10 h-10 bg-white rounded-full shadow-xs flex items-center justify-center mb-2 border border-slate-200">
              <UploadCloud className="w-5 h-5 text-[#123B70]" />
            </div>
            <p className="text-xs font-bold text-slate-900">Click to upload or drag & drop</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              JPG, PNG, WebP or SVG (max {maxSizeMB}MB) • Auto-converts to WebP
            </p>
          </div>
        )}
      </div>

      {/* Optimization metrics pill */}
      {optimizationStats && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-[11px]">
          <span className="flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Optimized to WebP
          </span>
          <span className="text-[10px] text-emerald-700 font-mono">
            {formatKB(optimizationStats.originalSize)} → {formatKB(optimizationStats.optimizedSize)}
            {optimizationStats.savedPercentage > 0 && ` (${optimizationStats.savedPercentage}% saved)`}
          </span>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

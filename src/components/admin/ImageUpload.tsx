import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Crop } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageCropModal, type CropShapeOption } from '../ImageCropModal';

export interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
  cropShape?: CropShapeOption;
  enableCrop?: boolean;
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  accept = "image/jpeg, image/png, image/webp",
  maxSizeMB = 5,
  label = "Upload Image",
  className,
  cropShape = "free",
  enableCrop = true,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndUpload = async (file: File) => {
    setError(null);
    
    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate type (basic check if accept is provided)
    if (accept && !accept.includes(file.type) && !accept.includes(file.type.split('/')[0] + '/*')) {
       const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
       const acceptTypes = accept.split(',').map(a => a.trim().toLowerCase());
       
       const isValidType = acceptTypes.some(type => {
         if (type.startsWith('.')) return type === fileExtension;
         if (type.endsWith('/*')) return file.type.startsWith(type.replace('/*', ''));
         return type === file.type;
       });

       if (!isValidType) {
         setError(`Invalid file type. Accepted types: ${accept}`);
         return;
       }
    }

    try {
      setIsUploading(true);
      await onUpload(file);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    await validateAndUpload(croppedFile);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
      
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-xl p-4 transition-colors duration-200 flex flex-col items-center justify-center text-center",
          isDragging ? "border-[#123B70] bg-[#123B70]/5" : "border-slate-300 hover:border-[#123B70] bg-slate-50",
          currentImageUrl && !isUploading ? "p-1.5" : "min-h-[120px]"
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
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center text-[#123B70]">
            <Loader2 className="w-6 h-6 animate-spin mb-1.5" />
            <p className="text-xs font-medium">Uploading...</p>
          </div>
        ) : currentImageUrl ? (
          <div className="relative w-full h-full min-h-[110px] rounded-lg overflow-hidden group">
            <img 
              src={currentImageUrl} 
              alt="Uploaded preview" 
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              {enableCrop && (
                <button
                  type="button"
                  onClick={() => setIsCropOpen(true)}
                  className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Crop size={12} />
                  <span>Crop</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-slate-900 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
              >
                Change
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="bg-rose-600 text-white p-1 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer active:scale-95"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center cursor-pointer w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-9 h-9 bg-white rounded-full shadow-xs flex items-center justify-center mb-2">
              <UploadCloud className="w-4 h-4 text-[#123B70]" />
            </div>
            <p className="text-xs font-bold text-slate-900">Click to upload or drag & drop</p>
            <p className="text-[10px] text-slate-500 mt-0.5">SVG, PNG, JPG or WEBP (max. {maxSizeMB}MB)</p>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}

      {currentImageUrl && enableCrop && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageSrc={currentImageUrl}
          cropShape={cropShape}
          title="Crop & Align Image"
          onClose={() => setIsCropOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

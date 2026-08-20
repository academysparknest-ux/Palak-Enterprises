import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  accept = "image/jpeg, image/png, image/webp",
  maxSizeMB = 5,
  label = "Upload Image",
  className
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-6 transition-colors duration-200 flex flex-col items-center justify-center text-center",
          isDragging ? "border-[#123B70] bg-[#123B70]/5" : "border-slate-300 hover:border-[#123B70] bg-slate-50",
          currentImageUrl && !isUploading ? "p-2" : "min-h-[160px]"
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
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Uploading...</p>
          </div>
        ) : currentImageUrl ? (
          <div className="relative w-full h-full min-h-[140px] rounded-xl overflow-hidden group">
            <img 
              src={currentImageUrl} 
              alt="Uploaded preview" 
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Change
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="bg-rose-600 text-white p-1.5 rounded-lg hover:bg-rose-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center cursor-pointer w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6 text-[#123B70]" />
            </div>
            <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or GIF (max. {maxSizeMB}MB)</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}

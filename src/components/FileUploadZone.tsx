import React, { useState, useRef } from "react";
import { UploadCloud, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";

interface FileUploadZoneProps {
  onFileSelect: (fileData: { name: string; size: number; url: string } | null) => void;
  selectedFile?: { name: string; size: number; url: string } | null;
  label?: string;
  helperText?: string;
  accept?: string;
  maxSizeMB?: number;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  selectedFile,
  label,
  helperText,
  accept = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.cdr,.ai,.psd",
  maxSizeMB = 25,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (file: File) => {
    setError(null);

    // Size validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(
        currentLang === "hi"
          ? `फ़ाइल बहुत बड़ी है (अधिकतम ${maxSizeMB}MB)`
          : `File size exceeds max limit of ${maxSizeMB}MB`
      );
      return;
    }

    // Simulate progress
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 95) {
          clearInterval(interval);
          return 100;
        }
        return prev + 30;
      });
    }, 80);

    const reader = new FileReader();
    reader.onload = () => {
      clearInterval(interval);
      setUploadProgress(null);
      const url = typeof reader.result === "string" ? reader.result : "";
      onFileSelect({
        name: file.name,
        size: file.size,
        url,
      });
    };
    reader.onerror = () => {
      clearInterval(interval);
      setUploadProgress(null);
      setError(currentLang === "hi" ? "फ़ाइल पढ़ने में त्रुटि हुई" : "Failed to read file");
    };

    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file);
    } else {
      // For PDF/doc, we can store dataURL or file name
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    onFileSelect(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-slate-800">
          {label}
        </label>
      )}

      {selectedFile ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-center gap-3 min-w-0">
            {selectedFile.url && selectedFile.url.startsWith("data:image/") ? (
              <img
                src={selectedFile.url}
                alt="Preview"
                className="h-10 w-10 rounded-lg object-cover border border-emerald-200 shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <File className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>{formatFileSize(selectedFile.size)} • Ready for printing</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-100 hover:text-rose-600 transition-colors ml-2 cursor-pointer"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all cursor-pointer",
            isDragging
              ? "border-[#123B70] bg-blue-50/50"
              : "border-slate-300 hover:border-[#123B70] hover:bg-slate-50/80",
            error && "border-rose-300 bg-rose-50/30"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleProcessFile(e.target.files[0]);
              }
            }}
          />

          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-[#123B70] mb-2">
            <UploadCloud className="h-5 w-5" />
          </div>

          <p className="text-xs font-bold text-slate-800">
            {currentLang === "hi"
              ? "फ़ाइल चुनें या यहाँ खींचकर छोड़ें"
              : "Click to upload design or drag & drop"}
          </p>

          <p className="text-[11px] text-slate-500 mt-0.5">
            {helperText || `PDF, PNG, JPG, WEBP, DOCX (Max ${maxSizeMB}MB)`}
          </p>

          {uploadProgress !== null && (
            <div className="w-full max-w-xs mt-3">
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#123B70] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

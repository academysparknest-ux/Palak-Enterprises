import React, { useState, useRef } from "react";
import { UploadCloud, File, X, CheckCircle2, AlertCircle, Crop } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";
import { ImageCropModal, type CropShapeOption } from "./ImageCropModal";

interface FileUploadZoneProps {
  onFileSelect: (fileData: { name: string; size: number; url: string } | null) => void;
  selectedFile?: { name: string; size: number; url: string } | null;
  label?: string;
  helperText?: string;
  accept?: string;
  maxSizeMB?: number;
  enableCrop?: boolean;
  cropShape?: CropShapeOption;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  selectedFile,
  label,
  helperText,
  accept = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.cdr,.ai,.psd",
  maxSizeMB = 25,
  enableCrop = true,
  cropShape = "free",
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check whether the uploaded file is strictly an image
  const isImageFile = Boolean(
    selectedFile &&
      (selectedFile.url?.startsWith("data:image/") ||
        selectedFile.url?.startsWith("blob:") ||
        /\.(jpe?g|png|webp|gif|bmp|svg|avif)$/i.test(selectedFile.name || ""))
  );

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

    reader.readAsDataURL(file);
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

  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : previewUrl;
      onFileSelect({
        name: croppedFile.name,
        size: croppedFile.size,
        url: dataUrl,
      });
    };
    reader.onerror = () => {
      onFileSelect({
        name: croppedFile.name,
        size: croppedFile.size,
        url: previewUrl,
      });
    };
    reader.readAsDataURL(croppedFile);
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
        <div
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 transition-all duration-300"
          style={{ animation: "scaleIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isImageFile && selectedFile.url ? (
              <img
                src={selectedFile.url}
                alt="Preview"
                className="h-11 w-11 rounded-lg object-cover border border-emerald-300/80 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition"
                onClick={() => enableCrop && setIsCropOpen(true)}
                title={enableCrop ? (currentLang === "hi" ? "फोटो क्रॉप करें" : "Click to crop image") : undefined}
              />
            ) : (
              <div className="h-11 w-11 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                <File className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 animate-popIn shrink-0" />
                <span>{formatFileSize(selectedFile.size)} • Ready for printing</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            {/* Crop Button - Exclusively visible for Image files */}
            {isImageFile && enableCrop && (
              <button
                type="button"
                onClick={() => setIsCropOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 active:scale-95 shadow-2xs transition cursor-pointer"
                title={currentLang === "hi" ? "इमेज क्रॉप करें" : "Crop image"}
              >
                <Crop className="h-3.5 w-3.5 text-emerald-700" />
                <span>{currentLang === "hi" ? "क्रॉप" : "Crop"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-100 hover:text-rose-600 active:scale-95 transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 cursor-pointer active-press group",
            isDragging
              ? "border-[#123B70] bg-blue-50/70 scale-[1.01] shadow-md ring-2 ring-blue-400/20"
              : "border-slate-300 hover:border-[#123B70] hover:bg-slate-50/80 hover:shadow-xs",
            error && "border-rose-300 bg-rose-50/30 animate-shake-once"
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

          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-[#123B70] mb-2 group-hover:-translate-y-0.5 transition-transform duration-200">
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
                  className="h-full bg-[#123B70] transition-all duration-150 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-600 animate-shake-once">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Interactive Crop Modal for Image Files */}
      {isImageFile && selectedFile && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageSrc={selectedFile.url}
          fileName={selectedFile.name}
          cropShape={cropShape}
          title={currentLang === "hi" ? "फोटो क्रॉप एवं एडजस्ट करें" : "Crop & Position Image"}
          onClose={() => setIsCropOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

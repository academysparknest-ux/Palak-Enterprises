/**
 * Quick Service & Document Printing Centralized Configuration
 * Single Source of Truth for File Size Limits, Validation & Formats.
 *
 * Configured for production safety on Supabase Free Plan (50 MB raw limit):
 * Enforces 45 MB max file size application-wide to reject oversized files
 * before attempting network uploads or expensive in-memory operations.
 */

export const QUICK_SERVICE_MAX_FILE_SIZE_MB = 45;
export const QUICK_SERVICE_MAX_FILE_SIZE_BYTES = QUICK_SERVICE_MAX_FILE_SIZE_MB * 1024 * 1024; // 47,185,920 bytes

export const QUICK_SERVICE_CONFIG = {
  maxFileSizeMB: QUICK_SERVICE_MAX_FILE_SIZE_MB,
  maxFileSizeBytes: QUICK_SERVICE_MAX_FILE_SIZE_BYTES,
  allowedExtensions: [
    ".pdf",
    ".docx",
    ".doc",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
  ] as const,
  allowedMimeTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ] as const,
} as const;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  errorHi?: string;
  fileName: string;
  selectedSizeBytes: number;
  selectedSizeMB: number;
  selectedSizeFormatted: string;
  maxSizeBytes: number;
  maxSizeMB: number;
}

export interface MultiFileValidationResult {
  allValid: boolean;
  validFiles: Array<{ name: string; size: number; [key: string]: any }>;
  rejectedFiles: FileValidationResult[];
  errorSummary?: string;
  errorSummaryHi?: string;
}

/**
 * Format bytes to a clean MB string (e.g. 85.12 MB)
 */
export function formatFileSizeMB(bytes: number): string {
  if (bytes < 0) return "0.00 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validate a single file against the Quick Service 45 MB boundary.
 * Boundary is deterministic: file.size <= MAX_BYTES is valid, file.size > MAX_BYTES is rejected.
 */
export function validateQuickServiceFileSize(file: { name: string; size: number }): FileValidationResult {
  const fileName = file.name || "Selected file";
  const sizeBytes = Number(file.size) || 0;
  const sizeMB = sizeBytes / (1024 * 1024);
  const formattedSize = formatFileSizeMB(sizeBytes);

  if (sizeBytes === 0) {
    return {
      isValid: false,
      fileName,
      selectedSizeBytes: sizeBytes,
      selectedSizeMB: 0,
      selectedSizeFormatted: "0 B",
      maxSizeBytes: QUICK_SERVICE_MAX_FILE_SIZE_BYTES,
      maxSizeMB: QUICK_SERVICE_MAX_FILE_SIZE_MB,
      error: `File "${fileName}" is empty (0 bytes). Please choose a valid document.`,
      errorHi: `फ़ाइल "${fileName}" खाली (0 bytes) है। कृपया वैध दस्तावेज चुनें।`,
    };
  }

  if (sizeBytes > QUICK_SERVICE_MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      fileName,
      selectedSizeBytes: sizeBytes,
      selectedSizeMB: sizeMB,
      selectedSizeFormatted: formattedSize,
      maxSizeBytes: QUICK_SERVICE_MAX_FILE_SIZE_BYTES,
      maxSizeMB: QUICK_SERVICE_MAX_FILE_SIZE_MB,
      error: `File "${fileName}" (${formattedSize}) exceeds maximum allowed size of ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB. Please choose a file under ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB.`,
      errorHi: `फ़ाइल "${fileName}" (${formattedSize}) अधिकतम अनुमत आकार ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB से बड़ी है। कृपया ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB से छोटी फ़ाइल चुनें।`,
    };
  }

  return {
    isValid: true,
    fileName,
    selectedSizeBytes: sizeBytes,
    selectedSizeMB: sizeMB,
    selectedSizeFormatted: formattedSize,
    maxSizeBytes: QUICK_SERVICE_MAX_FILE_SIZE_BYTES,
    maxSizeMB: QUICK_SERVICE_MAX_FILE_SIZE_MB,
  };
}

/**
 * Validate a list of files independently.
 * Allows valid files to be identified while isolating rejected files.
 */
export function validateQuickServiceFiles<T extends { name: string; size: number }>(
  files: T[]
): MultiFileValidationResult {
  const validFiles: T[] = [];
  const rejectedFiles: FileValidationResult[] = [];

  for (const file of files) {
    const res = validateQuickServiceFileSize(file);
    if (res.isValid) {
      validFiles.push(file);
    } else {
      rejectedFiles.push(res);
    }
  }

  if (rejectedFiles.length === 0) {
    return {
      allValid: true,
      validFiles,
      rejectedFiles: [],
    };
  }

  const rejectedNamesWithSizes = rejectedFiles
    .map((r) => `${r.fileName} (${r.selectedSizeFormatted})`)
    .join(", ");

  const errorSummary =
    rejectedFiles.length === 1
      ? rejectedFiles[0].error
      : `Rejected ${rejectedFiles.length} file(s) exceeding ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB limit: ${rejectedNamesWithSizes}. Maximum allowed size is ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB per file.`;

  const errorSummaryHi =
    rejectedFiles.length === 1
      ? rejectedFiles[0].errorHi
      : `${rejectedFiles.length} फ़ाइलें ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB सीमा से अधिक होने के कारण अस्वीकृत: ${rejectedNamesWithSizes}। अधिकतम आकार ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB प्रति फ़ाइल है।`;

  return {
    allValid: false,
    validFiles,
    rejectedFiles,
    errorSummary,
    errorSummaryHi,
  };
}

/**
 * User-facing format and limit info text for upload controls
 */
export function getQuickServiceUploadLimitText(lang: "en" | "hi" = "en"): string {
  if (lang === "hi") {
    return `PDF, Word (DOC/DOCX), JPG, PNG • अधिकतम फ़ाइल आकार: ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB`;
  }
  return `PDF, Word (DOC/DOCX), JPG, PNG • Maximum file size: ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB`;
}

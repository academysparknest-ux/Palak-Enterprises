import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Vercel Serverless Cron Job: 7-Day Document Retention Cleanup
 *
 * Runs on a daily schedule (0 3 * * *) to automatically purge expired Quick Services
 * customer-uploaded documents from Supabase Storage using the official Storage API
 * while preserving all orders, order items, invoices, and financial records.
 *
 * Security:
 * - Checks Authorization header against CRON_SECRET using timing-safe comparison.
 * - Uses Service Role key to execute authenticated PostgreSQL cleanup function.
 * - Enforces physical S3 file removal via Supabase Storage API.
 */

const ALLOWED_RETENTION_BUCKET = "customer-documents";

const FORBIDDEN_TOKENS = [
  "invoice-pdfs",
  "invoices",
  "idcard",
  "idcard-photos",
  "website",
  "website-photos",
  "website-assets",
  "business",
  "signatures",
  "logos",
  "templates",
  ".env",
  "schema.sql",
];

function recursivelyDecodePath(rawPath: string): string {
  let decoded = rawPath;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function validateCanonicalQuickServicePath(
  bucket: string,
  rawPath: string
): { isValid: boolean; cleanPath: string; error?: string } {
  if (!bucket || bucket.trim() !== ALLOWED_RETENTION_BUCKET) {
    return {
      isValid: false,
      cleanPath: "",
      error: `Forbidden bucket: "${bucket}". Retention cleanup is strictly restricted to "${ALLOWED_RETENTION_BUCKET}".`,
    };
  }

  if (!rawPath || typeof rawPath !== "string") {
    return {
      isValid: false,
      cleanPath: "",
      error: "Path is empty or not a string.",
    };
  }

  let normalized = rawPath.trim().normalize("NFC").replace(/\\/g, "/");

  if (normalized.startsWith("customer-documents/")) {
    normalized = normalized.substring("customer-documents/".length);
  }
  normalized = normalized.replace(/^\/+/, "");

  if (normalized.includes("\0")) {
    return {
      isValid: false,
      cleanPath: "",
      error: "Security violation: Null bytes are strictly forbidden.",
    };
  }

  const fullyDecoded = recursivelyDecodePath(normalized);

  if (
    fullyDecoded.includes("..") ||
    fullyDecoded.includes("/../") ||
    fullyDecoded.startsWith("../") ||
    fullyDecoded.endsWith("/..")
  ) {
    return {
      isValid: false,
      cleanPath: "",
      error: "Security violation: Directory traversal (..) is strictly forbidden.",
    };
  }

  const lowerDecoded = fullyDecoded.toLowerCase();
  for (const token of FORBIDDEN_TOKENS) {
    if (
      lowerDecoded.startsWith(`${token}/`) ||
      lowerDecoded.includes(`/${token}/`) ||
      lowerDecoded === token
    ) {
      return {
        isValid: false,
        cleanPath: "",
        error: `Security violation: Path references protected directory or token "${token}".`,
      };
    }
  }

  const segments = normalized.split("/").filter(Boolean);

  // Structure A: Canonical Order Document (strictly 3 segments: orders/<orderCode>/<filename>)
  if (segments.length === 3 && segments[0] === "orders") {
    const orderCode = segments[1];
    const fileName = segments[2];

    const isOrderCodeValid = /^[a-zA-Z0-9_\-]+$/.test(orderCode);
    const isFileNameValid = /^[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]{2,5}$/.test(fileName);

    if (!isOrderCodeValid) {
      return {
        isValid: false,
        cleanPath: "",
        error: `Invalid orderCode format: "${orderCode}".`,
      };
    }

    if (!isFileNameValid) {
      return {
        isValid: false,
        cleanPath: "",
        error: `Invalid fileName format: "${fileName}".`,
      };
    }

    return {
      isValid: true,
      cleanPath: `orders/${orderCode}/${fileName}`,
    };
  }

  // Structure B: Canonical Root Legacy Photo (strictly 1 segment: PHOTO-...)
  if (segments.length === 1) {
    const fileName = segments[0];
    const isLegacyPhoto = /^PHOTO-[0-9]{10,14}[a-zA-Z0-9_\-\.]*\.(jpg|jpeg|png|webp)$/i.test(fileName);

    if (isLegacyPhoto) {
      return {
        isValid: true,
        cleanPath: fileName,
      };
    }
  }

  return {
    isValid: false,
    cleanPath: "",
    error: `Path "${rawPath}" does not conform to permitted Quick Services retention structures.`,
  };
}

async function executeTwoPhaseCleanup(
  supabase: SupabaseClient,
  batchSize: number = 100
) {
  try {
    const { data: claimedFiles, error: claimError } = await supabase.rpc(
      "claim_expired_order_files_for_cleanup",
      { p_batch_size: batchSize }
    );

    if (claimError) {
      console.warn("[DocumentRetention] claim RPC notice:", claimError.message);
      return {
        success: false,
        error: claimError.message,
        claimedCount: 0,
        storageDeletedCount: 0,
        markedCleanedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    if (!claimedFiles || !Array.isArray(claimedFiles) || claimedFiles.length === 0) {
      return {
        success: true,
        claimedCount: 0,
        storageDeletedCount: 0,
        markedCleanedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    const itemResults: Array<{ id: string; status: "cleaned_up" | "failed"; storagePath?: string; error?: string }> = [];
    const validPathsToDelete: { id: string; cleanPath: string }[] = [];
    let skippedCount = 0;

    for (const file of claimedFiles) {
      const rawPath = file.file_path || file.filePath || "";

      if (!rawPath || rawPath.startsWith("data:") || rawPath.startsWith("blob:")) {
        itemResults.push({ id: file.id, status: "cleaned_up" });
        skippedCount++;
        continue;
      }

      const validation = validateCanonicalQuickServicePath(ALLOWED_RETENTION_BUCKET, rawPath);
      if (!validation.isValid) {
        console.warn(`[DocumentRetention] Rejection for ID ${file.id}: ${validation.error}`);
        itemResults.push({ id: file.id, status: "failed", error: validation.error });
        continue;
      }

      validPathsToDelete.push({ id: file.id, cleanPath: validation.cleanPath });
    }

    let storageDeletedCount = 0;

    if (validPathsToDelete.length > 0) {
      const paths = validPathsToDelete.map((p) => p.cleanPath);

      try {
        const { error: removeError } = await supabase.storage
          .from(ALLOWED_RETENTION_BUCKET)
          .remove(paths);

        if (removeError) {
          const errMsg = (removeError.message || "").toLowerCase();
          const errStatus = (removeError as any)?.statusCode || (removeError as any)?.status;
          const isBucketNotFound = errMsg.includes("bucket not found");
          const isObjectNotFound = !isBucketNotFound && (errStatus === 404 || errMsg.includes("not found") || errMsg.includes("does not exist"));

          if (isObjectNotFound) {
            for (const target of validPathsToDelete) {
              itemResults.push({ id: target.id, status: "cleaned_up", storagePath: target.cleanPath });
              storageDeletedCount++;
            }
          } else {
            console.error("[DocumentRetention] Storage removal error:", removeError);
            for (const target of validPathsToDelete) {
              itemResults.push({ id: target.id, status: "failed", storagePath: target.cleanPath, error: removeError.message });
            }
          }
        } else {
          for (const target of validPathsToDelete) {
            itemResults.push({ id: target.id, status: "cleaned_up", storagePath: target.cleanPath });
            storageDeletedCount++;
          }
        }
      } catch (storageException: any) {
        console.error("[DocumentRetention] Storage exception:", storageException);
        for (const target of validPathsToDelete) {
          itemResults.push({ id: target.id, status: "failed", storagePath: target.cleanPath, error: storageException?.message || "Storage exception" });
        }
      }
    }

    let markedCleanedCount = 0;
    let failedCount = 0;

    try {
      const { data: finalRes, error: finalError } = await supabase.rpc(
        "finalize_order_files_cleanup",
        { p_results: itemResults }
      );

      if (finalError) {
        console.error("[DocumentRetention] Finalize RPC error:", finalError);
        markedCleanedCount = itemResults.filter((r) => r.status === "cleaned_up").length;
        failedCount = itemResults.filter((r) => r.status === "failed").length;
      } else {
        markedCleanedCount = finalRes?.cleaned_count || 0;
        failedCount = finalRes?.failed_count || 0;
      }
    } catch (finalException) {
      console.error("[DocumentRetention] Finalize exception:", finalException);
    }

    return {
      success: failedCount === 0,
      claimedCount: claimedFiles.length,
      storageDeletedCount,
      markedCleanedCount,
      failedCount,
      skippedCount,
      results: itemResults,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unknown error during cleanup",
      claimedCount: 0,
      storageDeletedCount: 0,
      markedCleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    };
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      const errorMsg = { error: "Method Not Allowed. Use GET or POST." };
      if (typeof res.status === "function") return res.status(405).json(errorMsg);
      res.writeHead(405, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(errorMsg));
    }

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;

    if (cronSecret) {
      const expectedHeader = `Bearer ${cronSecret}`;
      let isAuthorized = false;
      if (typeof authHeader === "string" && authHeader.length === expectedHeader.length) {
        try {
          isAuthorized = crypto.timingSafeEqual(
            Buffer.from(authHeader, "utf-8"),
            Buffer.from(expectedHeader, "utf-8")
          );
        } catch {
          isAuthorized = false;
        }
      }

      if (!isAuthorized) {
        console.warn("[Cron:DocumentRetention] Unauthorized cron invocation attempt.");
        const errorMsg = { error: "Unauthorized: Invalid or missing CRON_SECRET." };
        if (typeof res.status === "function") return res.status(401).json(errorMsg);
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(errorMsg));
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[Cron:DocumentRetention] CRON_SECRET is required in production environment.");
      const errorMsg = { error: "Unauthorized: CRON_SECRET is required in production." };
      if (typeof res.status === "function") return res.status(401).json(errorMsg);
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(errorMsg));
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://zofddiuswdtbqvqycezy.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      const errorMsg = {
        error: "Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is required for retention cleanup.",
      };
      if (typeof res.status === "function") return res.status(500).json(errorMsg);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(errorMsg));
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    let totalClaimed = 0;
    let totalDeletedStorage = 0;
    let totalMarked = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const batchSize = 100;
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      const result = await executeTwoPhaseCleanup(supabase, batchSize);

      if (result.error && !result.success && result.claimedCount === 0) {
        throw new Error(result.error);
      }

      totalClaimed += result.claimedCount;
      totalDeletedStorage += result.storageDeletedCount;
      totalMarked += result.markedCleanedCount;
      totalSkipped += result.skippedCount;
      totalFailed += result.failedCount;

      if (result.claimedCount < batchSize) {
        break;
      }
    }

    const hasPartialFailures = totalFailed > 0;
    const payload = {
      success: !hasPartialFailures,
      has_partial_failures: hasPartialFailures,
      message: hasPartialFailures
        ? "7-day Quick Services document retention cleanup finished with partial item failures."
        : "7-day Quick Services document retention cleanup completed successfully.",
      summary: {
        total_processed: totalClaimed,
        storage_objects_deleted: totalDeletedStorage,
        metadata_records_marked: totalMarked,
        skipped_count: totalSkipped,
        failed_count: totalFailed,
        batches_executed: iteration,
        executed_at: new Date().toISOString(),
      },
    };

    const httpStatus = hasPartialFailures ? 207 : 200;
    if (typeof res.status === "function") return res.status(httpStatus).json(payload);
    res.writeHead(httpStatus, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(payload));
  } catch (error: any) {
    console.error("[Cron:DocumentRetention] Execution exception:", error);
    const errorMsg = {
      success: false,
      error: error?.message || "Internal server error during document retention cleanup",
    };
    if (typeof res.status === "function") return res.status(500).json(errorMsg);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }
}

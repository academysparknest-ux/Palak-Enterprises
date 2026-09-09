import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALLOWED_RETENTION_BUCKET,
  validateCanonicalQuickServicePath,
} from "./quickServicePathSecurity";

export interface CleanupItemResult {
  id: string;
  status: "cleaned_up" | "failed";
  storagePath?: string;
  error?: string;
}

export interface TwoPhaseCleanupSummary {
  success: boolean;
  claimedCount: number;
  storageDeletedCount: number;
  markedCleanedCount: number;
  failedCount: number;
  skippedCount: number;
  results: CleanupItemResult[];
  error?: string;
}

/**
 * Executes a production-grade, two-phase coordinated 7-day document retention cleanup.
 *
 * Phase 1: PostgreSQL claims expired records with FOR UPDATE SKIP LOCKED and advances
 *          status to 'cleaning' with a 15-minute reclaim lease.
 * Phase 2: Server-side official Supabase Storage API (`storage.from(...).remove(...)`)
 *          physically removes binary objects from AWS S3 storage backend.
 * Phase 3: PostgreSQL RPC finalizes the transaction, updating records to 'cleaned_up'
 *          (or 'failed' if physical deletion encountered an error) and nullifying URLs.
 */
export async function executeTwoPhaseDocumentRetentionCleanup(
  supabase: SupabaseClient,
  rawBatchSize: number = 100
): Promise<TwoPhaseCleanupSummary> {
  // 1. Clamped Batch Bounding
  const batchSize =
    rawBatchSize === null || rawBatchSize === undefined || isNaN(Number(rawBatchSize))
      ? 100
      : Math.max(1, Math.min(Math.floor(Number(rawBatchSize)), 500));

  try {
    // Phase 1: Claim records from PostgreSQL
    const { data: claimedFiles, error: claimError } = await supabase.rpc(
      "claim_expired_order_files_for_cleanup",
      { p_batch_size: batchSize }
    );

    if (claimError) {
      console.warn(
        "[DocumentRetention:TwoPhase] claim_expired_order_files_for_cleanup notice:",
        claimError.message
      );
      // Fallback: If newer RPC is not yet migrated, attempt legacy all-in-one cleanup
      const { data: legacyData, error: legacyError } = await supabase.rpc(
        "cleanup_expired_order_files",
        { p_batch_size: batchSize }
      );

      if (legacyError) {
        throw legacyError;
      }

      return {
        success: (legacyData?.failed_count || 0) === 0,
        claimedCount: legacyData?.processed_count || 0,
        storageDeletedCount: legacyData?.deleted_storage_count || 0,
        markedCleanedCount: legacyData?.marked_count || 0,
        failedCount: legacyData?.failed_count || 0,
        skippedCount: legacyData?.skipped_count || 0,
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

    const itemResults: CleanupItemResult[] = [];
    const validPathsToDelete: { id: string; cleanPath: string }[] = [];
    let skippedCount = 0;

    // Phase 2A: Validate paths against canonical security rules
    for (const file of claimedFiles) {
      const rawPath = file.file_path || file.filePath || "";

      // In-memory or empty files don't have remote storage objects
      if (!rawPath || rawPath.startsWith("data:") || rawPath.startsWith("blob:")) {
        itemResults.push({
          id: file.id,
          status: "cleaned_up",
        });
        skippedCount++;
        continue;
      }

      const validation = validateCanonicalQuickServicePath(
        ALLOWED_RETENTION_BUCKET,
        rawPath
      );

      if (!validation.isValid) {
        console.warn(
          `[DocumentRetention:TwoPhase] Security rejection for order_file ID ${file.id}: ${validation.error}`
        );
        itemResults.push({
          id: file.id,
          status: "failed",
          error: validation.error,
        });
        continue;
      }

      validPathsToDelete.push({
        id: file.id,
        cleanPath: validation.cleanPath,
      });
    }

    // Phase 2B: Invoke the official Supabase Storage API to physically remove files from S3
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
            console.log(
              "[DocumentRetention:TwoPhase] Storage objects already absent (404), reconciling to cleaned_up."
            );
            for (const target of validPathsToDelete) {
              itemResults.push({
                id: target.id,
                status: "cleaned_up",
                storagePath: target.cleanPath,
              });
              storageDeletedCount++;
            }
          } else {
            console.error(
              "[DocumentRetention:TwoPhase] Storage removal API error:",
              removeError
            );
            // If storage API call failed as a whole (network, 500, auth, bucket missing), mark failed so they are retried
            for (const target of validPathsToDelete) {
              itemResults.push({
                id: target.id,
                status: "failed",
                storagePath: target.cleanPath,
                error: removeError.message || "Storage API deletion failed",
              });
            }
          }
        } else {
          for (const target of validPathsToDelete) {
            // Storage reported success: object was removed or didn't exist
            itemResults.push({
              id: target.id,
              status: "cleaned_up",
              storagePath: target.cleanPath,
            });
            storageDeletedCount++;
          }
        }
      } catch (storageEx: any) {
        console.error(
          "[DocumentRetention:TwoPhase] Storage API invocation exception:",
          storageEx
        );
        for (const target of validPathsToDelete) {
          itemResults.push({
            id: target.id,
            status: "failed",
            storagePath: target.cleanPath,
            error: storageEx?.message || "Storage API exception",
          });
        }
      }
    }

    // Phase 3: Finalize status in PostgreSQL
    const { error: finalizeError } = await supabase.rpc(
      "finalize_order_files_cleanup",
      { p_results: itemResults }
    );

    if (finalizeError) {
      console.error(
        "[DocumentRetention:TwoPhase] finalize_order_files_cleanup error:",
        finalizeError
      );
      throw finalizeError;
    }

    const markedCleanedCount = itemResults.filter((r) => r.status === "cleaned_up").length;
    const failedCount = itemResults.filter((r) => r.status === "failed").length;

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
    console.error("[DocumentRetention:TwoPhase] Fatal cleanup error:", err);
    return {
      success: false,
      claimedCount: 0,
      storageDeletedCount: 0,
      markedCleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
      error: err?.message || "Cleanup failed",
    };
  }
}

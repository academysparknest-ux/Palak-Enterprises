import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { executeTwoPhaseDocumentRetentionCleanup } from "../../src/lib/orders/quickServiceStorageCleanup";

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
export default async function handler(req: any, res: any) {
  // Allow only GET (standard for Vercel Cron) and POST
  if (req.method !== "GET" && req.method !== "POST") {
    const errorMsg = { error: "Method Not Allowed. Use GET or POST." };
    if (typeof res.status === "function") return res.status(405).json(errorMsg);
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }

  // Verify CRON_SECRET if configured in environment using timing-safe comparison
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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const errorMsg = {
      error: "Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is required for retention cleanup.",
    };
    if (typeof res.status === "function") return res.status(500).json(errorMsg);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(errorMsg));
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    let totalClaimed = 0;
    let totalDeletedStorage = 0;
    let totalMarked = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const batchSize = 100;
    const maxIterations = 5; // Up to 500 files per run to avoid serverless timeout
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      const result = await executeTwoPhaseDocumentRetentionCleanup(supabase, batchSize);

      if (result.error && !result.success && result.claimedCount === 0) {
        console.error(`[Cron:DocumentRetention] Batch ${iteration} failed:`, result.error);
        throw new Error(result.error);
      }

      totalClaimed += result.claimedCount;
      totalDeletedStorage += result.storageDeletedCount;
      totalMarked += result.markedCleanedCount;
      totalSkipped += result.skippedCount;
      totalFailed += result.failedCount;

      // If fewer than batchSize were claimed, no more expired active records exist
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

    console.log("[Cron:DocumentRetention] Execution summary:", payload.summary);

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

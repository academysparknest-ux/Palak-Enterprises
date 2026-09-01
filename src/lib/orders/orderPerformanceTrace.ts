/**
 * Quick Service Order Submission Performance Tracer
 *
 * Lightweight, privacy-safe instrumentation to measure real execution timings
 * across all stages of the order submission pipeline:
 * - Validation
 * - Document Processing / Page Counting
 * - Upload (Direct Storage / XHR)
 * - Order Transaction / RPC
 * - Print Queue Registration
 * - Payment Handling
 * - Audit Logging
 * - Confirmation Finalization
 */

export interface OrderTraceStep {
  name: string;
  stage: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface OrderPerformanceTraceSummary {
  submissionId: string;
  orderCode?: string;
  serviceId: string;
  totalDurationMs: number;
  documentCount: number;
  totalBytes: number;
  steps: OrderTraceStep[];
  success: boolean;
}

export class OrderPerformanceTracer {
  private submissionId: string;
  private serviceId: string;
  private startTime: number;
  private steps: Map<string, OrderTraceStep> = new Map();
  private orderCode?: string;
  private documentCount: number = 0;
  private totalBytes: number = 0;

  constructor(submissionId: string, serviceId: string = "document-printing") {
    this.submissionId = submissionId;
    this.serviceId = serviceId;
    this.startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  public setMetadata(info: { orderCode?: string; documentCount?: number; totalBytes?: number }) {
    if (info.orderCode) this.orderCode = info.orderCode;
    if (info.documentCount !== undefined) this.documentCount = info.documentCount;
    if (info.totalBytes !== undefined) this.totalBytes = info.totalBytes;
  }

  public startStep(name: string, stage: string, metadata?: Record<string, string | number | boolean>): void {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.steps.set(name, {
      name,
      stage,
      startTime: now,
      success: false,
      metadata,
    });
  }

  public endStep(name: string, success: boolean = true, error?: string, additionalMeta?: Record<string, string | number | boolean>): void {
    const step = this.steps.get(name);
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (step) {
      step.endTime = now;
      step.durationMs = Math.round(now - step.startTime);
      step.success = success;
      if (error) step.error = error;
      if (additionalMeta) {
        step.metadata = { ...step.metadata, ...additionalMeta };
      }
    }
  }

  public summarize(): OrderPerformanceTraceSummary {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const totalDurationMs = Math.round(now - this.startTime);
    const stepList = Array.from(this.steps.values());
    const allSuccessful = stepList.every((s) => s.success !== false);

    const summary: OrderPerformanceTraceSummary = {
      submissionId: this.submissionId,
      orderCode: this.orderCode,
      serviceId: this.serviceId,
      totalDurationMs,
      documentCount: this.documentCount,
      totalBytes: this.totalBytes,
      steps: stepList,
      success: allSuccessful,
    };

    // Log formatted timings in non-production or when diagnostics are enabled
    if (typeof window !== "undefined" && (window as any).__PALAK_ENABLE_ORDER_TRACE__ || (typeof process !== "undefined" && process.env.NODE_ENV !== "production")) {
      this.logFormattedSummary(summary);
    }

    return summary;
  }

  private logFormattedSummary(summary: OrderPerformanceTraceSummary) {
    const prefix = `[ORDER-PERF][${summary.submissionId}]`;
    const timingsStr = summary.steps
      .map((s) => `${s.name}: ${s.durationMs ?? 0}ms (${s.success ? "✓" : "✗"})`)
      .join(" | ");

    console.log(
      `⚡ ${prefix} Total: ${summary.totalDurationMs}ms (${summary.documentCount} docs, ${Math.round(summary.totalBytes / 1024)} KB) -> ${timingsStr}`
    );
  }
}

export function createOrderPerformanceTracer(submissionId: string, serviceId?: string): OrderPerformanceTracer {
  return new OrderPerformanceTracer(submissionId, serviceId);
}

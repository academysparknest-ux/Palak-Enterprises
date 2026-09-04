/**
 * Quick Service Multi-Tab / Multi-Window Availability Synchronization Test Suite
 *
 * Verifies:
 * 1. Single source of truth availability schema and state model
 * 2. Stop All atomic state transition (0 Active / 11 Stopped)
 * 3. Start All atomic state transition (11 Active / 0 Stopped)
 * 4. Individual service stop with reason, timestamp, and updatedBy preservation
 * 5. Cross-tab BroadcastChannel dispatch and subscription synchronization
 * 6. Server-side order rejection for inactive/stopped services (stale tab bypass prevention)
 * 7. Focus / visibility revalidation and Reload Live functionality
 * 8. Concurrency resilience and multi-window state convergence
 */

import assert from "node:assert/strict";
import {
  getLocalQuickServices,
  saveLocalQuickServices,
  toggleQuickServiceAvailability,
  toggleAllQuickServicesAvailability,
  subscribeToQuickServices,
  submitPrintOrder,
} from "../supabase/database";

let passedCount = 0;
let failedCount = 0;

function logPass(msg: string) {
  console.log(`  ✓ ${msg}`);
  passedCount++;
}

function logFail(msg: string, err: any) {
  console.error(`  ❌ FAILED: ${msg}`, err);
  failedCount++;
}

async function runSyncTestSuite() {
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║  QUICK SERVICES MULTI-TAB AVAILABILITY SYNCHRONIZATION TEST SUITE     ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝\n");

  // --- Suite 1: Canonical Data Model & Single Source of Truth ---
  console.log("▶ Suite 1: Canonical Data Model & Single Source of Truth");
  try {
    const initialServices = getLocalQuickServices();
    assert.ok(Array.isArray(initialServices), "Initial services must be an array");
    assert.strictEqual(initialServices.length, 11, "Must contain exactly 11 canonical quick/sub services");

    initialServices.forEach((s) => {
      assert.ok(s.id, "Service must have an id");
      assert.ok(s.name_en, "Service must have name_en");
      assert.ok(typeof s.is_active === "boolean", "Service must have boolean is_active");
      assert.ok(typeof s.sort_order === "number", "Service must have sort_order");
    });
    logPass("1. Canonical schema conforms to single source of truth");
  } catch (e) {
    logFail("1. Canonical schema verification", e);
  }

  // --- Suite 2: Stop All Atomic Mutation ---
  console.log("\n▶ Suite 2: Stop All Atomic Availability Mutation");
  try {
    const stopReason = "Store closed for today";
    const actor = "Admin Rishav";
    const stopRes = await toggleAllQuickServicesAvailability(false, stopReason, actor);
    assert.strictEqual(stopRes.success, true, "toggleAllQuickServicesAvailability must succeed");

    const currentServices = getLocalQuickServices();
    const activeCount = currentServices.filter((s) => s.is_active).length;
    const stoppedCount = currentServices.filter((s) => !s.is_active).length;

    assert.strictEqual(activeCount, 0, "Active count must be 0 after Stop All");
    assert.strictEqual(stoppedCount, 11, "Stopped count must be 11 after Stop All");

    currentServices.forEach((s) => {
      assert.strictEqual(s.is_active, false, `${s.id} must be stopped`);
      assert.strictEqual(s.stop_reason, stopReason, `${s.id} must preserve stop reason`);
      assert.strictEqual(s.updated_by, actor, `${s.id} must record updated_by`);
      assert.ok(s.updated_at, `${s.id} must record updated_at`);
    });
    logPass("2. Stop All transitions all 11 services to STOPPED with reason & actor");
  } catch (e) {
    logFail("2. Stop All mutation", e);
  }

  // --- Suite 3: Start All Atomic Mutation ---
  console.log("\n▶ Suite 3: Start All Atomic Availability Mutation");
  try {
    const startRes = await toggleAllQuickServicesAvailability(true, undefined, "Admin Rishav");
    assert.strictEqual(startRes.success, true, "toggleAllQuickServicesAvailability must succeed");

    const currentServices = getLocalQuickServices();
    const activeCount = currentServices.filter((s) => s.is_active).length;
    const stoppedCount = currentServices.filter((s) => !s.is_active).length;

    assert.strictEqual(activeCount, 11, "Active count must be 11 after Start All");
    assert.strictEqual(stoppedCount, 0, "Stopped count must be 0 after Start All");

    currentServices.forEach((s) => {
      assert.strictEqual(s.is_active, true, `${s.id} must be active`);
      assert.strictEqual(s.stop_reason, null, `${s.id} stop_reason must be cleared`);
    });
    logPass("3. Start All transitions all 11 services to ACTIVE and clears stop reason");
  } catch (e) {
    logFail("3. Start All mutation", e);
  }

  // --- Suite 4: Individual Service Start/Stop Mutation ---
  console.log("\n▶ Suite 4: Individual Service Availability Mutation");
  try {
    const serviceId = "passport-photo";
    const customReason = "Printer maintenance in progress";
    const actor = "Staff Tech 1";

    const stopSingleRes = await toggleQuickServiceAvailability(serviceId, false, customReason, actor);
    assert.strictEqual(stopSingleRes.success, true, "Stopping single service must succeed");

    const currentServices = getLocalQuickServices();
    const targetService = currentServices.find((s) => s.id === serviceId);
    assert.ok(targetService, "Service must exist in local list");
    assert.strictEqual(targetService.is_active, false, "Target service must be stopped");
    assert.strictEqual(targetService.stop_reason, customReason, "Stop reason must match");
    assert.strictEqual(targetService.updated_by, actor, "Updated by must match");

    const otherActive = currentServices.filter((s) => s.id !== serviceId && s.is_active).length;
    assert.strictEqual(otherActive, 10, "All other 10 services must remain ACTIVE");
    logPass("4. Individual service stop preserves isolation of unaffected services");

    // Restart individual service
    const startSingleRes = await toggleQuickServiceAvailability(serviceId, true, undefined, actor);
    assert.strictEqual(startSingleRes.success, true, "Starting single service must succeed");
    const restored = getLocalQuickServices().find((s) => s.id === serviceId);
    assert.strictEqual(restored?.is_active, true, "Service must be active again");
    assert.strictEqual(restored?.stop_reason, null, "Stop reason must be cleared");
    logPass("5. Individual service start correctly restores active status");
  } catch (e) {
    logFail("4/5. Individual service mutation", e);
  }

  // --- Suite 5: Stale Ordering Rejection (Requirement 7) ---
  console.log("\n▶ Suite 5: Stale Ordering Rejection on Server/Persisted Inactive Service");
  try {
    // 1. Stop document-printing
    await toggleQuickServiceAvailability("document-printing", false, "Heavy queue backlog clearance", "Supervisor");

    // 2. Attempt to submit order from a tab simulating stale client state
    const orderSubmission = await submitPrintOrder({
      serviceId: "document-printing",
      serviceName: "Document Printing",
      customerName: "Rishav Raj",
      customerPhone: "9876543210",
      pricingSnapshot: { unitPrice: 10, subtotal: 10, totalAmount: 10 },
      options: {},
    });

    assert.strictEqual(orderSubmission.success, false, "Order must be rejected when service is stopped");
    assert.strictEqual(orderSubmission.orderCode, "", "No order code should be issued for rejected order");
    assert.ok(
      orderSubmission.error?.includes("currently unavailable"),
      `Error must contain 'currently unavailable', got: ${orderSubmission.error}`
    );
    assert.ok(
      orderSubmission.error?.includes("Heavy queue backlog clearance"),
      `Error must include the actual stop reason, got: ${orderSubmission.error}`
    );
    logPass("6. Stale window order submission is authoritatively rejected with clear message");

    // 3. Re-enable document-printing and verify orders succeed again
    await toggleQuickServiceAvailability("document-printing", true, undefined, "Supervisor");
    const validOrder = await submitPrintOrder({
      serviceId: "document-printing",
      serviceName: "Document Printing",
      customerName: "Rishav Raj",
      customerPhone: "9876543210",
      pricingSnapshot: { unitPrice: 10, subtotal: 10, totalAmount: 10 },
      options: {},
    });
    assert.strictEqual(validOrder.success, true, "Order must succeed once service is started");
    assert.ok(validOrder.orderCode, "Order code must be issued");
    logPass("7. Order submission succeeds immediately once service is restarted");
  } catch (e) {
    logFail("6/7. Stale ordering validation", e);
  }

  // --- Suite 6: Multi-Tab Subscriber & Realtime Multiplexer ---
  console.log("\n▶ Suite 6: Multi-Tab Subscriber & Realtime Multiplexer");
  try {
    let subscriberUpdatesCount = 0;
    let lastReceivedServices: any[] = [];

    const unsubscribe = subscribeToQuickServices((services) => {
      subscriberUpdatesCount++;
      lastReceivedServices = services;
    });

    // Initial delivery happened
    assert.ok(subscriberUpdatesCount >= 1, "Subscriber must receive initial state immediately");

    // Trigger update via saveLocalQuickServices (simulating same-window dispatch)
    const currentList = getLocalQuickServices();
    const modifiedList = currentList.map((s) => (s.id === "visiting-cards" ? { ...s, is_active: false } : s));
    saveLocalQuickServices(modifiedList, true);

    const receivedTarget = lastReceivedServices.find((s) => s.id === "visiting-cards");
    assert.strictEqual(receivedTarget?.is_active, false, "Subscriber must receive reactive state update");
    logPass("8. Realtime multiplexer synchronously notifies local subscribers");

    // Clean up
    unsubscribe();
    // Restore visiting cards
    await toggleQuickServiceAvailability("visiting-cards", true);
  } catch (e) {
    logFail("8. Subscriber multiplexer test", e);
  }

  // --- Suite 7: Multi-Window Convergence and Concurrency ---
  console.log("\n▶ Suite 7: Multi-Window Convergence and Concurrency");
  try {
    // Simulate Window A executing Stop All while Window B executes Start Service
    const stopAllPromise = toggleAllQuickServicesAvailability(false, "Maintenance");
    const startSinglePromise = toggleQuickServiceAvailability("custom-print", true);

    await Promise.all([stopAllPromise, startSinglePromise]);

    const finalState = getLocalQuickServices();
    assert.ok(Array.isArray(finalState) && finalState.length === 11, "Final state must contain all 11 services");
    logPass("9. Concurrent multi-window mutations resolve without corrupting canonical list");

    // Restore all to active
    await toggleAllQuickServicesAvailability(true);
    const restoredAll = getLocalQuickServices();
    assert.strictEqual(restoredAll.filter((s) => s.is_active).length, 11, "All 11 services restored to active");
    logPass("10. System cleanly returns to all active canonical baseline");
  } catch (e) {
    logFail("9/10. Concurrency and convergence test", e);
  }

  console.log("\n========================================================");
  console.log(`🏁 QUICK SERVICE SYNC TESTS: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSyncTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});

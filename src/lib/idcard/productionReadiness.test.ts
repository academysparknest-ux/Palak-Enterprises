import assert from 'node:assert';
import { CardImageCache } from './imageCache';
import { getQrCodePayload } from './validation';
import { classifySupabaseError } from './errors';
import { recordAuditLog, auditStudentCreated } from './auditLog';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║       PRODUCTION READINESS & SECURITY HARDENING TEST SUITE    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

async function runTests() {
  console.log('── Test 1: LRU Image Cache Eviction & Bounded Memory ──');
  const cache = new CardImageCache(3, 5); // small limit for testing

  cache.setCard('p1', 'front', 'data:img1');
  cache.setCard('p2', 'front', 'data:img2');
  cache.setCard('p3', 'front', 'data:img3');
  assert.strictEqual(cache.hasCard('p1', 'front'), true);
  assert.strictEqual(cache.hasCard('p2', 'front'), true);
  assert.strictEqual(cache.hasCard('p3', 'front'), true);

  // Access p1 so it becomes recently used
  cache.getCard('p1', 'front');

  // Insert p4 -> should evict p2 (oldest least recently used)
  cache.setCard('p4', 'front', 'data:img4');
  assert.strictEqual(cache.hasCard('p2', 'front'), false, 'p2 should be evicted');
  assert.strictEqual(cache.hasCard('p1', 'front'), true, 'p1 should be retained');
  assert.strictEqual(cache.hasCard('p3', 'front'), true, 'p3 should be retained');
  assert.strictEqual(cache.hasCard('p4', 'front'), true, 'p4 should be retained');
  passed++;
  console.log('  ✅ LRU cache correctly evicts oldest items while preserving active ones');

  console.log('\n── Test 2: QR Code Canonical Verification URL ──');
  const qrUrl = getQrCodePayload({ student_id: 'STU-2026-001.jpg', name: 'Rohan Sharma' });
  assert.ok(qrUrl.includes('/verify/STU-2026-001'), 'QR payload must include sanitized student ID');
  assert.ok(!qrUrl.includes('.jpg'), 'Accidental .jpg extension must be sanitized');
  passed++;
  console.log('  ✅ QR code payload correctly points to canonical verification endpoint');

  console.log('\n── Test 3: Robust Error Classification & No Dead Codes ──');
  const dupErr = classifySupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint idcard_persons_student_id' });
  assert.strictEqual(dupErr.code, 'VALIDATION_ERROR');
  assert.ok(dupErr.message.includes('unique Student ID'));

  const rlsErr = classifySupabaseError({ code: '42501', message: 'permission denied for table idcard_projects' });
  assert.strictEqual(rlsErr.code, 'ACCESS_DENIED');

  const nullErr = classifySupabaseError({ code: '23502', message: 'null value in column "name" violates not-null constraint' });
  assert.strictEqual(nullErr.code, 'VALIDATION_ERROR');
  assert.ok(nullErr.message.includes('name'));
  passed++;
  console.log('  ✅ Error classifier correctly categorizes database & constraint errors');

  console.log('\n── Test 4: Audit Log Service Resilience (Non-Blocking) ──');
  // Audit logging is fire-and-forget; calling it should never throw or block
  auditStudentCreated('proj-123', 'STU-001', 'Test Student');
  assert.doesNotThrow(() => {
    recordAuditLog({
      projectId: 'proj-123',
      action: 'CARD_GENERATED',
      targetType: 'GENERATION',
      targetId: 'STU-001',
      targetName: 'Test Student',
    });
  });
  passed++;
  console.log('  ✅ Audit log functions are safe, robust, and non-blocking');

  console.log('\n' + '═'.repeat(65));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(65) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

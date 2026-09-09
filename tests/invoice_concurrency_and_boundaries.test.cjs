const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const configs = [
  {
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  }
];

async function createClient() {
  for (const cfg of configs) {
    const client = new Client(cfg);
    try {
      await client.connect();
      return client;
    } catch (e) {
      try { await client.end(); } catch (_) {}
    }
  }
  throw new Error('Could not connect to database for testing.');
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING INVOICE CONCURRENCY & BOUNDARY TESTS');
  console.log('====================================================\n');

  const client = await createClient();

  try {
    // -------------------------------------------------------------
    // TEST 1: Financial-Year Boundary Tests (1 April - 31 March)
    // -------------------------------------------------------------
    console.log('▶ [Test 1] Testing Financial-Year Boundaries...');

    const fyTestCases = [
      { date: '2026-08-21 10:00:00+05:30', expectedYear: 2026, expectedCode: '2026-27' },
      { date: '2026-12-31 23:59:59+05:30', expectedYear: 2026, expectedCode: '2026-27' },
      { date: '2027-01-01 00:00:01+05:30', expectedYear: 2026, expectedCode: '2026-27' },
      { date: '2027-03-31 23:59:59+05:30', expectedYear: 2026, expectedCode: '2026-27' },
      { date: '2027-04-01 00:00:00+05:30', expectedYear: 2027, expectedCode: '2027-28' },
      { date: '2027-04-01 00:00:01+05:30', expectedYear: 2027, expectedCode: '2027-28' },
      { date: '2028-03-31 23:59:59+05:30', expectedYear: 2027, expectedCode: '2027-28' },
    ];

    for (const tc of fyTestCases) {
      const resStart = await client.query('SELECT public.get_financial_year_start($1::timestamptz) as yr;', [tc.date]);
      const resCode = await client.query('SELECT public.get_financial_year_code($1::timestamptz) as code;', [tc.date]);
      const actualYear = resStart.rows[0].yr;
      const actualCode = resCode.rows[0].code;

      if (actualYear !== tc.expectedYear || actualCode !== tc.expectedCode) {
        throw new Error(`FY Boundary Failure for ${tc.date}: got yr=${actualYear}, code=${actualCode}; expected yr=${tc.expectedYear}, code=${tc.expectedCode}`);
      }
    }
    console.log('  ✔ All 7 Financial-Year boundary cases verified.');

    // -------------------------------------------------------------
    // TEST 2: ID Card Invoice Financial-Year Awareness
    // -------------------------------------------------------------
    console.log('\n▶ [Test 2] Testing ID Card Invoice FY Number Generation...');
    // ID card invoices must use Indian FY (e.g. Feb 2027 -> IDC-2026-XXXXXX, NOT IDC-2027-XXXXXX)
    const idcTestDate = '2027-02-15 12:00:00+05:30';
    const idcRes = await client.query('SELECT public.generate_idcard_invoice_number($1::timestamptz) as num;', [idcTestDate]);
    const idcNum = idcRes.rows[0].num;
    if (!idcNum.startsWith('IDC-2026-')) {
      throw new Error(`ID Card FY Failure: expected IDC-2026-XXXXXX for Feb 2027, got ${idcNum}`);
    }
    console.log(`  ✔ ID Card number correctly formatted for FY 2026-27: ${idcNum}`);

    // -------------------------------------------------------------
    // TEST 3: Concurrent Counter Allocation (50 parallel calls)
    // -------------------------------------------------------------
    console.log('\n▶ [Test 3] Testing 50 High-Concurrency Parallel Invoice Allocations...');
    const testFY = 2029; // Use test financial year 2029 so we don't interfere with 2026 records
    await client.query('DELETE FROM public.invoice_counters WHERE year = $1;', [testFY]);
    
    // Run 50 simultaneous allocations using separate clients in parallel
    const concurrencyLevel = 50;
    const parallelAllocations = await Promise.all(
      Array.from({ length: concurrencyLevel }, async () => {
        const subClient = await createClient();
        try {
          const res = await subClient.query('SELECT * FROM public.allocate_next_invoice_number($1);', [testFY]);
          return res.rows[0];
        } finally {
          await subClient.end();
        }
      })
    );

    const allocatedSeqs = parallelAllocations.map(a => a.p_seq).sort((a, b) => a - b);
    const uniqueSeqs = new Set(allocatedSeqs);

    console.log(`  Allocated sequences: min=${allocatedSeqs[0]}, max=${allocatedSeqs[allocatedSeqs.length - 1]}, count=${allocatedSeqs.length}`);

    if (uniqueSeqs.size !== concurrencyLevel) {
      throw new Error(`Concurrency collision detected! Expected ${concurrencyLevel} unique numbers, got ${uniqueSeqs.size}`);
    }

    // Verify sequences are strictly 1 to 50 without gaps
    for (let i = 0; i < concurrencyLevel; i++) {
      if (allocatedSeqs[i] !== i + 1) {
        throw new Error(`Sequence gap detected! Index ${i} has value ${allocatedSeqs[i]}, expected ${i + 1}`);
      }
    }
    console.log(`  ✔ Exactly 50 unique, strictly consecutive numbers allocated with 0 collisions.`);

    // -------------------------------------------------------------
    // TEST 3B: Concurrent Order Invoice Generation (10 calls for same order)
    // -------------------------------------------------------------
    console.log('\n▶ [Test 3B] Testing 10 Concurrent Requests for the Same Completed Order...');
    const testOrderCode = `TEST-ORD-${Date.now()}`;
    await client.query(`
      INSERT INTO public.orders (order_code, customer_name, customer_phone, total_amount, order_status, payment_status)
      VALUES ($1, 'Concurrent Order Customer', '9999999999', 450, 'COMPLETED', 'paid');
    `, [testOrderCode]);

    const orderInvoices = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const subClient = await createClient();
        try {
          const res = await subClient.query('SELECT public.create_or_regenerate_invoice($1, false, $2) as inv_res;', [testOrderCode, 'Concurrent Test']);
          return res.rows[0].inv_res;
        } finally {
          await subClient.end();
        }
      })
    );

    const uniqueOrderInvs = new Set(orderInvoices.map(r => r.invoiceNumber));
    if (uniqueOrderInvs.size !== 1) {
      throw new Error(`Concurrent order invoice generation failure! Got multiple invoice numbers: ${Array.from(uniqueOrderInvs)}`);
    }
    console.log(`  ✔ All 10 concurrent requests received the identical invoice: ${orderInvoices[0].invoiceNumber}`);

    // Clean up test order
    await client.query('DELETE FROM public.orders WHERE order_code = $1;', [testOrderCode]);

    // -------------------------------------------------------------
    // TEST 4: Double-Click / Concurrency Idempotency on create_admin_bill
    // -------------------------------------------------------------
    console.log('\n▶ [Test 4] Testing Idempotent Concurrent Bill Creation (Same Idempotency Key)...');
    const sharedIdempotencyKey = `test_idemp_${Date.now()}_concurrency`;
    const billPayload = {
      action: 'ISSUE',
      documentType: 'TAX_INVOICE',
      customer: { name: 'Test Customer', phone: '9999999999' },
      items: [{ productName: 'Banner Print', quantity: 1, unitPrice: 500, totalPrice: 500 }],
      financials: { subtotal: 500, discount: 0, taxableAmount: 500, taxAmount: 0, grandTotal: 500 },
      paymentMode: 'cash',
      paymentStatus: 'paid',
      notes: 'Automated Test Bill',
      performedBy: 'Test Runner',
      idempotencyKey: sharedIdempotencyKey
    };

    // Fire 10 simultaneous requests with the SAME idempotency key
    const duplicateResults = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const subClient = await createClient();
        try {
          const res = await subClient.query(`
            SELECT public.create_admin_bill(
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) as bill;
          `, [
            billPayload.action,
            billPayload.documentType,
            JSON.stringify(billPayload.customer),
            JSON.stringify(billPayload.items),
            JSON.stringify(billPayload.financials),
            billPayload.paymentMode,
            billPayload.paymentStatus,
            500,
            billPayload.notes,
            billPayload.performedBy,
            null,
            billPayload.idempotencyKey
          ]);
          return res.rows[0].bill;
        } finally {
          await subClient.end();
        }
      })
    );

    const distinctInvoiceNumbers = new Set(duplicateResults.map(r => r.invoiceNumber));
    if (distinctInvoiceNumbers.size !== 1) {
      throw new Error(`Duplicate bill creation failure! Received ${distinctInvoiceNumbers.size} distinct numbers instead of 1: ${Array.from(distinctInvoiceNumbers)}`);
    }
    console.log(`  ✔ 10 simultaneous duplicate requests returned the exact same invoice: ${duplicateResults[0].invoiceNumber}`);

    // -------------------------------------------------------------
    // TEST 5: Cancellation Safety (Never delete, never reuse)
    // -------------------------------------------------------------
    console.log('\n▶ [Test 5] Testing Invoice Cancellation & Number Non-Reuse...');
    const invoiceToCancel = duplicateResults[0].invoiceNumber;
    
    // Cancel the invoice
    const cancelRes = await client.query(`
      SELECT public.cancel_invoice($1, 'Test Runner', 'Verification of cancellation invariant') as cancel_res;
    `, [invoiceToCancel]);

    if (!cancelRes.rows[0].cancel_res.success) {
      throw new Error(`Failed to cancel invoice: ${JSON.stringify(cancelRes.rows[0].cancel_res)}`);
    }

    // Verify invoice is marked CANCELLED in DB
    const checkInv = await client.query('SELECT status, sequence_number, cancelled_at FROM public.invoices WHERE invoice_number = $1;', [invoiceToCancel]);
    if (checkInv.rows[0].status !== 'CANCELLED') {
      throw new Error(`Invoice status was not updated to CANCELLED! Got ${checkInv.rows[0].status}`);
    }

    // Next allocation must NOT reuse this sequence number
    const nextAllocRes = await client.query(`
      SELECT public.create_admin_bill(
        'ISSUE', 'TAX_INVOICE',
        '{"name": "Next Customer", "phone": "9999999999"}'::jsonb,
        '[{"productName": "Print", "quantity": 1, "totalPrice": 100}]'::jsonb,
        '{"subtotal": 100, "grandTotal": 100}'::jsonb,
        'cash', 'paid', 100, 'Next bill', 'Test Runner', NULL, $1
      ) as next_bill;
    `, [`next_bill_${Date.now()}`]);

    const nextInvoiceNumber = nextAllocRes.rows[0].next_bill.invoiceNumber;
    if (nextInvoiceNumber === invoiceToCancel) {
      throw new Error(`Critical violation! Cancelled invoice number ${invoiceToCancel} was reused!`);
    }
    console.log(`  ✔ Invoice ${invoiceToCancel} successfully cancelled and NOT reused. Next invoice assigned: ${nextInvoiceNumber}`);

    // -------------------------------------------------------------
    // TEST 6: Pre-production Reset Safeguard
    // -------------------------------------------------------------
    console.log('\n▶ [Test 6] Testing Pre-production Reset Safeguards...');
    try {
      await client.query("SELECT public.admin_reset_preproduction_invoices('WRONG_TOKEN', true);");
      throw new Error('Safeguard failure: admin_reset_preproduction_invoices should have thrown an error on invalid token!');
    } catch (safeguardErr) {
      if (safeguardErr.message.includes('PERMISSION DENIED') || safeguardErr.message.includes('Confirmation token does not match')) {
        console.log('  ✔ Pre-production reset correctly rejected unauthorized / bad token request.');
      } else {
        throw safeguardErr;
      }
    }

    // Clean up test rows created in test FY 2029 and temporary test invoices
    await client.query("DELETE FROM public.invoices WHERE idempotency_key LIKE '%test%' OR created_by = 'Test Runner' OR order_code LIKE 'TEST%';");
    await client.query('DELETE FROM public.invoice_counters WHERE year = 2029;');
    await client.query("UPDATE public.invoice_counters SET last_number = (SELECT COALESCE(MAX(sequence_number), 0) FROM public.invoices WHERE financial_year_start = 2026), updated_at = timezone('utc'::text, now()) WHERE year = 2026;");
    await client.query("UPDATE public.idcard_invoice_counters SET last_number = (SELECT COALESCE(MAX(sequence_number), 0) FROM public.idcard_invoices WHERE financial_year_start = 2026), updated_at = timezone('utc'::text, now()) WHERE year = 2026;");
    console.log('  ✔ Test FY records and temporary test data cleaned up safely, counters synchronized.');

    console.log('\n====================================================');
    console.log('🎉 ALL INVOICE ARCHITECTURE TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');

  } finally {
    await client.end();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});

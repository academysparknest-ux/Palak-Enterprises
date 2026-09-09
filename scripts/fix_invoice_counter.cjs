const { getClient } = require('./db_helper.cjs');

async function fixInvoiceAndCounter() {
  console.log('====================================================');
  console.log('🔧 FIXING INVOICE COUNTER & INVOICE NUMBER');
  console.log('====================================================\n');

  const client = await getClient();

  try {
    await client.query('BEGIN;');

    // Check current state before fix
    console.log('--- Current Database State ---');
    const curInv = await client.query(`
      SELECT id, invoice_number, sequence_number, order_code, status 
      FROM public.invoices;
    `);
    console.table(curInv.rows);

    const curCounter = await client.query(`
      SELECT year, last_number, updated_at 
      FROM public.invoice_counters 
      WHERE year = 2026;
    `);
    console.table(curCounter.rows);

    // 1. Update invoice to sequence 1 and PE-2026-000001
    const updateInv = await client.query(`
      UPDATE public.invoices
      SET 
        invoice_number = 'PE-2026-000001',
        sequence_number = 1,
        updated_at = timezone('utc'::text, now())
      WHERE id = '411001fb-5d03-4830-9495-5492ee5babeb'
      RETURNING id, invoice_number, sequence_number, order_code;
    `);
    console.log('\n✔ Successfully updated invoice:');
    console.table(updateInv.rows);

    // 2. Update invoice_audit_logs to match PE-2026-000001
    const updateAudit = await client.query(`
      UPDATE public.invoice_audit_logs
      SET 
        invoice_number = 'PE-2026-000001',
        new_snapshot = jsonb_set(
          jsonb_set(new_snapshot, '{invoice_number}', '"PE-2026-000001"'),
          '{sequence_number}', '1'
        )
      WHERE invoice_id = '411001fb-5d03-4830-9495-5492ee5babeb'
      RETURNING id, invoice_id, invoice_number;
    `);
    console.log('\n✔ Successfully updated invoice audit logs:');
    console.table(updateAudit.rows);

    // 3. Update invoice_counters so 2026 last_number = 1
    const updateCounter = await client.query(`
      UPDATE public.invoice_counters
      SET 
        last_number = 1,
        updated_at = timezone('utc'::text, now())
      WHERE year = 2026
      RETURNING year, last_number, updated_at;
    `);
    console.log('\n✔ Successfully updated invoice_counters:');
    console.table(updateCounter.rows);

    await client.query('COMMIT;');
    console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY!');

    // Post-update verification
    console.log('\n--- Post-Fix Verification ---');
    const postInv = await client.query(`SELECT id, invoice_number, sequence_number, order_code FROM public.invoices;`);
    console.table(postInv.rows);

    const postCounter = await client.query(`SELECT year, last_number, updated_at FROM public.invoice_counters WHERE year = 2026;`);
    console.table(postCounter.rows);

    const postAudit = await client.query(`SELECT id, invoice_number, order_code, action_type FROM public.invoice_audit_logs;`);
    console.table(postAudit.rows);

  } catch (err) {
    try { await client.query('ROLLBACK;'); } catch (e) {}
    console.error('\n❌ ERROR FIXING INVOICE AND COUNTER (ROLLED BACK):', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixInvoiceAndCounter();

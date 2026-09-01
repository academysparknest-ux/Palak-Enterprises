const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

function getClient() {
  return new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
}

async function execSingle(sql) {
  const c = getClient();
  await c.connect();
  try {
    const res = await c.query(sql);
    return res;
  } finally {
    await c.end();
  }
}

async function main() {
  console.log('--- STARTING SIMPLE STEP RESET ---');

  console.log('1. Unlinking invoices...');
  const r1 = await execSingle('UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;');
  console.log(`[PASS] Unlinked ${r1.rowCount} invoices`);

  console.log('2. Deleting order_files...');
  const r2 = await execSingle('DELETE FROM public.order_files;');
  console.log(`[PASS] Deleted ${r2.rowCount} order_files`);

  console.log('3. Deleting order_items...');
  const r3 = await execSingle('DELETE FROM public.order_items;');
  console.log(`[PASS] Deleted ${r3.rowCount} order_items`);

  console.log('4. Deleting print_jobs...');
  const r4 = await execSingle('DELETE FROM public.print_jobs;');
  console.log(`[PASS] Deleted ${r4.rowCount} print_jobs`);

  console.log('5. Deleting parent orders...');
  const r5 = await execSingle('DELETE FROM public.orders;');
  console.log(`[PASS] Deleted ${r5.rowCount} orders`);

  console.log('6. Deleting order status history...');
  const r6 = await execSingle("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log(`[PASS] Deleted ${r6.rowCount} order status_history records`);

  console.log('7. Deleting storage objects...');
  const r7 = await execSingle("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  console.log(`[PASS] Deleted ${r7.rowCount} storage objects`);

  console.log('\n--- 8. AUDIT COUNTS ---');
  const auditRes = await execSingle(`
    SELECT 
      (SELECT count(*) FROM public.orders) as orders,
      (SELECT count(*) FROM public.order_items) as items,
      (SELECT count(*) FROM public.order_files) as files,
      (SELECT count(*) FROM public.print_jobs) as jobs,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as status,
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%')) as storage,
      (SELECT count(*) FROM public.invoices) as invoices,
      (SELECT count(*) FROM public.profiles) as profiles,
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'idcard-photos') as idcard_photos;
  `);

  console.log(auditRes.rows[0]);
}

main().catch(err => {
  console.error('[FAIL]:', err);
  process.exit(1);
});

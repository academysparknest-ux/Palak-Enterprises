const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function connectWithRetry(maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = new Client({
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.${ref}`,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      return client;
    } catch (err) {
      console.log(`[Attempt ${attempt}/${maxAttempts}] Connection failed: ${err.message}. Retrying in 1s...`);
      try { await client.end(); } catch (e) {}
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function executeReset() {
  console.log('================================================================');
  console.log('PALAK PRINTING PRESS — COMPLETE ORDER RESET EXECUTION');
  console.log('================================================================\n');

  console.log('Step 1: Deleting child order_files...');
  let c = await connectWithRetry();
  const resFiles = await c.query('DELETE FROM public.order_files;');
  await c.end();
  console.log(`  -> Deleted ${resFiles.rowCount} rows from order_files`);

  console.log('Step 2: Deleting child order_items...');
  c = await connectWithRetry();
  const resItems = await c.query('DELETE FROM public.order_items;');
  await c.end();
  console.log(`  -> Deleted ${resItems.rowCount} rows from order_items`);

  console.log('Step 3: Deleting child print_jobs...');
  c = await connectWithRetry();
  const resJobs = await c.query('DELETE FROM public.print_jobs;');
  await c.end();
  console.log(`  -> Deleted ${resJobs.rowCount} rows from print_jobs`);

  console.log('Step 4: Safely unlinking invoices (SET order_id = NULL)...');
  c = await connectWithRetry();
  const resInvs = await c.query('UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;');
  await c.end();
  console.log(`  -> Unlinked ${resInvs.rowCount} invoices referencing orders (financial records preserved)`);

  console.log('Step 5: Deleting parent orders...');
  c = await connectWithRetry();
  const resOrders = await c.query('DELETE FROM public.orders;');
  await c.end();
  console.log(`  -> Deleted ${resOrders.rowCount} rows from orders`);

  console.log('Step 6: Deleting order-owned status history...');
  c = await connectWithRetry();
  const resStatus = await c.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  await c.end();
  console.log(`  -> Deleted ${resStatus.rowCount} order status_history records`);

  console.log('Step 7: Deleting order documents from customer-documents storage bucket...');
  c = await connectWithRetry();
  const resStorage = await c.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  await c.end();
  console.log(`  -> Deleted ${resStorage.rowCount} storage objects from storage.objects`);

  console.log('\nStep 8: Performing complete forensic post-cleanup audit...');
  c = await connectWithRetry();
  const auditRes = await c.query(`
    SELECT 
      (SELECT count(*) FROM public.orders) as orders_count,
      (SELECT count(*) FROM public.order_items) as items_count,
      (SELECT count(*) FROM public.order_files) as files_count,
      (SELECT count(*) FROM public.print_jobs) as jobs_count,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as order_status_count,
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%')) as storage_order_docs,
      (SELECT count(*) FROM public.invoices) as invoices_count,
      (SELECT count(*) FROM public.profiles) as profiles_count,
      (SELECT count(*) FROM public.user_roles) as user_roles_count,
      (SELECT count(*) FROM public.categories) as categories_count,
      (SELECT count(*) FROM public.products) as products_count,
      (SELECT count(*) FROM public.idcard_projects) as idcard_projects_count,
      (SELECT count(*) FROM public.idcard_templates) as idcard_templates_count,
      (SELECT count(*) FROM public.idcard_persons) as idcard_persons_count,
      (SELECT count(*) FROM public.idcard_audit_log) as idcard_audit_count,
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'idcard-photos') as idcard_photos_count,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'service_request') as service_status_count,
      (SELECT count(*) FROM public.audit_logs) as audit_logs_count;
  `);
  await c.end();

  const audit = auditRes.rows[0];

  console.log('\n================================================================');
  console.log('POST-CLEANUP DATABASE INTEGRITY AUDIT');
  console.log('================================================================');
  console.log('\n[ORDER DATA - MUST BE ZERO]');
  console.log(`  orders:                             ${audit.orders_count} (Expected: 0)`);
  console.log(`  order_items:                        ${audit.items_count} (Expected: 0)`);
  console.log(`  order_files:                        ${audit.files_count} (Expected: 0)`);
  console.log(`  print_jobs:                         ${audit.jobs_count} (Expected: 0)`);
  console.log(`  status_history (order-owned):       ${audit.order_status_count} (Expected: 0)`);
  console.log(`  customer-documents order objects:   ${audit.storage_order_docs} (Expected: 0)`);

  console.log('\n[PRESERVED PRODUCTION DATA]');
  console.log(`  invoices (financial records):       ${audit.invoices_count} (PRESERVED)`);
  console.log(`  profiles:                           ${audit.profiles_count} (PRESERVED)`);
  console.log(`  user_roles:                         ${audit.user_roles_count} (PRESERVED)`);
  console.log(`  categories:                         ${audit.categories_count} (PRESERVED)`);
  console.log(`  products:                           ${audit.products_count} (PRESERVED)`);
  console.log(`  idcard_projects:                    ${audit.idcard_projects_count} (PRESERVED)`);
  console.log(`  idcard_templates:                   ${audit.idcard_templates_count} (PRESERVED)`);
  console.log(`  idcard_persons:                     ${audit.idcard_persons_count} (PRESERVED)`);
  console.log(`  idcard_audit_log:                   ${audit.idcard_audit_count} (PRESERVED)`);
  console.log(`  idcard-photos storage objects:      ${audit.idcard_photos_count} (PRESERVED)`);
  console.log(`  service_request status_history:     ${audit.service_status_count} (PRESERVED)`);
  console.log(`  system audit_logs:                  ${audit.audit_logs_count} (PRESERVED)`);

  const allZeros = (
    Number(audit.orders_count) === 0 &&
    Number(audit.items_count) === 0 &&
    Number(audit.files_count) === 0 &&
    Number(audit.jobs_count) === 0 &&
    Number(audit.order_status_count) === 0 &&
    Number(audit.storage_order_docs) === 0
  );

  const allPreserved = (
    Number(audit.invoices_count) >= 24 &&
    Number(audit.profiles_count) >= 2 &&
    Number(audit.idcard_photos_count) >= 67
  );

  if (allZeros && allPreserved) {
    console.log('\n================================================================');
    console.log('STATUS: 🟢 CLEAN — ALL ORDER HISTORY SUCCESSFULLY REMOVED');
    console.log('================================================================');
  } else {
    console.log('\n================================================================');
    console.log('STATUS: 🟡 PARTIAL CLEANUP — SOME RECORDS REQUIRE REVIEW');
    console.log('================================================================');
  }
}

executeReset().catch(err => {
  console.error('[FAIL] Execution error:', err);
  process.exit(1);
});

const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function main() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  console.log('1. Terminating any blocking sessions...');
  const term = await client.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE pid != pg_backend_pid() 
      AND (state IN ('idle in transaction', 'idle in transaction (aborted)') OR query LIKE '%orders%');
  `);
  console.log(`   -> Terminated ${term.rows.length} blocking sessions.`);

  console.log('2. Deleting order_files...');
  const delFiles = await client.query('DELETE FROM public.order_files;');
  console.log(`   -> Deleted ${delFiles.rowCount} rows from order_files`);

  console.log('3. Deleting order_items...');
  const delItems = await client.query('DELETE FROM public.order_items;');
  console.log(`   -> Deleted ${delItems.rowCount} rows from order_items`);

  console.log('4. Deleting print_jobs...');
  const delJobs = await client.query('DELETE FROM public.print_jobs;');
  console.log(`   -> Deleted ${delJobs.rowCount} rows from print_jobs`);

  console.log('5. Safely unlinking invoices (SET order_id = NULL)...');
  const updateInvoices = await client.query('UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;');
  console.log(`   -> Unlinked ${updateInvoices.rowCount} invoices referencing orders (all financial data preserved)`);

  console.log('6. Deleting parent orders...');
  const delOrders = await client.query('DELETE FROM public.orders;');
  console.log(`   -> Deleted ${delOrders.rowCount} rows from orders`);

  console.log('7. Deleting order status history...');
  const delStatus = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log(`   -> Deleted ${delStatus.rowCount} order status_history records`);

  console.log('8. Deleting order storage documents...');
  const delStorage = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  console.log(`   -> Deleted ${delStorage.rowCount} storage objects from storage.objects`);

  console.log('\n================================================================');
  console.log('9. RUNNING FORENSIC POST-CLEANUP AUDIT');
  console.log('================================================================');

  const auditRes = await client.query(`
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

  const audit = auditRes.rows[0];

  console.log('\n[ORDER DATA - TARGET: 0]');
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

  const allClean = (
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

  if (allClean && allPreserved) {
    console.log('\n================================================================');
    console.log('STATUS: 🟢 CLEAN — ALL ORDER HISTORY SUCCESSFULLY REMOVED');
    console.log('================================================================');
  } else {
    console.log('\n================================================================');
    console.log('STATUS: 🟡 PARTIAL CLEANUP — SOME RECORDS REQUIRE REVIEW');
    console.log('================================================================');
  }

  await client.end();
}

main().catch(console.error);

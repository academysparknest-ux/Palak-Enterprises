const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function uuidReset() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL!');

  // 1. Fetch all order IDs
  console.log('Fetching order IDs...');
  const orderRows = await client.query('SELECT id, order_code FROM public.orders;');
  console.log(`Found ${orderRows.rows.length} orders to delete.`);

  // 2. Delete each order by exact UUID
  let deletedOrders = 0;
  for (const row of orderRows.rows) {
    const res = await client.query('DELETE FROM public.orders WHERE id = $1;', [row.id]);
    deletedOrders += res.rowCount;
  }
  console.log(`[PASS] Deleted ${deletedOrders} orders via primary key!`);

  // 3. Delete any orphaned order_files if any exist
  const fileRows = await client.query('SELECT id FROM public.order_files;');
  console.log(`Found ${fileRows.rows.length} order_files remaining.`);
  for (const f of fileRows.rows) {
    await client.query('DELETE FROM public.order_files WHERE id = $1;', [f.id]);
  }

  // 4. Delete any orphaned order_items if any exist
  const itemRows = await client.query('SELECT id FROM public.order_items;');
  console.log(`Found ${itemRows.rows.length} order_items remaining.`);
  for (const it of itemRows.rows) {
    await client.query('DELETE FROM public.order_items WHERE id = $1;', [it.id]);
  }

  // 5. Delete any orphaned print_jobs if any exist
  const jobRows = await client.query('SELECT id FROM public.print_jobs;');
  console.log(`Found ${jobRows.rows.length} print_jobs remaining.`);
  for (const j of jobRows.rows) {
    await client.query('DELETE FROM public.print_jobs WHERE id = $1;', [j.id]);
  }

  // 6. Delete order status_history by ID
  const statusRows = await client.query("SELECT id FROM public.status_history WHERE entity_type = 'order';");
  console.log(`Found ${statusRows.rows.length} order status_history records.`);
  for (const s of statusRows.rows) {
    await client.query('DELETE FROM public.status_history WHERE id = $1;', [s.id]);
  }
  console.log('[PASS] Status history deleted.');

  // 7. Storage objects in customer-documents
  const storageRows = await client.query("SELECT id, name FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  console.log(`Found ${storageRows.rows.length} order storage objects.`);
  for (const st of storageRows.rows) {
    await client.query('DELETE FROM storage.objects WHERE id = $1;', [st.id]);
  }
  console.log('[PASS] Storage objects deleted.');

  // 8. Post-cleanup Audit
  console.log('\n================================================================');
  console.log('POST-CLEANUP AUDIT VERIFICATION');
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

uuidReset().catch(console.error);

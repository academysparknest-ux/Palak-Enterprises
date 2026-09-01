const { getClient } = require('./db_helper.cjs');

async function main() {
  console.log('Connecting via db_helper...');
  const client = await getClient();
  console.log('Connected successfully!');

  try {
    console.log('1. Deleting order_files...');
    const fRes = await client.query('DELETE FROM public.order_files WHERE id IN (SELECT id FROM public.order_files);');
    console.log(`[PASS] Deleted ${fRes.rowCount} order_files`);

    console.log('2. Deleting order_items...');
    const iRes = await client.query('DELETE FROM public.order_items WHERE id IN (SELECT id FROM public.order_items);');
    console.log(`[PASS] Deleted ${iRes.rowCount} order_items`);

    console.log('3. Deleting print_jobs...');
    const jRes = await client.query('DELETE FROM public.print_jobs WHERE id IN (SELECT id FROM public.print_jobs);');
    console.log(`[PASS] Deleted ${jRes.rowCount} print_jobs`);

    console.log('4. Unlinking invoices...');
    const invRes = await client.query('UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;');
    console.log(`[PASS] Unlinked ${invRes.rowCount} invoices`);

    console.log('5. Deleting orders...');
    const oRes = await client.query('DELETE FROM public.orders WHERE id IN (SELECT id FROM public.orders);');
    console.log(`[PASS] Deleted ${oRes.rowCount} orders`);

    console.log('6. Deleting status_history...');
    const shRes = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
    console.log(`[PASS] Deleted ${shRes.rowCount} status_history`);

    console.log('7. Deleting storage objects in customer-documents...');
    const stoRes = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
    console.log(`[PASS] Deleted ${stoRes.rowCount} storage objects`);

    console.log('\n================================================================');
    console.log('8. RUNNING POST-RESET AUDIT');
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

    console.log('\n[ORDER DATA - TARGET: ZERO]');
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

  } finally {
    await client.end();
  }
}

main().catch(console.error);

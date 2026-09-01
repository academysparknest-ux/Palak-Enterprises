const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function runChunkedReset() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });

  await client.connect();
  console.log('Connected to database.');

  console.log('1. Unlinking invoices...');
  const invRes = await client.query('UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;');
  console.log(`   -> Unlinked ${invRes.rowCount} invoices`);

  console.log('2. Deleting print_jobs...');
  const pjRes = await client.query('DELETE FROM public.print_jobs;');
  console.log(`   -> Deleted ${pjRes.rowCount} print_jobs`);

  console.log('3. Deleting order_files...');
  const ofRes = await client.query('DELETE FROM public.order_files;');
  console.log(`   -> Deleted ${ofRes.rowCount} order_files`);

  console.log('4. Deleting order_items...');
  const oiRes = await client.query('DELETE FROM public.order_items;');
  console.log(`   -> Deleted ${oiRes.rowCount} order_items`);

  console.log('5. Deleting orders...');
  const oRes = await client.query('DELETE FROM public.orders;');
  console.log(`   -> Deleted ${oRes.rowCount} orders`);

  console.log('6. Deleting order status history...');
  const shRes = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log(`   -> Deleted ${shRes.rowCount} status logs`);

  console.log('7. Deleting order storage objects...');
  const stoRes = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  console.log(`   -> Deleted ${stoRes.rowCount} storage objects`);

  console.log('\n--- VERIFICATION AUDIT ---');
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
  console.log('Audit Results:');
  console.log('Order counts (All must be 0):');
  console.log(`  orders: ${audit.orders_count}`);
  console.log(`  order_items: ${audit.items_count}`);
  console.log(`  order_files: ${audit.files_count}`);
  console.log(`  print_jobs: ${audit.jobs_count}`);
  console.log(`  order status_history: ${audit.order_status_count}`);
  console.log(`  customer_documents order storage: ${audit.storage_order_docs}`);
  console.log('Preserved counts:');
  console.log(`  invoices: ${audit.invoices_count}`);
  console.log(`  profiles: ${audit.profiles_count}`);
  console.log(`  categories: ${audit.categories_count}`);
  console.log(`  products: ${audit.products_count}`);
  console.log(`  idcard_projects: ${audit.idcard_projects_count}`);
  console.log(`  idcard_photos: ${audit.idcard_photos_count}`);

  await client.end();
}

runChunkedReset().catch(console.error);

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
  console.log('Connected to database.');

  console.log('1. Deleting order_files...');
  const files = await client.query('DELETE FROM public.order_files WHERE id IN (SELECT id FROM public.order_files LIMIT 500);');
  console.log(`   -> Deleted ${files.rowCount} order_files`);

  console.log('2. Deleting order_items...');
  const items = await client.query('DELETE FROM public.order_items WHERE id IN (SELECT id FROM public.order_items LIMIT 500);');
  console.log(`   -> Deleted ${items.rowCount} order_items`);

  console.log('3. Deleting print_jobs...');
  const jobs = await client.query('DELETE FROM public.print_jobs WHERE id IN (SELECT id FROM public.print_jobs LIMIT 500);');
  console.log(`   -> Deleted ${jobs.rowCount} print_jobs`);

  console.log('4. Deleting orders (Cascades ON DELETE SET NULL to invoices)...');
  const orders = await client.query('DELETE FROM public.orders WHERE id IN (SELECT id FROM public.orders LIMIT 500);');
  console.log(`   -> Deleted ${orders.rowCount} orders`);

  console.log('5. Deleting order status history...');
  const status = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log(`   -> Deleted ${status.rowCount} order status_history records`);

  console.log('6. Deleting customer-documents order storage objects...');
  const storage = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  console.log(`   -> Deleted ${storage.rowCount} storage objects`);

  console.log('\n7. Auditing database...');
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
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'idcard-photos') as idcard_photos_count;
  `);

  const audit = auditRes.rows[0];
  console.log('Audit Results:', audit);

  await client.end();
}

main().catch(console.error);

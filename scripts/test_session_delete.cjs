const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function testSessionDelete() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to session pooler port 5432...');
  await client.connect();
  console.log('Connected!');

  console.log('1. Deleting order_files...');
  const f = await client.query('DELETE FROM public.order_files;');
  console.log(`Deleted ${f.rowCount} order_files`);

  console.log('2. Deleting order_items...');
  const it = await client.query('DELETE FROM public.order_items;');
  console.log(`Deleted ${it.rowCount} order_items`);

  console.log('3. Deleting print_jobs...');
  const pj = await client.query('DELETE FROM public.print_jobs;');
  console.log(`Deleted ${pj.rowCount} print_jobs`);

  console.log('4. Deleting orders...');
  const o = await client.query('DELETE FROM public.orders;');
  console.log(`Deleted ${o.rowCount} orders`);

  console.log('5. Deleting status_history...');
  const sh = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log(`Deleted ${sh.rowCount} status history`);

  console.log('6. Deleting storage objects...');
  const st = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');");
  console.log(`Deleted ${st.rowCount} storage objects`);

  console.log('\n--- 7. AUDITING FINAL COUNTS ---');
  const audit = await client.query(`
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

  console.log('Audit Results:', audit.rows[0]);

  await client.end();
}

testSessionDelete().catch(console.error);

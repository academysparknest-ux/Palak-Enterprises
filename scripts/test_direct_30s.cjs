const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function testDirect() {
  const client = new Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  });

  console.log('Connecting to db.zofddiuswdtbqvqycezy.supabase.co:5432 with 30s timeout...');
  const t0 = Date.now();
  await client.connect();
  console.log(`Connected in ${Date.now() - t0}ms!`);

  const res = await client.query(`
    SELECT 
      (SELECT count(*) FROM public.orders) as orders,
      (SELECT count(*) FROM public.order_items) as items,
      (SELECT count(*) FROM public.order_files) as files,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as status_history,
      (SELECT count(*) FROM public.invoices) as invoices,
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents') as storage_docs;
  `);
  console.log('Database live counts:', res.rows[0]);
  await client.end();
}

testDirect().catch(console.error);

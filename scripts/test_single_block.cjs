const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function testSingle() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected!');

  const sql = `
    SELECT 
      (SELECT count(*) FROM public.orders) as orders_count,
      (SELECT count(*) FROM public.order_items) as items_count,
      (SELECT count(*) FROM public.order_files) as files_count,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as status_count,
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents') as docs_count;
  `;

  const res = await client.query(sql);
  console.log('Query result:', res.rows[0]);
  await client.end();
}

testSingle().catch(console.error);

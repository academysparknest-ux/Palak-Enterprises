const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const connStr = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

async function test() {
  console.log('Testing connection string format...');
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected!');

  const delTest = await client.query('DELETE FROM public.order_files WHERE id = (SELECT id FROM public.order_files LIMIT 1);');
  console.log('Delete test row count:', delTest.rowCount);

  const res = await client.query('SELECT count(*) FROM public.orders;');
  console.log('Orders count:', res.rows[0].count);

  await client.end();
}

test().catch(console.error);

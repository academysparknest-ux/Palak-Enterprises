const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function test() {
  console.log('Testing with setDefaultResultOrder ipv4first...');
  const t0 = Date.now();

  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log(`Connected in ${Date.now() - t0}ms!`);

  const res = await client.query('SELECT count(*) FROM public.orders;');
  console.log(`Query result in ${Date.now() - t0}ms: orders count = ${res.rows[0].count}`);

  await client.end();
}

test().catch(console.error);

const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function test() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    application_name: 'admin_reset_tool',
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected! Querying...');
    const res = await client.query('SELECT 1 as ok, current_database(), current_user;');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (e) {
    console.error('Error:', e.message);
    try { await client.end(); } catch (err) {}
  }
}

test();

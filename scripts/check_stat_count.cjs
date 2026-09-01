const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function check() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query('SELECT count(*), state, usename FROM pg_stat_activity GROUP BY state, usename;');
  console.log('pg_stat_activity summary:', res.rows);
  await client.end();
}

check().catch(console.error);

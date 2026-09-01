const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function check() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query(`
    SELECT pid, state, wait_event_type, wait_event, query_start, query 
    FROM pg_stat_activity 
    WHERE pid != pg_backend_pid() AND state != 'idle';
  `);
  console.log('Active queries in pg_stat_activity:');
  console.log(res.rows);
  await client.end();
}

check().catch(console.error);

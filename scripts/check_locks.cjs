const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function checkLocks() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query(`
    SELECT pid, state, wait_event_type, wait_event, query_start, query 
    FROM pg_stat_activity 
    WHERE state != 'idle' AND pid != pg_backend_pid();
  `);
  console.log('Active queries in pg_stat_activity:', res.rows);

  // Terminate any old uncommitted transactions holding locks
  const termRes = await client.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE state IN ('idle in transaction', 'idle in transaction (aborted)')
      AND pid != pg_backend_pid();
  `);
  console.log('Terminated idle in transaction sessions:', termRes.rows.length);

  await client.end();
}

checkLocks().catch(console.error);

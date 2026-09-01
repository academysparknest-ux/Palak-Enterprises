const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function diagnose() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('--- 1. ACTIVE LOCKS ---');
  const locks = await client.query(`
    SELECT l.pid, l.mode, l.granted, a.query, a.state
    FROM pg_locks l
    JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE l.relation = 'public.order_files'::regclass OR l.relation = 'public.orders'::regclass;
  `);
  console.log(locks.rows);

  console.log('\n--- 2. TRIGGERS ON ORDER TABLES ---');
  const triggers = await client.query(`
    SELECT tgname, relname, proname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE c.relname IN ('orders', 'order_files', 'order_items', 'print_jobs', 'invoices', 'status_history')
      AND NOT t.tgisinternal;
  `);
  console.log(triggers.rows);

  console.log('\n--- 3. TERMINATING BLOCKING SESSIONS ---');
  const term = await client.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE pid != pg_backend_pid() 
      AND (query LIKE '%orders%' OR query LIKE '%order_files%' OR state = 'idle in transaction');
  `);
  console.log(`Terminated ${term.rows.length} sessions.`);

  console.log('\n--- 4. TESTING DELETE SINGLE ROW ---');
  const delTest = await client.query('DELETE FROM public.order_files WHERE id = (SELECT id FROM public.order_files LIMIT 1);');
  console.log('Delete single row result:', delTest.rowCount);

  await client.end();
}

diagnose().catch(console.error);

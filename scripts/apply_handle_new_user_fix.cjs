const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyFix() {
  const client = new Client({
    host: 'db.zofddiuswdtbqvqycezy.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'R9i8s7h6@5v4',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  await client.connect();
  console.log('Connected to PostgreSQL!');

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260825_fix_auth_new_user_trigger.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
  console.log('Migration 20260825_fix_auth_new_user_trigger.sql applied successfully!');

  // Verify the updated function definition
  const funcRes = await client.query(`
    SELECT pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE proname = 'handle_new_user'
  `);
  console.log('Updated handle_new_user definition:');
  console.log(funcRes.rows[0]?.def);

  // Verify triggers on auth.users
  const trigRes = await client.query(`
    SELECT tgname, pg_get_triggerdef(oid) as def
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
  `);
  console.log('\nActive triggers on auth.users:');
  console.log(JSON.stringify(trigRes.rows, null, 2));

  await client.end();
}

applyFix().catch(err => {
  console.error('Failed to apply fix:', err);
  process.exit(1);
});

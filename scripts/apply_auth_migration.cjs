const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function apply() {
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
  console.log('Connected to Supabase PostgreSQL!');

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260824_auth_role_sync_and_rls_hardening.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
  console.log('Migration 20260824_auth_role_sync_and_rls_hardening.sql APPLIED SUCCESSFULLY!');

  const funcs = await client.query("SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('is_admin', 'is_manager', 'is_staff', 'sync_current_user_role')");
  console.log('Verified Functions:', funcs.rows);

  await client.end();
}

apply().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

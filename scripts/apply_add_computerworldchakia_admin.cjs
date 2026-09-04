const { getClient } = require('./db_helper.cjs');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const client = await getClient();
  try {
    console.log('Connected to PostgreSQL!');
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260904_add_computerworldchakia_admin.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Migration 20260904_add_computerworldchakia_admin.sql applied successfully!');

    // Verify user role
    const res = await client.query(`
      SELECT u.id, u.email, u.raw_app_meta_data, u.raw_user_meta_data, ur.role
      FROM auth.users u
      LEFT JOIN public.user_roles ur ON u.id = ur.user_id
      WHERE lower(u.email) = 'computerworldchakia@gmail.com'
    `);
    console.log('\nVerified user_roles & metadata for computerworldchakia@gmail.com:');
    console.log(JSON.stringify(res.rows, null, 2));

    // Verify functions
    const funcRes = await client.query(`
      SELECT proname FROM pg_proc WHERE proname IN ('is_admin', 'is_manager', 'is_staff', 'sync_current_user_role', 'handle_new_user')
    `);
    console.log('\nVerified functions in database:', funcRes.rows.map(r => r.proname));
  } finally {
    await client.end();
  }
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

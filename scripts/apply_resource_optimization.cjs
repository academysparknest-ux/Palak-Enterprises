const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  host: 'db.zofddiuswdtbqvqycezy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'R9i8s7h6@5v4',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  console.log('Connecting to PostgreSQL database...');
  await client.connect();
  console.log('Connected.');

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260824_resource_and_query_optimization.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying 20260824_resource_and_query_optimization.sql ...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify created indexes
  const idxRes = await client.query(`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `);
  console.log(`\nVerified ${idxRes.rows.length} custom performance indexes in public schema:`);
  idxRes.rows.forEach(r => console.log(`  - [${r.tablename}] ${r.indexname}`));

  await client.end();
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

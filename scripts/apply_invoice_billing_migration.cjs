const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const configs = [
  {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  }
];

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260821_production_invoice_billing_system.sql'),
    'utf-8'
  );

  for (const cfg of configs) {
    console.log(`Connecting to ${cfg.host}:${cfg.port} as ${cfg.user}...`);
    const client = new Client(cfg);
    try {
      await client.connect();
      console.log('Connected! Executing 20260821_production_invoice_billing_system.sql...');
      await client.query(sql);
      console.log('MIGRATION APPLIED SUCCESSFULLY!');
      
      // Test the new function
      const fyRes = await client.query('SELECT public.get_financial_year_code() AS fy, public.generate_next_invoice_number() AS next_inv;');
      console.log('Test function output:', fyRes.rows);
      
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed on ${cfg.host}:`, err.message);
      try { await client.end(); } catch (e) {}
    }
  }

  console.error('Could not apply migration on any target.');
  process.exit(1);
}

main();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const configs = [
  {
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
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
    path.join(__dirname, '..', 'supabase', 'migrations', '20260909_harden_invoice_numbering_system.sql'),
    'utf-8'
  );

  for (const cfg of configs) {
    console.log(`Connecting to ${cfg.host}:${cfg.port}...`);
    const client = new Client(cfg);
    try {
      await client.connect();
      console.log('Connected! Executing 20260909_harden_invoice_numbering_system.sql...');
      await client.query(sql);
      console.log('MIGRATION APPLIED SUCCESSFULLY!');
      
      // Verification of columns and constraints
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name IN ('sequence_number', 'financial_year_start', 'idempotency_key')
      `);
      console.log('Verified columns on public.invoices:', res.rows);

      const existingInvoices = await client.query(`
        SELECT id, invoice_number, sequence_number, financial_year_start, financial_year, status
        FROM public.invoices
      `);
      console.log('Existing invoices backfilled:', existingInvoices.rows);

      const counters = await client.query(`SELECT * FROM public.invoice_counters;`);
      console.log('invoice_counters:', counters.rows);

      const idcardCounters = await client.query(`SELECT * FROM public.idcard_invoice_counters;`);
      console.log('idcard_invoice_counters:', idcardCounters.rows);

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

main().catch(err => {
  console.error(err);
  process.exit(1);
});

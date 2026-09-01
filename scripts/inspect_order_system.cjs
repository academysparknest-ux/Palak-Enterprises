const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const secretKey = 'sb_secret_ak1kcjS6OaiJMPD4Hzq0OA_6OjpURqo';
const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const hosts = [
  `aws-0-ap-south-1.pooler.supabase.com`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `db.${ref}.supabase.co`,
  `aws-0-us-east-1.pooler.supabase.com`
];

async function getPgClient() {
  for (const host of hosts) {
    const isPooler = host.includes('pooler');
    const client = new Client({
      host: host,
      port: isPooler ? 6543 : 5432,
      user: isPooler ? `postgres.${ref}` : 'postgres',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`Connected successfully to PostgreSQL on ${host}!`);
      return client;
    } catch (err) {
      console.log(`Connection to ${host} failed: ${err.message}`);
      try { await client.end(); } catch (e) {}
    }
  }
  throw new Error('All database connections failed.');
}

const adminClient = createClient(supabaseUrl, secretKey);

async function inspect() {
  const pgClient = await getPgClient();

  // 1. All tables in public schema
  const tablesRes = await pgClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('\n--- TABLES IN PUBLIC SCHEMA ---');
  console.log(tables.join(', '));

  // 2. Row counts in each table
  console.log('\n--- ROW COUNTS ---');
  for (const t of tables) {
    try {
      const countRes = await pgClient.query(`SELECT count(*) FROM public."${t}";`);
      console.log(`  ${t.padEnd(35)}: ${countRes.rows[0].count}`);
    } catch (e) {
      console.log(`  ${t.padEnd(35)}: ERROR (${e.message})`);
    }
  }

  // 3. Foreign Keys referencing orders or child tables
  console.log('\n--- FOREIGN KEYS INVOLVING ORDERS & ORDER-RELATED TABLES ---');
  const fkRes = await pgClient.query(`
    SELECT
      tc.table_schema, 
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  for (const row of fkRes.rows) {
    if (
      row.table_name.includes('order') || 
      row.foreign_table_name.includes('order') ||
      row.table_name.includes('invoice') ||
      row.foreign_table_name.includes('invoice') ||
      row.table_name.includes('status') ||
      row.foreign_table_name.includes('status') ||
      row.table_name.includes('print') ||
      row.foreign_table_name.includes('print')
    ) {
      console.log(`  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} [ON DELETE: ${row.delete_rule}] (Constraint: ${row.constraint_name})`);
    }
  }

  // 4. Invoices check
  console.log('\n--- INVOICES INSPECTION ---');
  try {
    const invoicesRes = await pgClient.query(`
      SELECT id, invoice_number, order_id, order_code, customer_name, total_amount, created_at 
      FROM public.invoices;
    `);
    console.log(`Found ${invoicesRes.rows.length} invoices:`);
    for (const inv of invoicesRes.rows) {
      console.log(`  Invoice ${inv.invoice_number} | OrderID: ${inv.order_id} | OrderCode: ${inv.order_code} | Customer: ${inv.customer_name} | Amount: ${inv.total_amount}`);
    }
  } catch (e) {
    console.log('Invoices query info:', e.message);
  }

  // 5. Triggers on order-related tables
  console.log('\n--- TRIGGERS ON ORDER TABLES ---');
  const trigRes = await pgClient.query(`
    SELECT 
      event_object_table,
      trigger_name,
      event_manipulation,
      action_statement,
      action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);
  for (const tr of trigRes.rows) {
    if (tr.event_object_table.includes('order') || tr.event_object_table.includes('invoice') || tr.event_object_table.includes('print') || tr.event_object_table.includes('status') || tr.event_object_table.includes('audit')) {
      console.log(`  Table: ${tr.event_object_table.padEnd(20)} | Trigger: ${tr.trigger_name.padEnd(35)} | Event: ${tr.event_manipulation} (${tr.action_timing})`);
    }
  }

  // 6. Check sequences
  console.log('\n--- DATABASE SEQUENCES ---');
  const seqRes = await pgClient.query(`
    SELECT sequence_schema, sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public';
  `);
  for (const s of seqRes.rows) {
    console.log(`  Sequence: ${s.sequence_name}`);
  }

  // 7. Audit logs schema and sample
  console.log('\n--- AUDIT LOGS INSPECTION ---');
  try {
    const auditCols = await pgClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'audit_logs';
    `);
    console.log('audit_logs columns:', auditCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    const auditRows = await pgClient.query(`SELECT count(*), entity_type FROM public.audit_logs GROUP BY entity_type;`);
    console.log('audit_logs by entity_type:', auditRows.rows);
  } catch (e) {
    console.log('Audit logs info:', e.message);
  }

  // 8. Notifications schema and sample
  console.log('\n--- NOTIFICATIONS INSPECTION ---');
  try {
    const notifCols = await pgClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications';
    `);
    console.log('notifications columns:', notifCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    const notifRows = await pgClient.query(`SELECT count(*), type FROM public.notifications GROUP BY type;`);
    console.log('notifications by type:', notifRows.rows);
  } catch (e) {
    console.log('Notifications info:', e.message);
  }

  // 9. Storage Buckets inspection
  console.log('\n--- STORAGE BUCKETS & OBJECTS INSPECTION ---');
  const { data: buckets, error: bErr } = await adminClient.storage.listBuckets();
  if (bErr) {
    console.log('Error listing buckets:', bErr);
  } else {
    for (const b of buckets) {
      console.log(`\nBucket: ${b.name} (public: ${b.public})`);
      const { data: files, error: fErr } = await adminClient.storage.from(b.name).list('', { limit: 100 });
      if (fErr) {
        console.log(`  Error listing files in ${b.name}:`, fErr.message);
      } else {
        console.log(`  Top-level files/folders in ${b.name} (${files.length}):`);
        for (const f of files) {
          if (f.id) {
            console.log(`    - [FILE] ${f.name} (${f.metadata?.size || 'unknown'} bytes)`);
          } else {
            console.log(`    - [DIR]  ${f.name}/`);
            const { data: subfiles } = await adminClient.storage.from(b.name).list(f.name, { limit: 50 });
            if (subfiles && subfiles.length > 0) {
              for (const sf of subfiles) {
                if (sf.id) {
                  console.log(`        -- [FILE] ${f.name}/${sf.name} (${sf.metadata?.size || 'unknown'} bytes)`);
                } else {
                  console.log(`        -- [DIR]  ${f.name}/${sf.name}/`);
                  const { data: subsubfiles } = await adminClient.storage.from(b.name).list(`${f.name}/${sf.name}`, { limit: 50 });
                  if (subsubfiles && subsubfiles.length > 0) {
                    for (const ssf of subsubfiles) {
                      console.log(`            --- [FILE] ${f.name}/${sf.name}/${ssf.name} (${ssf.metadata?.size || 'unknown'} bytes)`);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 10. Orders sample
  console.log('\n--- CURRENT ORDERS IN DATABASE ---');
  const orders = await pgClient.query(`SELECT id, order_code, customer_name, customer_phone, total_amount, order_status, created_at FROM public.orders ORDER BY created_at DESC;`);
  console.log(`Found ${orders.rows.length} orders:`);
  for (const o of orders.rows) {
    console.log(`  Order: ${o.order_code} | Status: ${o.order_status} | Name: ${o.customer_name} | Total: ${o.total_amount} | ID: ${o.id}`);
  }

  await pgClient.end();
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});

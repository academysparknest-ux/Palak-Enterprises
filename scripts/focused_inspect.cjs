const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function run() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('--- 1. ORDER_FILES DETAILS ---');
  const ofRes = await client.query('SELECT id, order_id, file_name, file_path, file_size FROM public.order_files');
  console.log(`Found ${ofRes.rows.length} order_files:`);
  for (const f of ofRes.rows) {
    console.log(`  order_id: ${f.order_id} | name: ${f.file_name} | path: ${f.file_path} | size: ${f.file_size}`);
  }

  console.log('\n--- 2. INVOICES LINKED TO ORDERS ---');
  const invRes = await client.query('SELECT id, invoice_number, order_id, order_code, total_amount, payment_status FROM public.invoices');
  console.log(`Found ${invRes.rows.length} invoices:`);
  const linkedInvoices = invRes.rows.filter(i => i.order_id || i.order_code);
  const unlinkedInvoices = invRes.rows.filter(i => !i.order_id && !i.order_code);
  console.log(`  Linked to orders (${linkedInvoices.length}):`);
  for (const i of linkedInvoices) {
    console.log(`    ${i.invoice_number}: order_id=${i.order_id}, order_code=${i.order_code}, total=${i.total_amount}, status=${i.payment_status}`);
  }
  console.log(`  Standalone / unlinked (${unlinkedInvoices.length}):`);
  for (const i of unlinkedInvoices) {
    console.log(`    ${i.invoice_number}: total=${i.total_amount}, status=${i.payment_status}`);
  }

  console.log('\n--- 3. STATUS HISTORY ENTITY BREAKDOWN ---');
  const shRes = await client.query('SELECT entity_type, count(*) FROM public.status_history GROUP BY entity_type');
  console.log(shRes.rows);

  console.log('\n--- 4. AUDIT LOGS BREAKDOWN ---');
  const alRes = await client.query('SELECT entity_type, action_type, count(*) FROM public.audit_logs GROUP BY entity_type, action_type');
  console.log(alRes.rows);

  console.log('\n--- 5. STORAGE OBJECTS IN CUSTOMER-DOCUMENTS & ORDER-ARTWORK ---');
  const stoRes = await client.query(`
    SELECT bucket_id, name, (metadata->>'size')::bigint as size_bytes
    FROM storage.objects
    WHERE bucket_id IN ('customer-documents', 'order-artwork', 'design-files')
  `);
  console.log(`Found ${stoRes.rows.length} objects in order-related buckets:`);
  for (const s of stoRes.rows) {
    console.log(`  [${s.bucket_id}] ${s.name} (${s.size_bytes} bytes)`);
  }

  console.log('\n--- 6. STORAGE OBJECTS IN ID CARD BUCKETS ---');
  const idcardStoRes = await client.query(`
    SELECT bucket_id, count(*), sum((metadata->>'size')::bigint) as total_bytes
    FROM storage.objects
    WHERE bucket_id IN ('idcard-assets', 'idcard-photos', 'idcard-logos')
    GROUP BY bucket_id
  `);
  console.log(idcardStoRes.rows);

  await client.end();
}

run().catch(console.error);

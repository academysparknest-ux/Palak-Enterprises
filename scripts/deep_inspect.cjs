const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const hosts = [
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-ap-south-1.pooler.supabase.com`,
  `db.${ref}.supabase.co`
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
      return client;
    } catch (err) {
      try { await client.end(); } catch (e) {}
    }
  }
  throw new Error('All database connections failed.');
}

async function deepInspect() {
  const pgClient = await getPgClient();
  console.log('Connected to PostgreSQL successfully!');

  // 1. Status History Details
  console.log('\n=== STATUS HISTORY SCHEMA & DATA ===');
  const shCols = await pgClient.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'status_history';
  `);
  console.log('Columns:', shCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  
  const shSample = await pgClient.query(`
    SELECT count(*), entity_type 
    FROM public.status_history 
    GROUP BY entity_type;
  `);
  console.log('status_history grouped by entity_type:', shSample.rows);

  const shFk = await pgClient.query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'public.status_history'::regclass;
  `);
  console.log('status_history constraints:', shFk.rows);

  // 2. Invoices Schema & Detailed Data
  console.log('\n=== INVOICES SCHEMA & DATA ===');
  const invCols = await pgClient.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices';
  `);
  console.log('Columns:', invCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

  const invData = await pgClient.query(`
    SELECT id, invoice_number, order_id, order_code, total_amount, payment_status, created_at 
    FROM public.invoices;
  `);
  console.log(`Invoices (${invData.rows.length}):`);
  for (const inv of invData.rows) {
    console.log(`  ${inv.invoice_number} | order_id: ${inv.order_id} | order_code: ${inv.order_code} | total: ${inv.grand_total} | payment: ${inv.payment_status} | created: ${inv.created_at}`);
  }

  // 3. Storage Buckets and Objects directly from storage schema
  console.log('\n=== STORAGE BUCKETS & OBJECTS (storage.objects) ===');
  const buckets = await pgClient.query(`SELECT id, name, public FROM storage.buckets;`);
  console.log('Buckets:', buckets.rows);

  const objects = await pgClient.query(`
    SELECT id, bucket_id, name, (metadata->>'size')::bigint as size_bytes, metadata->>'mimetype' as mime_type, created_at
    FROM storage.objects
    ORDER BY bucket_id, name;
  `);
  console.log(`Found ${objects.rows.length} total storage objects in storage.objects:`);
  
  const bucketCounts = {};
  for (const obj of objects.rows) {
    if (!bucketCounts[obj.bucket_id]) bucketCounts[obj.bucket_id] = [];
    bucketCounts[obj.bucket_id].push(obj);
  }

  for (const [bucket, files] of Object.entries(bucketCounts)) {
    console.log(`\n--- Bucket: ${bucket} (${files.length} objects) ---`);
    for (const f of files) {
      const sz = f.size_bytes ? Number(f.size_bytes) : 0;
      console.log(`  ${f.name} (${(sz/1024).toFixed(1)} KB, ${f.mime_type}) [Created: ${f.created_at}]`);
    }
  }

  // 4. Order Files details
  console.log('\n=== ORDER FILES TABLE DATA ===');
  const ofCols = await pgClient.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_files';
  `);
  console.log('Columns:', ofCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

  const orderFiles = await pgClient.query(`
    SELECT * 
    FROM public.order_files;
  `);
  console.log(`order_files (${orderFiles.rows.length} rows):`);
  for (const of of orderFiles.rows) {
    console.log(`  order_id: ${of.order_id} | name: ${of.file_name} | file_path: ${of.file_path} | file_url: ${of.file_url} | size: ${of.file_size} | pages: ${of.page_count}`);
  }

  // 5. Order Items details
  console.log('\n=== ORDER ITEMS TABLE DATA ===');
  const orderItems = await pgClient.query(`
    SELECT id, order_id, product_id, item_title, quantity, unit_price, total_price 
    FROM public.order_items;
  `);
  console.log(`order_items (${orderItems.rows.length} rows):`);
  for (const oi of orderItems.rows) {
    console.log(`  order_id: ${oi.order_id} | item_title: ${oi.item_title} | qty: ${oi.quantity} | total: ${oi.total_price}`);
  }

  // 6. Sequences
  console.log('\n=== ALL SEQUENCES IN DB ===');
  const seqs = await pgClient.query(`
    SELECT sequence_name, last_value 
    FROM information_schema.sequences;
  `);
  console.log('Sequences in information_schema:', seqs.rows);

  // 7. Invoice Counters table data
  console.log('\n=== INVOICE COUNTERS TABLE ===');
  const invCounters = await pgClient.query(`SELECT * FROM public.invoice_counters;`);
  console.log(invCounters.rows);

  await pgClient.end();
}

deepInspect().catch(err => {
  console.error('Deep inspection error:', err);
  process.exit(1);
});

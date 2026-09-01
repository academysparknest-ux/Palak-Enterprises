const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

function getPg() {
  return new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
}

async function runQuery(queryText) {
  const client = getPg();
  await client.connect();
  try {
    const res = await client.query(queryText);
    return res.rows;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('1. Fetching orders...');
  const orders = await runQuery('SELECT id, order_code, user_id, customer_name, customer_phone, customer_email, delivery_address, fulfillment_type, order_notes, staff_notes, payment_method, payment_status, subtotal_amount, delivery_fee, total_amount, order_status, created_at, updated_at FROM public.orders ORDER BY created_at;');
  console.log(`   -> ${orders.length} orders`);

  console.log('2. Fetching order_items...');
  const items = await runQuery('SELECT id, order_id, product_id, product_name, quantity, unit_price, total_price, uploaded_file_name, created_at FROM public.order_items ORDER BY id;');
  console.log(`   -> ${items.length} items`);

  console.log('3. Fetching order_files...');
  const files = await runQuery('SELECT id, order_id, order_item_id, file_name, file_path, file_size, file_type, uploaded_by, created_at, page_count FROM public.order_files ORDER BY id;');
  console.log(`   -> ${files.length} files`);

  console.log('4. Fetching print_jobs...');
  const jobs = await runQuery('SELECT * FROM public.print_jobs ORDER BY id;');
  console.log(`   -> ${jobs.length} jobs`);

  console.log('5. Fetching order status_history...');
  const statusHistory = await runQuery("SELECT id, entity_type, entity_code, previous_status, new_status, message_en, message_hi, performed_by, created_at FROM public.status_history WHERE entity_type = 'order' ORDER BY created_at;");
  console.log(`   -> ${statusHistory.length} status logs`);

  console.log('6. Fetching linked invoices...');
  const invoices = await runQuery("SELECT id, invoice_number, order_id, order_code, total_amount, payment_status FROM public.invoices WHERE order_id IS NOT NULL OR order_code IS NOT NULL;");
  console.log(`   -> ${invoices.length} invoices`);

  console.log('7. Fetching storage objects...');
  const storageObjects = await runQuery("SELECT id, bucket_id, name, created_at, updated_at FROM storage.objects WHERE bucket_id = 'customer-documents';");
  console.log(`   -> ${storageObjects.length} storage objects`);

  const backupData = {
    timestamp: new Date().toISOString(),
    counts: {
      orders: orders.length,
      order_items: items.length,
      order_files: files.length,
      print_jobs: jobs.length,
      order_status_history: statusHistory.length,
      linked_invoices: invoices.length,
      storage_objects: storageObjects.length
    },
    orders,
    order_items: items,
    order_files: files,
    print_jobs: jobs,
    order_status_history: statusHistory,
    linked_invoices_snapshot: invoices,
    storage_objects: storageObjects
  };

  const backupDir = path.join(__dirname, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `orders_backup_${Date.now()}.json`;
  const backupPath = path.join(backupDir, filename);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\n[SUCCESS] Backup completed and saved to: ${backupPath}`);
  console.log(JSON.stringify(backupData.counts, null, 2));
}

main().catch(err => {
  console.error('[FAIL] Error:', err);
  process.exit(1);
});

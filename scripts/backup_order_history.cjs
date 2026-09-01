const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function backup() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  console.log('Connecting to PostgreSQL Session Pooler (aws-0-ap-southeast-1.pooler.supabase.com:5432)...');
  await client.connect();
  console.log('Connected successfully in Session Mode!');

  console.log('1. Querying orders snapshot...');
  const ordersRes = await client.query('SELECT id, order_code, user_id, customer_name, customer_phone, customer_email, delivery_address, fulfillment_type, order_notes, staff_notes, payment_method, payment_status, subtotal_amount, delivery_fee, total_amount, order_status, created_at, updated_at FROM public.orders ORDER BY created_at;');
  console.log(`   -> Orders: ${ordersRes.rows.length}`);

  console.log('2. Querying order_items snapshot...');
  const orderItemsRes = await client.query('SELECT id, order_id, product_id, item_title, quantity, unit_price, total_price, uploaded_file_name, created_at FROM public.order_items ORDER BY id;');
  console.log(`   -> Order Items: ${orderItemsRes.rows.length}`);

  console.log('3. Querying order_files snapshot...');
  const orderFilesRes = await client.query('SELECT id, order_id, order_item_id, file_name, file_path, file_size, file_type, uploaded_by, created_at, page_count FROM public.order_files ORDER BY id;');
  console.log(`   -> Order Files: ${orderFilesRes.rows.length}`);

  console.log('4. Querying print_jobs snapshot...');
  const printJobsRes = await client.query('SELECT * FROM public.print_jobs ORDER BY id;');
  console.log(`   -> Print Jobs: ${printJobsRes.rows.length}`);

  console.log('5. Querying order status_history snapshot...');
  const statusHistoryRes = await client.query("SELECT id, entity_type, entity_code, previous_status, new_status, message_en, message_hi, performed_by, created_at FROM public.status_history WHERE entity_type = 'order' ORDER BY created_at;");
  console.log(`   -> Order Status History: ${statusHistoryRes.rows.length}`);

  console.log('6. Querying linked invoices snapshot...');
  const invoicesLinkedRes = await client.query("SELECT id, invoice_number, order_id, order_code, total_amount, payment_status FROM public.invoices WHERE order_id IS NOT NULL OR order_code IS NOT NULL;");
  console.log(`   -> Linked Invoices: ${invoicesLinkedRes.rows.length}`);

  console.log('7. Querying storage objects snapshot...');
  const storageObjectsRes = await client.query("SELECT id, bucket_id, name, created_at, updated_at FROM storage.objects WHERE bucket_id = 'customer-documents';");
  console.log(`   -> Storage Objects: ${storageObjectsRes.rows.length}`);

  const backupData = {
    timestamp: new Date().toISOString(),
    counts: {
      orders: ordersRes.rows.length,
      order_items: orderItemsRes.rows.length,
      order_files: orderFilesRes.rows.length,
      print_jobs: printJobsRes.rows.length,
      order_status_history: statusHistoryRes.rows.length,
      linked_invoices: invoicesLinkedRes.rows.length,
      customer_documents_storage_objects: storageObjectsRes.rows.length
    },
    orders: ordersRes.rows,
    order_items: orderItemsRes.rows,
    order_files: orderFilesRes.rows,
    print_jobs: printJobsRes.rows,
    order_status_history: statusHistoryRes.rows,
    linked_invoices_snapshot: invoicesLinkedRes.rows,
    storage_objects: storageObjectsRes.rows
  };

  const backupDir = path.join(__dirname, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `orders_backup_${Date.now()}.json`;
  const backupPath = path.join(backupDir, filename);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\n[SUCCESS] Pre-cleanup backup saved to: ${backupPath}`);
  console.log('Summary of backed up records:');
  console.log(`  - Orders: ${backupData.counts.orders}`);
  console.log(`  - Order Items: ${backupData.counts.order_items}`);
  console.log(`  - Order Files: ${backupData.counts.order_files}`);
  console.log(`  - Print Jobs: ${backupData.counts.print_jobs}`);
  console.log(`  - Order Status History: ${backupData.counts.order_status_history}`);
  console.log(`  - Linked Invoices: ${backupData.counts.linked_invoices}`);
  console.log(`  - Customer Documents: ${backupData.counts.customer_documents_storage_objects}`);

  await client.end();
  return backupPath;
}

backup().catch(err => {
  console.error('[FAIL] Backup error:', err);
  process.exit(1);
});

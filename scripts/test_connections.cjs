const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const secretKey = 'sb_secret_ak1kcjS6OaiJMPD4Hzq0OA_6OjpURqo';
const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function testConn() {
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('Testing Supabase JS Client...');
  const { data: orders, error: oErr } = await adminClient.from('orders').select('id, order_code, total_amount, order_status');
  if (oErr) console.error('Orders error:', oErr);
  else console.log(`Supabase JS fetched ${orders.length} orders successfully!`);

  const { data: invs, error: iErr } = await adminClient.from('invoices').select('id, invoice_number, order_id, order_code, total_amount, payment_status');
  if (iErr) console.error('Invoices error:', iErr);
  else console.log(`Supabase JS fetched ${invs.length} invoices successfully!`);

  const { data: ofs, error: fErr } = await adminClient.from('order_files').select('id, order_id, file_name, file_path, file_size');
  if (fErr) console.error('Order files error:', fErr);
  else console.log(`Supabase JS fetched ${ofs.length} order_files successfully!`);

  // Testing PG on Session Pooler (port 5432)
  console.log('\nTesting PG client on Session Pooler port 5432...');
  const pgClient = new Client({
    host: `aws-0-ap-southeast-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await pgClient.connect();
  console.log('Connected to PG Session pooler (5432)!');
  const res = await pgClient.query('SELECT current_database(), current_user, count(*) FROM public.orders;');
  console.log('PG Query result:', res.rows);
  await pgClient.end();
}

testConn().catch(console.error);

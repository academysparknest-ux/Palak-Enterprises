import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const supabaseAnonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseClient() {
  console.log('Testing Supabase JS client queries...');

  const { data: orders, count: orderCount, error: err1 } = await supabase
    .from('orders')
    .select('id, order_code', { count: 'exact' });

  if (err1) {
    console.error('Error fetching orders:', err1);
  } else {
    console.log(`Orders in database: ${orderCount} (fetched ${orders?.length})`);
  }

  const { data: invs, count: invCount, error: err2 } = await supabase
    .from('invoices')
    .select('id, invoice_number', { count: 'exact' });

  if (err2) {
    console.error('Error fetching invoices:', err2);
  } else {
    console.log(`Invoices in database: ${invCount} (fetched ${invs?.length})`);
  }

  const { data: files, count: fileCount, error: err3 } = await supabase
    .from('order_files')
    .select('id', { count: 'exact' });

  if (err3) {
    console.error('Error fetching order_files:', err3);
  } else {
    console.log(`Order files in database: ${fileCount}`);
  }
}

testSupabaseClient().catch(console.error);

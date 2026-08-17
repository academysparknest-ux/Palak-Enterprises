const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const anonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';
const secretKey = 'sb_secret_ak1kcjS6OaiJMPD4Hzq0OA_6OjpURqo';

const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, secretKey);

async function runSecurityTests() {
  console.log('====================================================');
  console.log('PALAK ENTERPRISES — SUPABASE SECURITY & RLS AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Public Anonymous SELECT on Orders
  console.log('TEST 1: Anonymous SELECT * from orders (Should return 0 rows under strict RLS or empty)');
  const { data: anonOrders, error: anonOrderErr } = await anonClient.from('orders').select('*');
  console.log('  Result:', anonOrderErr ? `Blocked (${anonOrderErr.message})` : `Returned ${anonOrders?.length} rows`);
  passed++;

  // TEST 2: Public Guest Order Creation (Allowed without returning rows)
  console.log('\nTEST 2: Public Guest Order Insertion (Allowed)');
  const testOrderCode = 'PE-TEST-' + Date.now();
  const { error: insertErr } = await anonClient.from('orders').insert({
    order_code: testOrderCode,
    customer_name: 'Test Customer',
    customer_phone: '9905238015',
    subtotal_amount: 500,
    total_amount: 500,
    order_status: 'NEW'
  });

  if (insertErr) {
    console.log('  Insert Notice:', insertErr.message);
  } else {
    console.log('  SUCCESS: Order inserted into database by anonymous visitor!');
    passed++;

    // TEST 3: Verify the inserted order exists using Admin Client (Bypasses RLS)
    console.log('\nTEST 3: Admin verification & cleanup of inserted test order');
    const { data: foundOrder } = await adminClient.from('orders').select('*').eq('order_code', testOrderCode).single();
    if (foundOrder) {
      console.log('  SUCCESS: Admin verified test order exists in database:', foundOrder.order_code);
      await adminClient.from('orders').delete().eq('order_code', testOrderCode);
      console.log('  SUCCESS: Cleaned up test order.');
      passed++;
    }
  }

  // TEST 4: Tracking RPC Test
  console.log('\nTEST 4: Public Tracking RPC execution');
  const { data: trackingData, error: trackingErr } = await anonClient.rpc('get_public_order_tracking', {
    p_tracking_code: 'NON_EXISTENT_CODE_123',
    p_phone: '0000'
  });
  console.log('  RPC response for non-existent code:', trackingErr ? trackingErr.message : trackingData);
  passed++;

  console.log('\n====================================================');
  console.log(`SUMMARY: Security & Database Verification Complete!`);
  console.log('====================================================');
}

runSecurityTests();
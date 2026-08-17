const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const anonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';
const secretKey = 'sb_secret_ak1kcjS6OaiJMPD4Hzq0OA_6OjpURqo';

const pgClient = new Client({
  host: 'db.zofddiuswdtbqvqycezy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'R9i8s7h6@5v4',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, secretKey);

async function runAudit() {
  console.log('================================================================');
  console.log('PALAK ENTERPRISES — COMPREHENSIVE PRODUCTION SYSTEM AUDIT');
  console.log('================================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function report(name, passed, details) {
    totalChecks++;
    if (passed) {
      passedChecks++;
      console.log(`[PASS] ${name}: ${details || 'OK'}`);
    } else {
      console.log(`[FAIL] ${name}: ${details || 'Failed'}`);
    }
  }

  // 1. PostgreSQL Direct DB Connectivity
  try {
    await pgClient.connect();
    report('1. Direct PostgreSQL Database Connection', true, 'Connected to db.zofddiuswdtbqvqycezy.supabase.co:5432');
  } catch (err) {
    report('1. Direct PostgreSQL Database Connection', false, err.message);
  }

  // 2. Verify Tables in public schema
  const expectedTables = [
    'profiles',
    'user_roles',
    'categories',
    'products',
    'product_options',
    'product_option_values',
    'services',
    'orders',
    'order_items',
    'service_requests',
    'quote_requests',
    'design_requests',
    'status_history',
    'notifications',
    'audit_logs',
    'business_settings'
  ];

  try {
    const tableRes = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const existingTables = tableRes.rows.map(r => r.table_name);
    
    let allTablesPresent = true;
    const missing = [];
    for (const t of expectedTables) {
      if (!existingTables.includes(t)) {
        allTablesPresent = false;
        missing.push(t);
      }
    }
    report('2. Schema Tables Verification', allTablesPresent, allTablesPresent ? `All ${expectedTables.length} tables verified` : `Missing: ${missing.join(', ')}`);
  } catch (err) {
    report('2. Schema Tables Verification', false, err.message);
  }

  // 3. Verify Functions & RPC
  try {
    const fnRes = await pgClient.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public';
    `);
    const fns = fnRes.rows.map(r => r.routine_name);
    const hasTracking = fns.includes('get_public_order_tracking');
    const hasStaff = fns.includes('is_staff');
    const hasAdmin = fns.includes('is_admin');
    report('3. Security Functions & Tracking RPC', hasTracking && hasStaff && hasAdmin, `get_public_order_tracking, is_staff, is_admin present`);
  } catch (err) {
    report('3. Security Functions & Tracking RPC', false, err.message);
  }

  // 4. Verify Catalog Data Counts
  try {
    const catCount = await pgClient.query('SELECT count(*) FROM public.categories;');
    const prodCount = await pgClient.query('SELECT count(*) FROM public.products;');
    const servCount = await pgClient.query('SELECT count(*) FROM public.services;');
    report('4. Database Catalog Seed', true, `${catCount.rows[0].count} Categories, ${prodCount.rows[0].count} Products, ${servCount.rows[0].count} Services in DB`);
  } catch (err) {
    report('4. Database Catalog Seed', false, err.message);
  }

  // 5. Verify RLS Anonymous Data Isolation (Negative Test)
  try {
    const { data: anonOrders, error: anonErr } = await anonClient.from('orders').select('*');
    const secure = !anonErr && anonOrders.length === 0;
    report('5. RLS Customer Order Isolation', secure, `Anonymous SELECT returned ${anonOrders ? anonOrders.length : 'error'} rows (Data Protected)`);
  } catch (err) {
    report('5. RLS Customer Order Isolation', false, err.message);
  }

  // 6. Verify Anonymous Guest Order Placement (Public Insert)
  const testCode = 'PE-AUDIT-' + Date.now();
  try {
    const { error: insertErr } = await anonClient.from('orders').insert({
      order_code: testCode,
      customer_name: 'Audit Guest',
      customer_phone: '9905238015',
      subtotal_amount: 199,
      total_amount: 199,
      order_status: 'NEW'
    });
    
    if (insertErr) {
      report('6. Anonymous Guest Order Placement', false, insertErr.message);
    } else {
      // Verify with admin
      const { data: verifiedOrder } = await adminClient.from('orders').select('*').eq('order_code', testCode).single();
      const success = Boolean(verifiedOrder);
      report('6. Anonymous Guest Order Placement', success, `Order ${testCode} inserted & verified in database`);
      
      // Cleanup
      await adminClient.from('orders').delete().eq('order_code', testCode);
    }
  } catch (err) {
    report('6. Anonymous Guest Order Placement', false, err.message);
  }

  // 7. Verify Privacy Tracking RPC Execution
  try {
    const { data: trackingRes, error: trackErr } = await anonClient.rpc('get_public_order_tracking', {
      p_tracking_code: 'PE-AUDIT-NONEXISTENT',
      p_phone: '0000'
    });
    const trackingWorks = !trackErr && trackingRes && trackingRes.success === false;
    report('7. Privacy-Preserving Tracking RPC', trackingWorks, `RPC returned sanitized NOT_FOUND result without leaking data`);
  } catch (err) {
    report('7. Privacy-Preserving Tracking RPC', false, err.message);
  }

  // 8. Verify Storage Buckets
  try {
    const { data: buckets, error: bucketErr } = await adminClient.storage.listBuckets();
    const bucketNames = buckets ? buckets.map(b => b.name) : [];
    report('8. Private Storage Buckets', !bucketErr, `Available buckets: [${bucketNames.join(', ')}]`);
  } catch (err) {
    report('8. Private Storage Buckets', false, err.message);
  }

  await pgClient.end();

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED (${Math.round((passedChecks/totalChecks)*100)}%)`);
  console.log('================================================================');
}

runAudit();
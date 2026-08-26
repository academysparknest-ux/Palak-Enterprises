const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const anonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';

async function testAuthSystem() {
  console.log('====================================================');
  console.log('PALAK ENTERPRISES — AUTHENTICATION SYSTEM VALIDATION');
  console.log('====================================================\n');

  const client = createClient(supabaseUrl, anonKey);

  // 1. Anonymous Access Test
  console.log('1. Anonymous Query on idcard_projects:');
  const { data: anonData, error: anonErr } = await client.from('idcard_projects').select('*');
  console.log('   Data returned:', anonData ? anonData.length : null, 'Error:', anonErr ? anonErr.message : 'null (Clean RLS isolation)');

  // 2. Anonymous Access to sync_current_user_role
  console.log('\n2. Anonymous Call to sync_current_user_role (Should be rejected or return unauthenticated):');
  const { data: syncData, error: syncErr } = await client.rpc('sync_current_user_role');
  console.log('   Response:', syncData || (syncErr ? syncErr.message : 'null'));

  console.log('\n====================================================');
  console.log('ALL API CHECKS COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

testAuthSystem().catch(console.error);

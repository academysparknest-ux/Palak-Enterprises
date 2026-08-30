const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const supabaseKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnonRpc() {
  console.log('Calling verify_digital_id anonymously for student STU-0001...');
  const { data: stuData, error: stuErr } = await supabase.rpc('verify_digital_id', { p_identifier: '0001' });
  if (stuErr) console.error('Student RPC error:', stuErr);
  else console.log('Student RPC success:', stuData);

  console.log('\nCalling verify_digital_id anonymously for teacher T-001...');
  const { data: tchData, error: tchErr } = await supabase.rpc('verify_digital_id', { p_identifier: 'T-001' });
  if (tchErr) console.error('Teacher RPC error:', tchErr);
  else console.log('Teacher RPC success:', tchData);

  console.log('\nCalling verify_digital_id anonymously for invalid ID...');
  const { data: invData, error: invErr } = await supabase.rpc('verify_digital_id', { p_identifier: 'INVALID' });
  if (invErr) console.error('Invalid RPC error:', invErr);
  else console.log('Invalid RPC success:', invData);
}

testAnonRpc();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const anonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';

async function test() {
  const t0 = Date.now();
  console.log('Testing HTTPS REST API with ipv4first...');
  
  const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,order_code&limit=5`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  console.log(`HTTP Status in ${Date.now() - t0}ms:`, res.status, res.statusText);
  const data = await res.json();
  console.log('Fetched data sample:', data);
}

test().catch(console.error);

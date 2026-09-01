const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const anonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';

async function testRest() {
  console.log('Testing PostgREST API connectivity...');
  
  // 1. Fetch count of orders via REST API
  const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,order_code`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Prefer': 'count=exact'
    }
  });

  console.log('Status:', res.status, res.statusText);
  const contentRange = res.headers.get('content-range');
  console.log('Content-Range:', contentRange);
  const data = await res.json();
  console.log(`Fetched ${Array.isArray(data) ? data.length : JSON.stringify(data)} items`);

  // 2. Fetch invoices
  const invRes = await fetch(`${supabaseUrl}/rest/v1/invoices?select=id,invoice_number`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Prefer': 'count=exact'
    }
  });
  console.log('Invoices Content-Range:', invRes.headers.get('content-range'));
}

testRest().catch(console.error);

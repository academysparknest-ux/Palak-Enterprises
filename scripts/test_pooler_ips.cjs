const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const ips = ['54.255.219.82', '52.74.252.201', '52.77.146.31'];

async function testIps() {
  for (const ip of ips) {
    const client = new Client({
      host: ip,
      port: 6543,
      user: `postgres.${ref}`,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' },
      connectionTimeoutMillis: 5000
    });

    try {
      const t0 = Date.now();
      await client.connect();
      const res = await client.query('SELECT 1 as ok;');
      console.log(`[PASS] IP ${ip}:6543 -> OK in ${Date.now() - t0}ms`);
      await client.end();
    } catch (e) {
      console.log(`[FAIL] IP ${ip}:6543 -> ${e.message}`);
      try { await client.end(); } catch (err) {}
    }
  }
}

testIps().catch(console.error);

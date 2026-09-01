const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const candidateHosts = [
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { host: `aws-0-eu-central-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `aws-0-us-west-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' }
];

async function testAll() {
  for (const c of candidateHosts) {
    const client = new Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000
    });
    try {
      const t0 = Date.now();
      await client.connect();
      const res = await client.query('SELECT 1 as ok, current_database();');
      const dt = Date.now() - t0;
      console.log(`[PASS] ${c.host}:${c.port} (${c.user}) -> ${JSON.stringify(res.rows[0])} in ${dt}ms`);
      await client.end();
    } catch (e) {
      console.log(`[FAIL] ${c.host}:${c.port} -> ${e.message}`);
      try { await client.end(); } catch (err) {}
    }
  }
}

testAll().catch(console.error);

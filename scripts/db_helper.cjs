const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const hosts = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `aws-0-ap-south-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` }
];

async function getClient() {
  for (const cfg of hosts) {
    const client = new Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      return client;
    } catch (e) {
      try { await client.end(); } catch (err) {}
    }
  }
  throw new Error('All connection attempts failed.');
}

module.exports = { getClient };

const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const hosts = [
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
  { host: `aws-0-eu-central-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` }
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
      connectionTimeoutMillis: 8000,
      query_timeout: 10000
    });

    try {
      await client.connect();
      console.log(`Connected to ${cfg.host}:${cfg.port}`);
      return client;
    } catch (e) {
      console.log(`Failed ${cfg.host}: ${e.message}`);
      try { await client.end(); } catch (err) {}
    }
  }
  throw new Error('All connection attempts failed.');
}

module.exports = { getClient };

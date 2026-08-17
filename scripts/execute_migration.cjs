const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const hosts = [
  `db.${ref}.supabase.co`,
  `aws-0-ap-south-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`,
  `aws-0-ap-southeast-1.pooler.supabase.com`
];

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260817_security_and_expansion.sql'), 'utf-8');

  for (const host of hosts) {
    console.log(`Attempting connection to ${host}...`);
    const client = new Client({
      host: host,
      port: host.includes('pooler') ? 6543 : 5432,
      user: host.includes('pooler') ? `postgres.${ref}` : 'postgres',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000
    });

    try {
      await client.connect();
      console.log(`Connected successfully to PostgreSQL on ${host}!`);
      console.log('Executing migration 20260817_security_and_expansion.sql...');
      await client.query(sql);
      console.log('MIGRATION EXECUTED SUCCESSFULLY!');
      await client.end();
      return true;
    } catch (err) {
      console.log(`Connection to ${host} failed:`, err.message);
      try { await client.end(); } catch (e) {}
    }
  }

  console.error('All direct connection hosts failed.');
  return false;
}

run();
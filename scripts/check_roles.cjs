const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function checkRoles() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query('SELECT rolname, rolsuper, rolcanlogin, rolconnlimit FROM pg_roles WHERE rolcanlogin = true;');
  console.log('Login roles in database:', res.rows);
  await client.end();
}

checkRoles().catch(console.error);

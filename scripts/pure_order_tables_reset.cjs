const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function main() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected!');

  console.log('1. Deleting order_files...');
  const files = await client.query('DELETE FROM public.order_files WHERE id = (SELECT id FROM public.order_files LIMIT 1);');
  console.log('Test file delete 1 row:', files.rowCount);

  await client.end();
}

main().catch(console.error);

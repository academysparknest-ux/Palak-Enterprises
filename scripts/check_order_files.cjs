const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function checkOrderFiles() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to pooler!');

  const ofRes = await client.query(`
    SELECT id, order_id, file_name, file_path, file_size, page_count, octet_length(file_url) as url_len, (file_url IS NOT NULL AND file_url LIKE 'data:%') as is_base64
    FROM public.order_files;
  `);
  console.log(`\nFound ${ofRes.rows.length} order_files rows:`);
  for (const r of ofRes.rows) {
    console.log(`  ID: ${r.id} | OrderID: ${r.order_id} | Name: ${r.file_name} | Path: ${r.file_path} | Size: ${r.file_size} | URL len: ${r.url_len} (base64: ${r.is_base64})`);
  }

  await client.end();
}

checkOrderFiles().catch(console.error);

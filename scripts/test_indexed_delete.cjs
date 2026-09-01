const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function testIndexed() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected! Deleting with indexed scan...');

  const del1 = await client.query("DELETE FROM public.order_files WHERE id IS NOT NULL;");
  console.log('Order files deleted:', del1.rowCount);

  const del2 = await client.query("DELETE FROM public.order_items WHERE id IS NOT NULL;");
  console.log('Order items deleted:', del2.rowCount);

  const del3 = await client.query("DELETE FROM public.print_jobs WHERE id IS NOT NULL;");
  console.log('Print jobs deleted:', del3.rowCount);

  const del4 = await client.query("UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;");
  console.log('Invoices unlinked:', del4.rowCount);

  const del5 = await client.query("DELETE FROM public.orders WHERE id IS NOT NULL;");
  console.log('Orders deleted:', del5.rowCount);

  const del6 = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log('Order status history deleted:', del6.rowCount);

  const audit = await client.query(`
    SELECT 
      (SELECT count(*) FROM public.orders) as orders,
      (SELECT count(*) FROM public.order_items) as items,
      (SELECT count(*) FROM public.order_files) as files,
      (SELECT count(*) FROM public.print_jobs) as jobs,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as status,
      (SELECT count(*) FROM public.invoices) as invoices;
  `);
  console.log('Audit counts:', audit.rows[0]);

  await client.end();
}

testIndexed().catch(console.error);

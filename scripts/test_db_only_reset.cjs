const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function dbOnlyReset() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL!');

  console.log('1. Deleting order_files...');
  const files = await client.query('DELETE FROM public.order_files;');
  console.log(`[PASS] Deleted ${files.rowCount} order_files`);

  console.log('2. Deleting order_items...');
  const items = await client.query('DELETE FROM public.order_items;');
  console.log(`[PASS] Deleted ${items.rowCount} order_items`);

  console.log('3. Deleting print_jobs...');
  const jobs = await client.query('DELETE FROM public.print_jobs;');
  console.log(`[PASS] Deleted ${jobs.rowCount} print_jobs`);

  console.log('4. Safely unlinking invoices...');
  const invs = await client.query('UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;');
  console.log(`[PASS] Unlinked ${invs.rowCount} invoices`);

  console.log('5. Deleting orders...');
  const orders = await client.query('DELETE FROM public.orders;');
  console.log(`[PASS] Deleted ${orders.rowCount} orders`);

  console.log('6. Deleting order status history...');
  const status = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
  console.log(`[PASS] Deleted ${status.rowCount} status history records`);

  console.log('\n--- 7. AUDIT LIVE TABLE COUNTS ---');
  const auditRes = await client.query(`
    SELECT 
      (SELECT count(*) FROM public.orders) as orders_count,
      (SELECT count(*) FROM public.order_items) as items_count,
      (SELECT count(*) FROM public.order_files) as files_count,
      (SELECT count(*) FROM public.print_jobs) as jobs_count,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as order_status_count,
      (SELECT count(*) FROM public.invoices) as invoices_count,
      (SELECT count(*) FROM public.profiles) as profiles_count,
      (SELECT count(*) FROM public.user_roles) as user_roles_count,
      (SELECT count(*) FROM public.categories) as categories_count,
      (SELECT count(*) FROM public.products) as products_count,
      (SELECT count(*) FROM public.idcard_projects) as idcard_projects_count,
      (SELECT count(*) FROM public.idcard_templates) as idcard_templates_count,
      (SELECT count(*) FROM public.idcard_persons) as idcard_persons_count,
      (SELECT count(*) FROM public.idcard_audit_log) as idcard_audit_count,
      (SELECT count(*) FROM public.status_history WHERE entity_type = 'service_request') as service_status_count,
      (SELECT count(*) FROM public.audit_logs) as audit_logs_count;
  `);

  console.log(auditRes.rows[0]);

  await client.end();
}

dbOnlyReset().catch(console.error);

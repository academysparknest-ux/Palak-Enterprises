const { Client } = require('pg');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

const functionSql = `
CREATE OR REPLACE FUNCTION public.execute_production_order_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_del_files INT;
  v_del_items INT;
  v_del_jobs INT;
  v_unlinked_inv INT;
  v_del_orders INT;
  v_del_status INT;
  v_del_storage INT;
  v_result JSONB;
BEGIN
  -- 1. Unlink invoices (preserve all financial records)
  UPDATE public.invoices SET order_id = NULL WHERE order_id IS NOT NULL;
  GET DIAGNOSTICS v_unlinked_inv = ROW_COUNT;

  -- 2. Delete child records
  DELETE FROM public.order_files;
  GET DIAGNOSTICS v_del_files = ROW_COUNT;

  DELETE FROM public.order_items;
  GET DIAGNOSTICS v_del_items = ROW_COUNT;

  DELETE FROM public.print_jobs;
  GET DIAGNOSTICS v_del_jobs = ROW_COUNT;

  -- 3. Delete parent orders
  DELETE FROM public.orders;
  GET DIAGNOSTICS v_del_orders = ROW_COUNT;

  -- 4. Delete order status history
  DELETE FROM public.status_history WHERE entity_type = 'order';
  GET DIAGNOSTICS v_del_status = ROW_COUNT;

  -- 5. Delete storage objects
  DELETE FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');
  GET DIAGNOSTICS v_del_storage = ROW_COUNT;

  -- 6. Build audit summary
  SELECT jsonb_build_object(
    'unlinked_invoices', v_unlinked_inv,
    'deleted_order_files', v_del_files,
    'deleted_order_items', v_del_items,
    'deleted_print_jobs', v_del_jobs,
    'deleted_orders', v_del_orders,
    'deleted_status_history', v_del_status,
    'deleted_storage_objects', v_del_storage,
    'remaining_orders', (SELECT count(*) FROM public.orders),
    'remaining_order_items', (SELECT count(*) FROM public.order_items),
    'remaining_order_files', (SELECT count(*) FROM public.order_files),
    'remaining_print_jobs', (SELECT count(*) FROM public.print_jobs),
    'remaining_order_status', (SELECT count(*) FROM public.status_history WHERE entity_type = 'order'),
    'remaining_storage_docs', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents' AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%')),
    'preserved_invoices', (SELECT count(*) FROM public.invoices),
    'preserved_profiles', (SELECT count(*) FROM public.profiles),
    'preserved_idcard_photos', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'idcard-photos'),
    'preserved_categories', (SELECT count(*) FROM public.categories),
    'preserved_products', (SELECT count(*) FROM public.products),
    'preserved_idcard_projects', (SELECT count(*) FROM public.idcard_projects)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
`;

async function main() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${ref}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!');

  console.log('1. Creating server-side function execute_production_order_reset()...');
  await client.query(functionSql);
  console.log('[PASS] Function created successfully!');

  console.log('2. Executing public.execute_production_order_reset()...');
  const res = await client.query('SELECT public.execute_production_order_reset() as audit;');
  const audit = res.rows[0].audit;

  console.log('\n================================================================');
  console.log('ORDER RESET AUDIT RESULT');
  console.log('================================================================');
  console.log(JSON.stringify(audit, null, 2));

  // Drop temporary helper function after successful execution
  console.log('\n3. Cleaning up helper function...');
  await client.query('DROP FUNCTION IF EXISTS public.execute_production_order_reset();');
  console.log('[PASS] Helper function dropped.');

  await client.end();
}

main().catch(console.error);

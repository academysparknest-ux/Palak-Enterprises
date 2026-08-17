const { Client } = require('pg');

const client = new Client({
  host: 'db.zofddiuswdtbqvqycezy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'R9i8s7h6@5v4',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies WHERE tablename = 'orders';
  `);
  console.log('Orders policies:', JSON.stringify(res.rows, null, 2));

  // Drop old conflicting policy names from initial schema
  await client.query(`
    DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
    DROP POLICY IF EXISTS "Anyone can insert service request" ON public.service_requests;
    DROP POLICY IF EXISTS "Anyone can insert quote request" ON public.quote_requests;
    DROP POLICY IF EXISTS "Anyone can insert status log" ON public.status_history;
    DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;
    DROP POLICY IF EXISTS "Allow public read access on service_requests" ON public.service_requests;
    DROP POLICY IF EXISTS "Allow public read access on quote_requests" ON public.quote_requests;
    DROP POLICY IF EXISTS "Allow public read access on status_history" ON public.status_history;

    DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
    CREATE POLICY "orders_public_insert" ON public.orders
      FOR INSERT TO public
      WITH CHECK (true);

    DROP POLICY IF EXISTS "service_requests_public_insert" ON public.service_requests;
    CREATE POLICY "service_requests_public_insert" ON public.service_requests
      FOR INSERT TO public
      WITH CHECK (true);

    DROP POLICY IF EXISTS "quote_requests_public_insert" ON public.quote_requests;
    CREATE POLICY "quote_requests_public_insert" ON public.quote_requests
      FOR INSERT TO public
      WITH CHECK (true);

    DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;
    CREATE POLICY "order_items_public_insert" ON public.order_items
      FOR INSERT TO public
      WITH CHECK (true);
  `);
  console.log('Insert policies updated successfully.');

  await client.end();
}

check();
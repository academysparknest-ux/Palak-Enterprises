const { Client } = require('pg');

const client = new Client({
  host: 'db.zofddiuswdtbqvqycezy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'R9i8s7h6@5v4',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function applyRealtimeConfig() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    // 1. Ensure REPLICA IDENTITY FULL on all realtime tables
    await client.query(`
      ALTER TABLE public.orders REPLICA IDENTITY FULL;
      ALTER TABLE public.order_items REPLICA IDENTITY FULL;
      ALTER TABLE public.service_requests REPLICA IDENTITY FULL;
      ALTER TABLE public.quote_requests REPLICA IDENTITY FULL;
      ALTER TABLE public.design_requests REPLICA IDENTITY FULL;
      ALTER TABLE public.notifications REPLICA IDENTITY FULL;
      ALTER TABLE public.status_history REPLICA IDENTITY FULL;
    `);
    console.log('✓ Set REPLICA IDENTITY FULL on all tables.');

    // 2. Add tables to supabase_realtime publication
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          -- Orders
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
          END IF;
          -- Order Items
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
          END IF;
          -- Service Requests
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'service_requests') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
          END IF;
          -- Quote Requests
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quote_requests') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;
          END IF;
          -- Design Requests
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'design_requests') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.design_requests;
          END IF;
          -- Notifications
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
          END IF;
          -- Status History
          IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'status_history') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.status_history;
          END IF;
        END IF;
      END $$;
    `);
    console.log('✓ Added tables to supabase_realtime publication.');

    // 3. Set RLS policies on orders to ensure staff & anonymous order insert/select works properly
    await client.query(`
      DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
      DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
      DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
      DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;

      CREATE POLICY "orders_select_policy" ON public.orders
        FOR SELECT TO public
        USING (
          public.is_staff() = true
          OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
          OR user_id IS NULL
        );

      DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
      DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
      DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;

      CREATE POLICY "orders_public_insert" ON public.orders
        FOR INSERT TO public
        WITH CHECK (true);

      DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
      DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
      CREATE POLICY "order_items_select_policy" ON public.order_items
        FOR SELECT TO public
        USING (true);

      DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;
      CREATE POLICY "order_items_public_insert" ON public.order_items
        FOR INSERT TO public
        WITH CHECK (true);
    `);
    console.log('✓ Updated RLS policies for orders and order_items.');

    // 4. Verify publication tables now
    const pubRes = await client.query(`
      SELECT pubname, schemaname, tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime';
    `);
    console.log('\n--- Verified Tables in supabase_realtime ---');
    console.table(pubRes.rows);

    await client.end();
  } catch (err) {
    console.error('Error applying realtime config:', err);
    process.exit(1);
  }
}

applyRealtimeConfig();

const { getClient } = require('./db_helper.cjs');

async function main() {
  const client = await getClient();
  console.log('Connected to database!');

  try {
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('business-assets', 'business-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log('Bucket business-assets configured successfully!');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read business-assets'
        ) THEN
          CREATE POLICY "Public read business-assets"
          ON storage.objects FOR SELECT
          TO public
          USING (bucket_id = 'business-assets');
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow upload business-assets'
        ) THEN
          CREATE POLICY "Allow upload business-assets"
          ON storage.objects FOR INSERT
          TO public
          WITH CHECK (bucket_id = 'business-assets');
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow update business-assets'
        ) THEN
          CREATE POLICY "Allow update business-assets"
          ON storage.objects FOR UPDATE
          TO public
          USING (bucket_id = 'business-assets')
          WITH CHECK (bucket_id = 'business-assets');
        END IF;
      END $$;
    `);

    console.log('Storage policies verified!');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

const { getClient } = require('./db_helper.cjs');

async function runProductionCleanup() {
  console.log('====================================================');
  console.log('🚀 STARTING PRODUCTION HANDOVER CLEANUP');
  console.log('====================================================\n');

  const client = await getClient();

  try {
    await client.query('SET statement_timeout = 60000;');

    // 1. Audit pre-cleanup counts
    console.log('--- Step 1: Pre-cleanup Database State ---');
    const preRes = await client.query(`
      SELECT 
        (SELECT count(*) FROM public.orders) as orders,
        (SELECT count(*) FROM public.order_items) as order_items,
        (SELECT count(*) FROM public.order_files) as order_files,
        (SELECT count(*) FROM public.print_jobs) as print_jobs,
        (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as order_status_history,
        (SELECT count(*) FROM public.invoices) as invoices,
        (SELECT count(*) FROM public.invoice_audit_logs) as invoice_audit_logs,
        (SELECT count(*) FROM public.idcard_projects) as idcard_projects,
        (SELECT count(*) FROM public.idcard_persons) as idcard_persons,
        (SELECT count(*) FROM public.idcard_generations) as idcard_generations,
        (SELECT count(*) FROM public.idcard_templates) as idcard_templates,
        (SELECT count(*) FROM public.idcard_audit_log) as idcard_audit_logs,
        (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents') as customer_docs,
        (SELECT count(*) FROM storage.objects WHERE bucket_id = 'idcard-photos') as idcard_photos,
        (SELECT count(*) FROM storage.objects WHERE bucket_id = 'business-assets') as business_assets,
        (SELECT count(*) FROM auth.users) as auth_users,
        (SELECT count(*) FROM public.profiles) as profiles;
    `);
    console.table(preRes.rows[0]);

    // Verify owner account exists
    const ownerRes = await client.query(`
      SELECT id, email FROM auth.users WHERE lower(email) = 'computerworldchakia@gmail.com';
    `);
    if (ownerRes.rows.length === 0) {
      throw new Error('CRITICAL SAFETY CHECK FAILED: Admin account computerworldchakia@gmail.com not found!');
    }
    const ownerId = ownerRes.rows[0].id;
    console.log(`Verified Owner Account ID: ${ownerId} (${ownerRes.rows[0].email})\n`);

    await client.query('BEGIN;');

    // 2. Clean Test Invoices FIRST (so invoices.order_id foreign key constraint does not lock or block orders)
    console.log('--- Step 2: Cleaning Test Invoices ---');
    const delInvAudit = await client.query('DELETE FROM public.invoice_audit_logs;');
    console.log(`Deleted invoice_audit_logs: ${delInvAudit.rowCount}`);

    const delInvoices = await client.query('DELETE FROM public.invoices;');
    console.log(`Deleted invoices: ${delInvoices.rowCount}`);

    // Reset invoice sequential counter
    await client.query(`
      UPDATE public.invoice_counters 
      SET last_number = 0, updated_at = NOW() 
      WHERE year = 2026;
    `);
    console.log('Reset invoice_counters for year 2026 to 0.');

    // 3. Clean Test Orders and dependencies
    console.log('\n--- Step 3: Cleaning Test Orders and Queue ---');
    const delPrintJobs = await client.query('DELETE FROM public.print_jobs;');
    console.log(`Deleted print_jobs: ${delPrintJobs.rowCount}`);

    const delOrderFiles = await client.query('DELETE FROM public.order_files;');
    console.log(`Deleted order_files: ${delOrderFiles.rowCount}`);

    const delOrderItems = await client.query('DELETE FROM public.order_items;');
    console.log(`Deleted order_items: ${delOrderItems.rowCount}`);

    const delStatusHistory = await client.query("DELETE FROM public.status_history WHERE entity_type = 'order';");
    console.log(`Deleted order status_history: ${delStatusHistory.rowCount}`);

    const delOrders = await client.query('DELETE FROM public.orders;');
    console.log(`Deleted orders: ${delOrders.rowCount}`);

    // 4. Clean Service Requests and Quotes (if any)
    console.log('\n--- Step 4: Cleaning Service Requests & Quotes ---');
    const delSR = await client.query('DELETE FROM public.service_requests;');
    console.log(`Deleted service_requests: ${delSR.rowCount}`);

    const delQR = await client.query('DELETE FROM public.quote_requests;');
    console.log(`Deleted quote_requests: ${delQR.rowCount}`);

    const delDR = await client.query('DELETE FROM public.design_requests;');
    console.log(`Deleted design_requests: ${delDR.rowCount}`);

    // 5. Clean ID Card Studio Test Data
    console.log('\n--- Step 5: Cleaning ID Card Studio Test Data ---');
    const delIdAudit = await client.query('DELETE FROM public.idcard_audit_log;');
    console.log(`Deleted idcard_audit_log: ${delIdAudit.rowCount}`);

    const delIdHistory = await client.query('DELETE FROM public.idcard_print_history;');
    console.log(`Deleted idcard_print_history: ${delIdHistory.rowCount}`);

    const delIdLocks = await client.query('DELETE FROM public.idcard_print_locks;');
    console.log(`Deleted idcard_print_locks: ${delIdLocks.rowCount}`);

    const delIdSessions = await client.query('DELETE FROM public.idcard_print_sessions;');
    console.log(`Deleted idcard_print_sessions: ${delIdSessions.rowCount}`);

    const delIdGen = await client.query('DELETE FROM public.idcard_generations;');
    console.log(`Deleted idcard_generations: ${delIdGen.rowCount}`);

    const delIdPersons = await client.query('DELETE FROM public.idcard_persons;');
    console.log(`Deleted idcard_persons: ${delIdPersons.rowCount}`);

    // Remove foreign key references in projects to templates before deleting templates
    await client.query('UPDATE public.idcard_projects SET template_id = NULL;');
    const delIdTemplates = await client.query('DELETE FROM public.idcard_templates;');
    console.log(`Deleted idcard_templates: ${delIdTemplates.rowCount}`);

    const delIdProjects = await client.query('DELETE FROM public.idcard_projects;');
    console.log(`Deleted idcard_projects: ${delIdProjects.rowCount}`);

    // 6. Clean Storage Objects (customer-documents, idcard-photos)
    console.log('\n--- Step 6: Cleaning Test Storage Files ---');
    await client.query("SET LOCAL storage.allow_delete_query = 'true';");
    const delCustDocs = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'customer-documents';");
    console.log(`Deleted storage customer-documents objects: ${delCustDocs.rowCount}`);

    const delIdPhotos = await client.query("DELETE FROM storage.objects WHERE bucket_id = 'idcard-photos';");
    console.log(`Deleted storage idcard-photos objects: ${delIdPhotos.rowCount}`);

    // Safety check: verify business-assets bucket has NOT been touched
    const busAssetsCheck = await client.query("SELECT count(*) FROM storage.objects WHERE bucket_id = 'business-assets';");
    console.log(`Verified business-assets objects intact: ${busAssetsCheck.rows[0].count}`);

    // 7. Clean Developer Accounts
    console.log('\n--- Step 7: Cleaning Developer User Accounts ---');
    const devEmails = [
      'academysparknest@gmail.com',
      'rishavraj05072002@gmail.com',
      'rishavrajchaman@gmail.com',
      'rishavrajrj572@gmail.com'
    ];

    const delDevUsers = await client.query(`
      DELETE FROM auth.users 
      WHERE lower(email) = ANY($1::text[])
      RETURNING id, email;
    `, [devEmails]);
    console.log(`Deleted developer auth.users: ${delDevUsers.rowCount}`, delDevUsers.rows.map(r => r.email));

    // Ensure owner has ADMIN role in user_roles and profiles
    await client.query(`
      INSERT INTO public.user_roles (user_id, role)
      VALUES ($1, 'ADMIN')
      ON CONFLICT (user_id, role) DO NOTHING;
    `, [ownerId]);

    await client.query(`
      UPDATE public.profiles 
      SET full_name = 'Kumar Pankaj', phone = '9905238015', updated_at = NOW()
      WHERE id = $1;
    `, [ownerId]);
    console.log(`Ensured owner account ${ownerRes.rows[0].email} is configured with ADMIN role.`);

    // 8. Ensure all Quick Services are active
    console.log('\n--- Step 8: Ensuring Production Quick Services Active ---');
    const qsUpdate = await client.query(`
      UPDATE public.quick_services 
      SET is_active = true, updated_at = NOW(), updated_by = 'Kumar Pankaj' 
      WHERE is_active = false;
    `);
    console.log(`Re-activated inactive quick services (if any): ${qsUpdate.rowCount}`);

    await client.query('COMMIT;');
    console.log('\n✅ Database transaction successfully COMMITTED!');

    // 9. Post-cleanup Audit
    console.log('\n--- Step 9: Post-cleanup Database State ---');
    const postRes = await client.query(`
      SELECT 
        (SELECT count(*) FROM public.orders) as orders,
        (SELECT count(*) FROM public.order_items) as order_items,
        (SELECT count(*) FROM public.order_files) as order_files,
        (SELECT count(*) FROM public.print_jobs) as print_jobs,
        (SELECT count(*) FROM public.status_history WHERE entity_type = 'order') as order_status_history,
        (SELECT count(*) FROM public.invoices) as invoices,
        (SELECT last_number FROM public.invoice_counters WHERE year = 2026) as invoice_counter_last_num,
        (SELECT count(*) FROM public.idcard_projects) as idcard_projects,
        (SELECT count(*) FROM public.idcard_persons) as idcard_persons,
        (SELECT count(*) FROM storage.objects WHERE bucket_id = 'customer-documents') as customer_docs,
        (SELECT count(*) FROM storage.objects WHERE bucket_id = 'idcard-photos') as idcard_photos,
        (SELECT count(*) FROM storage.objects WHERE bucket_id = 'business-assets') as business_assets,
        (SELECT count(*) FROM auth.users) as auth_users,
        (SELECT count(*) FROM public.profiles) as profiles,
        (SELECT count(*) FROM public.quick_services WHERE is_active = true) as active_quick_services,
        (SELECT count(*) FROM public.products WHERE is_active = true) as active_products,
        (SELECT count(*) FROM public.categories WHERE is_active = true) as active_categories;
    `);
    console.table(postRes.rows[0]);

    // Active Users and Roles
    const remainingUsers = await client.query(`
      SELECT u.id, u.email, p.full_name, p.phone, ur.role
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      LEFT JOIN public.user_roles ur ON ur.user_id = u.id;
    `);
    console.log('\nRemaining Production Users & Roles:');
    console.table(remainingUsers.rows);

    // Business Assets Verification
    const sigFiles = await client.query(`
      SELECT name, metadata->>'size' as size_bytes, created_at 
      FROM storage.objects 
      WHERE bucket_id = 'business-assets';
    `);
    console.log('\nPreserved Business Assets:');
    console.table(sigFiles.rows);

    console.log('\n====================================================');
    console.log('🎉 PRODUCTION HANDOVER CLEANUP COMPLETE & VERIFIED!');
    console.log('====================================================\n');

  } catch (err) {
    try { await client.query('ROLLBACK;'); } catch (e) {}
    console.error('\n❌ ERROR DURING CLEANUP (ROLLED BACK):', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runProductionCleanup();

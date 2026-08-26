const { Client } = require('pg');

async function getPgClient() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zofddiuswdtbqvqycezy',
    password: 'R9i8s7h6@5v4',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  await client.connect();
  console.log('Connected to PostgreSQL on aws-0-ap-southeast-1.pooler.supabase.com!');
  return client;
}

async function runScenarioTest() {
  const client = await getPgClient();
  try {
    // 1. Create test project "ABC School"
    const projRes = await client.query(`
      INSERT INTO public.idcard_projects (name, description, project_type)
      VALUES ('ABC School Test', 'ABC Educational Trust', 'school')
      RETURNING id, name;
    `);
    const projectId = projRes.rows[0].id;
    console.log(`[PASS] Project created: ${projRes.rows[0].name} (${projectId})`);

    // 2. Create Groups: Students, Teachers, Principal
    const grpStudent = await client.query(`INSERT INTO public.idcard_groups (project_id, name, description) VALUES ($1, 'Students', 'All School Students') RETURNING id`, [projectId]);
    const grpTeacher = await client.query(`INSERT INTO public.idcard_groups (project_id, name, description) VALUES ($1, 'Teachers', 'Faculty and Teaching Staff') RETURNING id`, [projectId]);
    const grpPrincipal = await client.query(`INSERT INTO public.idcard_groups (project_id, name, description) VALUES ($1, 'Principal', 'Executive Office') RETURNING id`, [projectId]);
    console.log(`[PASS] Groups created: Students (${grpStudent.rows[0].id}), Teachers (${grpTeacher.rows[0].id}), Principal (${grpPrincipal.rows[0].id})`);

    // 3. Create Student Design: CR80 Landscape Single Side
    const stuFrontConfig = {
      background: { type: 'solid', color: '#ffffff' },
      elements: [
        { id: 'name', type: 'dynamic_text', text: '{{name}}', x: 28, y: 15, width: 50, height: 6, fontSize: 12, fontWeight: 'bold' },
        { id: 'photo', type: 'photo_frame', x: 4, y: 10, width: 20, height: 26 },
        { id: 'qr', type: 'qr_code', x: 65, y: 30, width: 14, height: 14 }
      ]
    };
    const stuDesign = await client.query(`
      INSERT INTO public.idcard_designs (project_id, name, category, is_double_sided, card_width_mm, card_height_mm, front_config, back_config)
      VALUES ($1, 'Student Standard Landscape', 'student', false, 85.60, 53.98, $2, '{}'::jsonb)
      RETURNING id, name;
    `, [projectId, JSON.stringify(stuFrontConfig)]);
    const stuDesignId = stuDesign.rows[0].id;

    // Create Design Version 1
    const v1Res = await client.query(`
      INSERT INTO public.idcard_design_versions (design_id, version_number, front_config, back_config, is_double_sided, card_width_mm, card_height_mm, change_notes)
      VALUES ($1, 1, $2, '{}'::jsonb, false, 85.60, 53.98, 'Initial v1 design')
      RETURNING id, version_number;
    `, [stuDesignId, JSON.stringify(stuFrontConfig)]);
    const version1Id = v1Res.rows[0].id;
    console.log(`[PASS] Student Design v1 saved with ID: ${stuDesignId}, Version ID: ${version1Id}`);

    // Assign to Students Group
    await client.query(`
      INSERT INTO public.idcard_design_assignments (project_id, group_id, design_id)
      VALUES ($1, $2, $3);
    `, [projectId, grpStudent.rows[0].id, stuDesignId]);
    console.log(`[PASS] Student Design assigned to Students Group`);

    // 4. Create Teacher Design: CR80 Landscape Double Side
    const teaFrontConfig = {
      background: { type: 'solid', color: '#1e3a8a' },
      elements: [{ id: 't_name', type: 'dynamic_text', text: '{{name}}', x: 30, y: 15, width: 50, height: 6, color: '#ffffff' }]
    };
    const teaBackConfig = {
      background: { type: 'solid', color: '#f8fafc' },
      elements: [{ id: 't_terms', type: 'text', text: 'Teacher ID Terms & Conditions', x: 10, y: 10, width: 65, height: 5 }]
    };
    const teaDesign = await client.query(`
      INSERT INTO public.idcard_designs (project_id, name, category, is_double_sided, card_width_mm, card_height_mm, front_config, back_config)
      VALUES ($1, 'Teacher Professional Double-Sided', 'teacher', true, 85.60, 53.98, $2, $3)
      RETURNING id, name;
    `, [projectId, JSON.stringify(teaFrontConfig), JSON.stringify(teaBackConfig)]);
    console.log(`[PASS] Teacher Design (Double-Sided) created with ID: ${teaDesign.rows[0].id}`);

    // 5. Create Principal Design: CR80 Portrait
    const prnFrontConfig = {
      background: { type: 'solid', color: '#0f172a' },
      elements: [{ id: 'p_name', type: 'dynamic_text', text: '{{name}}', x: 5, y: 50, width: 44, height: 6, color: '#fbbf24' }]
    };
    const prnDesign = await client.query(`
      INSERT INTO public.idcard_designs (project_id, name, category, is_double_sided, card_width_mm, card_height_mm, front_config, back_config)
      VALUES ($1, 'Principal Executive Portrait', 'principal', false, 53.98, 85.60, $2, '{}'::jsonb)
      RETURNING id, name;
    `, [projectId, JSON.stringify(prnFrontConfig)]);
    console.log(`[PASS] Principal Design (CR80 Portrait 53.98x85.60mm) created with ID: ${prnDesign.rows[0].id}`);

    // 6. Create a Person and generate card with v1
    const personRes = await client.query(`
      INSERT INTO public.idcard_persons (project_id, group_id, person_code, display_name)
      VALUES ($1, $2, 'ABC-STU-001', 'Rahul Kumar')
      RETURNING id, display_name;
    `, [projectId, grpStudent.rows[0].id]);
    const personId = personRes.rows[0].id;

    const cardRes = await client.query(`
      INSERT INTO public.idcard_generated_cards (project_id, person_id, design_version_id, card_number, qr_token, qr_verification_url, data_snapshot, status)
      VALUES ($1, $2, $3, 'CARD-001', 'token_' || floor(random()*100000), 'https://palak.com/verify', '{"displayName": "Rahul Kumar", "personCode": "ABC-STU-001"}'::jsonb, 'generated')
      RETURNING id, design_version_id;
    `, [projectId, personId, version1Id]);
    const cardId = cardRes.rows[0].id;
    console.log(`[PASS] Card generated for person with v1: Card ID ${cardId}`);

    // 7. Modify Student Design -> Save v2
    const stuFrontConfigV2 = {
      background: { type: 'solid', color: '#f0f9ff' },
      elements: [
        { id: 'name', type: 'dynamic_text', text: '{{name}}', x: 28, y: 14, width: 50, height: 7, fontSize: 14, fontWeight: 'bold' },
        { id: 'photo', type: 'photo_frame', x: 4, y: 8, width: 22, height: 28 },
        { id: 'qr', type: 'qr_code', x: 65, y: 28, width: 16, height: 16 }
      ]
    };

    const v2Res = await client.query(`
      INSERT INTO public.idcard_design_versions (design_id, version_number, front_config, back_config, is_double_sided, card_width_mm, card_height_mm, change_notes)
      VALUES ($1, 2, $2, '{}'::jsonb, false, 85.60, 53.98, 'Updated background, font size, photo size, QR size')
      RETURNING id, version_number;
    `, [stuDesignId, JSON.stringify(stuFrontConfigV2)]);
    const version2Id = v2Res.rows[0].id;

    await client.query(`
      UPDATE public.idcard_designs
      SET front_config = $1
      WHERE id = $2;
    `, [JSON.stringify(stuFrontConfigV2), stuDesignId]);
    console.log(`[PASS] Student Design updated to v2 with Version ID: ${version2Id}`);

    // 8. Verify generated card remains bound to v1 immutably
    const checkCard = await client.query(`
      SELECT c.id, v.version_number, c.design_version_id, v.front_config
      FROM public.idcard_generated_cards c
      JOIN public.idcard_design_versions v ON c.design_version_id = v.id
      WHERE c.id = $1;
    `, [cardId]);

    const cardRow = checkCard.rows[0];
    if (cardRow.design_version_id === version1Id && Number(cardRow.version_number) === 1) {
      console.log(`[PASS] Immutable Versioning: Card ${cardId} is strictly tied to v1 (Color: ${cardRow.front_config.background.color}) and completely unaffected by v2 updates.`);
    } else {
      throw new Error(`Versioning test failed: card was modified or not bound to v1`);
    }

    console.log('\n======================================================');
    console.log('ALL REAL TEST SCENARIOS EXECUTED & PASSED SUCCESSFULLY');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Scenario test error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runScenarioTest();

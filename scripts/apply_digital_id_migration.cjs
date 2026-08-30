const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ref = 'zofddiuswdtbqvqycezy';
const password = 'R9i8s7h6@5v4';

async function applyMigration() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260830_online_digital_id_system.sql'), 'utf-8');

  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected! Applying migration 20260830_online_digital_id_system.sql...');
  await client.query(sql);
  console.log('MIGRATION APPLIED SUCCESSFULLY!');

  // Insert sample teacher profile if not present so we can test both students and teachers
  const checkTeacher = await client.query("SELECT * FROM idcard_persons WHERE person_type = 'teacher' LIMIT 1;");
  if (checkTeacher.rows.length === 0) {
    console.log('Creating sample teacher record for verification test...');
    const projectRes = await client.query("SELECT id FROM idcard_projects LIMIT 1;");
    if (projectRes.rows.length > 0) {
      const pId = projectRes.rows[0].id;
      await client.query(`
        INSERT INTO public.idcard_persons (
          project_id, student_id, employee_id, person_type, name, designation, department,
          email, phone, emergency_number, blood_group, address, joining_date, status
        ) VALUES (
          $1, 'T-001', 'T-001', 'teacher', 'Rahul Kumar', 'Computer Science Teacher', 'Computer Science',
          'rahul.kumar@roshani.edu.in', '9876543210', '9876500025', 'B+', 'Civil Lines, Motihari, Bihar-845401', '2022-07-15', 'active'
        ) ON CONFLICT DO NOTHING;
      `, [pId]);
      console.log('Sample teacher record created!');
    }
  }

  // Test the RPC function directly
  console.log('\n--- Testing RPC verify_digital_id with student 0001 ---');
  const stuTest = await client.query("SELECT public.verify_digital_id('0001') as result;");
  console.log('Student test result:', JSON.stringify(stuTest.rows[0].result, null, 2));

  console.log('\n--- Testing RPC verify_digital_id with teacher T-001 ---');
  const tchTest = await client.query("SELECT public.verify_digital_id('T-001') as result;");
  console.log('Teacher test result:', JSON.stringify(tchTest.rows[0].result, null, 2));

  console.log('\n--- Testing RPC verify_digital_id with invalid ID ---');
  const invTest = await client.query("SELECT public.verify_digital_id('INVALID-999') as result;");
  console.log('Invalid test result:', JSON.stringify(invTest.rows[0].result, null, 2));

  await client.end();
}

applyMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const supabaseKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAcceptanceTests() {
  console.log('=====================================================');
  console.log('ONLINE DIGITAL ID CARD & QR VERIFICATION ACCEPTANCE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      if (details) console.log(`   ${details}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (details) console.error(`   ${details}`);
      failed++;
    }
  }

  // 1. STUDENT VERIFICATION TEST
  console.log('--- TEST 1: Student Record Dynamic Lookup ---');
  const { data: stuData, error: stuErr } = await supabase.rpc('verify_digital_id', { p_identifier: '0001' });
  assert(!stuErr, 'Student query executed without RPC error', stuErr ? JSON.stringify(stuErr) : '');
  assert(stuData && stuData.status === 'active', 'Student status is ACTIVE');
  assert(stuData && stuData.personType === 'student', 'Person type correctly resolved as STUDENT');
  assert(stuData && stuData.name === 'Riya Singh', `Student name is '${stuData?.name}' (Expected 'Riya Singh')`);
  assert(stuData && stuData.photoUrl && stuData.photoUrl.startsWith('https://'), 'Photo URL dynamically resolved from Supabase Storage');
  assert(stuData && stuData.fields && stuData.fields.phone && stuData.fields.phone.startsWith('******'), `Phone masked for privacy: ${stuData?.fields?.phone}`);
  assert(stuData && stuData.fields && stuData.fields.class === '4', `Class is populated: ${stuData?.fields?.class}`);
  assert(stuData && stuData.fields && !Object.values(stuData.fields).some(v => v === '' || v === null), 'No empty field labels or blank values present');

  // 2. TEACHER VERIFICATION TEST
  console.log('\n--- TEST 2: Teacher Record Dynamic Lookup ---');
  const { data: tchData, error: tchErr } = await supabase.rpc('verify_digital_id', { p_identifier: 'T-001' });
  assert(!tchErr, 'Teacher query executed without RPC error', tchErr ? JSON.stringify(tchErr) : '');
  assert(tchData && tchData.status === 'active', 'Teacher status is ACTIVE');
  assert(tchData && tchData.personType === 'teacher', 'Person type correctly resolved as TEACHER');
  assert(tchData && tchData.name === 'Rahul Kumar', `Teacher name is '${tchData?.name}' (Expected 'Rahul Kumar')`);
  assert(tchData && tchData.fields && tchData.fields.designation === 'Computer Science Teacher', `Designation populated: ${tchData?.fields?.designation}`);
  assert(tchData && tchData.fields && tchData.fields.department === 'Computer Science', `Department populated: ${tchData?.fields?.department}`);
  assert(tchData && tchData.fields && tchData.fields.email === 'rahul.kumar@roshani.edu.in', `Email populated: ${tchData?.fields?.email}`);

  // 3. INVALID ID TEST
  console.log('\n--- TEST 3: Invalid / Unknown ID Handling ---');
  const { data: invData, error: invErr } = await supabase.rpc('verify_digital_id', { p_identifier: 'NON-EXISTENT-ID-9999' });
  assert(!invErr, 'Invalid ID handled gracefully without crashing RPC');
  assert(invData && invData.status === 'invalid', 'Invalid record returns status: invalid');
  assert(invData && invData.error === 'RECORD_NOT_FOUND', 'Returns clean error code RECORD_NOT_FOUND without database leak');

  // 4. SECURITY & CREDENTIAL ISOLATION TEST
  console.log('\n--- TEST 4: Anonymous Security Isolation ---');
  assert(!JSON.stringify(stuData).includes('service_role'), 'Zero service_role key leakage in payload');
  assert(!JSON.stringify(stuData).includes('password'), 'Zero password or hash leakage in payload');
  assert(!JSON.stringify(stuData).includes('created_by'), 'Zero internal admin/user ID leakage in payload');

  console.log('\n=====================================================');
  console.log(`ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runAcceptanceTests().catch(e => {
  console.error('Acceptance test execution failed:', e);
  process.exit(1);
});

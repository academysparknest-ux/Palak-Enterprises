/**
 * Master Test Suite Runner
 *
 * Runs all ID card test suites:
 * 1. frontBackRendering.test.ts
 * 2. imageTemplateCoordinates.test.ts
 * 3. photoUploadValidation.test.ts
 * 4. printLayoutEngine.test.ts
 * 5. savedTemplatePreview.test.ts
 * 6. templateFirstDataFlow.test.ts
 * 7. templatePresets.test.ts
 *
 * Run: npx tsx src/lib/idcard/runAllTests.ts
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const testFiles = [
  'src/lib/idcard/frontBackRendering.test.ts',
  'src/lib/idcard/imageTemplateCoordinates.test.ts',
  'src/lib/idcard/photoUploadValidation.test.ts',
  'src/lib/idcard/printLayoutEngine.test.ts',
  'src/lib/idcard/savedTemplatePreview.test.ts',
  'src/lib/idcard/templateFirstDataFlow.test.ts',
  'src/lib/idcard/templatePresets.test.ts',
  'src/lib/idcard/logoUpload.test.ts',
  'src/lib/idcard/masterDataArchitecture.test.ts',
  'src/lib/idcard/idCardStatusEngine.test.ts',
  'src/lib/idcard/studentSort.test.ts',
  'src/lib/idcard/productionTable.test.ts',
  'src/lib/idcard/spreadsheetTableEngine.test.ts',
  'src/lib/idcard/printSessionHardening.test.ts',
  'src/lib/idcard/productionReadiness.test.ts',
  'src/lib/idcard/studioDesigner.test.ts',
  'src/lib/idcard/landscapeTemplateWorkflow.test.ts',
];


console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║       PALAK PRINTING PRESS - COMPLETE TEST SUITE RUNNER       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let totalPassedSuites = 0;
let totalFailedSuites = 0;

for (const testFile of testFiles) {
  const fileName = path.basename(testFile);
  console.log(`▶ Running: ${fileName}...`);
  
  const result = spawnSync(`npx --yes tsx "${testFile}"`, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  if (result.status === 0) {
    totalPassedSuites++;
  } else {
    totalFailedSuites++;
    console.error(`\n❌ Test suite failed: ${fileName}\n`);
  }
}

console.log('\n' + '═'.repeat(65));
console.log(`  OVERALL TEST SUMMARY:`);
console.log(`  ✅ Passed Suites: ${totalPassedSuites} / ${testFiles.length}`);
if (totalFailedSuites > 0) {
  console.log(`  ❌ Failed Suites: ${totalFailedSuites} / ${testFiles.length}`);
} else {
  console.log(`  🎉 ALL TEST SUITES PASSED ACCURATELY!`);
}
console.log('═'.repeat(65) + '\n');

if (totalFailedSuites > 0) {
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'supabase', 'migrations', '20260824_idcard_management_system.sql'),
  path.join(__dirname, '..', 'supabase', 'migrations', '20260824_idcard_public_verification_and_promotion.sql')
];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Match: CREATE POLICY "policy name" ON public.table_name or storage.objects
  content = content.replace(/CREATE POLICY\s+("([^"]+)"|(\w+))\s+ON\s+(public|storage)\.(\w+)/g, (match, polExpr, quotedName, bareName, schemaName, tblName) => {
    const pName = quotedName ? `"${quotedName}"` : `"${bareName || polExpr}"`;
    return `DROP POLICY IF EXISTS ${pName} ON ${schemaName}.${tblName};\n${match}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated policies in ${filePath}`);
}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const supabaseKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadFile(bucket, filePath, remoteName) {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(remoteName, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '31536000'
    });

  if (error) {
    console.error('Upload failed for', remoteName, ':', error.message);
    throw error;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(remoteName);
  console.log('Successfully uploaded:', remoteName);
  console.log('Public URL:', urlData.publicUrl);
  return urlData.publicUrl;
}

async function main() {
  const baseDir = path.join(__dirname, '..', 'public', 'signatures');
  const sigTransparent = path.join(baseDir, 'owner_signature.png');
  const sigOriginal = path.join(baseDir, 'owner_signature_original.png');

  console.log('Uploading to Supabase Storage (business-assets bucket)...');
  const url1 = await uploadFile('business-assets', sigTransparent, 'signatures/owner_signature.png');
  const url2 = await uploadFile('business-assets', sigOriginal, 'signatures/owner_signature_original.png');

  console.log('\nVerifying online access via HTTP fetch...');
  const res = await fetch(url1);
  console.log('Fetch status:', res.status, 'Content-Type:', res.headers.get('content-type'), 'Size:', res.headers.get('content-length'));
}

main().catch(console.error);

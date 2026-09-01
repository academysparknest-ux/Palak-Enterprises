const dns = require('dns');

const host = 'db.zofddiuswdtbqvqycezy.supabase.co';

dns.lookup(host, { all: true }, (err, addresses) => {
  if (err) console.error('Lookup error:', err);
  else console.log('Addresses for ' + host + ':', addresses);
});

const pooler = 'aws-0-ap-southeast-1.pooler.supabase.com';
dns.lookup(pooler, { all: true }, (err, addresses) => {
  if (err) console.error('Pooler lookup error:', err);
  else console.log('Addresses for ' + pooler + ':', addresses);
});

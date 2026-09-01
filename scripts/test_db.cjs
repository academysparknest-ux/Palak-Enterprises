const { getClient } = require('./db_helper.cjs');

async function test() {
  const client = await getClient();
  const res = await client.query('SELECT count(*) FROM public.orders;');
  console.log('Orders count:', res.rows[0].count);
  await client.end();
}

test().catch(console.error);

const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.nbqkgekosqyupfvpruao:Ahmed%40123Bup@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
});
(async () => {
  await client.connect();
  await client.query('DELETE FROM product_variants WHERE product_id > 12');
  await client.query('DELETE FROM products WHERE id > 12');
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_sizes text DEFAULT ''");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouses jsonb DEFAULT '[]'::jsonb");
  await client.query('CREATE TABLE IF NOT EXISTS settings (id serial primary key, key text unique not null, value jsonb not null, updated_at timestamptz default now())');
  
  const settings = [
    { key: 'fab', value: { whatsapp: '01098286085', sales: '01061212626', complaints: '01012221197' } },
    { key: 'popup', value: { enabled: false, imageUrl: '', linkUrl: '', couponCode: 'WELCOME10', label: 'خصم 10% على أول طلب' } },
    { key: 'hero_slides', value: [] },
  ];
  for (const s of settings) {
    await client.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [s.key, JSON.stringify(s.value)]);
  }
  
  console.log('All SQL executed successfully');
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });

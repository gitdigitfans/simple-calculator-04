const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.nbqkgekosqyupfvpruao:Ahmed%40123Bup@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
});
(async () => {
  await client.connect();
  await client.query("ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");
  await client.query("ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS show_countdown BOOLEAN DEFAULT false");
  console.log('Added expires_at and show_countdown columns to coupons table');
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
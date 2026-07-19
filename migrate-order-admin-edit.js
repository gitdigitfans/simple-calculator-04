const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.nbqkgekosqyupfvpruao:Ahmed%40123Bup@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
});
(async () => {
  await client.connect();
  await client.query("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_modified BOOLEAN DEFAULT false");
  await client.query("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_modified_at TIMESTAMPTZ");
  await client.query("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb");
  await client.query("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes_admin TEXT DEFAULT ''");
  console.log('Added admin_modified, admin_modified_at, status_history, notes_admin columns to orders table');
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
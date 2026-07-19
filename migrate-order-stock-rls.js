// Migration: Grant stock update permission + RLS policies for order placement
// Run: node migrate-order-stock-rls.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nbqkgekosqyupfvpruao.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

async function run() {
  if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_KEY env var');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const sqls = [
    // Allow anon and authenticated to update stock column on product_variants
    `GRANT UPDATE (stock) ON public.product_variants TO anon, authenticated;`,

    // Allow authenticated users (non-admin) to update stock (e.g., during order placement)
    `DROP POLICY IF EXISTS "variants_update_stock" ON public.product_variants;
     CREATE POLICY "variants_update_stock" ON public.product_variants FOR UPDATE TO authenticated
      USING (true) WITH CHECK (stock >= 0);`,

    // Allow anonymous users to update stock during order placement
    `DROP POLICY IF EXISTS "variants_update_stock_anon" ON public.product_variants;
     CREATE POLICY "variants_update_stock_anon" ON public.product_variants FOR UPDATE TO anon
      USING (true) WITH CHECK (stock >= 0);`,
  ];

  for (const sql of sqls) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        // Fallback: try direct query via REST
        console.log('Note: exec_sql fallback needed for:', error.message);
        console.log('Run this SQL manually in Supabase SQL editor:\n');
        console.log(sqls.join('\n'));
        return;
      }
    } catch (e) {
      console.log('Migration error:', e.message);
      console.log('Run this SQL manually in Supabase SQL editor:\n');
      console.log(sqls.join('\n'));
      return;
    }
  }
  console.log('✓ Migration complete: stock update permissions and RLS policies created');
}

run();

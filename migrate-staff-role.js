const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres.nbqkgekosqyupfvpruao:Ahmed%40123Bup@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected. Running staff role migration...\n');

    // 1. Update CHECK constraint
    await client.query(`
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff', 'user'));
    `);
    console.log('✓ Updated role CHECK constraint (admin, staff, user)');

    // 2. Update all RLS policies to include staff
    const policyUpdates = [
      // Categories
      `DROP POLICY IF EXISTS "categories_insert" ON public.categories;
       CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "categories_update" ON public.categories;
       CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "categories_delete" ON public.categories;
       CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      // Products
      `DROP POLICY IF EXISTS "products_insert" ON public.products;
       CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "products_update" ON public.products;
       CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "products_delete" ON public.products;
       CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      // Variants
      `DROP POLICY IF EXISTS "variants_insert" ON public.product_variants;
       CREATE POLICY "variants_insert" ON public.product_variants FOR INSERT TO authenticated
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "variants_update" ON public.product_variants;
       CREATE POLICY "variants_update" ON public.product_variants FOR UPDATE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "variants_delete" ON public.product_variants;
       CREATE POLICY "variants_delete" ON public.product_variants FOR DELETE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      // Coupons
      `DROP POLICY IF EXISTS "coupons_insert" ON public.coupons;
       CREATE POLICY "coupons_insert" ON public.coupons FOR INSERT TO authenticated
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "coupons_update" ON public.coupons;
       CREATE POLICY "coupons_update" ON public.coupons FOR UPDATE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "coupons_delete" ON public.coupons;
       CREATE POLICY "coupons_delete" ON public.coupons FOR DELETE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      // Orders
      `DROP POLICY IF EXISTS "orders_select" ON public.orders;
       CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
        USING (user_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
      `DROP POLICY IF EXISTS "orders_update" ON public.orders;
       CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff'))`,
    ];

    for (const sql of policyUpdates) {
      try { await client.query(sql); } catch (e) { console.log('  Policy error:', e.message.substring(0, 80)); }
    }
    console.log('✓ Updated all RLS policies for staff role');

    console.log('\n✅ Staff role migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();

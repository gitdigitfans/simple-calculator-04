const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres.nbqkgekosqyupfvpruao:Ahmed%40123Bup@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected. Fixing profiles RLS policies...\n');

    await client.query(`
      DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
      CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
        WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    `);
    console.log('✓ Added profiles_update_admin policy (only admin can update any profile)');

    await client.query(`
      DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
      CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
        USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    `);
    console.log('✓ Added profiles_delete policy (only admin can delete any profile)');

    console.log('\n✅ Profiles RLS fix complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();

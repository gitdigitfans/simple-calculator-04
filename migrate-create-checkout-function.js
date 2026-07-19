const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres.nbqkgekosqyupfvpruao:Ahmed%40123Bup@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected. Running migration...\n');

    // 1. Add is_active to products
    await client.query(`
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    console.log('✓ Added is_active column to products');

    // 2. Create the SECURITY DEFINER function
    await client.query(`
      CREATE OR REPLACE FUNCTION public.create_checkout_order(
        p_items jsonb,
        p_shipping_name text,
        p_shipping_phone text,
        p_shipping_city text,
        p_shipping_address text,
        p_notes text DEFAULT '',
        p_coupon_code text DEFAULT NULL,
        p_discount numeric DEFAULT 0
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $$
      DECLARE
        v_user_id uuid;
        v_subtotal numeric(10,2) := 0;
        v_discount numeric(10,2) := 0;
        v_shipping numeric(10,2);
        v_total numeric(10,2);
        v_order_id bigint;
        v_item jsonb;
        v_product record;
        v_variant record;
        v_full_items jsonb := '[]'::jsonb;
        v_enriched jsonb;
      BEGIN
        v_user_id := auth.uid();
        v_discount := COALESCE(p_discount, 0);

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
          SELECT p.id, p.price, p.name_ar, p.name_en, p.images,
                 COALESCE(c.name_ar, '') AS cat_ar, COALESCE(c.name_en, '') AS cat_en
          INTO v_product
          FROM public.products p
          LEFT JOIN public.categories c ON c.id = p.category_id
          WHERE p.id = (v_item->>'product_id')::bigint AND p.is_active = true;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج غير موجود أو غير متاح' USING ERRCODE = 'P0001';
          END IF;

          SELECT id, stock INTO v_variant
          FROM public.product_variants
          WHERE product_id = v_product.id AND size = v_item->>'size';

          IF NOT FOUND THEN
            RAISE EXCEPTION 'المقاس غير متاح للمنتج' USING ERRCODE = 'P0001';
          END IF;

          IF v_variant.stock < (v_item->>'quantity')::int THEN
            RAISE EXCEPTION 'الكمية المطلوبة غير متوفرة في المخزون' USING ERRCODE = 'P0001';
          END IF;

          v_subtotal := v_subtotal + v_product.price * (v_item->>'quantity')::int;

          v_enriched := jsonb_build_object(
            'productId', v_product.id,
            'size', v_item->>'size',
            'quantity', (v_item->>'quantity')::int,
            'price', v_product.price,
            'name_ar', v_product.name_ar,
            'name_en', v_product.name_en,
            'category', v_product.cat_ar,
            'image', COALESCE(v_product.images[1], '')
          );
          v_full_items := v_full_items || v_enriched;
        END LOOP;

        v_shipping := CASE WHEN (v_subtotal - v_discount) >= 1000 THEN 0 ELSE 50 END;

        v_total := v_subtotal - v_discount + v_shipping;

        INSERT INTO public.orders (
          user_id, customer_name, customer_phone, customer_address, customer_city,
          notes, items, subtotal, discount, shipping, total, coupon_code, payment_method, status
        ) VALUES (
          v_user_id, p_shipping_name, p_shipping_phone, p_shipping_address, p_shipping_city,
          p_notes, v_full_items, v_subtotal, v_discount, v_shipping, v_total,
          p_coupon_code, 'cod', 'pending'
        )
        RETURNING public.orders.id INTO v_order_id;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
          UPDATE public.product_variants
          SET stock = GREATEST(public.product_variants.stock - (v_item->>'quantity')::int, 0)
          WHERE public.product_variants.product_id = (v_item->>'product_id')::bigint
            AND public.product_variants.size = v_item->>'size';
        END LOOP;

        RETURN json_build_object(
          'id', v_order_id,
          'order_number', v_order_id::text,
          'total', v_total
        );
      END;
      $$;
    `);
    console.log('✓ Created create_checkout_order function');

    // 3. Grant execute
    await client.query(`GRANT EXECUTE ON FUNCTION public.create_checkout_order TO anon;`);
    await client.query(`GRANT EXECUTE ON FUNCTION public.create_checkout_order TO authenticated;`);
    console.log('✓ Granted EXECUTE to anon and authenticated');

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();

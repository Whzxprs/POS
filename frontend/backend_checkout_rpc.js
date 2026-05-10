const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.fvniaapkjuzjbkfcphfv:Acetilena1702%40%40%2F%2F@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Inyectando lógica de Checkout y Mermas...');

    await client.query(`
      CREATE OR REPLACE FUNCTION process_checkout(p_order_id UUID, p_payment_method TEXT)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        item_record RECORD;
        ing_record RECORD;
      BEGIN
        -- 1. Marcar la orden como pagada
        UPDATE public.orders 
        SET status = 'paid', updated_at = NOW()
        WHERE id = p_order_id;

        -- 2. Iterar sobre todos los platillos ordenados en esa mesa
        FOR item_record IN 
          SELECT recipe_id, station_id, quantity 
          FROM public.order_items 
          WHERE order_id = p_order_id AND recipe_id IS NOT NULL
        LOOP
          -- 3. Iterar sobre los ingredientes de cada receta
          FOR ing_record IN
            SELECT ingredient_item_id, qty
            FROM public.recipe_ingredients
            WHERE recipe_id = item_record.recipe_id AND ingredient_item_id IS NOT NULL
          LOOP
            -- 4. Descontar del inventario de la estación correspondiente
            UPDATE public.inventory_stock
            SET current_qty = current_qty - (ing_record.qty * item_record.quantity)
            WHERE item_id = ing_record.ingredient_item_id 
              AND location_id = item_record.station_id;
              
            -- Si no existe el registro en inventory_stock para esa estación, se podría insertar negativo
            IF NOT FOUND THEN
              INSERT INTO public.inventory_stock (item_id, location_id, current_qty)
              VALUES (ing_record.ingredient_item_id, item_record.station_id, - (ing_record.qty * item_record.quantity));
            END IF;
          END LOOP;
        END LOOP;

        RETURN TRUE;
      END;
      $$;
    `);

    console.log('RPC process_checkout creado exitosamente.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

run();

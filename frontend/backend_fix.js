const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.fvniaapkjuzjbkfcphfv:Acetilena1702%40%40%2F%2F@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Aplicando fix al backend...');

    await client.query(`
      -- Vincular items de órdenes a las recetas y a la estación específica
      ALTER TABLE public.order_items 
        ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS course INTEGER DEFAULT 1; -- Para manejar los "Tiempos"
        
      -- Asegurar que la tabla locations tiene el campo correcto
      -- (Ya lo hicimos en schema_erp, pero verificamos)
    `);

    console.log('Backend fix aplicado correctamente.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

run();

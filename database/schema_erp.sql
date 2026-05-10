-- ==========================================
-- ERP GASTRONÓMICO - SCHEMA AVANZADO
-- ==========================================
-- Diseñado para operación real: automatización de mermas, costeo dinámico,
-- requisiciones y estaciones de trabajo.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROVEEDORES Y DIRECTORIO
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  delivery_days INTEGER[], -- Días de la semana que entregan (0=Dom, 1=Lun...)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÁREAS Y ESTACIONES (LOCATIONS)
-- Define dónde existe el inventario (Almacén Global, Barra, Cocina Fría, etc.)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('global', 'sub_kitchen', 'sub_bar', 'service')), 
  is_production_area BOOLEAN DEFAULT false, -- Si es true, puede transformar insumos (ej. cocina caliente)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATÁLOGO GLOBAL DE INSUMOS (BASE)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Ej: ABA-001
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL, -- Kg, Lt, Pza
  yield_percentage DECIMAL(5,2) DEFAULT 100.00, -- Masa Drenada / Rendimiento (Ej: 80% después de limpiar carne)
  base_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000, -- Costo bruto (última compra)
  net_cost DECIMAL(10,4) GENERATED ALWAYS AS (base_cost / (yield_percentage / 100)) STORED, -- Costo real utilizable
  primary_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STOCK Y PAR LEVELS POR ÁREA (El corazón del control)
-- Evita que la barra pida 10 botellas si su "Max Par" es 5.
CREATE TABLE IF NOT EXISTS public.inventory_stock (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  current_qty DECIMAL(10,4) DEFAULT 0.0000,
  min_par DECIMAL(10,4) DEFAULT 0.0000, -- Al llegar aquí, salta alerta de requisición
  max_par DECIMAL(10,4) DEFAULT 0.0000, -- Límite físico en la estación
  UNIQUE(item_id, location_id)
);

-- 5. RECETAS, SUBRECETAS Y PLATILLOS
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Ej: SUB-001 o PLA-001
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('subrecipe', 'menu_item', 'batch_cocktail')),
  yield_qty DECIMAL(10,4) DEFAULT 1.0000, -- Cuánto rinde esta receta (ej. 1 litro de jarabe)
  yield_unit TEXT DEFAULT 'portion',
  station_id UUID REFERENCES public.locations(id) ON DELETE SET NULL, -- Estación que lo prepara (ej. Parrilla)
  sale_price DECIMAL(10,2) DEFAULT 0.00, -- Si es menu_item, a cuánto se vende
  target_cost_pct DECIMAL(5,2) DEFAULT 30.00, -- % Food Cost objetivo
  instructions TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 6. INGREDIENTES DE RECETAS (Escandallos/Costeo)
-- Se auto-calcula recursivamente usando el net_cost del inventario
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE, -- Insumo crudo
  ingredient_recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE, -- O Subreceta
  qty DECIMAL(10,4) NOT NULL, -- Cantidad que usa
  unit TEXT NOT NULL,
  CHECK (
    (ingredient_item_id IS NOT NULL AND ingredient_recipe_id IS NULL) OR
    (ingredient_item_id IS NULL AND ingredient_recipe_id IS NOT NULL)
  )
);

-- 7. REQUISICIONES (Flujo Cocina/Barra -> Almacén)
CREATE TABLE IF NOT EXISTS public.requisitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  to_location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'partial', 'rejected', 'fulfilled')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.requisition_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty_requested DECIMAL(10,4) NOT NULL,
  qty_approved DECIMAL(10,4) DEFAULT 0.0000
);

-- 8. MERMAS Y AUDITORÍAS (Evitar robos)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('waste', 'adjustment', 'transfer_in', 'transfer_out', 'po_receipt')),
  qty DECIMAL(10,4) NOT NULL, -- Positivo o negativo
  reason TEXT, -- Ej: "Se quemó", "Caducado", "Auditoría mensual"
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Si requiere aprobación
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ÓRDENES DE COMPRA (Automatización hacia Proveedor)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial_received', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.po_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty_ordered DECIMAL(10,4) NOT NULL,
  qty_received DECIMAL(10,4) DEFAULT 0.0000,
  unit_cost DECIMAL(10,4) NOT NULL -- Precio pactado o de última compra
);

-- 10. RECURSOS HUMANOS (Turnos)
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  role_played TEXT, -- Porque un capitán a veces dobla turno como gerente
  notes TEXT
);

-- NOTA: Se requerirán políticas RLS (Row Level Security) estrictas para que
-- solo el Admin apruebe POs, y los Jefes de área aprueben Requisiciones.

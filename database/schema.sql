-- SPV POS Intelligence - Supabase Schema
-- Archivo actualizado para usar login por PIN (sin depender de auth.users estrictamente)

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS PRINCIPALES

-- Tabla de Personal (Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'capitan', 'mesero', 'cocina', 'barra', 'auditor', 'admin')),
  pin_code TEXT UNIQUE, -- PIN de 4 dígitos para inicio de sesión rápido en tablets
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Mesas (Floor)
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  name TEXT, -- Ej: 'Terraza 1'
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'dirty')),
  current_order_id UUID, -- Referencia a la orden activa
  grid_index INTEGER, -- Posición en el editor (0-79)
  server_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Mesero asignado a la mesa
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Catálogo de Insumos (Inventory)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('liquor', 'food', 'supply', 'garnish')),
  unit TEXT NOT NULL DEFAULT 'ml', -- 'ml', 'gr', 'piece'
  cost_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  stock_level DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_stock_alert DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Órdenes (Tickets/Cuentas)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  server_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pax INTEGER DEFAULT 1,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'void')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Tabla de Items en la Orden (Comandas para KDS)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL, -- Costo guardado en el momento (para reportes inmutables)
  notes TEXT,
  destination TEXT CHECK (destination IN ('cocina', 'barra', 'piso')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'prep', 'ready', 'delivered')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. SEGURIDAD A NIVEL DE FILAS (Row Level Security - RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Políticas base: Permitimos lectura y escritura a las operaciones del POS
-- (El acceso lo controla la UI con el PIN ingresado)
CREATE POLICY "Enable read/write for all users" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Enable read/write for all users" ON public.tables FOR ALL USING (true);
CREATE POLICY "Enable read/write for all users" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Enable read/write for all users" ON public.orders FOR ALL USING (true);
CREATE POLICY "Enable read/write for all users" ON public.order_items FOR ALL USING (true);

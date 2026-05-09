import { supabase } from '../lib/supabase';

/**
 * SERVICIO DE BASE DE DATOS - SUPABASE
 * Estas funciones conectan la UI con la base de datos PostgreSQL de Supabase.
 * Para que funcionen en Producción, debes añadir tus credenciales en un archivo .env:
 * NEXT_PUBLIC_SUPABASE_URL=tu_url
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
 */

export const FloorService = {
  // Obtener el estado actual de todas las mesas
  async getTables() {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('number', { ascending: true });
        
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase no configurado o error de red. Devolviendo Mocks...', err);
      return null; // El UI usará los mocks si esto falla localmente sin credenciales
    }
  },

  // Actualizar el estado de una mesa (ej. de 'available' a 'occupied')
  async updateTableStatus(id: string, status: 'available' | 'occupied' | 'dirty') {
    const { data, error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};

export interface OrderItemInput {
  name: string;
  volume?: number;
  quantity?: number;
  price: number;
  cost: number;
  destination: string;
}

export const OrderService = {
  // Crear una nueva cuenta para una mesa
  async createOrder(tableId: string, serverId: string, pax: number) {
    const { data, error } = await supabase
      .from('orders')
      .insert([{ table_id: tableId, server_id: serverId, pax }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  // Insertar items a una cuenta (comandas) y descontar inventario si es necesario
  async addItemsToOrder(orderId: string, items: OrderItemInput[]) {
    // 1. Insertamos en order_items
    const { data, error } = await supabase
      .from('order_items')
      .insert(items.map(item => ({
        order_id: orderId,
        product_name: item.name,
        quantity: item.volume ? 1 : item.quantity,
        price: item.price,
        cost: item.cost, // Guardamos el costo en este momento del tiempo
        destination: item.destination // 'cocina' o 'barra'
      })))
      .select();
      
    if (error) throw error;
    
    // 2. Aquí iría un llamado a un Stored Procedure de Supabase para descontar inventario 
    // automáticamente: await supabase.rpc('deduct_inventory', { order_items: data });
    
    return data;
  },
  
  // Cerrar la cuenta (Checkout)
  async closeOrder(orderId: string, totalAmount: number) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: 'closed', 
        total_amount: totalAmount,
        closed_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};

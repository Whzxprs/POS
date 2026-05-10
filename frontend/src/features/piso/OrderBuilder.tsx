'use client';

import React, { useState, useEffect } from 'react';
import styles from './OrderBuilder.module.css';
import { X, Send, Utensils, Coffee, Wine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TableData } from './FloorDashboard';
import { useSocket } from '../../hooks/useSocket';

interface OrderBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableData | null;
}

export const OrderBuilder = ({ isOpen, onClose, table }: OrderBuilderProps) => {
  const { getSocket } = useSocket();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      fetchMenu();
      setCart([]);
    }
  }, [isOpen]);

  const fetchMenu = async () => {
    const { data } = await supabase
      .from('recipes')
      .select('*, locations(name, type)')
      .eq('type', 'menu_item')
      .eq('is_active', true);
    
    if (data) setMenuItems(data);
  };

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id && c.course === activeCourse);
    if (existing) {
      setCart(cart.map(c => c.id === item.id && c.course === activeCourse ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1, course: activeCourse }]);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.sale_price * item.qty), 0);
  };

  const handleSend = async () => {
    if (!table || !table.orderId || cart.length === 0) return;

    const itemsPayload = cart.map(c => ({
      order_id: table.orderId,
      recipe_id: c.id,
      station_id: c.station_id,
      product_name: c.name,
      quantity: c.qty,
      price: c.sale_price,
      cost: c.sale_price * (c.target_cost_pct / 100), // estimado
      destination: c.locations?.type === 'sub_kitchen' ? 'cocina' : 'barra',
      status: 'pending',
      course: c.course
    }));

    const { error } = await supabase.from('order_items').insert(itemsPayload);

    if (error) {
      alert('Error enviando la orden.');
    } else {
      // Actualizar total
      const total = getCartTotal();
      const { error: rpcError } = await supabase.rpc('increment_order_total', { row_id: table.orderId, amount: total });
      if (rpcError) {
        const { data } = await supabase.from('orders').select('total_amount').eq('id', table.orderId).single();
        if (data) {
          await supabase.from('orders').update({ total_amount: Number(data.total_amount) + total }).eq('id', table.orderId);
        }
      }

      // Notificar a cocina/barra por socket
      const socket = getSocket();
      if (socket) {
        socket.emit('new_order', {
          table: table.name,
          items: cart.length
        });
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2>Mesa {table?.number}</h2>
            <div className={styles.subtitle}>Tomar Órden</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          {[1, 2, 3].map(c => (
            <button 
              key={c}
              onClick={() => setActiveCourse(c)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeCourse === c ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: activeCourse === c ? 'white' : 'var(--text-secondary)'
              }}
            >
              {c}º Tiempo
            </button>
          ))}
        </div>

        <div className={styles.content} style={{ display: 'flex', flexDirection: 'row', gap: '1rem', padding: '1rem', height: 'calc(100% - 200px)' }}>
          {/* Menu Grid */}
          <div style={{ flex: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', alignContent: 'start', overflowY: 'auto' }}>
            {menuItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => addToCart(item)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {item.locations?.type === 'sub_kitchen' ? <Utensils color="var(--text-secondary)" /> : <Wine color="var(--text-secondary)" />}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                <span style={{ color: 'var(--accent-success)', fontSize: '0.9rem' }}>${item.sale_price.toFixed(2)}</span>
              </div>
            ))}
            {menuItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                No hay platillos registrados. Ve a "Fichas Técnicas" para crear el menú.
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Comanda Actual</h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {cart.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--border-color)' }}>
                  <div>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginRight: '8px' }}>{c.qty}x</span>
                    {c.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>(T{c.course})</span>
                  </div>
                  <span>${(c.sale_price * c.qty).toFixed(2)}</span>
                </div>
              ))}
              {cart.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Vacía</span>}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--accent-success)' }}>${getCartTotal().toFixed(2)}</span>
              </div>
              <button 
                onClick={handleSend}
                disabled={cart.length === 0}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: cart.length > 0 ? 'var(--accent-success)' : 'var(--bg-surface-hover)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'bold',
                  cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Send size={18} /> Mandar Comanda
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

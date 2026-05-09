'use client';

import React, { useEffect, useState } from 'react';
import styles from './KDSBoard.module.css';
import { useSocket } from '../../hooks/useSocket';
import { Clock, AlertTriangle, CheckCircle, ChefHat } from 'lucide-react';

type OrderItem = {
  name: string;
  volume?: number;
  costPerMl?: number;
};

type Order = {
  id: string;
  table: string;
  pax: number;
  type: string;
  ingredients: OrderItem[];
  timestamp: string;
  status: 'pending' | 'prep' | 'ready';
  allergies?: string[];
  timerMinutes?: number;
};

export const KDSBoard = ({ area = 'cocina' }: { area?: string }) => {
  const { getSocket } = useSocket(area);
  const [orders, setOrders] = useState<Order[]>(() => [
    // Un par de órdenes de prueba pre-existentes
    {
      id: 'mock1',
      table: 'Mesa 5',
      pax: 2,
      type: 'Hamburguesa Doble',
      ingredients: [{ name: 'Sin cebolla' }, { name: 'Extra queso' }],
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(), // 8 mins ago
      status: 'pending',
      timerMinutes: 8,
    },
    {
      id: 'mock2',
      table: 'VIP - Gómez',
      pax: 6,
      type: 'Ribeye 400g',
      ingredients: [{ name: 'Término Medio' }, { name: 'Puré Trufado' }],
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'prep',
      timerMinutes: 15,
      allergies: ['Gluten']
    }
  ]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (newOrder: Omit<Order, 'status' | 'timerMinutes'>) => {
      // Formatear la orden que viene del OrderBuilder
      const formattedOrder: Order = {
        ...newOrder,
        status: 'pending',
        timerMinutes: 0, // Recién llegada
        // Asegurarnos que existan alergias (simuladas por ahora)
        allergies: newOrder.table.includes('VIP') ? ['Nueces'] : [],
      };
      
      setOrders(prev => [formattedOrder, ...prev]);
      
      // Feedback visual (en la app real podría haber un sonido)
      console.log('¡NUEVA COMANDA RECIBIDA!', formattedOrder);
    };

    socket.on('order_received', handleNewOrder);

    return () => {
      socket.off('order_received', handleNewOrder);
    };
  }, [getSocket]);

  // Actualizador de timers (cada 60 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => prev.map(order => {
        const diffMs = new Date().getTime() - new Date(order.timestamp).getTime();
        return { ...order, timerMinutes: Math.floor(diffMs / 60000) };
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const moveOrder = (id: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    // Aquí se emitiría un evento al servidor de que el plato avanzó de estado
    // ej: socket.emit('order_status_update', { id, status: newStatus });
  };

  const getTimerClass = (minutes: number = 0) => {
    if (minutes > 15) return styles.timerDanger;
    if (minutes > 10) return styles.timerWarning;
    return '';
  };

  const renderColumn = (status: Order['status'], title: string) => {
    const columnOrders = orders.filter(o => o.status === status);
    
    return (
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          <div className={styles.columnTitle}>
            {title} <span className={styles.badgeCount}>{columnOrders.length}</span>
          </div>
        </div>
        
        <div className={styles.ticketList}>
          {columnOrders.map(order => (
            <div key={order.id} className={`${styles.ticket} ${
              status === 'pending' ? styles.ticketPending : 
              status === 'prep' ? styles.ticketPrep : styles.ticketReady
            }`}>
              
              <div className={styles.ticketHeader}>
                <div className={styles.ticketTable}>{order.table}</div>
                <div className={styles.ticketMeta}>
                  <ChefHat size={14} /> {order.pax} pax
                </div>
              </div>

              <div className={`${styles.ticketTimer} ${getTimerClass(order.timerMinutes)}`}>
                <Clock size={14} /> {order.timerMinutes} min
              </div>

              {order.allergies && order.allergies.length > 0 && (
                <div className={styles.allergyAlert}>
                  <AlertTriangle size={14} /> ALERGIA: {order.allergies.join(', ')}
                </div>
              )}

              <div className={styles.itemList}>
                <div className={styles.item}>
                  <span className={styles.itemName}>1x {order.type}</span>
                  {order.ingredients.map((ing, idx) => (
                    <span key={idx} className={styles.itemDetails}>- {ing.name} {ing.volume ? `(${ing.volume}ml)` : ''}</span>
                  ))}
                </div>
              </div>

              {status === 'pending' && (
                <button className={styles.actionBtn} onClick={() => moveOrder(order.id, 'prep')}>
                  Comenzar Preparación
                </button>
              )}
              {status === 'prep' && (
                <button className={styles.actionBtn} onClick={() => moveOrder(order.id, 'ready')}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                  Marcar como Listo (Pase)
                </button>
              )}
              {status === 'ready' && (
                <div style={{ textAlign: 'center', color: 'var(--accent-success)', fontWeight: 600, marginTop: '0.5rem' }}>
                  Esperando a Mesero...
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.board}>
      {renderColumn('pending', 'Pendiente')}
      {renderColumn('prep', 'En Preparación')}
      {renderColumn('ready', 'Listo (Pase)')}
    </div>
  );
};

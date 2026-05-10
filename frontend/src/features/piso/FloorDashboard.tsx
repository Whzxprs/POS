'use client';

import React, { useState, useEffect } from 'react';
import styles from './FloorDashboard.module.css';
import { useSocket } from '../../hooks/useSocket';
import { Clock, Users, Utensils, Wine, Clock4, AlertCircle, Receipt } from 'lucide-react';
import { OrderBuilder } from './OrderBuilder';
import { CheckoutModal } from './CheckoutModal';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const MOCK_RESERVATIONS = [
  { id: 1, name: 'Familia Pérez', time: '20:00', pax: 4, allergies: ['Mariscos'] },
  { id: 2, name: 'Cena Empresa', time: '20:30', pax: 12, allergies: [] },
];

export interface TableData {
  id: string; // uuid
  number: number;
  name: string;
  pax: number;
  amount: number;
  status: string; // 'available', 'occupied', etc.
  foodItems: number;
  drinkItems: number;
  timer: number;
  needsAttention: boolean;
  serverId?: string;
  orderId?: string;
}

export const FloorDashboard = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket('piso');
  const [currentTime, setCurrentTime] = useState<string>('00:00');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [checkoutTable, setCheckoutTable] = useState<TableData | null>(null);
  
  const [tables, setTables] = useState<TableData[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    const { data: tablesData, error: tablesError } = await supabase.from('tables').select('*');
    const { data: ordersData } = await supabase.from('orders').select('*').eq('status', 'open');
    
    if (tablesData) {
      const combined = tablesData.map(t => {
        // Find active order for this table
        const activeOrder = ordersData?.find(o => o.table_id === t.id);
        
        return {
          id: t.id,
          number: t.number,
          name: t.name || `Mesa ${t.number}`,
          pax: activeOrder ? activeOrder.pax : t.capacity,
          amount: activeOrder ? Number(activeOrder.total_amount) : 0,
          status: activeOrder ? 'occupied' : t.status,
          foodItems: 0, // Podríamos hacer un join con order_items
          drinkItems: 0,
          timer: activeOrder ? Math.floor((new Date().getTime() - new Date(activeOrder.opened_at).getTime()) / 60000) : 0,
          needsAttention: false,
          serverId: t.server_id,
          orderId: activeOrder?.id
        };
      });
      // Sort by number
      combined.sort((a, b) => a.number - b.number);
      setTables(combined);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Suscribirse a cambios en realtime
    const channel = supabase.channel('dashboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchDashboardData)
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visibleTables = user?.role === 'mesero' 
    ? tables.filter(t => t.serverId === user.id)
    : tables;

  const isManagerOrCapitan = user?.role === 'manager' || user?.role === 'capitan' || user?.role === 'admin';

  const handleOpenTable = async (table: TableData) => {
    if (table.status === 'available' || !table.orderId) {
      // Create order
      const { data, error } = await supabase.from('orders').insert({
        table_id: table.id,
        server_id: user?.id,
        pax: table.pax,
        total_amount: 0,
        status: 'open'
      }).select().single();
      
      if (data) {
        await supabase.from('tables').update({ status: 'occupied', current_order_id: data.id }).eq('id', table.id);
        setSelectedTable({ ...table, orderId: data.id });
        setIsBuilderOpen(true);
      }
    } else {
      setSelectedTable(table);
      setIsBuilderOpen(true);
    }
  };

  return (
    <div className={styles.dashboard}>
      {isManagerOrCapitan && (
        <section className={styles.topSection}>
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Servicio Actual</span>
            <Clock size={18} color="var(--text-secondary)" />
          </div>
          <div className={styles.clockDisplay}>{currentTime}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {isConnected ? '🟢 Sockets Activos' : '🟡 Supabase Realtime'}
          </p>
        </div>

        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Próximas Reservaciones</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', cursor: 'pointer' }}>Ver todas</span>
          </div>
          <div className={styles.reservationList}>
            {MOCK_RESERVATIONS.map(res => (
              <div key={res.id} className={styles.reservationCard}>
                <div className={styles.reservationName}>{res.name}</div>
                <div className={styles.reservationTime}>{res.time} • {res.pax} pax</div>
                {res.allergies.length > 0 && (
                  <div className={styles.allergyBadge}>⚠️ {res.allergies.join(', ')}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Pendientes (Manager)</span>
          </div>
          <div className={styles.taskList}>
            <div className={styles.taskItem}>
              <div className={styles.taskCheckbox}></div>
              <span className={styles.taskText}>Revisar montaje de terraza</span>
            </div>
          </div>
        </div>
      </section>
    )}

      <section className={styles.floorSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.sectionTitle}>
            {user?.role === 'mesero' ? `Mis Mesas (${user.name})` : 'Planta Principal'}
          </h2>
        </div>
        
        <div className={styles.tableGrid}>
          {visibleTables.map(table => (
            <div 
              key={table.id} 
              className={styles.tableCard}
              onClick={() => handleOpenTable(table)}
              style={{ opacity: table.status === 'available' ? 0.7 : 1 }}
            >
              <div className={`${styles.statusBorder} ${
                table.status === 'occupied' ? styles.borderYellow : styles.borderGray
              }`} />

              <div className={styles.tableHeader}>
                <span className={styles.tableName}>{table.name}</span>
                <span className={styles.tableInfo}><Users size={14} /> {table.pax}</span>
              </div>

              <div className={styles.tableAmount}>
                ${table.amount.toFixed(2)}
                {table.amount > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCheckoutTable(table); }}
                    style={{
                      marginLeft: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                      borderRadius: 'var(--radius-md)', border: 'none',
                      background: 'var(--accent-success)', color: 'white', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                    }}
                  >
                    <Receipt size={14} /> Cobrar
                  </button>
                )}
              </div>

              <div className={styles.tableProgress}>
                <div className={styles.itemsIndicator}>
                  {table.status === 'occupied' ? (
                    <div className={`${styles.itemBadge} ${styles.statusYellow}`}>
                      Activa
                    </div>
                  ) : (
                    <div className={`${styles.itemBadge} ${styles.statusGray}`}>
                      Libre
                    </div>
                  )}
                </div>

                <div className={styles.timer}>
                  <Clock4 size={14} /> {table.timer}m
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <OrderBuilder 
        isOpen={isBuilderOpen} 
        onClose={() => setIsBuilderOpen(false)} 
        table={selectedTable}
      />
      
      <CheckoutModal 
        isOpen={!!checkoutTable} 
        onClose={() => setCheckoutTable(null)} 
        tableData={checkoutTable} 
      />
    </div>
  );
};

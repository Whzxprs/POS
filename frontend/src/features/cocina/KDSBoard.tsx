'use client';

import React, { useEffect, useState } from 'react';
import styles from './KDSBoard.module.css';
import { Clock, AlertTriangle, CheckCircle, ChefHat } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  notes: string;
  status: 'pending' | 'prep' | 'ready' | 'delivered';
  sent_at: string;
  course?: number;
  // Joins
  orders?: {
    pax: number;
    tables?: {
      name: string;
    };
  };
  timerMinutes?: number;
};

export const KDSBoard = ({ area = 'cocina' }: { area?: string }) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('');

  useEffect(() => {
    // Cargar las estaciones/partidas aplicables a esta área
    const loadStations = async () => {
      const typeFilter = area === 'cocina' ? 'sub_kitchen' : 'sub_bar';
      const { data } = await supabase.from('locations').select('*').eq('type', typeFilter);
      if (data) {
        setStations(data);
        if (data.length > 0) setSelectedStationId(data[0].id);
      }
    };
    loadStations();
  }, [area]);

  const fetchItems = async () => {
    if (!selectedStationId) return;

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        *,
        orders (
          pax,
          tables (
            name
          )
        )
      `)
      .eq('station_id', selectedStationId)
      .neq('status', 'delivered')
      .order('course', { ascending: true }) // Ordenar por tiempos
      .order('sent_at', { ascending: true });

    if (data && !error) {
      const itemsWithTimers = data.map((item: any) => ({
        ...item,
        timerMinutes: Math.floor((new Date().getTime() - new Date(item.sent_at).getTime()) / 60000)
      }));
      setItems(itemsWithTimers);
    }
  };

  useEffect(() => {
    fetchItems();

    if (selectedStationId) {
      // Supabase Realtime
      const channel = supabase.channel(`kds_${selectedStationId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'order_items',
          filter: `station_id=eq.${selectedStationId}`
        }, () => {
          fetchItems();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedStationId]);

  // Actualizador de timers cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => prev.map(item => {
        const diffMs = new Date().getTime() - new Date(item.sent_at).getTime();
        return { ...item, timerMinutes: Math.floor(diffMs / 60000) };
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const moveOrder = async (id: string, newStatus: OrderItem['status']) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    const { error } = await supabase.from('order_items').update({ status: newStatus }).eq('id', id);
    if (error) fetchItems(); // revert on error
  };

  const getTimerClass = (minutes: number = 0) => {
    if (minutes > 15) return styles.timerDanger;
    if (minutes > 10) return styles.timerWarning;
    return '';
  };

  const renderColumn = (status: OrderItem['status'], title: string) => {
    const columnItems = items.filter(i => i.status === status);
    
    return (
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          <div className={styles.columnTitle}>
            {title} <span className={styles.badgeCount}>{columnItems.length}</span>
          </div>
        </div>
        
        <div className={styles.ticketList}>
          {columnItems.map(item => {
            const tableName = item.orders?.tables?.name || 'Mesa ?';
            const pax = item.orders?.pax || 1;

            return (
              <div key={item.id} className={`${styles.ticket} ${
                status === 'pending' ? styles.ticketPending : 
                status === 'prep' ? styles.ticketPrep : styles.ticketReady
              }`}>
                
                <div className={styles.ticketHeader}>
                  <div className={styles.ticketTable}>{tableName}</div>
                  <div className={styles.ticketMeta}>
                    <ChefHat size={14} /> T{item.course || 1} • {pax} pax
                  </div>
                </div>

                <div className={`${styles.ticketTimer} ${getTimerClass(item.timerMinutes)}`}>
                  <Clock size={14} /> {item.timerMinutes} min
                </div>

                <div className={styles.itemList}>
                  <div className={styles.item}>
                    <span className={styles.itemName}>{item.quantity}x {item.product_name}</span>
                    {item.notes && (
                      <span className={styles.itemDetails}>- {item.notes}</span>
                    )}
                  </div>
                </div>

                {status === 'pending' && (
                  <button className={styles.actionBtn} onClick={() => moveOrder(item.id, 'prep')}>
                    Comenzar Preparación
                  </button>
                )}
                {status === 'prep' && (
                  <button className={styles.actionBtn} onClick={() => moveOrder(item.id, 'ready')}>
                    <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                    Marcar Listo (Pase)
                  </button>
                )}
                {status === 'ready' && (
                  <button 
                    className={styles.actionBtn} 
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    onClick={() => moveOrder(item.id, 'delivered')}
                  >
                    Entregado al Mesero
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Station Selector Header */}
      <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Partida:</h2>
        <select 
          value={selectedStationId} 
          onChange={(e) => setSelectedStationId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          {stations.map(st => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.board}>
        {renderColumn('pending', 'Pendiente')}
        {renderColumn('prep', 'En Preparación')}
        {renderColumn('ready', 'Listo (Pase)')}
      </div>
    </div>
  );
};

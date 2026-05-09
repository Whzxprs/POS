'use client';

import React, { useState, useEffect } from 'react';
import styles from './FloorDashboard.module.css';
import { useSocket } from '../../hooks/useSocket';
import { Clock, Users, Utensils, Wine, Clock4, AlertCircle, Receipt } from 'lucide-react';
import { OrderBuilder } from './OrderBuilder';
import { CheckoutModal } from './CheckoutModal';
import { useAuth } from '../../context/AuthContext';

// Mock Data Inicial
const MOCK_RESERVATIONS = [
  { id: 1, name: 'Familia Pérez', time: '20:00', pax: 4, allergies: ['Mariscos'] },
  { id: 2, name: 'Cena Empresa', time: '20:30', pax: 12, allergies: [] },
  { id: 3, name: 'Aniversario D.', time: '21:00', pax: 2, allergies: ['Gluten'] },
];

const MOCK_TABLES = [
  { 
    id: 1, 
    number: 12, 
    name: 'Familia Pérez', 
    pax: 4, 
    amount: 1450.50, 
    status: 'yellow', 
    foodItems: 3, 
    drinkItems: 1, 
    timer: 15,
    needsAttention: false,
    serverId: 'u3' 
  },
  { 
    id: 2, 
    number: 5, 
    name: 'Mesa 5', 
    pax: 2, 
    amount: 320.00, 
    status: 'green', 
    foodItems: 2, 
    drinkItems: 2, 
    timer: 2,
    needsAttention: false,
    serverId: 'u4'
  },
  { 
    id: 3, 
    number: 8, 
    name: 'VIP - Gómez', 
    pax: 6, 
    amount: 5800.00, 
    status: 'yellow', 
    foodItems: 5, 
    drinkItems: 4, 
    timer: 35, 
    needsAttention: true,
    serverId: 'u3'
  },
  { 
    id: 4, 
    number: 15, 
    name: 'Terraza 1', 
    pax: 3, 
    amount: 950.00, 
    status: 'gray', 
    foodItems: 0, 
    drinkItems: 0, 
    timer: 45,
    needsAttention: false,
    serverId: 'u4'
  },
];

export interface TableData {
  id: number;
  number: number;
  name: string;
  pax: number;
  amount: number;
  status: string;
  foodItems: number;
  drinkItems: number;
  timer: number;
  needsAttention: boolean;
  serverId?: string;
}

export const FloorDashboard = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket('piso');
  const [currentTime, setCurrentTime] = useState<string>('00:00');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [checkoutTable, setCheckoutTable] = useState<TableData | null>(null);

  useEffect(() => {
    // Actualizador simple de reloj
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtrar mesas si es mesero
  const visibleTables = user?.role === 'mesero' 
    ? MOCK_TABLES.filter(t => t.serverId === user.id)
    : MOCK_TABLES;

  const isManagerOrCapitan = user?.role === 'manager' || user?.role === 'capitan';

  return (
    <div className={styles.dashboard}>
      {/* Top Widgets Section - Solo para Managers y Capitanes */}
      {isManagerOrCapitan && (
        <section className={styles.topSection}>
          {/* Widget 1: Reloj de Apertura / Estado */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Servicio Actual</span>
            <Clock size={18} color="var(--text-secondary)" />
          </div>
          <div className={styles.clockDisplay}>{currentTime}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {isConnected ? '🟢 Conectado (Tiempo Real)' : '🔴 Desconectado'}
          </p>
        </div>

        {/* Widget 2: Reservaciones OpenTable */}
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

        {/* Widget 3: Tareas Kanban */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Pendientes (Manager)</span>
          </div>
          <div className={styles.taskList}>
            <div className={styles.taskItem}>
              <div className={styles.taskCheckbox}></div>
              <span className={styles.taskText}>Revisar montaje de terraza</span>
            </div>
            <div className={styles.taskItem}>
              <div className={styles.taskCheckbox}></div>
              <span className={styles.taskText}>Reporte de rotura de cristalería</span>
            </div>
          </div>
        </div>
      </section>
    )}

      {/* Floor Section: Mesas */}
      <section className={styles.floorSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.sectionTitle}>
            {user?.role === 'mesero' ? `Mis Mesas (${user.name})` : 'Planta Principal'}
          </h2>
          {/* Aquí irían filtros: Todas, Mis Mesas, Libres */}
        </div>
        
        <div className={styles.tableGrid}>
          {visibleTables.map(table => (
            <div 
              key={table.id} 
              className={styles.tableCard}
              onClick={() => setIsBuilderOpen(true)}
            >
              {/* Border Status Indicator */}
              <div className={`${styles.statusBorder} ${
                table.status === 'yellow' ? styles.borderYellow : 
                table.status === 'green' ? styles.borderGreen : styles.borderGray
              }`} />

              <div className={styles.tableHeader}>
                <span className={styles.tableName}>{table.name}</span>
                <span className={styles.tableInfo}><Users size={14} /> {table.pax} (M-{table.number})</span>
              </div>

              <div className={styles.tableAmount}>
                ${table.amount.toFixed(2)}
                {table.amount > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCheckoutTable(table); }}
                    style={{
                      marginLeft: '1rem',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'var(--accent-success)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Receipt size={14} /> Cobrar
                  </button>
                )}
              </div>

              <div className={styles.tableProgress}>
                <div className={styles.itemsIndicator}>
                  {table.foodItems > 0 && (
                    <div className={`${styles.itemBadge} ${
                      table.status === 'yellow' ? styles.statusYellow :
                      table.status === 'green' ? styles.statusGreen : styles.statusGray
                    }`}>
                      <Utensils size={14} /> {table.foodItems}
                    </div>
                  )}
                  {table.drinkItems > 0 && (
                    <div className={`${styles.itemBadge} ${styles.statusGray}`}>
                      <Wine size={14} /> {table.drinkItems}
                    </div>
                  )}
                </div>

                <div className={`${styles.timer} ${table.needsAttention ? styles.timerWarning : ''}`}>
                  {table.needsAttention && <AlertCircle size={14} color="var(--accent-danger)" />}
                  <Clock4 size={14} /> {table.timer}m
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Slide-over Constructor de Pedidos */}
      <OrderBuilder isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} />
      
      {/* Modal de Cobro */}
      <CheckoutModal 
        isOpen={!!checkoutTable} 
        onClose={() => setCheckoutTable(null)} 
        tableData={checkoutTable} 
      />
    </div>
  );
};

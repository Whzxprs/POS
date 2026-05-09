'use client';

import React, { useState } from 'react';
import styles from './FloorEditor.module.css';
import { Save, Plus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Interfaz para el editor
interface EditorTable {
  id: string;
  number: number;
  name: string;
  serverId?: string;
  serverInitials?: string;
}

// Simulamos 80 celdas (10x8 grid)
const INITIAL_GRID: (EditorTable | null)[] = Array(80).fill(null);

// Colocamos algunas mesas predeterminadas
INITIAL_GRID[12] = { id: 't1', number: 12, name: 'Mesa 12' };
INITIAL_GRID[15] = { id: 't2', number: 5, name: 'Mesa 5', serverId: 'u4', serverInitials: 'JU' };
INITIAL_GRID[33] = { id: 't3', number: 8, name: 'VIP Gómez' };
INITIAL_GRID[48] = { id: 't4', number: 15, name: 'Terraza 1', serverId: 'u4', serverInitials: 'JU' };

export const FloorEditor = () => {
  const { users } = useAuth();
  const [grid, setGrid] = useState<(EditorTable | null)[]>(INITIAL_GRID);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  // Filtramos solo a los meseros
  const waiters = users.filter(u => u.role === 'mesero');

  const handleCellClick = (index: number) => {
    const table = grid[index];
    
    // Modo de asignación: Si hay un mesero seleccionado y hacemos clic en una mesa
    if (selectedServerId && table) {
      const server = waiters.find(w => w.id === selectedServerId);
      const newGrid = [...grid];
      newGrid[index] = { 
        ...table, 
        serverId: selectedServerId, 
        serverInitials: server?.name.substring(0,2).toUpperCase() 
      };
      setGrid(newGrid);
      return;
    }

    // Modo creación básica: Click en celda vacía añade una mesa
    if (!table && !selectedServerId) {
      const newTableNumber = grid.filter(c => c !== null).length + 1;
      const newGrid = [...grid];
      newGrid[index] = {
        id: `new_${newTableNumber}`,
        number: newTableNumber,
        name: `Mesa ${newTableNumber}`
      };
      setGrid(newGrid);
    }
  };

  const handleSave = () => {
    alert('Diseño de piso y asignaciones guardadas en la base de datos.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.title}>Editor de Mapa y Zonas</div>
        <button className={styles.saveBtn} onClick={handleSave}>
          <Save size={20} /> Guardar Cambios
        </button>
      </div>

      <div className={styles.editorLayout}>
        {/* Grid Principal */}
        <div className={styles.gridContainer}>
          {grid.map((cell, index) => (
            <div 
              key={index} 
              className={`${styles.cell} ${cell ? styles.tableFilled : styles.cellEmpty}`}
              onClick={() => handleCellClick(index)}
            >
              {cell ? (
                <>
                  <span className={styles.tableNumber}>{cell.number}</span>
                  <span className={styles.tableName}>{cell.name}</span>
                  {cell.serverInitials && (
                    <span className={styles.serverBadge} title="Mesero Asignado">
                      {cell.serverInitials}
                    </span>
                  )}
                </>
              ) : (
                <Plus size={16} color="var(--border-color)" />
              )}
            </div>
          ))}
        </div>

        {/* Barra Lateral de Herramientas */}
        <div className={styles.sidebar}>
          <div>
            <div className={styles.sideSectionTitle}>Asignación de Zonas</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Selecciona un mesero y haz clic en las mesas para asignarlas.
            </p>
            <div className={styles.waiterList}>
              {waiters.map(waiter => (
                <div 
                  key={waiter.id} 
                  className={`${styles.waiterCard} ${selectedServerId === waiter.id ? styles.selected : ''}`}
                  onClick={() => setSelectedServerId(waiter.id === selectedServerId ? null : waiter.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} />
                    <span style={{ fontWeight: 600 }}>{waiter.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {grid.filter(c => c?.serverId === waiter.id).length} mesas
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: 'auto' }}>
            <button className={styles.addTableBtn} onClick={() => setSelectedServerId(null)}>
              <Plus size={20} /> Modo Construcción (Añadir Mesa)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

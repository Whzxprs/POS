'use client';

import React, { useState, useEffect } from 'react';
import styles from './FloorEditor.module.css';
import { Save, Plus, Users, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface EditorTable {
  id: string;
  number: number;
  name: string;
  serverId?: string | null;
  serverInitials?: string;
}

export const FloorEditor = () => {
  const { users } = useAuth();
  const [grid, setGrid] = useState<(EditorTable | null)[]>(Array(80).fill(null));
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filtramos solo a los meseros o capitanes
  const waiters = users.filter(u => u.role === 'mesero' || u.role === 'capitan');

  useEffect(() => {
    fetchTables();
  }, [users]);

  const fetchTables = async () => {
    const { data, error } = await supabase.from('tables').select('*');
    if (data && !error) {
      const newGrid = Array(80).fill(null);
      data.forEach((t: any) => {
        if (t.grid_index !== null && t.grid_index >= 0 && t.grid_index < 80) {
          const server = users.find(u => u.id === t.server_id);
          newGrid[t.grid_index] = {
            id: t.id,
            number: t.number,
            name: t.name,
            serverId: t.server_id,
            serverInitials: server ? server.name.substring(0, 2).toUpperCase() : undefined
          };
        }
      });
      setGrid(newGrid);
    }
  };

  const handleCellClick = (index: number) => {
    const table = grid[index];
    
    // Modo de asignación de mesero
    if (selectedServerId && table) {
      const server = waiters.find(w => w.id === selectedServerId);
      const newGrid = [...grid];
      
      // Si le damos clic al mismo mesero que ya tiene, lo desasignamos
      if (table.serverId === selectedServerId) {
        newGrid[index] = { ...table, serverId: null, serverInitials: undefined };
      } else {
        newGrid[index] = { 
          ...table, 
          serverId: selectedServerId, 
          serverInitials: server?.name.substring(0,2).toUpperCase() 
        };
      }
      setGrid(newGrid);
      return;
    }

    // Modo creación básica
    if (!table && !selectedServerId) {
      let maxNum = 0;
      grid.forEach(c => {
        if (c && c.number > maxNum) maxNum = c.number;
      });
      const newTableNumber = maxNum + 1;
      
      const newGrid = [...grid];
      newGrid[index] = {
        id: `new_${newTableNumber}_${Date.now()}`,
        number: newTableNumber,
        name: `Mesa ${newTableNumber}`
      };
      setGrid(newGrid);
    }
  };

  const handleRemoveTable = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newGrid = [...grid];
    newGrid[index] = null;
    setGrid(newGrid);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const { data: existingTables } = await supabase.from('tables').select('id');
    
    const tablesToUpsert: any[] = [];
    const currentTableIds = new Set<string>();

    grid.forEach((cell, idx) => {
      if (cell) {
        const payload: any = {
          number: cell.number,
          name: cell.name,
          grid_index: idx,
          server_id: cell.serverId || null
        };
        // Si no es nueva, pasamos el id
        if (!cell.id.startsWith('new_')) {
          payload.id = cell.id;
          currentTableIds.add(cell.id);
        }
        tablesToUpsert.push(payload);
      }
    });

    const tablesToDelete = existingTables
      ?.filter(t => !currentTableIds.has(t.id))
      .map(t => t.id) || [];

    if (tablesToDelete.length > 0) {
      await supabase.from('tables').delete().in('id', tablesToDelete);
    }

    if (tablesToUpsert.length > 0) {
      const { error } = await supabase.from('tables').upsert(tablesToUpsert, { onConflict: 'number' });
      if (error) {
        console.error('Error saving tables:', error);
        alert('Hubo un error al guardar.');
      } else {
        alert('Diseño de piso guardado correctamente en Supabase.');
      }
    } else {
      alert('Diseño guardado (mapa vacío).');
    }

    setIsSaving(false);
    fetchTables();
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.title}>Editor de Mapa y Zonas</div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
          <Save size={20} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className={styles.editorLayout}>
        <div className={styles.gridContainer}>
          {grid.map((cell, index) => (
            <div 
              key={index} 
              className={`${styles.cell} ${cell ? styles.tableFilled : styles.cellEmpty}`}
              onClick={() => handleCellClick(index)}
              style={{ position: 'relative' }}
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
                  {!selectedServerId && (
                    <div 
                      className={styles.deleteBtn} 
                      onClick={(e) => handleRemoveTable(index, e)}
                      style={{ position: 'absolute', top: 2, right: 2, cursor: 'pointer', opacity: 0.5 }}
                    >
                      <Trash2 size={12} color="#ff4444" />
                    </div>
                  )}
                </>
              ) : (
                <Plus size={16} color="var(--border-color)" />
              )}
            </div>
          ))}
        </div>

        <div className={styles.sidebar}>
          <div>
            <div className={styles.sideSectionTitle}>Asignación de Zonas</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Selecciona un mesero y haz clic en las mesas para asignarlas/quitarlas.
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
            <button 
              className={styles.addTableBtn} 
              onClick={() => setSelectedServerId(null)}
              style={{ background: !selectedServerId ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}
            >
              <Plus size={20} /> Modo Construcción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import styles from './InventoryDashboard.module.css';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  stock_level: number;
  min_stock_alert: number;
}

export const InventoryDashboard = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (data && !error) {
      setItems(data as InventoryItem[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddDemoItem = async () => {
    const newItem = {
      name: 'Tequila Don Julio 70',
      category: 'liquor',
      unit: 'ml',
      cost_per_unit: 2.50,
      stock_level: 250, // ml
      min_stock_alert: 500, // alert!
    };
    
    await supabase.from('inventory_items').insert(newItem);
    fetchItems();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Control de Inventario</div>
        <button className={styles.addBtn} onClick={handleAddDemoItem}>
          <Plus size={20} /> Agregar Insumo (Demo)
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Categoría</th>
              <th>Costo Unitario</th>
              <th>Nivel de Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay insumos registrados.</td></tr>
            ) : (
              items.map(item => {
                const isLowStock = item.stock_level <= item.min_stock_alert;
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <span className={styles.categoryBadge}>{item.category}</span>
                    </td>
                    <td>${item.cost_per_unit.toFixed(2)} / {item.unit}</td>
                    <td>
                      <span className={isLowStock ? styles.stockAlert : styles.stockNormal}>
                        {isLowStock && <AlertCircle size={16} />}
                        {item.stock_level} {item.unit}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} title="Editar">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import styles from './PurchasingDashboard.module.css';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, ShoppingCart, Send, CheckCircle } from 'lucide-react';

export const PurchasingDashboard = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // 1. Fetch Alertas de Stock (Inventario Global)
    const { data: stockData } = await supabase
      .from('inventory_stock')
      .select(`
        *,
        inventory_items (name, unit, primary_supplier_id),
        locations (name, type)
      `)
      .eq('locations.type', 'global');
      
    if (stockData) {
      const lowStock = stockData.filter(s => s.current_qty <= s.min_par);
      setAlerts(lowStock);
    }

    // 2. Fetch Órdenes de Compra
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (name),
        po_items (qty_ordered, unit_cost)
      `)
      .order('created_at', { ascending: false });
    
    if (poData) setPos(poData);

    // 3. Fetch Suppliers
    const { data: supData } = await supabase.from('suppliers').select('*');
    if (supData) setSuppliers(supData);
  };

  const handleAutoPO = async () => {
    if (alerts.length === 0) {
      alert("No hay insumos por debajo del mínimo.");
      return;
    }

    // Agrupar alertas por proveedor
    const alertsBySupplier = alerts.reduce((acc, alert) => {
      const supId = alert.inventory_items.primary_supplier_id;
      if (!supId) return acc;
      if (!acc[supId]) acc[supId] = [];
      acc[supId].push(alert);
      return acc;
    }, {});

    // Crear POs
    for (const supId of Object.keys(alertsBySupplier)) {
      const itemsToOrder = alertsBySupplier[supId];
      
      const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
        supplier_id: supId,
        status: 'draft',
        total_amount: 0 // Simplificado para la demo
      }).select().single();

      if (po && !poError) {
        const poItemsPayload = itemsToOrder.map((item: any) => ({
          po_id: po.id,
          item_id: item.item_id,
          // Pide lo necesario para llegar al Max Par
          qty_ordered: (item.max_par - item.current_qty) > 0 ? (item.max_par - item.current_qty) : 10,
          unit_cost: 0 // Vendría del item
        }));
        
        await supabase.from('po_items').insert(poItemsPayload);
      }
    }

    alert("Órdenes de Compra generadas en borrador.");
    fetchDashboardData();
  };

  const handleSendPO = async (id: string) => {
    await supabase.from('purchase_orders').update({ status: 'sent' }).eq('id', id);
    alert("Orden enviada por correo al proveedor.");
    fetchDashboardData();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Portal de Compras y Proveedores</div>
        <button className={styles.autoBtn} onClick={handleAutoPO}>
          <ShoppingCart size={18} /> Generar Auto-Pedidos
        </button>
      </div>

      <div className={styles.grid}>
        {/* Alertas de Almacén Global */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <AlertTriangle color="var(--accent-danger)" size={20} />
            Alertas de Stock (Almacén Global)
          </div>
          
          <div className={styles.alertList}>
            {alerts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Niveles óptimos de inventario.</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={styles.alertItem}>
                  <div>
                    <div className={styles.alertName}>{alert.inventory_items?.name}</div>
                    <div className={styles.alertDetails}>
                      Actual: {alert.current_qty} {alert.inventory_items?.unit} | Mínimo: {alert.min_par}
                    </div>
                  </div>
                  <div style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>
                    Faltan {alert.max_par - alert.current_qty} {alert.inventory_items?.unit}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Órdenes de Compra */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Órdenes de Compra Recientes
          </div>
          
          <div className={styles.poList}>
            {pos.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No hay órdenes de compra activas.</p>
            ) : (
              pos.map(po => (
                <div key={po.id} className={styles.poCard}>
                  <div className={styles.poHeader}>
                    <span className={styles.poSupplier}>{po.suppliers?.name}</span>
                    <span className={po.status === 'draft' ? styles.badgeDraft : styles.badgeSent}>
                      {po.status === 'draft' ? 'Borrador' : 'Enviado'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Items solicitados: {po.po_items?.length || 0}
                  </div>
                  
                  {po.status === 'draft' && (
                    <div className={styles.poActions}>
                      <button className={styles.sendBtn} onClick={() => handleSendPO(po.id)}>
                        <Send size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                        Aprobar y Enviar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import styles from './RequisitionsDashboard.module.css';
import { supabase } from '../../lib/supabase';
import { Send, ClipboardCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RequisitionsDashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [globalLocId, setGlobalLocId] = useState('');
  const [requisitions, setRequisitions] = useState<any[]>([]);

  // Form
  const [stationId, setStationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: locData } = await supabase.from('locations').select('*');
    if (locData) {
      setStations(locData.filter(l => l.type !== 'global'));
      const global = locData.find(l => l.type === 'global');
      if (global) setGlobalLocId(global.id);
    }

    const { data: invData } = await supabase.from('inventory_items').select('*');
    if (invData) setItems(invData);

    const { data: reqData } = await supabase
      .from('requisitions')
      .select('*, locations!requisitions_from_location_id_fkey(name), requisition_items(*, inventory_items(name, unit))')
      .order('created_at', { ascending: false });
    
    if (reqData) setRequisitions(reqData);
  };

  const handleCreateRequisition = async () => {
    if (!stationId || !itemId || !qty || !globalLocId) {
      alert("Faltan datos");
      return;
    }

    // 1. Crear Requisición
    const { data: req, error } = await supabase.from('requisitions').insert({
      from_location_id: stationId,
      to_location_id: globalLocId,
      status: 'pending',
      requested_by: user?.id
    }).select().single();

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    // 2. Agregar Item
    await supabase.from('requisition_items').insert({
      requisition_id: req.id,
      item_id: itemId,
      qty_requested: Number(qty)
    });

    alert("¡Requisición enviada a Almacén!");
    setQty('');
    fetchData();
  };

  const handleApprove = async (id: string) => {
    await supabase.from('requisitions').update({
      status: 'approved',
      approved_by: user?.id
    }).eq('id', id);
    alert("Requisición Aprobada (El stock se ha transferido virtualmente).");
    fetchData();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Requisiciones de Insumos</div>
      </div>

      <div className={styles.grid}>
        {/* Crear Requisición */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Send size={20} /> Solicitar a Almacén Global
          </div>
          
          <div className={styles.formGroup}>
            <label>Mi Estación (Quien pide)</label>
            <select className={styles.input} value={stationId} onChange={e => setStationId(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {stations.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Insumo Requerido</label>
            <select className={styles.input} value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Cantidad</label>
            <input type="number" className={styles.input} value={qty} onChange={e => setQty(e.target.value)} />
          </div>

          <button className={styles.submitBtn} onClick={handleCreateRequisition}>
            Enviar Petición
          </button>
        </div>

        {/* Lista de Requisiciones Pendientes (Vista Almacenista) */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <ClipboardCheck size={20} /> Bandeja de Entrada (Almacén)
          </div>
          
          <div className={styles.reqList}>
            {requisitions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No hay peticiones activas.</p>
            ) : (
              requisitions.map(req => (
                <div key={req.id} className={styles.reqCard}>
                  <div className={styles.reqHeader}>
                    <span className={styles.reqStation}>Para: {req.locations?.name}</span>
                    <span className={req.status === 'pending' ? styles.badgePending : styles.badgeApproved}>
                      {req.status === 'pending' ? 'Pendiente' : 'Aprobado'}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: '0.5rem' }}>
                    {req.requisition_items?.map((ri: any) => (
                      <div key={ri.id} style={{ fontSize: '0.9rem' }}>
                        - {ri.qty_requested} {ri.inventory_items?.unit} de {ri.inventory_items?.name}
                      </div>
                    ))}
                  </div>
                  
                  {req.status === 'pending' && (
                    <div className={styles.reqActions}>
                      <button className={styles.actionBtn} onClick={() => handleApprove(req.id)}>
                        <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                        Aprobar y Entregar
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

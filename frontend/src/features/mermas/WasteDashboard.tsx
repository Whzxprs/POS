'use client';

import React, { useState, useEffect } from 'react';
import styles from './WasteDashboard.module.css';
import { supabase } from '../../lib/supabase';
import { Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const WasteDashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Form
  const [itemId, setItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Caducidad');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: invData } = await supabase.from('inventory_items').select('*');
    const { data: locData } = await supabase.from('locations').select('*');
    const { data: logsData } = await supabase
      .from('inventory_transactions')
      .select('*, inventory_items(name), locations(name), profiles(name)')
      .eq('type', 'waste')
      .order('timestamp', { ascending: false });

    if (invData) setItems(invData);
    if (locData) setLocations(locData);
    if (logsData) setLogs(logsData);
  };

  const handleSubmit = async () => {
    if (!itemId || !locationId || !qty || !reason) {
      alert('Llena todos los campos');
      return;
    }

    const { error } = await supabase.from('inventory_transactions').insert({
      item_id: itemId,
      location_id: locationId,
      type: 'waste',
      qty: -Math.abs(Number(qty)),
      reason: reason,
      performed_by: user?.id
    });

    if (error) {
      alert('Error registrando merma: ' + error.message);
    } else {
      alert('Merma registrada exitosamente.');
      // Aquí se descontaría del inventory_stock en la vida real mediante un Trigger en Supabase
      setItemId('');
      setQty('');
      fetchData();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Registro de Mermas y Desperdicios</div>
      </div>

      <div className={styles.card}>
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '5px' }}/>
          Todo registro de merma impacta directamente el Food Cost y será auditado por gerencia.
        </div>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Estación / Almacén</label>
            <select className={styles.input} value={locationId} onChange={e => setLocationId(e.target.value)}>
              <option value="">Selecciona área...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label>Insumo Mermado</label>
            <select className={styles.input} value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">Selecciona insumo...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Cantidad Perdida</label>
            <input type="number" step="0.01" className={styles.input} placeholder="Ej. 1.5" value={qty} onChange={e => setQty(e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Motivo</label>
            <select className={styles.input} value={reason} onChange={e => setReason(e.target.value)}>
              <option value="Caducidad">Caducidad</option>
              <option value="Error de Producción">Error de Producción</option>
              <option value="Contaminación Cruzada">Contaminación Cruzada</option>
              <option value="Caída / Rotura">Caída / Rotura</option>
              <option value="Muestra / Prueba">Muestra / Prueba</option>
            </select>
          </div>
        </div>

        <button className={styles.submitBtn} onClick={handleSubmit}>
          <Trash2 size={18} /> Registrar Merma Definitiva
        </button>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: '1rem' }}>Historial de Mermas (Bitácora)</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Insumo</th>
              <th>Área</th>
              <th>Cantidad</th>
              <th>Motivo</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</td>
                <td style={{ fontWeight: 600 }}>{log.inventory_items?.name}</td>
                <td>{log.locations?.name}</td>
                <td style={{ color: 'var(--accent-danger)' }}>{log.qty}</td>
                <td>{log.reason}</td>
                <td>{log.profiles?.name}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sin registros recientes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

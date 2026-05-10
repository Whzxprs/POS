'use client';

import React, { useState, useEffect } from 'react';
import styles from './StaffPortal.module.css';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Plane } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StaffPortal = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  
  // Time off state
  const [type, setType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('schedules')
      .select('*, locations(name)')
      .eq('employee_id', user?.id)
      .gte('shift_date', new Date().toISOString().split('T')[0])
      .order('shift_date', { ascending: true })
      .limit(7);

    if (data) setSchedules(data);
  };

  const handleSubmitRequest = async () => {
    if (!startDate || !endDate) {
      alert("Selecciona las fechas.");
      return;
    }
    
    const { error } = await supabase.from('time_off_requests').insert({
      employee_id: user?.id,
      type,
      start_date: startDate,
      end_date: endDate,
      reason,
      status: 'pending'
    });

    if (error) {
      alert("Error enviando solicitud.");
    } else {
      alert("¡Solicitud enviada al gerente exitosamente!");
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Mi Portal (Recursos Humanos)</div>
        <p style={{ color: 'var(--text-secondary)' }}>Hola, {user?.name}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <Clock size={20} /> Mis Próximos Turnos
        </div>
        
        <div className={styles.scheduleList}>
          {schedules.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No tienes turnos programados próximos.</p>
          ) : (
            schedules.map(shift => (
              <div key={shift.id} className={styles.shiftItem}>
                <div>
                  <div className={styles.shiftDay}>{new Date(shift.shift_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short'})}</div>
                  <div className={styles.shiftTime}>{shift.start_time.substring(0,5)} - {shift.end_time.substring(0,5)}</div>
                </div>
                <div className={styles.shiftLocation}>
                  {shift.locations?.name || 'Por asignar'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <Plane size={20} /> Solicitar Vacaciones / Permiso
        </div>
        
        <div className={styles.formGroup}>
          <label>Tipo de Permiso</label>
          <select className={styles.input} value={type} onChange={e => setType(e.target.value)}>
            <option value="vacation">Vacaciones</option>
            <option value="sick_leave">Incapacidad Médica</option>
            <option value="day_off">Cambio de Descanso</option>
            <option value="other">Otro Permiso Especial</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className={styles.formGroup}>
            <label>Fecha de Inicio</label>
            <input type="date" className={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Fecha de Fin</label>
            <input type="date" className={styles.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Motivo / Detalles (Opcional)</label>
          <textarea className={styles.input} rows={3} value={reason} onChange={e => setReason(e.target.value)}></textarea>
        </div>

        <button className={styles.submitBtn} onClick={handleSubmitRequest}>
          <Calendar size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Enviar Solicitud
        </button>
      </div>
    </div>
  );
};

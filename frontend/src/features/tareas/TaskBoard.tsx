'use client';

import React, { useState, useMemo } from 'react';
import styles from './TaskBoard.module.css';
import { Clock, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'verified';
type Area = 'piso' | 'barra' | 'cocina' | 'general';

interface Task {
  id: string;
  title: string;
  area: Area;
  status: TaskStatus;
  scheduledTime?: string;
}

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Encender cafeteras y verificar molinos', area: 'barra', status: 'todo', scheduledTime: '08:00 AM' },
  { id: '2', title: 'Alineación de mesas (Piso)', area: 'piso', status: 'todo' },
  { id: '3', title: 'Limpieza profunda de cava', area: 'barra', status: 'in_progress' },
  { id: '4', title: 'Recepción de insumos frescos', area: 'cocina', status: 'in_progress' },
  { id: '5', title: 'Conteo caja chica', area: 'general', status: 'done' },
];

export const TaskBoard = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [storeOpen, setStoreOpen] = useState(false);

  // Derivar estado: ¿Están todas las tareas pre-apertura completadas o verificadas?
  // Para la regla de negocio: "No puedes marcar Restaurante Abierto hasta que checklists estén en Done"
  const canOpenStore = useMemo(() => {
    // Definimos que todas las tareas de piso, barra y cocina deben estar mínimo en 'done'
    const criticalTasks = tasks.filter(t => ['piso', 'barra', 'cocina'].includes(t.area));
    const allCriticalCompleted = criticalTasks.every(t => t.status === 'done' || t.status === 'verified');
    return criticalTasks.length > 0 && allCriticalCompleted;
  }, [tasks]);

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const renderColumn = (statusKey: TaskStatus | 'done_group', title: string) => {
    // Si la columna es "Done", agrupar 'done' y 'verified'
    const colTasks = statusKey === 'done_group' 
      ? tasks.filter(t => t.status === 'done' || t.status === 'verified')
      : tasks.filter(t => t.status === statusKey);

    return (
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          {title} <span className={styles.taskCount}>{colTasks.length}</span>
        </div>
        <div className={styles.taskList}>
          {colTasks.map(task => (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.taskArea}>{task.area}</span>
              </div>
              
              {task.scheduledTime && (
                <div className={`${styles.taskTime} ${task.status === 'todo' ? styles.timeWarning : ''}`}>
                  <Clock size={12} /> Programada: {task.scheduledTime}
                </div>
              )}

              <div className={styles.taskActions}>
                {task.status === 'todo' && (
                  <button className={styles.actionBtn} onClick={() => updateTaskStatus(task.id, 'in_progress')}>
                    Iniciar
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button className={styles.actionBtn} onClick={() => updateTaskStatus(task.id, 'done')}>
                    Marcar Listo
                  </button>
                )}
                {task.status === 'done' && (
                  <button className={`${styles.actionBtn} ${styles.verifyBtn}`} onClick={() => updateTaskStatus(task.id, 'verified')}>
                    <ShieldCheck size={14} /> Verificar (Manager)
                  </button>
                )}
                {task.status === 'verified' && (
                  <div className={styles.verifiedBadge}>
                    <CheckCircle size={14} /> Verificado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Top Bar: Store Status Controller */}
      <div className={styles.topBar}>
        <div className={styles.statusSection}>
          <div className={styles.statusIndicator}>
            <div className={`${styles.statusDot} ${storeOpen ? styles.dotGreen : styles.dotRed}`} />
            Estado del Servicio: {storeOpen ? 'ABIERTO' : 'CERRADO'}
          </div>
          {!storeOpen && !canOpenStore && (
            <div className={styles.warningText}>
              <AlertCircle size={16} /> 
              Completa los checklists de áreas operativas para poder abrir.
            </div>
          )}
        </div>
        
        <button 
          className={`${styles.openBtn} ${!storeOpen && canOpenStore ? styles.openBtnActive : styles.openBtnDisabled}`}
          disabled={storeOpen || !canOpenStore}
          onClick={() => {
            if (canOpenStore) setStoreOpen(true);
          }}
        >
          {storeOpen ? 'Servicio en Curso' : 'Iniciar Servicio (Abrir)'}
        </button>
      </div>

      {/* Kanban Board */}
      <div className={styles.kanbanBoard}>
        {renderColumn('todo', 'Pendientes (To-Do)')}
        {renderColumn('in_progress', 'En Progreso')}
        {renderColumn('done_group', 'Completadas / Verificación')}
      </div>
    </div>
  );
};

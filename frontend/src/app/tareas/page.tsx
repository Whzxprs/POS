import { TaskBoard } from '../../features/tareas/TaskBoard';

export default function TareasPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Gestión de Operaciones</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Aseguramiento de Calidad y Checklists
          </p>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        <TaskBoard />
      </div>
    </div>
  );
}

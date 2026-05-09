import { KDSBoard } from '../../features/cocina/KDSBoard';

export default function CocinaPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>KDS - Cocina Principal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Visualización en Vivo • Todas las estaciones
          </p>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        <KDSBoard area="cocina" />
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface InventoryModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  status: 'ready' | 'in-progress' | 'completed';
}

export const InventoryDashboardNavPage: React.FC = () => {
  const navigate = useNavigate();

  const modules: InventoryModule[] = [
    {
      id: 'physical-count',
      title: '📊 Gestión de Conteos',
      description: 'Crea nuevos conteos, carga datos del ERP y registra existencias físicas.',
      icon: '📊',
      color: '#6366f1',
      route: '/inventory/counts',
      status: 'ready',
    },
    {
      id: 'variance-reports',
      title: '📈 Varianzas y Análisis',
      description: 'Analiza discrepancias entre stock teórico y físico para ajustes precisos.',
      icon: '📈',
      color: '#8b5cf6',
      route: '/inventory/variances',
      status: 'ready',
    },
    {
      id: 'mapping-config',
      title: '🗺️ Mapeo de Datos',
      description: 'Configura la estructura de comunicación entre tu sistema y el ERP.',
      icon: '🗺️',
      color: '#06b6d4',
      route: '/admin/mapping',
      status: 'ready',
    },
  ];

  const styles = {
    container: {
      padding: '40px 20px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '40px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#1f2937',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '30px',
    },
    flowDiagram: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '50px',
      flexWrap: 'wrap' as const,
      backgroundColor: '#f3f4f6',
      padding: '20px',
      borderRadius: '8px',
    },
    flowStep: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
    arrow: {
      fontSize: '20px',
      color: '#9ca3af',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    card: {
      padding: '24px',
      borderRadius: '8px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    cardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderColor: '#d1d5db',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
    },
    cardIcon: {
      fontSize: '32px',
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
    },
    cardDescription: {
      fontSize: '14px',
      color: '#6b7280',
      lineHeight: '1.5',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      marginTop: '12px',
      backgroundColor: '#10b98130',
      color: '#047857',
    },
    section: {
      marginBottom: '40px',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#1f2937',
    },
    instructionsBox: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '8px',
      padding: '20px',
      marginTop: '40px',
    },
    instructionsTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: '12px',
    },
    instructionsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    instructionsItem: {
      padding: '8px 0',
      color: '#1e40af',
      fontSize: '14px',
    },
  };

  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📦 Centro de Inventario</h1>
        <p style={styles.subtitle}>
          Gestiona tu inventario: desde exploración de datos hasta sincronización con el ERP
        </p>
      </div>

      {/* Flujo Visual */}
      <div style={styles.flowDiagram}>
        <div style={styles.flowStep}>
          <span>🗺️ Mapping</span>
          <span style={styles.arrow}>→</span>
        </div>
        <div style={styles.flowStep}>
          <span>📊 Conteo</span>
          <span style={styles.arrow}>→</span>
        </div>
        <div style={styles.flowStep}>
          <span>📈 Análisis</span>
          <span style={styles.arrow}>→</span>
        </div>
        <div style={styles.flowStep}>
          <span>🚀 Sincronización ERP</span>
        </div>
      </div>

      {/* Sección de Módulos de Inventario */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Módulos Principales</h2>
        <div style={styles.grid}>
          {modules.map((module) => (
            <div
              key={module.id}
              style={{
                ...styles.card,
                ...(hoveredCard === module.id ? styles.cardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(module.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick(module.route)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>{module.icon}</div>
                <h3 style={styles.cardTitle}>{module.title}</h3>
              </div>
              <p style={styles.cardDescription}>{module.description}</p>
              <div style={styles.statusBadge}>✓ Listo para usar</div>
            </div>
          ))}
        </div>
      </div>

      {/* Instrucciones */}
      <div style={styles.instructionsBox}>
        <h3 style={styles.instructionsTitle}>📖 Guía de Operación</h3>
        <ul style={styles.instructionsList}>
          <li style={styles.instructionsItem}>
            <strong>1. Mapeo:</strong> Define cómo se comunican las tablas del ERP con el sistema (Usa "Mapeo de Datos").
          </li>
          <li style={styles.instructionsItem}>
            <strong>2. Conteo:</strong> Crea un nuevo proceso, selecciona el almacén e inicia el registro (Usa "Gestión de Conteos").
          </li>
          <li style={styles.instructionsItem}>
            <strong>3. Varianzas:</strong> Al finalizar el conteo, analiza automáticamente las discrepancias detectadas.
          </li>
          <li style={styles.instructionsItem}>
            <strong>4. Sincronizar:</strong> Envía los resultados finales al ERP una vez aprobadas las varianzas.
          </li>
        </ul>
      </div>

      {/* Tips */}
      <div style={styles.instructionsBox}>
        <h3 style={styles.instructionsTitle}>💡 Tips</h3>
        <ul style={styles.instructionsList}>
          <li style={styles.instructionsItem}>
            Use Query Explorer para explorar estructuras antes de crear mappings permanentes
          </li>
          <li style={styles.instructionsItem}>
            Puede guardar queries desde Query Explorer como mappings reutilizables
          </li>
          <li style={styles.instructionsItem}>
            La estrategia REPLACE (Sync) actualiza cantidades; ADD aplica varianzas
          </li>
          <li style={styles.instructionsItem}>
            Siempre valide resultados antes de sincronizar al ERP
          </li>
        </ul>
      </div>
    </div>
  );
};

export default InventoryDashboardNavPage;

import React from 'react';
import { FiFileText, FiPlus } from 'react-icons/fi';

const Contrats = () => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestion des contrats</h1>
        <button style={styles.addButton}>
          <FiPlus /> Nouveau contrat
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FiFileText size={24} color="#2563eb" />
          <div>
            <div style={styles.statLabel}>Total contrats</div>
            <div style={styles.statValue}>0</div>
          </div>
        </div>
      </div>

      <div style={styles.emptyState}>
        <p style={styles.emptyText}>Aucun contrat trouvé</p>
        <button style={styles.createButton}>
          <FiPlus /> Créer votre premier contrat
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: 0
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#666'
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  emptyText: {
    color: '#666',
    marginBottom: '1rem'
  },
  createButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  }
};

export default Contrats;
// frontend/src/pages/Parametres/TauxChange.jsx

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const TauxChange = () => {
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    chargerDevises();
  }, []);

  const chargerDevises = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/devises');
      
      if (res.data && Array.isArray(res.data)) {
        setDevises(res.data);
        // Trouver la date de dernière mise à jour
        const lastUpdateDate = res.data.find(d => d.date_mise_a_jour)?.date_mise_a_jour;
        if (lastUpdateDate) {
          setLastUpdate(new Date(lastUpdateDate));
        }
      } else {
        setDevises([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement devises:', error);
      setError('Erreur lors du chargement des devises');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value) => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('fr-FR');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Chargement des devises...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>💰 Gestion des taux de change</h2>
        <p style={styles.subtitle}>
          Les taux de change sont mis à jour automatiquement toutes les 24 heures.
          {lastUpdate && (
            <span style={styles.lastUpdate}>
              Dernière mise à jour : {formatDate(lastUpdate)}
            </span>
          )}
        </p>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Devise</th>
              <th style={styles.th}>Symbole</th>
              <th style={styles.th}>Taux de change (1 X = CDF)</th>
              <th style={styles.th}>Dernière mise à jour</th>
             </tr>
          </thead>
          <tbody>
            {devises.length === 0 ? (
              <tr>
                <td colSpan="5" style={styles.emptyState}>
                  Aucune devise trouvée
                </td>
              </tr>
            ) : (
              devises.map((devise) => (
                <tr key={devise.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <strong>{devise.code || 'N/A'}</strong>
                  </td>
                  <td style={styles.td}>{devise.nom || 'N/A'}</td>
                  <td style={styles.td}>{devise.symbole || 'N/A'}</td>
                  <td style={styles.td}>
                    <span style={styles.tauxValue}>
                      {formatNumber(devise.taux_change_actuel)} CDF
                    </span>
                  </td>
                  <td style={styles.td}>
                    {formatDate(devise.date_mise_a_jour)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          ℹ️ Les taux de change sont mis à jour automatiquement depuis une API externe toutes les 24 heures.
          Les valeurs sont utilisées pour convertir automatiquement les montants des actifs acquis en devises étrangères.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: 0,
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  lastUpdate: {
    fontSize: '0.75rem',
    color: '#059669',
    marginTop: '0.25rem'
  },
  tableWrapper: {
    overflowX: 'auto',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb'
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  },
  tableRow: {
    transition: 'background-color 0.2s'
  },
  tauxValue: {
    fontWeight: '500',
    color: '#059669'
  },
  loading: {
    textAlign: 'center',
    padding: '3rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-secondary)'
  },
  infoBox: {
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd'
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#0369a1',
    margin: 0
  }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  tr:hover {
    background-color: #f9fafb;
  }
`;
document.head.appendChild(styleSheet);

export default TauxChange;
// frontend/src/pages/Rapports/SuiviInvestissements.jsx

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import {
  FiTrendingUp, FiDollarSign, FiPieChart, FiBarChart2,
  FiCalendar, FiRefreshCw, FiDownload, FiChevronDown,
  FiChevronUp, FiAlertCircle, FiCheckCircle, FiXCircle
} from 'react-icons/fi';

const SuiviInvestissements = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('graph');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/reports/suivi-investissements?annee=${annee}`);
      
      console.log('📊 Données reçues:', response.data);
      
      if (response.data.annee) {
        setData([response.data]);
      } else if (Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.response?.data?.message || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [annee]);

  const handleExport = async (format = 'csv') => {
    try {
      setExporting(true);
      const response = await api.get(`/reports/suivi-investissements/export?format=${format}&annee=${annee}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `suivi_investissements_${annee}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export:', err);
      alert('Erreur lors de l\'export des données');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getTauxRealisationColor = (taux) => {
    if (taux >= 100) return '#ef4444';
    if (taux >= 80) return '#f59e0b';
    if (taux >= 50) return '#10b981';
    return 'var(--text-secondary)';
  };

  const getTauxRealisationIcon = (taux) => {
    if (taux >= 100) return <FiXCircle size={16} color="#ef4444" />;
    if (taux >= 80) return <FiAlertCircle size={16} color="#f59e0b" />;
    if (taux >= 50) return <FiCheckCircle size={16} color="#10b981" />;
    return <FiTrendingUp size={16} color='var(--text-secondary)' />;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={styles.customTooltip}>
          <p style={styles.tooltipTitle}>Année {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '0.25rem 0' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement des données d'investissements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FiAlertCircle size={48} color="#ef4444" />
        <h3 style={styles.errorTitle}>Erreur de chargement</h3>
        <p style={styles.errorText}>{error}</p>
        <button onClick={fetchData} style={styles.retryButton}>
          <FiRefreshCw /> Réessayer
        </button>
      </div>
    );
  }

  const currentData = data[0] || { annee, realise: 0, budget: 0 };
  const tauxRealisation = currentData.budget ? (currentData.realise / currentData.budget) * 100 : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <FiTrendingUp size={28} color="#f59e0b" />
          </div>
          <div>
            <h1 style={styles.title}>Suivi des investissements</h1>
            <p style={styles.subtitle}>
              Analyse comparative des budgets prévisionnels et réalisés
            </p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...styles.filterButton,
              backgroundColor: showFilters ? 'var(--border-color)' : 'var(--bg-primary)'
            }}
          >
            <FiCalendar /> {annee}
            {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          <button
            onClick={() => handleExport('csv')}
            style={styles.exportButton}
            disabled={exporting || data.length === 0}
          >
            <FiDownload /> {exporting ? 'Export...' : 'Exporter'}
          </button>
          <button
            onClick={fetchData}
            style={styles.refreshButton}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div style={styles.filtersCard}>
          <h3 style={styles.filtersTitle}>
            <FiCalendar size={16} /> Sélectionner une année
          </h3>
          <div style={styles.filtersContent}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Année</label>
              <select 
                value={annee} 
                onChange={(e) => setAnnee(parseInt(e.target.value))}
                style={styles.filterSelect}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(an => (
                  <option key={an} value={an}>{an}</option>
                ))}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Mode d'affichage</label>
              <div style={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('graph')}
                  style={viewMode === 'graph' ? styles.viewActive : styles.viewButton}
                >
                  <FiBarChart2 size={14} /> Graphique
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={viewMode === 'table' ? styles.viewActive : styles.viewButton}
                >
                  <FiPieChart size={14} /> Tableau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cartes récapitulatives */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <FiDollarSign size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Budget prévisionnel</span>
            <span style={styles.statValue}>{formatCurrency(currentData.budget)}</span>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#d1fae5', color: '#10b981' }}>
            <FiTrendingUp size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Réalisé</span>
            <span style={styles.statValue}>{formatCurrency(currentData.realise)}</span>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fee2e2', color: '#ef4444' }}>
            <FiXCircle size={24} />
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Écart</span>
            <span style={{
              ...styles.statValue,
              color: currentData.realise > currentData.budget ? '#ef4444' : '#10b981'
            }}>
              {formatCurrency(Math.abs(currentData.budget - currentData.realise))}
              <span style={styles.statUnit}>
                {currentData.realise > currentData.budget ? ' (dépassement)' : ' (sous-budget)'}
              </span>
            </span>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e0e7ff', color: '#6366f1' }}>
            {getTauxRealisationIcon(tauxRealisation)}
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Taux de réalisation</span>
            <span style={{
              ...styles.statValue,
              color: getTauxRealisationColor(tauxRealisation)
            }}>
              {tauxRealisation.toFixed(1)}%
            </span>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${Math.min(100, tauxRealisation)}%`,
                backgroundColor: getTauxRealisationColor(tauxRealisation)
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Graphique ou Tableau */}
      {data.length > 0 ? (
        viewMode === 'graph' ? (
          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <FiBarChart2 size={18} /> Évolution des investissements
              </h3>
              <span style={styles.cardSubtitle}>
                Comparaison budget vs réalisé par année
              </span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke='var(--border-color)' />
                <XAxis dataKey="annee" stroke='var(--text-secondary)' />
                <YAxis stroke='var(--text-secondary)' tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="budget" fill="#f59e0b" name="Budget prévisionnel" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realise" fill="#10b981" name="Réalisé" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <FiPieChart size={18} /> Détail des investissements
              </h3>
              <span style={styles.cardSubtitle}>
                {data.length} année{data.length > 1 ? 's' : ''} disponible{data.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Année</th>
                    <th style={styles.th}>Budget (CDF)</th>
                    <th style={styles.th}>Réalisé (CDF)</th>
                    <th style={styles.th}>Écart (CDF)</th>
                    <th style={styles.th}>Taux de réalisation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => {
                    const taux = item.budget ? (item.realise / item.budget) * 100 : 0;
                    const isOverBudget = item.realise > item.budget;
                    return (
                      <tr key={index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>
                          <strong style={styles.yearCell}>{item.annee}</strong>
                        </td>
                        <td style={styles.td}>{formatCurrency(item.budget)}</td>
                        <td style={styles.td}>{formatCurrency(item.realise)}</td>
                        <td style={{
                          ...styles.td,
                          color: isOverBudget ? '#ef4444' : '#10b981',
                          fontWeight: '500'
                        }}>
                          {isOverBudget ? '+' : '-'}{formatCurrency(Math.abs(item.budget - item.realise))}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.progressWrapper}>
                            <div style={styles.progressBarTable}>
                              <div style={{
                                ...styles.progressFillTable,
                                width: `${Math.min(100, taux)}%`,
                                backgroundColor: getTauxRealisationColor(taux)
                              }} />
                            </div>
                            <span style={{
                              ...styles.progressTextTable,
                              color: getTauxRealisationColor(taux)
                            }}>
                              {taux.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div style={styles.emptyState}>
          <FiAlertCircle size={64} color="#cbd5e1" />
          <h3 style={styles.emptyTitle}>Aucune donnée disponible</h3>
          <p style={styles.emptyText}>
            Aucune donnée d'investissement trouvée pour l'année {annee}
          </p>
          <button onClick={() => setAnnee(new Date().getFullYear())} style={styles.emptyButton}>
            Voir l'année en cours
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    backgroundColor: 'var(--bg-card)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  refreshButton: {
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s'
  },
  filtersCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    animation: 'slideDown 0.3s ease'
  },
  filtersTitle: {
    margin: '0 0 1rem 0',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  filtersContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  filterSelect: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    transition: 'all 0.2s'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '10px',
    padding: '0.25rem'
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  },
  viewActive: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 0.2s'
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statInfo: {
    flex: 1
  },
  statLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.25rem'
  },
  statValue: {
    display: 'block',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  statUnit: {
    fontSize: '0.7rem',
    fontWeight: 'normal',
    color: '#94a3b8',
    marginLeft: '0.25rem'
  },
  progressBar: {
    marginTop: '0.5rem',
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '2px'
  },
  chartCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tableCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f1f5f9'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cardSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    fontSize: '0.75rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#1e293b',
    borderBottom: '1px solid #f1f5f9'
  },
  trEven: {
    backgroundColor: 'var(--bg-card)'
  },
  trOdd: {
    backgroundColor: '#fafafa'
  },
  yearCell: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#2563eb'
  },
  progressWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  progressBarTable: {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFillTable: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '3px'
  },
  progressTextTable: {
    fontSize: '0.75rem',
    fontWeight: '600',
    minWidth: '45px'
  },
  customTooltip: {
    backgroundColor: 'var(--bg-card)',
    padding: '0.75rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  tooltipTitle: {
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    color: 'var(--text-primary)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  errorTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '1rem 0 0.5rem 0'
  },
  errorText: {
    color: 'var(--text-secondary)',
    marginBottom: '1.5rem'
  },
  retryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '1rem 0 0.5rem 0'
  },
  emptyText: {
    color: 'var(--text-secondary)',
    marginBottom: '1.5rem'
  },
  emptyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  }
};

// Ajout des animations globales
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(styleSheet);

export default SuiviInvestissements;
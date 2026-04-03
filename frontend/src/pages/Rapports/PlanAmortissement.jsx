// frontend/src/pages/Rapports/PlanAmortissement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { 
  FiCalendar, FiRefreshCw, FiDownload, 
  FiTrendingUp, FiTrendingDown, FiBarChart2,
  FiPieChart, FiEye, FiFileText, FiDollarSign
} from 'react-icons/fi';

const PlanAmortissement = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('chart');
  const [totaux, setTotaux] = useState({
    valeur_brute: 0,
    annuite: 0,
    cumul: 0,
    vnc: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/reports/tableau-amortissements?exercice=${exercice}`);
      
      console.log('📊 Données reçues:', response.data);
      
      const amortissements = response.data.amortissements || [];
      setData(amortissements);
      setTotaux({
        valeur_brute: amortissements.reduce((s, i) => s + (i.valeur_brute || 0), 0),
        annuite: amortissements.reduce((s, i) => s + (i.annuite || 0), 0),
        cumul: amortissements.reduce((s, i) => s + (i.cumul || 0), 0),
        vnc: amortissements.reduce((s, i) => s + (i.vnc || 0), 0)
      });
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleExport = () => {
    console.log('Export des données');
  };

  const handleViewActif = (actifId) => {
    if (actifId) {
      navigate(`/actifs/${actifId}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, [exercice]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `${(value || 0).toLocaleString()} FC`;
    }
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  const annees = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FiTrendingDown size={48} color="#ef4444" />
        <p>{error}</p>
        <button onClick={fetchData} style={styles.retryButton}>
          <FiRefreshCw /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <FiTrendingUp style={styles.titleIcon} />
            Plan d'amortissement
          </h1>
          <p style={styles.subtitle}>
            Suivi des amortissements pour l'exercice {exercice}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleExport} style={styles.iconButton} title="Exporter">
            <FiDownload />
          </button>
          <button onClick={handleRefresh} style={styles.refreshButton} disabled={refreshing}>
            <FiRefreshCw className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterBar}>
          <FiCalendar size={18} style={styles.filterIcon} />
          <span style={styles.filterLabel}>Exercice :</span>
          <select 
            value={exercice} 
            onChange={(e) => setExercice(parseInt(e.target.value))}
            style={styles.select}
          >
            {annees.map(an => (
              <option key={an} value={an}>{an}</option>
            ))}
          </select>
        </div>
        
        <div style={styles.viewToggle}>
          <button 
            onClick={() => setViewMode('chart')}
            style={viewMode === 'chart' ? styles.viewActive : styles.viewButton}
            title="Vue graphique"
          >
            <FiBarChart2 />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            style={viewMode === 'table' ? styles.viewActive : styles.viewButton}
            title="Vue tableau"
          >
            <FiFileText />
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIconWrapper}>
            <FiDollarSign size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatCurrency(totaux.valeur_brute)}</div>
            <div style={styles.summaryLabel}>Valeur brute totale</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#dbeafe' }}>
            <FiTrendingUp size={20} color="#2563eb" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatCurrency(totaux.annuite)}</div>
            <div style={styles.summaryLabel}>Annuité totale</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#fef3c7' }}>
            <FiTrendingDown size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatCurrency(totaux.cumul)}</div>
            <div style={styles.summaryLabel}>Cumul total</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#fee2e2' }}>
            <FiFileText size={20} color="#ef4444" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatCurrency(totaux.vnc)}</div>
            <div style={styles.summaryLabel}>VNC totale</div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={styles.emptyContainer}>
          <FiFileText size={48} color="#cbd5e1" />
          <p>Aucune donnée disponible pour l'exercice {exercice}</p>
          <button onClick={fetchData} style={styles.retryButton}>
            <FiRefreshCw /> Actualiser
          </button>
        </div>
      ) : (
        <>
          {/* Contrôle du type de graphique (uniquement en vue graphique) */}
          {viewMode === 'chart' && (
            <div style={styles.chartControls}>
              <button 
                onClick={() => setChartType('bar')}
                style={chartType === 'bar' ? styles.chartTypeActive : styles.chartTypeButton}
                title="Graphique en barres"
              >
                <FiBarChart2 /> Barres
              </button>
              <button 
                onClick={() => setChartType('line')}
                style={chartType === 'line' ? styles.chartTypeActive : styles.chartTypeButton}
                title="Graphique en lignes"
              >
                <FiTrendingUp /> Lignes
              </button>
              <button 
                onClick={() => setChartType('area')}
                style={chartType === 'area' ? styles.chartTypeActive : styles.chartTypeButton}
                title="Graphique en aires"
              >
                <FiPieChart /> Aires
              </button>
            </div>
          )}

          {/* Vue Graphique */}
          {viewMode === 'chart' && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>
                {chartType === 'bar' && 'Amortissements par actif (barres)'}
                {chartType === 'line' && 'Évolution des amortissements'}
                {chartType === 'area' && 'Répartition des valeurs'}
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'bar' && (
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="annuite" fill="#3b82f6" name="Annuité" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cumul" fill="#10b981" name="Cumul" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="vnc" fill="#f59e0b" name="VNC" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
                {chartType === 'line' && (
                  <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="annuite" stroke="#3b82f6" name="Annuité" strokeWidth={2} />
                    <Line type="monotone" dataKey="cumul" stroke="#10b981" name="Cumul" strokeWidth={2} />
                    <Line type="monotone" dataKey="vnc" stroke="#f59e0b" name="VNC" strokeWidth={2} />
                  </LineChart>
                )}
                {chartType === 'area' && (
                  <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="vnc" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="VNC" />
                    <Area type="monotone" dataKey="cumul" stackId="1" stroke="#10b981" fill="#10b981" name="Cumul" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Vue Tableau */}
          {viewMode === 'table' && (
            <div style={styles.tableCard}>
              <div style={styles.tableHeader}>
                <h3 style={styles.chartTitle}>Détail des amortissements - Exercice {exercice}</h3>
                <div style={styles.tableStats}>
                  <span>{data.length} actif(s)</span>
                  <span>Total annuités: {formatCurrency(totaux.annuite)}</span>
                </div>
              </div>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Code actif</th>
                      <th style={styles.th}>Nom actif</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Compte</th>
                      <th style={styles.th}>Valeur brute</th>
                      <th style={styles.th}>Annuité</th>
                      <th style={styles.th}>Cumul</th>
                      <th style={styles.th}>VNC</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>
                          <span style={styles.codeBadge}>{item.actif_code}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.nomCell}>{item.actif_nom}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.typeBadge}>{item.type || 'N/A'}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.compteBadge}>{item.compte}</span>
                        </td>
                        <td style={styles.tdRight}>{formatCurrency(item.valeur_brute)}</td>
                        <td style={styles.tdRight}>{formatCurrency(item.annuite)}</td>
                        <td style={styles.tdRight}>{formatCurrency(item.cumul)}</td>
                        <td style={styles.tdRight}>
                          <span style={{ fontWeight: '600', color: item.vnc > 0 ? '#2563eb' : '#ef4444' }}>
                            {formatCurrency(item.vnc)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button 
                            onClick={() => handleViewActif(item.actif_id)}
                            style={styles.viewButton}
                            title="Voir l'actif"
                          >
                            <FiEye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={styles.tfoot}>
                      <td colSpan="4" style={styles.td}><strong>Total</strong></td>
                      <td style={styles.tdRight}><strong>{formatCurrency(totaux.valeur_brute)}</strong></td>
                      <td style={styles.tdRight}><strong>{formatCurrency(totaux.annuite)}</strong></td>
                      <td style={styles.tdRight}><strong>{formatCurrency(totaux.cumul)}</strong></td>
                      <td style={styles.tdRight}><strong>{formatCurrency(totaux.vnc)}</strong></td>
                      <td style={styles.td}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============ STYLES ============

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 64px)',
    backgroundColor: 'var(--bg-primary)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1.8rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  titleIcon: {
    color: '#3b82f6'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginTop: '0.5rem'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc',
      borderColor: '#cbd5e1'
    }
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--bg-card)',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#2563eb'
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  filtersContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  filterIcon: {
    color: '#94a3b8'
  },
  filterLabel: {
    fontSize: '0.875rem',
    color: '#475569'
  },
  select: {
    padding: '0.25rem 0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    cursor: 'pointer'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.25rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '0.25rem',
    border: '1px solid #e2e8f0'
  },
  viewButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--bg-primary)',
      color: '#475569'
    }
  },
  viewActive: {
    padding: '0.5rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  summaryCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }
  },
  summaryIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  chartControls: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginBottom: '1rem'
  },
  chartTypeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  },
  chartTypeActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--bg-card)'
  },
  chartCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  chartTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem'
  },
  tableCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  tableStats: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e2e8f0',
    color: '#334155'
  },
  tdRight: {
    padding: '0.75rem',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'right',
    color: '#334155'
  },
  trEven: {
    backgroundColor: 'var(--bg-card)'
  },
  trOdd: {
    backgroundColor: '#fafafa'
  },
  tfoot: {
    backgroundColor: '#f8fafc',
    fontWeight: 'bold',
    borderTop: '2px solid #e2e8f0'
  },
  codeBadge: {
    fontFamily: 'monospace',
    backgroundColor: '#e0f2fe',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    color: '#1e40af'
  },
  nomCell: {
    fontWeight: '500'
  },
  typeBadge: {
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    backgroundColor: 'var(--bg-primary)',
    color: '#475569'
  },
  compteBadge: {
    fontFamily: 'monospace',
    backgroundColor: '#fef3c7',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    color: '#b45309'
  },
  viewButton: {
    padding: '0.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    ':hover': {
      color: '#3b82f6',
      backgroundColor: '#eff6ff'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '1rem',
    color: 'var(--text-secondary)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #fee2e2',
    color: '#ef4444'
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    color: '#94a3b8'
  },
  retryButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  }
};

// Ajouter l'animation spin
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default PlanAmortissement;
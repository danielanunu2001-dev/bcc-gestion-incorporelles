// frontend/src/pages/Rapports/EtatImmobilisations.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { 
  FiBarChart2, FiPieChart, FiRefreshCw, 
  FiDownload, FiFilter, FiTrendingUp, 
  FiTrendingDown, FiDollarSign, FiPackage,
  FiGrid, FiList, FiEye, FiCalendar
} from 'react-icons/fi';

const EtatImmobilisations = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [groupePar, setGroupePar] = useState('categorie');
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('chart');
  const [totaux, setTotaux] = useState({
    nombre: 0,
    valeur_brute: 0,
    valeur_nette: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/reports/etat-immobilisations?groupePar=${groupePar}`);
      
      console.log('📊 Données reçues:', response.data);
      
      let resultats = [];
      if (response.data.resultats) {
        resultats = response.data.resultats;
        setTotaux(response.data.totaux || {
          nombre: resultats.reduce((sum, r) => sum + (r.nombre || 0), 0),
          valeur_brute: resultats.reduce((sum, r) => sum + (r.valeur_brute || 0), 0),
          valeur_nette: resultats.reduce((sum, r) => sum + (r.valeur_nette || 0), 0)
        });
      } else if (Array.isArray(response.data)) {
        resultats = response.data;
        setTotaux({
          nombre: resultats.reduce((sum, r) => sum + (r.nombre || 0), 0),
          valeur_brute: resultats.reduce((sum, r) => sum + (r.valeur_brute || 0), 0),
          valeur_nette: resultats.reduce((sum, r) => sum + (r.valeur_nette || 0), 0)
        });
      } else {
        resultats = [];
      }
      
      setData(resultats);
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
    // Fonction d'export à implémenter
    console.log('Export des données');
  };

  const handleViewActif = (groupe) => {
    // Navigation vers les actifs filtrés par groupe
    navigate(`/actifs?${groupePar}=${encodeURIComponent(groupe)}`);
  };

  useEffect(() => {
    fetchData();
  }, [groupePar]);

  const getGroupeLabel = () => {
    switch(groupePar) {
      case 'categorie': return 'Catégorie';
      case 'localisation': return 'Localisation';
      case 'affectation': return 'Service/Affectation';
      default: return 'Groupe';
    }
  };

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

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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

  if (data.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <FiPackage size={48} color="#cbd5e1" />
        <p>Aucune donnée disponible</p>
        <button onClick={fetchData} style={styles.retryButton}>
          <FiRefreshCw /> Actualiser
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
            <FiBarChart2 style={styles.titleIcon} />
            État des immobilisations
          </h1>
          <p style={styles.subtitle}>
            Analyse de la répartition des actifs par {getGroupeLabel().toLowerCase()}
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
          <FiFilter size={18} style={styles.filterIcon} />
          <span style={styles.filterLabel}>Grouper par :</span>
          <select 
            value={groupePar} 
            onChange={(e) => setGroupePar(e.target.value)}
            style={styles.select}
          >
            <option value="categorie">🏷️ Catégorie</option>
            <option value="localisation">📍 Localisation</option>
            <option value="affectation">👥 Service/Affectation</option>
          </select>
        </div>
        
        <div style={styles.viewToggle}>
          <button 
            onClick={() => setViewMode('chart')}
            style={viewMode === 'chart' ? styles.viewActive : styles.viewButton}
            title="Vue graphique"
          >
            <FiGrid />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            style={viewMode === 'table' ? styles.viewActive : styles.viewButton}
            title="Vue tableau"
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIconWrapper}>
            <FiPackage size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatNumber(totaux.nombre)}</div>
            <div style={styles.summaryLabel}>Total actifs</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#dbeafe' }}>
            <FiTrendingUp size={20} color="#2563eb" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatCurrency(totaux.valeur_brute)}</div>
            <div style={styles.summaryLabel}>Valeur brute</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#fef3c7' }}>
            <FiDollarSign size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{formatCurrency(totaux.valeur_nette)}</div>
            <div style={styles.summaryLabel}>Valeur nette</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#f3e8ff' }}>
            <FiCalendar size={20} color="#8b5cf6" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{data.length}</div>
            <div style={styles.summaryLabel}>{getGroupeLabel()}s</div>
          </div>
        </div>
      </div>

      {/* Graphiques ou Tableau */}
      {viewMode === 'chart' ? (
        <div style={styles.chartsContainer}>
          {/* Contrôle du type de graphique */}
          <div style={styles.chartControls}>
            <button 
              onClick={() => setChartType('bar')}
              style={chartType === 'bar' ? styles.chartTypeActive : styles.chartTypeButton}
              title="Graphique en barres"
            >
              <FiBarChart2 /> Barres
            </button>
            <button 
              onClick={() => setChartType('pie')}
              style={chartType === 'pie' ? styles.chartTypeActive : styles.chartTypeButton}
              title="Camembert"
            >
              <FiPieChart /> Camembert
            </button>
            <button 
              onClick={() => setChartType('area')}
              style={chartType === 'area' ? styles.chartTypeActive : styles.chartTypeButton}
              title="Graphique en aires"
            >
              <FiTrendingUp /> Aires
            </button>
          </div>

          {/* Graphique en barres */}
          {(chartType === 'bar' || chartType === 'area') && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>
                {chartType === 'bar' ? 'Répartition par barres' : 'Évolution par aires'}
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'bar' ? (
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="groupe" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'nombre') return [formatNumber(value), 'Nombre'];
                        return [formatCurrency(value), name === 'valeur_brute' ? 'Valeur brute' : 'Valeur nette'];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="nombre" fill="#2563eb" name="Nombre d'actifs" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="valeur_brute" fill="#10b981" name="Valeur brute" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="valeur_nette" fill="#f59e0b" name="Valeur nette" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="groupe" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="valeur_brute" stackId="1" stroke="#10b981" fill="#10b981" name="Valeur brute" />
                    <Area type="monotone" dataKey="valeur_nette" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Valeur nette" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Graphique en camembert */}
          {chartType === 'pie' && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Répartition par nombre</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ groupe, percent }) => `${groupe} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="nombre"
                    nameKey="groupe"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Graphique en camembert pour la valeur nette */}
              <h3 style={{ ...styles.chartTitle, marginTop: '2rem' }}>Répartition par valeur nette</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ groupe, percent }) => `${groupe} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="valeur_nette"
                    nameKey="groupe"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        /* Vue Tableau */
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{getGroupeLabel()}</th>
                <th style={styles.th}>Nombre d'actifs</th>
                <th style={styles.th}>Valeur brute</th>
                <th style={styles.th}>Valeur nette</th>
                <th style={styles.th}>% du total</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const pourcentage = ((item.valeur_nette / totaux.valeur_nette) * 100).toFixed(1);
                return (
                  <tr key={index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>
                      <span style={styles.groupeBadge}>{item.groupe}</span>
                    </td>
                    <td style={styles.td}>{formatNumber(item.nombre)}</td>
                    <td style={styles.td}>{formatCurrency(item.valeur_brute)}</td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '600', color: '#2563eb' }}>
                        {formatCurrency(item.valeur_nette)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${pourcentage}%` }} />
                        <span style={styles.progressText}>{pourcentage}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => handleViewActif(item.groupe)}
                        style={styles.viewButton}
                        title={`Voir les actifs de ${item.groupe}`}
                      >
                        <FiEye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={styles.tfoot}>
                <td style={styles.td}><strong>Total</strong></td>
                <td style={styles.td}><strong>{formatNumber(totaux.nombre)}</strong></td>
                <td style={styles.td}><strong>{formatCurrency(totaux.valeur_brute)}</strong></td>
                <td style={styles.td}><strong>{formatCurrency(totaux.valeur_nette)}</strong></td>
                <td style={styles.td}><strong>100%</strong></td>
                <td style={styles.td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
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
  chartsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  chartControls: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end'
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  chartTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem'
  },
  tableContainer: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    overflow: 'auto',
    border: '1px solid #e2e8f0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0',
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
    fontWeight: 'bold'
  },
  groupeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '4px',
    fontSize: '0.75rem',
    color: '#1e293b'
  },
  progressBar: {
    position: 'relative',
    width: '100px',
    height: '24px',
    backgroundColor: 'var(--border-color)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '12px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    zIndex: 1
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

export default EtatImmobilisations;
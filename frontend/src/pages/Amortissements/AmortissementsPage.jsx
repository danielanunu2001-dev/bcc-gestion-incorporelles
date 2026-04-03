import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActifById, fetchAmortissements } from '../../store/actifSlice';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import {
  FiDownload, FiCalendar, FiTrendingUp,
  FiPieChart, FiBarChart2
} from 'react-icons/fi';

const AmortissementsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  
  const { actifCourant, amortissements, loading } = useSelector((state) => state.actifs);
  const [viewType, setViewType] = useState('combined');
  const [yearRange, setYearRange] = useState({ start: 0, end: 0 });

  // ✅ CORRECTION : Validation stricte de l'ID
  useEffect(() => {
    // Vérification que l'ID est valide (UUID ou au moins un format d'ID)
    if (id && id.length > 10 && id !== 'dashboard' && id !== 'undefined') {
      console.log('📊 Chargement des amortissements pour l\'actif:', id);
      dispatch(fetchActifById(id));
      dispatch(fetchAmortissements(id));
    } else {
      console.warn('⚠️ ID invalide pour les amortissements:', id);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (amortissements.length > 0) {
      const years = amortissements.map(a => a.exercice);
      setYearRange({
        start: Math.min(...years),
        end: Math.max(...years)
      });
    }
  }, [amortissements]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  // Données pour le graphique d'évolution
  const getEvolutionData = () => {
    return amortissements.map(am => ({
      annee: am.exercice,
      annuite: am.annuite,
      cumul: am.cumul_amortissements,
      valeurNette: am.valeur_nette,
      taux: ((am.cumul_amortissements / actifCourant?.cout_acquisition) * 100).toFixed(1)
    }));
  };

  // Statistiques
  const getStats = () => {
    if (amortissements.length === 0) return null;
    
    const dernier = amortissements[amortissements.length - 1];
    const premier = amortissements[0];
    
    return {
      duree: amortissements.length,
      annuiteMoyenne: amortissements.reduce((sum, a) => sum + a.annuite, 0) / amortissements.length,
      totalAmorti: dernier.cumul_amortissements,
      restant: dernier.valeur_nette,
      progression: ((dernier.cumul_amortissements / actifCourant?.cout_acquisition) * 100).toFixed(1)
    };
  };

  const stats = getStats();

  // ✅ Redirection ou message si ID invalide
  if (!id || id === 'dashboard' || id.length < 10) {
    return (
      <div style={styles.errorContainer}>
        <h2>❌ ID d'actif invalide</h2>
        <p>L'identifiant fourni n'est pas valide.</p>
        <button 
          onClick={() => window.history.back()}
          style={styles.backButton}
        >
          Retour
        </button>
      </div>
    );
  }

  if (loading || !actifCourant) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des amortissements...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Plan d'amortissement</h1>
          <p style={styles.subtitle}>
            {actifCourant.code} - {actifCourant.nom}
          </p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.viewToggle}>
            <button
              onClick={() => setViewType('combined')}
              style={viewType === 'combined' ? styles.viewActive : styles.viewButton}
              title="Vue combinée"
            >
              <FiTrendingUp />
            </button>
            <button
              onClick={() => setViewType('annuities')}
              style={viewType === 'annuities' ? styles.viewActive : styles.viewButton}
              title="Annuités"
            >
              <FiBarChart2 />
            </button>
            <button
              onClick={() => setViewType('cumul')}
              style={viewType === 'cumul' ? styles.viewActive : styles.viewButton}
              title="Cumul"
            >
              <FiPieChart />
            </button>
          </div>
          <button style={styles.exportButton}>
            <FiDownload /> Exporter
          </button>
        </div>
      </div>

      {/* Informations de l'actif */}
      <div style={styles.infoCard}>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Code</span>
            <span style={styles.infoValue}>{actifCourant.code}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Nom</span>
            <span style={styles.infoValue}>{actifCourant.nom}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Type</span>
            <span style={styles.infoValue}>{actifCourant.type}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Mode</span>
            <span style={styles.infoValue}>
              {actifCourant.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif'}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Coût acquisition</span>
            <span style={styles.infoValue}>{formatCurrency(actifCourant.cout_acquisition)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Durée</span>
            <span style={styles.infoValue}>{actifCourant.duree_utile_ans} ans</span>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h4>Durée</h4>
            <p>{stats.duree} ans</p>
          </div>
          <div style={styles.statCard}>
            <h4>Annuité moyenne</h4>
            <p>{formatCurrency(stats.annuiteMoyenne)}</p>
          </div>
          <div style={styles.statCard}>
            <h4>Total amorti</h4>
            <p>{formatCurrency(stats.totalAmorti)}</p>
          </div>
          <div style={styles.statCard}>
            <h4>Valeur résiduelle</h4>
            <p>{formatCurrency(stats.restant)}</p>
          </div>
          <div style={styles.statCard}>
            <h4>Progression</h4>
            <p>{stats.progression}%</p>
          </div>
        </div>
      )}

      {/* Graphique principal */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Évolution de la valeur nette</h3>
        <ResponsiveContainer width="100%" height={400}>
          {viewType === 'combined' && (
            <ComposedChart data={getEvolutionData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="annee" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar yAxisId="left" dataKey="annuite" fill="#f59e0b" name="Annuité" />
              <Line yAxisId="right" type="monotone" dataKey="valeurNette" stroke="#2563eb" name="Valeur nette" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="cumul" fill="#10b981" stroke="#10b981" name="Cumul" />
            </ComposedChart>
          )}
          {viewType === 'annuities' && (
            <BarChart data={getEvolutionData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="annee" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="annuite" fill="#f59e0b" name="Annuité" />
            </BarChart>
          )}
          {viewType === 'cumul' && (
            <LineChart data={getEvolutionData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="annee" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="cumul" stroke="#10b981" name="Cumul" strokeWidth={2} />
              <Line type="monotone" dataKey="valeurNette" stroke="#2563eb" name="Valeur nette" strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Tableau des amortissements */}
      <div style={styles.tableCard}>
        <h3 style={styles.chartTitle}>Détail par exercice</h3>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Exercice</th>
                <th style={styles.th}>Annuité</th>
                <th style={styles.th}>Cumul</th>
                <th style={styles.th}>Valeur nette</th>
                <th style={styles.th}>Taux d'amortissement</th>
              </tr>
            </thead>
            <tbody>
              {amortissements.map((am, index) => (
                <tr key={index} style={styles.tr}>
                  <td style={styles.td}>{am.exercice}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{formatCurrency(am.annuite)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{formatCurrency(am.cumul_amortissements)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <span style={{ color: am.valeur_nette > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {formatCurrency(am.valeur_nette)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${((am.cumul_amortissements / actifCourant.cout_acquisition) * 100).toFixed(1)}%`
                      }}></div>
                      <span style={styles.progressText}>
                        {((am.cumul_amortissements / actifCourant.cout_acquisition) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: 0
  },
  subtitle: {
    color: '#666',
    marginTop: '0.5rem'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.25rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '4px',
    padding: '0.25rem',
    border: '1px solid #e5e7eb'
  },
  viewButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#9ca3af'
  },
  viewActive: {
    padding: '0.5rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--bg-card)'
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  infoCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#666',
    marginBottom: '0.25rem'
  },
  infoValue: {
    fontSize: '1rem',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  chartCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: 'var(--text-primary)'
  },
  tableCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '0.75rem',
    color: '#4b5563'
  },
  progressBar: {
    position: 'relative',
    height: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#2563eb',
    transition: 'width 0.3s ease'
  },
  progressText: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '0.75rem',
    color: '#111',
    fontWeight: '500'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    textAlign: 'center'
  },
  backButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};

export default AmortissementsPage;
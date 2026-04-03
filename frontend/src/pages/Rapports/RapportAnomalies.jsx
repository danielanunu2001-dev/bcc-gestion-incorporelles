import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiAlertCircle, FiDownload, FiFilter, FiRefreshCw,
  FiPieChart, FiBarChart2, FiCalendar, FiCheck,
  FiX, FiClock, FiMapPin, FiUser, FiPackage,
  FiTrendingUp, FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const RapportAnomalies = () => {
  const { can } = usePermissions();
  const [anomalies, setAnomalies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtres, setFiltres] = useState({
    statut: '',
    type: '',
    dateDebut: '',
    dateFin: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    chargerAnomalies();
    chargerStats();
  }, []);

  const chargerAnomalies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.dateDebut) params.append('startDate', filtres.dateDebut);
      if (filtres.dateFin) params.append('endDate', filtres.dateFin);
      
      const res = await api.get(`/anomalies?${params.toString()}`);
      setAnomalies(res.data.anomalies || res.data);
    } catch (err) {
      console.error('Erreur chargement anomalies', err);
    } finally {
      setLoading(false);
    }
  };

  const chargerStats = async () => {
    try {
      const res = await api.get('/anomalies/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur chargement stats', err);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ format });
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.dateDebut) params.append('startDate', filtres.dateDebut);
      if (filtres.dateFin) params.append('endDate', filtres.dateFin);
      
      const res = await api.get(`/anomalies/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `anomalies_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'manquant': 'Bien manquant',
      'non_etiquete': 'Non étiqueté',
      'mauvais_etat': 'Mauvais état',
      'autre': 'Autre'
    };
    return types[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'manquant': <FiX size={16} />,
      'non_etiquete': <FiAlertCircle size={16} />,
      'mauvais_etat': <FiAlertCircle size={16} />,
      'autre': <FiAlertCircle size={16} />
    };
    return icons[type] || <FiAlertCircle size={16} />;
  };

  const getStatutBadge = (statut) => {
    const configs = {
      'signalé': { bg: '#fee2e2', color: '#b91c1c', icon: <FiAlertCircle size={12} />, label: 'Signalé' },
      'en_cours': { bg: '#fed7aa', color: '#9a3412', icon: <FiClock size={12} />, label: 'En cours' },
      'résolu': { bg: '#dcfce7', color: '#166534', icon: <FiCheck size={12} />, label: 'Résolu' }
    };
    const config = configs[statut] || configs['signalé'];
    return (
      <span style={{
        ...badgeStyle,
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (statut) => {
    const colors = {
      'signalé': '#ef4444',
      'en_cours': '#f59e0b',
      'résolu': '#10b981'
    };
    return colors[statut] || 'var(--text-secondary)';
  };

  return (
    <div style={styles.container}>
      {/* Header avec animation */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <FiAlertCircle size={28} color="#ef4444" />
          </div>
          <div>
            <h1 style={styles.title}>Rapport des anomalies</h1>
            <p style={styles.subtitle}>
              Suivi et gestion des anomalies d'inventaire
            </p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => chargerAnomalies()}
            style={styles.iconButton}
            title="Rafraîchir"
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...styles.filterButton,
              backgroundColor: showFilters ? 'var(--border-color)' : 'var(--bg-primary)'
            }}
          >
            <FiFilter /> Filtres
            {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          <div style={styles.exportGroup}>
            <button
              onClick={() => handleExport('csv')}
              style={styles.exportButton}
              disabled={exporting || anomalies.length === 0}
            >
              <FiDownload /> {exporting ? 'Export...' : 'CSV'}
            </button>
            <button
              onClick={() => handleExport('json')}
              style={styles.exportButton}
              disabled={exporting || anomalies.length === 0}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div style={styles.filtersCard}>
          <h3 style={styles.filtersTitle}>
            <FiFilter size={16} /> Filtres de recherche
          </h3>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Statut</label>
              <select
                value={filtres.statut}
                onChange={(e) => setFiltres({ ...filtres, statut: e.target.value })}
                style={styles.filterSelect}
              >
                <option value="">Tous les statuts</option>
                <option value="signalé">Signalé</option>
                <option value="en_cours">En cours</option>
                <option value="résolu">Résolu</option>
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Type d'anomalie</label>
              <select
                value={filtres.type}
                onChange={(e) => setFiltres({ ...filtres, type: e.target.value })}
                style={styles.filterSelect}
              >
                <option value="">Tous les types</option>
                <option value="manquant">Bien manquant</option>
                <option value="non_etiquete">Non étiqueté</option>
                <option value="mauvais_etat">Mauvais état</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiCalendar size={12} /> Date début
              </label>
              <input
                type="date"
                value={filtres.dateDebut}
                onChange={(e) => setFiltres({ ...filtres, dateDebut: e.target.value })}
                style={styles.filterInput}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiCalendar size={12} /> Date fin
              </label>
              <input
                type="date"
                value={filtres.dateFin}
                onChange={(e) => setFiltres({ ...filtres, dateFin: e.target.value })}
                style={styles.filterInput}
              />
            </div>
          </div>
          <div style={styles.filterActions}>
            <button
              onClick={() => {
                setFiltres({ statut: '', type: '', dateDebut: '', dateFin: '' });
                chargerAnomalies();
              }}
              style={styles.resetButton}
            >
              Réinitialiser
            </button>
            <button
              onClick={chargerAnomalies}
              style={styles.applyButton}
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <FiAlertCircle size={24} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Total anomalies</span>
              <span style={styles.statValue}>{stats.total || 0}</span>
            </div>
          </div>
          {stats.parType?.map((item, idx) => (
            <div key={idx} style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                {getTypeIcon(item.type_anomalie)}
              </div>
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>{getTypeLabel(item.type_anomalie)}</span>
                <span style={styles.statValue}>{item.count}</span>
              </div>
            </div>
          ))}
          {stats.parStatut?.map((item, idx) => (
            <div key={`statut-${idx}`} style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: `${getStatusColor(item.statut)}10`, color: getStatusColor(item.statut) }}>
                <FiClock size={24} />
              </div>
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>{item.statut}</span>
                <span style={styles.statValue}>{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tableau des anomalies */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement des anomalies...</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          {anomalies.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle size={64} color="#cbd5e1" />
              <h3 style={styles.emptyTitle}>Aucune anomalie trouvée</h3>
              <p style={styles.emptyText}>
                Aucune anomalie ne correspond à vos critères de recherche
              </p>
              <button
                onClick={() => {
                  setFiltres({ statut: '', type: '', dateDebut: '', dateFin: '' });
                  chargerAnomalies();
                }}
                style={styles.emptyButton}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Actif</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Localisation</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Créé par</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((anomalie, index) => (
                  <tr key={anomalie.id} style={{ ...styles.tr, animationDelay: `${index * 0.05}s` }}>
                    <td style={styles.td}>
                      <div style={styles.dateCell}>
                        <FiCalendar size={12} color="#94a3b8" />
                        <span>{formatDate(anomalie.date_constat)}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actifCell}>
                        <strong style={styles.actifCode}>{anomalie.Actif?.code}</strong>
                        <div style={styles.actifNom}>{anomalie.Actif?.nom}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>
                        {getTypeIcon(anomalie.type_anomalie)}
                        {getTypeLabel(anomalie.type_anomalie)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.descriptionCell}>
                        {anomalie.description || '-'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {anomalie.localisation_constatee ? (
                        <div style={styles.locationCell}>
                          <FiMapPin size={12} color="#94a3b8" />
                          <span>{anomalie.localisation_constatee}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={styles.td}>{getStatutBadge(anomalie.statut)}</td>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <FiUser size={12} color="#94a3b8" />
                        <span>{anomalie.createurAnomalie?.full_name || '-'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

const badgeStyle = {
  padding: '0.25rem 0.75rem',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
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
    flexWrap: 'wrap',
    gap: '1rem',
    backgroundColor: 'var(--bg-card)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
    backgroundColor: '#fee2e2',
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
  iconButton: {
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
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc',
      borderColor: '#cbd5e1'
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
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
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--border-color)'
    }
  },
  exportGroup: {
    display: 'flex',
    gap: '0.5rem'
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
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#1d4ed8'
    },
    ':disabled': {
      backgroundColor: '#94a3b8',
      cursor: 'not-allowed'
    }
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
    margin: '0 0 1.25rem 0',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '1.5rem'
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
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  filterSelect: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
    }
  },
  filterInput: {
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
    }
  },
  filterActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    paddingTop: '0.5rem'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--border-color)'
    }
  },
  applyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#1d4ed8'
    }
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
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
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  tableContainer: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px'
  },
  th: {
    padding: '1rem 1.25rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    fontSize: '0.75rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s',
    animation: 'fadeInUp 0.3s ease forwards',
    opacity: 0,
    animationFillMode: 'forwards',
    ':hover': {
      backgroundColor: '#faf5ff'
    }
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569'
  },
  actifCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem'
  },
  actifCode: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'monospace'
  },
  actifNom: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '20px',
    fontSize: '0.75rem',
    color: '#475569'
  },
  descriptionCell: {
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '0.75rem',
    color: '#475569'
  },
  locationCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  spinner: {
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem'
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
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--border-color)'
    }
  }
};

// Ajout des animations globales
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(styleSheet);

export default RapportAnomalies;
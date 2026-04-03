// frontend/src/pages/Rapports/Alertes.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  FiAlertCircle, FiClock, FiPackage, FiFileText,
  FiTrendingUp, FiTrendingDown, FiRefreshCw,
  FiEye, FiCalendar, FiMapPin, FiTag, FiFilter,
  FiChevronRight, FiChevronDown, FiBell, FiX
} from 'react-icons/fi';

const Alertes = () => {
  const navigate = useNavigate();
  const [alertes, setAlertes] = useState({
    finLicence: [],
    maintenance: [],
    echeancesContrats: [],
    actifsEnMaintenance: [],
    anomalies: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    finLicence: true,
    maintenance: true,
    echeancesContrats: true,
    actifsEnMaintenance: true,
    anomalies: true
  });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAlertes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/reports/alertes');
      
      console.log('🔔 Alertes reçues:', response.data);
      setAlertes(response.data);
    } catch (err) {
      console.error('❌ Erreur chargement alertes:', err);
      setError(err.response?.data?.message || 'Erreur de chargement des alertes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlertes();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleViewActif = (id) => {
    if (id) {
      navigate(`/actifs/${id}`);
    }
  };

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getPrioriteColor = (priorite) => {
    switch(priorite) {
      case 'critique': return '#ef4444';
      case 'haute': return '#f97316';
      case 'moyenne': return '#f59e0b';
      case 'basse': return '#10b981';
      default: return 'var(--text-secondary)';
    }
  };

  const getPrioriteLabel = (priorite) => {
    switch(priorite) {
      case 'critique': return 'Critique';
      case 'haute': return 'Haute';
      case 'moyenne': return 'Moyenne';
      case 'basse': return 'Basse';
      default: return priorite || 'Moyenne';
    }
  };

  const getDaysRemaining = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysBadge = (days) => {
    if (days === null) return null;
    if (days < 0) {
      return <span style={styles.daysBadgeExpired}>Expiré depuis {Math.abs(days)}j</span>;
    }
    if (days <= 7) {
      return <span style={styles.daysBadgeUrgent}>Urgent! {days}j</span>;
    }
    if (days <= 30) {
      return <span style={styles.daysBadgeWarning}>{days}j restants</span>;
    }
    return <span style={styles.daysBadgeNormal}>{days}j</span>;
  };

  const filterAlerte = (alerte) => {
    if (filter !== 'all' && alerte.priorite !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (alerte.code?.toLowerCase().includes(searchLower) ||
              alerte.nom?.toLowerCase().includes(searchLower));
    }
    return true;
  };

  const getSectionCount = (section) => {
    return alertes[section]?.filter(filterAlerte).length || 0;
  };

  const totalAlertes = 
    (alertes.finLicence?.length || 0) + 
    (alertes.maintenance?.length || 0) + 
    (alertes.echeancesContrats?.length || 0) +
    (alertes.actifsEnMaintenance?.length || 0) +
    (alertes.anomalies?.length || 0);

  const filteredTotal = 
    (alertes.finLicence?.filter(filterAlerte).length || 0) + 
    (alertes.maintenance?.filter(filterAlerte).length || 0) + 
    (alertes.echeancesContrats?.filter(filterAlerte).length || 0) +
    (alertes.actifsEnMaintenance?.filter(filterAlerte).length || 0) +
    (alertes.anomalies?.filter(filterAlerte).length || 0);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des alertes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FiAlertCircle size={48} color="#ef4444" />
        <p>{error}</p>
        <button onClick={fetchAlertes} style={styles.retryButton}>
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
            <FiBell style={styles.titleIcon} />
            Alertes et échéances
          </h1>
          <p style={styles.subtitle}>
            {filteredTotal} alerte(s) active(s) • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button onClick={handleRefresh} style={styles.refreshButton} disabled={refreshing}>
          <FiRefreshCw className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Filtres et recherche */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterBar}>
          <FiFilter size={18} style={styles.filterIcon} />
          <button 
            onClick={() => setFilter('all')} 
            style={filter === 'all' ? styles.filterActive : styles.filterButton}
          >
            Toutes
          </button>
          <button 
            onClick={() => setFilter('critique')} 
            style={filter === 'critique' ? styles.filterActive : styles.filterButton}
          >
            <span style={styles.critiqueDot}></span>
            Critique
          </button>
          <button 
            onClick={() => setFilter('haute')} 
            style={filter === 'haute' ? styles.filterActive : styles.filterButton}
          >
            <span style={styles.hauteDot}></span>
            Haute
          </button>
          <button 
            onClick={() => setFilter('moyenne')} 
            style={filter === 'moyenne' ? styles.filterActive : styles.filterButton}
          >
            <span style={styles.moyenneDot}></span>
            Moyenne
          </button>
          <button 
            onClick={() => setFilter('basse')} 
            style={filter === 'basse' ? styles.filterActive : styles.filterButton}
          >
            <span style={styles.basseDot}></span>
            Basse
          </button>
        </div>
        
        <div style={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Rechercher par code ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={styles.clearSearch}>
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Résumé */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIconWrapper}>
            <FiBell size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{filteredTotal}</div>
            <div style={styles.summaryLabel}>Alertes totales</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#fef3c7' }}>
            <FiTrendingUp size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{getSectionCount('finLicence')}</div>
            <div style={styles.summaryLabel}>Fin de licence</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#dbeafe' }}>
            <FiFileText size={20} color="#2563eb" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{getSectionCount('echeancesContrats')}</div>
            <div style={styles.summaryLabel}>Échéances contrats</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIconWrapper, backgroundColor: '#fee2e2' }}>
            <FiTrendingDown size={20} color="#ef4444" />
          </div>
          <div>
            <div style={styles.summaryNumber}>{getSectionCount('actifsEnMaintenance')}</div>
            <div style={styles.summaryLabel}>Actifs en maintenance</div>
          </div>
        </div>
      </div>

      {/* Liste des alertes */}
      <div style={styles.alertesList}>
        {/* Alertes fin de licence */}
        {alertes.finLicence?.length > 0 && getSectionCount('finLicence') > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} onClick={() => toggleSection('finLicence')}>
              <div style={styles.sectionTitle}>
                <FiTrendingUp style={{ color: '#f59e0b' }} />
                <span>Fins de licence imminentes</span>
                <span style={styles.sectionCount}>{getSectionCount('finLicence')}</span>
              </div>
              <div style={styles.sectionToggle}>
                {expandedSections.finLicence ? <FiChevronDown /> : <FiChevronRight />}
              </div>
            </div>
            {expandedSections.finLicence && (
              <div style={styles.sectionContent}>
                {alertes.finLicence.filter(filterAlerte).map((alerte, index) => {
                  const daysRemaining = getDaysRemaining(alerte.date);
                  const actifId = alerte.id || alerte.actif_id;
                  return (
                    <div 
                      key={index} 
                      style={styles.alerteCard} 
                      onClick={() => handleViewActif(actifId)}
                    >
                      <div style={styles.alerteIcon}>
                        <FiClock size={20} color="#f59e0b" />
                      </div>
                      <div style={styles.alerteContent}>
                        <div style={styles.alerteTitle}>
                          <span style={styles.alerteCode}>{alerte.code}</span>
                          <span style={styles.alerteNom}>{alerte.nom}</span>
                        </div>
                        <div style={styles.alerteDate}>
                          <FiCalendar size={12} /> Expire le {formatDate(alerte.date)}
                        </div>
                      </div>
                      <div style={styles.alerteRight}>
                        {getDaysBadge(daysRemaining)}
                        <div style={{ ...styles.prioriteBadge, backgroundColor: getPrioriteColor(alerte.priorite) }}>
                          {getPrioriteLabel(alerte.priorite)}
                        </div>
                        <FiEye size={16} style={styles.viewIcon} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alertes échéances contrats */}
        {alertes.echeancesContrats?.length > 0 && getSectionCount('echeancesContrats') > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} onClick={() => toggleSection('echeancesContrats')}>
              <div style={styles.sectionTitle}>
                <FiFileText style={{ color: '#2563eb' }} />
                <span>Échéances de contrats</span>
                <span style={styles.sectionCount}>{getSectionCount('echeancesContrats')}</span>
              </div>
              <div style={styles.sectionToggle}>
                {expandedSections.echeancesContrats ? <FiChevronDown /> : <FiChevronRight />}
              </div>
            </div>
            {expandedSections.echeancesContrats && (
              <div style={styles.sectionContent}>
                {alertes.echeancesContrats.filter(filterAlerte).map((alerte, index) => {
                  const daysRemaining = getDaysRemaining(alerte.date);
                  const actifId = alerte.id || alerte.actif_id;
                  return (
                    <div 
                      key={index} 
                      style={styles.alerteCard} 
                      onClick={() => handleViewActif(actifId)}
                    >
                      <div style={styles.alerteIcon}>
                        <FiFileText size={20} color="#2563eb" />
                      </div>
                      <div style={styles.alerteContent}>
                        <div style={styles.alerteTitle}>
                          <span style={styles.alerteCode}>{alerte.code}</span>
                          <span style={styles.alerteNom}>{alerte.nom}</span>
                        </div>
                        <div style={styles.alerteDate}>
                          <FiCalendar size={12} /> Contrat expire le {formatDate(alerte.date)}
                        </div>
                      </div>
                      <div style={styles.alerteRight}>
                        {getDaysBadge(daysRemaining)}
                        <div style={{ ...styles.prioriteBadge, backgroundColor: getPrioriteColor(alerte.priorite) }}>
                          {getPrioriteLabel(alerte.priorite)}
                        </div>
                        <FiEye size={16} style={styles.viewIcon} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alertes maintenance */}
        {alertes.maintenance?.length > 0 && getSectionCount('maintenance') > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} onClick={() => toggleSection('maintenance')}>
              <div style={styles.sectionTitle}>
                <FiPackage style={{ color: '#10b981' }} />
                <span>Maintenances à prévoir</span>
                <span style={styles.sectionCount}>{getSectionCount('maintenance')}</span>
              </div>
              <div style={styles.sectionToggle}>
                {expandedSections.maintenance ? <FiChevronDown /> : <FiChevronRight />}
              </div>
            </div>
            {expandedSections.maintenance && (
              <div style={styles.sectionContent}>
                {alertes.maintenance.filter(filterAlerte).map((alerte, index) => {
                  const daysRemaining = getDaysRemaining(alerte.date);
                  const actifId = alerte.id || alerte.actif_id;
                  return (
                    <div 
                      key={index} 
                      style={styles.alerteCard} 
                      onClick={() => handleViewActif(actifId)}
                    >
                      <div style={styles.alerteIcon}>
                        <FiPackage size={20} color="#10b981" />
                      </div>
                      <div style={styles.alerteContent}>
                        <div style={styles.alerteTitle}>
                          <span style={styles.alerteCode}>{alerte.code}</span>
                          <span style={styles.alerteNom}>{alerte.nom}</span>
                        </div>
                        <div style={styles.alerteDate}>
                          <FiCalendar size={12} /> Maintenance due le {formatDate(alerte.date)}
                        </div>
                      </div>
                      <div style={styles.alerteRight}>
                        {getDaysBadge(daysRemaining)}
                        <div style={{ ...styles.prioriteBadge, backgroundColor: getPrioriteColor(alerte.priorite) }}>
                          {getPrioriteLabel(alerte.priorite)}
                        </div>
                        <FiEye size={16} style={styles.viewIcon} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alertes actifs en maintenance */}
        {alertes.actifsEnMaintenance?.length > 0 && getSectionCount('actifsEnMaintenance') > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} onClick={() => toggleSection('actifsEnMaintenance')}>
              <div style={styles.sectionTitle}>
                <FiTrendingDown style={{ color: '#ef4444' }} />
                <span>Actifs en maintenance/réparation</span>
                <span style={styles.sectionCount}>{getSectionCount('actifsEnMaintenance')}</span>
              </div>
              <div style={styles.sectionToggle}>
                {expandedSections.actifsEnMaintenance ? <FiChevronDown /> : <FiChevronRight />}
              </div>
            </div>
            {expandedSections.actifsEnMaintenance && (
              <div style={styles.sectionContent}>
                {alertes.actifsEnMaintenance.filter(filterAlerte).map((alerte, index) => {
                  const actifId = alerte.id || alerte.actif_id;
                  return (
                    <div 
                      key={index} 
                      style={styles.alerteCard} 
                      onClick={() => handleViewActif(actifId)}
                    >
                      <div style={styles.alerteIcon}>
                        <FiTrendingDown size={20} color="#ef4444" />
                      </div>
                      <div style={styles.alerteContent}>
                        <div style={styles.alerteTitle}>
                          <span style={styles.alerteCode}>{alerte.code}</span>
                          <span style={styles.alerteNom}>{alerte.nom}</span>
                        </div>
                        <div style={styles.alerteDate}>
                          <FiTag size={12} /> État: <span style={{ color: getPrioriteColor(alerte.priorite) }}>{alerte.etat}</span>
                          {alerte.localisation && <span><FiMapPin size={12} style={{ marginLeft: '0.75rem' }} /> {alerte.localisation}</span>}
                        </div>
                      </div>
                      <div style={styles.alerteRight}>
                        <div style={{ ...styles.prioriteBadge, backgroundColor: getPrioriteColor(alerte.priorite) }}>
                          {getPrioriteLabel(alerte.priorite)}
                        </div>
                        <FiEye size={16} style={styles.viewIcon} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alertes anomalies */}
        {alertes.anomalies?.length > 0 && getSectionCount('anomalies') > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader} onClick={() => toggleSection('anomalies')}>
              <div style={styles.sectionTitle}>
                <FiAlertCircle style={{ color: '#ef4444' }} />
                <span>Anomalies non résolues</span>
                <span style={styles.sectionCount}>{getSectionCount('anomalies')}</span>
              </div>
              <div style={styles.sectionToggle}>
                {expandedSections.anomalies ? <FiChevronDown /> : <FiChevronRight />}
              </div>
            </div>
            {expandedSections.anomalies && (
              <div style={styles.sectionContent}>
                {alertes.anomalies.filter(filterAlerte).map((alerte, index) => {
                  const actifId = alerte.id || alerte.actif_id;
                  return (
                    <div 
                      key={index} 
                      style={styles.alerteCard} 
                      onClick={() => handleViewActif(actifId)}
                    >
                      <div style={styles.alerteIcon}>
                        <FiAlertCircle size={20} color="#ef4444" />
                      </div>
                      <div style={styles.alerteContent}>
                        <div style={styles.alerteTitle}>
                          <span style={styles.alerteCode}>{alerte.code}</span>
                          <span style={styles.alerteNom}>{alerte.nom}</span>
                        </div>
                        <div style={styles.alerteDate}>
                          <FiCalendar size={12} /> Signalé le {formatDate(alerte.date)}
                        </div>
                      </div>
                      <div style={styles.alerteRight}>
                        <div style={{ ...styles.prioriteBadge, backgroundColor: getPrioriteColor(alerte.priorite) }}>
                          {getPrioriteLabel(alerte.priorite)}
                        </div>
                        <FiEye size={16} style={styles.viewIcon} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filteredTotal === 0 && (
          <div style={styles.emptyState}>
            <FiAlertCircle size={48} color="#cbd5e1" />
            <p>Aucune alerte trouvée</p>
            {(filter !== 'all' || searchTerm) && (
              <button onClick={() => { setFilter('all'); setSearchTerm(''); }} style={styles.resetButton}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>
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
  refreshButton: {
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
    gap: '0.5rem',
    flexWrap: 'wrap',
    padding: '0.25rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  filterIcon: {
    color: '#94a3b8',
    margin: '0 0.5rem'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    ':hover': {
      backgroundColor: 'var(--bg-primary)'
    }
  },
  filterActive: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  critiqueDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    display: 'inline-block'
  },
  hauteDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#f97316',
    display: 'inline-block'
  },
  moyenneDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
    display: 'inline-block'
  },
  basseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    display: 'inline-block'
  },
  searchWrapper: {
    position: 'relative',
    minWidth: '250px'
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 2rem 0.5rem 1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 2px rgba(59,130,246,0.1)'
    }
  },
  clearSearch: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
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
  alertesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  section: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  sectionCount: {
    backgroundColor: 'var(--bg-primary)',
    padding: '0.125rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500',
    color: '#475569',
    marginLeft: '0.5rem'
  },
  sectionToggle: {
    color: '#94a3b8'
  },
  sectionContent: {
    borderTop: '1px solid #e2e8f0'
  },
  alerteCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc'
    },
    ':last-child': {
      borderBottom: 'none'
    }
  },
  alerteIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  alerteContent: {
    flex: 1,
    minWidth: 0
  },
  alerteTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '0.25rem'
  },
  alerteCode: {
    fontFamily: 'monospace',
    backgroundColor: 'var(--bg-primary)',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    color: '#1e293b'
  },
  alerteNom: {
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  alerteDate: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  alerteRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexShrink: 0
  },
  prioriteBadge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'var(--bg-card)',
    textTransform: 'uppercase'
  },
  daysBadgeUrgent: {
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    padding: '0.125rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  daysBadgeWarning: {
    backgroundColor: '#f59e0b',
    color: 'var(--bg-card)',
    padding: '0.125rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  daysBadgeNormal: {
    backgroundColor: 'var(--border-color)',
    color: '#475569',
    padding: '0.125rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  daysBadgeExpired: {
    backgroundColor: '#94a3b8',
    color: 'var(--bg-card)',
    padding: '0.125rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  viewIcon: {
    color: '#94a3b8',
    transition: 'color 0.2s',
    ':hover': {
      color: '#3b82f6'
    }
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    color: '#94a3b8'
  },
  resetButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--border-color)'
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
  retryButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
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

export default Alertes;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiActivity, FiUser, FiCalendar, FiFilter,
  FiSearch, FiDownload, FiRefreshCw, FiFileText,
  FiPackage, FiTrendingDown, FiTrendingUp, FiClock,
  FiEye, FiEdit, FiTrash2, FiPlus, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AuditList = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  // États pour les logs
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  
  // ✅ État pour l'audit sélectionné (détails)
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  
  // États pour la pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    userId: '',
    table: '',
    action: '',
    startDate: null,
    endDate: null,
    search: ''
  });
  
  // États pour les statistiques
  const [stats, setStats] = useState({
    total: 0,
    parAction: [],
    parTable: []
  });
  
  // Options pour les filtres
  const tables = [
    { value: '', label: 'Toutes les tables' },
    { value: 'actifs', label: 'Actifs' },
    { value: 'users', label: 'Utilisateurs' },
    { value: 'contrats', label: 'Contrats' },
    { value: 'reevaluations', label: 'Réévaluations' },
    { value: 'depreciations', label: 'Dépréciations' }
  ];
  
  const actions = [
    { value: '', label: 'Toutes les actions' },
    { value: 'CREATE', label: 'Créations' },
    { value: 'UPDATE', label: 'Modifications' },
    { value: 'DELETE', label: 'Suppressions' },
    { value: 'REEVALUATION', label: 'Réévaluations' },
    { value: 'DEPRECIATION', label: 'Dépréciations' },
    { value: 'RECALCUL', label: 'Recalculs' },
    { value: 'SORTIE', label: 'Sorties' }
  ];

  // ✅ FONCTION POUR EXTRAIRE LA DATE DE L'OPÉRATION
  const getOperationDate = (log) => {
    if (log.action === 'CREATE' && log.table_name === 'actifs' && log.new_data?.date_acquisition) {
      return new Date(log.new_data.date_acquisition);
    }
    if (log.action === 'UPDATE' && log.table_name === 'actifs') {
      return new Date(log.created_at);
    }
    if (log.action === 'CONTRAT_CREATE' && log.new_data?.date_debut) {
      return new Date(log.new_data.date_debut);
    }
    if (log.action === 'CONTRAT_UPDATE' || log.action === 'CONTRAT_DELETE') {
      return new Date(log.created_at);
    }
    if (log.action === 'REEVALUATION' && log.new_data?.date_reevaluation) {
      return new Date(log.new_data.date_reevaluation);
    }
    if (log.action === 'DEPRECIATION' && log.new_data?.date_test) {
      return new Date(log.new_data.date_test);
    }
    if (log.action === 'DOCUMENT_UPLOAD') {
      return new Date(log.created_at);
    }
    if (log.action === 'MOUVEMENT_CREATE' && log.new_data?.date_mouvement) {
      return new Date(log.new_data.date_mouvement);
    }
    if (log.action === 'MOUVEMENT_VALIDER' || log.action === 'MOUVEMENT_ANNULER') {
      return new Date(log.created_at);
    }
    return new Date(log.created_at);
  };

  // ✅ FONCTION DE FORMATAGE DES DATES
  const formatDateTime = (date) => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    try {
      const jour = date.getUTCDate().toString().padStart(2, '0');
      const mois = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const annee = date.getUTCFullYear();
      const heures = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${jour}/${mois}/${annee} ${heures}:${minutes}`;
    } catch {
      return 'Date invalide';
    }
  };

  // Charger les logs au montage et quand les filtres changent
  useEffect(() => {
    fetchLogs();
  }, [page, limit, filters.userId, filters.table, filters.action, filters.startDate, filters.endDate]);

  // Charger les stats au montage
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page,
        limit
      });
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.table) params.append('table', filters.table);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      console.log('📡 Appel API:', `/audit-logs?${params.toString()}`);
      
      const res = await api.get(`/audit-logs?${params.toString()}`);
      
      console.log('✅ Réponse reçue:', res.data);
      
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('❌ Erreur chargement logs:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/audit-logs/stats');
      setStats(res.data);
    } catch (error) {
      console.error('❌ Erreur chargement stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!filters.search || filters.search.length < 3) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.get(`/audit-logs/search?q=${filters.search}&page=${page}&limit=${limit}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      userId: '',
      table: '',
      action: '',
      startDate: null,
      endDate: null,
      search: ''
    });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('❌ Erreur export:', error);
      setError('Erreur lors de l\'export');
    }
  };

  // ✅ Fonction pour basculer l'affichage des détails d'un audit
  const toggleAuditDetails = (auditId) => {
    if (selectedAuditId === auditId) {
      setSelectedAuditId(null); // Fermer si déjà ouvert
    } else {
      setSelectedAuditId(auditId); // Ouvrir le nouveau
    }
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATE': return <FiPlus color="#10b981" />;
      case 'UPDATE': return <FiEdit color="#3b82f6" />;
      case 'DELETE': return <FiTrash2 color="#ef4444" />;
      case 'REEVALUATION': return <FiTrendingUp color="#f59e0b" />;
      case 'DEPRECIATION': return <FiTrendingDown color="#8b5cf6" />;
      case 'RECALCUL': return <FiRefreshCw color="#2563eb" />;
      case 'SORTIE': return <FiPackage color='var(--text-secondary)' />;
      default: return <FiActivity />;
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'REEVALUATION': 'Réévaluation',
      'DEPRECIATION': 'Dépréciation',
      'RECALCUL': 'Recalcul',
      'SORTIE': 'Sortie'
    };
    return labels[action] || action;
  };

  const getTableLabel = (table) => {
    const labels = {
      'actifs': 'Actif',
      'users': 'Utilisateur',
      'contrats': 'Contrat',
      'reevaluations': 'Réévaluation',
      'depreciations': 'Dépréciation'
    };
    return labels[table] || table;
  };

  return (
    <div style={styles.container}>
      {/* En-tête avec stats */}
      <div style={styles.header}>
        <h1 style={styles.title}>Journal d'audit</h1>
        <div style={styles.statsCards}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total logs</span>
          </div>
          {stats.parAction?.slice(0, 3).map((item, index) => (
            <div key={index} style={styles.statCard}>
              <span style={styles.statValue}>{item.count}</span>
              <span style={styles.statLabel}>{getActionLabel(item.action)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Affichage de l'erreur */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Barre de filtres */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiPackage /> Table
            </label>
            <select
              value={filters.table}
              onChange={(e) => setFilters({...filters, table: e.target.value})}
              style={styles.filterSelect}
            >
              {tables.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiActivity /> Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              style={styles.filterSelect}
            >
              {actions.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiCalendar /> Date début
            </label>
            <DatePicker
              selected={filters.startDate}
              onChange={(date) => setFilters({...filters, startDate: date})}
              dateFormat="dd/MM/yyyy"
              placeholderText="JJ/MM/AAAA"
              isClearable
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiCalendar /> Date fin
            </label>
            <DatePicker
              selected={filters.endDate}
              onChange={(date) => setFilters({...filters, endDate: date})}
              dateFormat="dd/MM/yyyy"
              placeholderText="JJ/MM/AAAA"
              isClearable
              minDate={filters.startDate}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiSearch /> Recherche
            </label>
            <div style={styles.searchBox}>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher..."
                style={styles.searchInput}
              />
              <button onClick={handleSearch} style={styles.searchButton}>
                <FiSearch />
              </button>
            </div>
          </div>
        </div>

        <div style={styles.filterActions}>
          <button onClick={handleReset} style={styles.resetButton}>
            <FiFilter /> Réinitialiser
          </button>
          <button onClick={handleExport} style={styles.exportButton}>
            <FiDownload /> Exporter
          </button>
          <button onClick={fetchLogs} style={styles.refreshButton}>
            <FiRefreshCw /> Rafraîchir
          </button>
        </div>
      </div>

      {/* Liste des logs */}
      <div style={styles.logsCard}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Chargement des logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.noData}>
            <FiFileText size={48} color="#9ca3af" />
            <p>Aucun log trouvé</p>
          </div>
        ) : (
          <>
            <div style={styles.logsList}>
              {logs.map((log) => {
                const operationDate = getOperationDate(log);
                const isSelected = selectedAuditId === log.id;
                
                return (
                  <div key={log.id} style={styles.logItemWrapper}>
                    {/* Ligne principale de l'audit - cliquable */}
                    <div 
                      style={{...styles.logItem, ...(isSelected ? styles.logItemSelected : {})}}
                      onClick={() => toggleAuditDetails(log.id)}
                    >
                      <div style={styles.logIcon}>
                        {getActionIcon(log.action)}
                      </div>
                      <div style={styles.logContent}>
                        <div style={styles.logHeader}>
                          <div style={styles.logTitle}>
                            <strong>{getActionLabel(log.action)}</strong>
                            <span style={styles.logTable}>
                              {getTableLabel(log.table_name)}
                            </span>
                          </div>
                          <span style={styles.logDate}>
                            {formatDateTime(operationDate)}
                          </span>
                        </div>
                        <div style={styles.logDetails}>
                          {log.utilisateur && (
                            <span style={styles.logUser}>
                              <FiUser size={12} /> {log.utilisateur.full_name}
                            </span>
                          )}
                          {log.record_id && (
                            <span style={styles.logRecord}>
                              ID: {log.record_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Icône d'expansion */}
                      <div style={styles.expandIcon}>
                        {isSelected ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                      </div>
                    </div>
                    
                    {/* ✅ Détails de l'audit - affichés uniquement si sélectionné */}
                    {isSelected && (
                      <div style={styles.auditDetails}>
                        <div style={styles.detailsHeader}>
                          <FiFileText size={14} />
                          <span>Détails de l'opération</span>
                        </div>
                        
                        {/* Anciennes valeurs */}
                        {log.old_data && Object.keys(log.old_data).length > 0 && (
                          <div style={styles.detailsSection}>
                            <div style={styles.detailsSectionTitle}>
                              <span style={styles.oldDataBadge}>Anciennes valeurs</span>
                            </div>
                            <div style={styles.detailsGrid}>
                              {Object.entries(log.old_data).map(([key, value]) => (
                                <div key={key} style={styles.detailRow}>
                                  <span style={styles.detailKey}>{key}:</span>
                                  <span style={styles.detailValueOld}>
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Nouvelles valeurs */}
                        {log.new_data && Object.keys(log.new_data).length > 0 && (
                          <div style={styles.detailsSection}>
                            <div style={styles.detailsSectionTitle}>
                              <span style={styles.newDataBadge}>Nouvelles valeurs</span>
                            </div>
                            <div style={styles.detailsGrid}>
                              {Object.entries(log.new_data).map(([key, value]) => (
                                <div key={key} style={styles.detailRow}>
                                  <span style={styles.detailKey}>{key}:</span>
                                  <span style={styles.detailValueNew}>
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Si pas de données détaillées */}
                        {(!log.old_data || Object.keys(log.old_data).length === 0) && 
                         (!log.new_data || Object.keys(log.new_data).length === 0) && (
                          <div style={styles.noDetails}>
                            <em>Aucune donnée détaillée disponible pour cette action</em>
                          </div>
                        )}
                        
                        {/* Informations supplémentaires */}
                        <div style={styles.detailsFooter}>
                          <span>IP: {log.ip_address || 'N/A'}</span>
                          <span>ID complet: {log.record_id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}
                  style={styles.pageButton}
                >
                  Précédent
                </button>
                <span style={styles.pageInfo}>
                  Page {page} sur {Math.ceil(total/limit)}
                </span>
                <button
                  onClick={() => setPage(p => p+1)}
                  disabled={page >= Math.ceil(total/limit)}
                  style={styles.pageButton}
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    marginBottom: '1.5rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  statsCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)'
  },
  filtersCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem'
  },
  filterSelect: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  searchBox: {
    display: 'flex',
    gap: '0.5rem'
  },
  searchInput: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  searchButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--text-secondary)',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  refreshButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  logsCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  noData: {
    textAlign: 'center',
    padding: '3rem',
    color: '#9ca3af'
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  logItemWrapper: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  logItem: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    alignItems: 'center'
  },
  logItemSelected: {
    backgroundColor: '#e0f2fe',
    borderBottom: '1px solid #bae6fd'
  },
  logIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  logContent: {
    flex: 1
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  logTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  logTable: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)'
  },
  logDate: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  logDetails: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    color: '#4b5563'
  },
  logUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  logRecord: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  expandIcon: {
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // ✅ Styles pour les détails de l'audit
  auditDetails: {
    backgroundColor: 'var(--bg-card)',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  detailsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  detailsSection: {
    marginBottom: '1rem'
  },
  detailsSectionTitle: {
    marginBottom: '0.5rem'
  },
  oldDataBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  newDataBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dcfce7',
    color: '#10b981',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-secondary)',
    padding: '0.75rem',
    borderRadius: '6px'
  },
  detailRow: {
    display: 'flex',
    gap: '0.5rem',
    fontSize: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'baseline'
  },
  detailKey: {
    fontWeight: '600',
    color: '#4b5563',
    minWidth: '100px',
    fontFamily: 'monospace'
  },
  detailValueOld: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  detailValueNew: {
    color: '#10b981',
    backgroundColor: '#dcfce7',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  noDetails: {
    padding: '1rem',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '0.875rem'
  },
  detailsFooter: {
    marginTop: '1rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#9ca3af'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '2rem'
  },
  pageButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: '#4b5563'
  }
};

export default AuditList;
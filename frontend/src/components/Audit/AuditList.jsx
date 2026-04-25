// frontend/src/components/Audit/AuditList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { formatAuditData } from '../../utils/auditFormatter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity, FiUser, FiCalendar, FiFilter,
  FiSearch, FiDownload, FiRefreshCw, FiFileText,
  FiPackage, FiTrendingDown, FiTrendingUp, FiClock,
  FiEye, FiEdit, FiTrash2, FiPlus, FiChevronDown, FiChevronUp,
  FiShield, FiEyeOff, FiX
} from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AuditList = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { user: currentUser } = useSelector(state => state.auth || { user: null });
  
  // Déterminer les permissions selon le rôle
  const role = currentUser?.role || 'guest';
  const isJuridique = role === 'juridique';
  const isAuditeur = role === 'auditeur';
  const canFilterByUser = ['admin', 'auditeur'].includes(role);
  const canViewUserEmails = ['admin', 'auditeur'].includes(role);
  const canViewAudit = ['admin', 'auditeur'].includes(role);
  
  // États pour les logs
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  
  // État pour l'audit sélectionné (détails)
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
  
  // État pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [usersLoadingError, setUsersLoadingError] = useState(false);
  
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

  // Chargement des utilisateurs
  useEffect(() => {
    if (canFilterByUser && canViewAudit) {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users/audit-list');
          setUsers(res.data);
          setUsersLoadingError(false);
        } catch (err) {
          console.error('Erreur chargement utilisateurs:', err);
          setUsersLoadingError(true);
        }
      };
      fetchUsers();
    }
  }, [canFilterByUser, canViewAudit]);

  // Fonction pour extraire la date de l'opération
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
    if (log.action === 'REEVALUATION' && log.new_data?.date_reevaluation) {
      return new Date(log.new_data.date_reevaluation);
    }
    if (log.action === 'DEPRECIATION' && log.new_data?.date_test) {
      return new Date(log.new_data.date_test);
    }
    return new Date(log.created_at);
  };

  // Fonction de formatage des dates
  const formatDateTime = (date) => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Charger les logs
  useEffect(() => {
    if (canViewAudit) {
      fetchLogs();
    }
  }, [page, limit, filters.userId, filters.table, filters.action, filters.startDate, filters.endDate, canViewAudit]);

  // Charger les stats
  useEffect(() => {
    if (canViewAudit) {
      fetchStats();
    }
  }, [canViewAudit]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page,
        limit
      });
      
      if (filters.userId && canFilterByUser) params.append('userId', filters.userId);
      if (filters.table) params.append('table', filters.table);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      const res = await api.get(`/audit-logs?${params.toString()}`);
      
      let logsData = res.data.logs || [];
      const sortedLogs = [...logsData].sort((a, b) => {
        const dateA = new Date(a.action_date || a.created_at);
        const dateB = new Date(b.action_date || b.created_at);
        return dateB - dateA;
      });
      
      setLogs(sortedLogs);
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
      let logsData = res.data.logs || [];
      const sortedLogs = [...logsData].sort((a, b) => {
        const dateA = new Date(a.action_date || a.created_at);
        const dateB = new Date(b.action_date || b.created_at);
        return dateB - dateA;
      });
      
      setLogs(sortedLogs);
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

  const toggleAuditDetails = (auditId) => {
    setSelectedAuditId(selectedAuditId === auditId ? null : auditId);
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATE': return <FiPlus size={16} style={{ color: '#10b981' }} />;
      case 'UPDATE': return <FiEdit size={16} style={{ color: '#3b82f6' }} />;
      case 'DELETE': return <FiTrash2 size={16} style={{ color: '#ef4444' }} />;
      case 'REEVALUATION': return <FiTrendingUp size={16} style={{ color: '#f59e0b' }} />;
      case 'DEPRECIATION': return <FiTrendingDown size={16} style={{ color: '#8b5cf6' }} />;
      case 'RECALCUL': return <FiRefreshCw size={16} style={{ color: '#06b6d4' }} />;
      case 'SORTIE': return <FiPackage size={16} style={{ color: '#64748b' }} />;
      default: return <FiActivity size={16} style={{ color: '#94a3b8' }} />;
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

  // Message si accès non autorisé
  if (!canViewAudit) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.errorContainer}
      >
        <FiShield size={48} color="#ef4444" />
        <h2 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>Accès non autorisé</h2>
        <p style={{ color: '#94a3b8' }}>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Cette section est réservée aux administrateurs et auditeurs.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      {/* Bannière d'information sur le rôle */}
      {isJuridique && (
        <div style={styles.roleBanner}>
          <FiShield size={16} />
          <span>Mode Judiciaire - Accès limité (conformité RGPD)</span>
          <FiEyeOff size={14} />
        </div>
      )}
      {isAuditeur && (
        <div style={{...styles.roleBanner, background: 'linear-gradient(135deg, rgba(0,255,247,0.15), rgba(124,58,237,0.15))', color: '#00fff7'}}>
          <FiEye size={16} />
          <span>Mode Auditeur - Accès complet aux logs</span>
        </div>
      )}

      {/* En-tête avec stats */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Journal d'audit</h1>
          <p style={styles.subtitle}>Traçabilité complète des actions utilisateurs</p>
        </div>
      </div>

      {/* Statistiques */}
      <div style={styles.statsSection}>
        <div style={styles.statsCards}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={styles.statCard}
          >
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total logs</span>
          </motion.div>
          {stats.parAction?.slice(0, 3).map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + (index * 0.05) }}
              style={styles.statCard}
            >
              <span style={styles.statValue}>{item.count}</span>
              <span style={styles.statLabel}>{getActionLabel(item.action)}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Affichage de l'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.errorAlert}
          >
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose}>
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de filtres futuriste */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          {/* Filtre Utilisateur - conditionnel selon le rôle */}
          {canFilterByUser ? (
            <div style={styles.filterGroup}>
              <label><FiUser size={14} /> Utilisateur</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({...filters, userId: e.target.value})}
                disabled={usersLoadingError}
                style={styles.select}
              >
                <option value="">Tous les utilisateurs</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                    {canViewUserEmails && u.email && ` (${u.email})`}
                  </option>
                ))}
              </select>
              {usersLoadingError && (
                <small style={{ color: '#f59e0b' }}>Chargement impossible</small>
              )}
            </div>
          ) : (
            <div style={styles.filterGroup}>
              <label><FiUser size={14} /> Utilisateur</label>
              <select style={{...styles.select, opacity: 0.6, cursor: 'not-allowed' }} disabled>
                <option>Filtre indisponible</option>
              </select>
              {isJuridique && (
                <small style={{ color: '#64748b' }}>Non disponible pour le rôle juridique</small>
              )}
            </div>
          )}

          <div style={styles.filterGroup}>
            <label><FiPackage size={14} /> Table</label>
            <select
              value={filters.table}
              onChange={(e) => setFilters({...filters, table: e.target.value})}
              style={styles.select}
            >
              {tables.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label><FiActivity size={14} /> Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              style={styles.select}
            >
              {actions.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label><FiCalendar size={14} /> Date début</label>
            <DatePicker
              selected={filters.startDate}
              onChange={(date) => setFilters({...filters, startDate: date})}
              dateFormat="dd/MM/yyyy"
              placeholderText="JJ/MM/AAAA"
              isClearable
              className="react-datepicker-custom"
            />
          </div>

          <div style={styles.filterGroup}>
            <label><FiCalendar size={14} /> Date fin</label>
            <DatePicker
              selected={filters.endDate}
              onChange={(date) => setFilters({...filters, endDate: date})}
              dateFormat="dd/MM/yyyy"
              placeholderText="JJ/MM/AAAA"
              isClearable
              minDate={filters.startDate}
              className="react-datepicker-custom"
            />
          </div>

          <div style={styles.filterGroup}>
            <label><FiSearch size={14} /> Recherche</label>
            <div style={styles.searchBox}>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher..."
                style={styles.searchInput}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSearch} 
                style={styles.searchButton}
              >
                <FiSearch size={14} />
              </motion.button>
            </div>
          </div>
        </div>

        <div style={styles.filterActions}>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset} 
            style={styles.resetButton}
          >
            <FiFilter size={14} /> Réinitialiser
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport} 
            style={styles.exportButton}
          >
            <FiDownload size={14} /> Exporter
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchLogs} 
            style={styles.refreshButton}
          >
            <FiRefreshCw size={14} /> Rafraîchir
          </motion.button>
        </div>
      </div>

      {/* Liste des logs */}
      <div style={styles.logsCard}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Chargement des logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.noData}>
            <FiFileText size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
            <p>Aucun log trouvé</p>
          </div>
        ) : (
          <>
            <div style={styles.logsList}>
              {logs.map((log, index) => {
                const operationDate = getOperationDate(log);
                const isSelected = selectedAuditId === log.id;
                
                return (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    style={styles.logItem}
                  >
                    {/* Ligne principale */}
                    <div 
                      onClick={() => toggleAuditDetails(log.id)}
                      style={{
                        ...styles.logRow,
                        backgroundColor: isSelected ? 'rgba(0,255,247,0.05)' : 'transparent'
                      }}
                    >
                      <div style={styles.logIcon}>
                        {getActionIcon(log.action)}
                      </div>
                      <div style={styles.logContent}>
                        <div style={styles.logHeader}>
                          <div style={styles.logBadges}>
                            <strong>{getActionLabel(log.action)}</strong>
                            <span style={styles.tableBadge}>{getTableLabel(log.table_name)}</span>
                          </div>
                          <span style={styles.logDate}>{formatDateTime(operationDate)}</span>
                        </div>
                        <div style={styles.logMeta}>
                          {log.utilisateur && (
                            <span><FiUser size={12} /> {log.utilisateur.full_name}</span>
                          )}
                          {log.record_id && (
                            <span className="font-monospace">ID: {log.record_id.substring(0, 8)}...</span>
                          )}
                        </div>
                      </div>
                      <div style={styles.logExpand}>
                        {isSelected ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                      </div>
                    </div>
                    
                    {/* Détails expansés */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={styles.logDetails}
                        >
                          <div style={styles.detailsHeader}>
                            <FiFileText size={14} />
                            <span>Détails de l'opération</span>
                          </div>
                          
                          {/* Anciennes valeurs */}
                          {log.old_data && Object.keys(log.old_data).length > 0 && (
                            <div style={styles.detailsSection}>
                              {formatAuditData(log.old_data, 'old')}
                            </div>
                          )}
                          
                          {/* Nouvelles valeurs */}
                          {log.new_data && Object.keys(log.new_data).length > 0 && (
                            <div style={styles.detailsSection}>
                              {formatAuditData(log.new_data, 'new')}
                            </div>
                          )}
                          
                          {/* Pas de données */}
                          {(!log.old_data || Object.keys(log.old_data).length === 0) && 
                           (!log.new_data || Object.keys(log.new_data).length === 0) && (
                            <div style={styles.noDetails}>
                              <em>Aucune donnée détaillée disponible pour cette action</em>
                            </div>
                          )}
                          
                          {/* Infos supplémentaires */}
                          <div style={styles.detailsFooter}>
                            <span>IP: {log.ip_address || 'N/A'}</span>
                            <span className="font-monospace">ID complet: {log.record_id}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div style={styles.pagination}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}
                  style={{...styles.paginationButton, opacity: page === 1 ? 0.5 : 1}}
                >
                  Précédent
                </motion.button>
                <span style={styles.paginationInfo}>
                  Page {page} sur {Math.ceil(total/limit)}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage(p => p+1)}
                  disabled={page >= Math.ceil(total/limit)}
                  style={{...styles.paginationButton, opacity: page >= Math.ceil(total/limit) ? 0.5 : 1}}
                >
                  Suivant
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .react-datepicker-custom {
          width: 100%;
          padding: 0.5rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(0, 255, 247, 0.2);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 0.875rem;
        }
        .react-datepicker-custom:focus {
          outline: none;
          border-color: #00fff7;
          box-shadow: 0 0 0 2px rgba(0, 255, 247, 0.1);
        }
        .react-datepicker {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 255, 247, 0.2);
          font-family: inherit;
        }
        .react-datepicker__header {
          background: rgba(0, 255, 247, 0.1);
          border-bottom: 1px solid rgba(0, 255, 247, 0.2);
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name,
        .react-datepicker__day {
          color: #e2e8f0;
        }
        .react-datepicker__day:hover {
          background: rgba(0, 255, 247, 0.2);
        }
        .react-datepicker__day--selected {
          background: #00fff7;
          color: #0f172a;
        }
        .react-datepicker__close-icon::after {
          background-color: #00fff7;
        }
      `}</style>
    </motion.div>
  );
};

// ============ STYLES FUTURISTES ============
const styles = {
  container: { 
    maxWidth: '1400px', 
    margin: '0 auto', 
    padding: '2rem', 
    backgroundColor: 'transparent', 
    minHeight: 'calc(100vh - 80px)' 
  },
  header: { 
    marginBottom: '1.5rem' 
  },
  title: { 
    fontSize: '1.8rem', 
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: { 
    color: '#94a3b8', 
    marginTop: '0.25rem' 
  },
  statsSection: { 
    marginBottom: '2rem' 
  },
  statsCards: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4, 1fr)', 
    gap: '1rem', 
    marginBottom: '1rem' 
  },
  statCard: { 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px', 
    padding: '1.5rem', 
    textAlign: 'center', 
    border: '1px solid rgba(0,255,247,0.15)'
  },
  statValue: { 
    fontSize: '2rem', 
    fontWeight: 'bold', 
    color: '#00fff7', 
    display: 'block' 
  },
  statLabel: { 
    fontSize: '0.8rem', 
    color: '#94a3b8' 
  },
  roleBanner: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '0.75rem', 
    background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
    border: '1px solid rgba(245,158,11,0.3)',
    color: '#fbbf24', 
    padding: '0.75rem 1rem', 
    borderRadius: '12px', 
    marginBottom: '1rem',
    fontSize: '0.8rem'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    marginBottom: '1rem'
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  filtersCard: { 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px', 
    padding: '1.5rem', 
    marginBottom: '1.5rem', 
    border: '1px solid rgba(0,255,247,0.15)'
  },
  filtersGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '1rem', 
    marginBottom: '1rem' 
  },
  filterGroup: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  select: {
    padding: '0.5rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  searchBox: {
    display: 'flex',
    gap: '0.5rem'
  },
  searchInput: {
    flex: 1,
    padding: '0.5rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    outline: 'none'
  },
  searchButton: {
    padding: '0.5rem 0.75rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer'
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(0,255,247,0.15)'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  exportButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  refreshButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  logsCard: { 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px', 
    border: '1px solid rgba(0,255,247,0.15)',
    overflow: 'hidden'
  },
  loading: { 
    textAlign: 'center', 
    padding: '3rem' 
  },
  spinner: { 
    width: '40px', 
    height: '40px', 
    border: '3px solid rgba(0,255,247,0.2)', 
    borderTop: '3px solid #00fff7', 
    borderRadius: '50%', 
    animation: 'spin 1s linear infinite', 
    margin: '0 auto 1rem' 
  },
  noData: { 
    textAlign: 'center', 
    padding: '3rem', 
    color: '#64748b' 
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column'
  },
  logItem: {
    borderBottom: '1px solid rgba(0,255,247,0.08)'
  },
  logRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  logIcon: {
    marginTop: '0.125rem'
  },
  logContent: {
    flex: 1
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '0.5rem'
  },
  logBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tableBadge: {
    padding: '0.125rem 0.5rem',
    backgroundColor: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '20px',
    fontSize: '0.7rem',
    color: '#00fff7'
  },
  logDate: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  logMeta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.7rem',
    color: '#94a3b8'
  },
  logExpand: {
    color: '#64748b'
  },
  logDetails: {
    padding: '1rem',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderTop: '1px solid rgba(0,255,247,0.08)'
  },
  detailsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(0,255,247,0.15)',
    fontSize: '0.8rem',
    color: '#00fff7'
  },
  detailsSection: {
    marginBottom: '1rem'
  },
  noDetails: {
    textAlign: 'center',
    padding: '1rem',
    color: '#64748b',
    fontStyle: 'italic'
  },
  detailsFooter: {
    marginTop: '1rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid rgba(0,255,247,0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#64748b'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderTop: '1px solid rgba(0,255,247,0.15)'
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#00fff7',
    cursor: 'pointer'
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: '#94a3b8'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    maxWidth: '500px',
    margin: '2rem auto',
    border: '1px solid rgba(0,255,247,0.15)'
  }
};

export default AuditList;
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { getUserRecentActivity, getUserAuditLogs } from '../../services/auditService';
import {
  FiUser, FiMail, FiShield, FiCalendar,
  FiClock, FiEdit, FiTrash2, FiArrowLeft,
  FiActivity, FiFileText, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiSearch,
  FiX, FiEye, FiInfo
} from 'react-icons/fi';

const UtilisateurDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { can, user: currentUser } = usePermissions();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  
  // État pour l'activité récente
  const [activities, setActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // État pour les logs d'audit (admin uniquement)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ action: '', table_name: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const isAdmin = can(['admin']);

  useEffect(() => {
    chargerUtilisateur();
  }, [id]);

  useEffect(() => {
    if (user && activeTab === 'activite') {
      chargerActiviteRecente();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user && activeTab === 'audit' && isAdmin) {
      chargerAuditLogs();
    }
  }, [user, activeTab, pagination.page, filters]);

  const chargerUtilisateur = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const chargerActiviteRecente = async () => {
    try {
      setLoadingActivity(true);
      const data = await getUserRecentActivity(id, 20);
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error('Erreur chargement activité:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const chargerAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const data = await getUserAuditLogs(id, {
        page: pagination.page,
        limit: 20,
        action: filters.action,
        table_name: filters.table_name
      });
      if (data.success) {
        setAuditLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
      }
    } catch (err) {
      console.error('Erreur chargement logs audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer l'utilisateur "${user?.full_name}" ?`)) return;
    try {
      await api.delete(`/users/${id}`);
      navigate('/utilisateurs');
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'activite') {
      chargerActiviteRecente();
    } else if (activeTab === 'audit') {
      chargerAuditLogs();
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ action: '', table_name: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const getRoleBadge = (role) => {
    const colors = {
      'admin': { bg: '#fee2e2', color: '#b91c1c' },
      'comptable': { bg: '#dbeafe', color: '#1e40af' },
      'auditeur': { bg: '#fef3c7', color: '#92400e' },
      'juridique': { bg: '#dcfce7', color: '#166534' },
      'informatique': { bg: '#e0f2fe', color: '#0369a1' },
      'inventoriste': { bg: '#f3e8ff', color: '#6b21a8' },
      'gestionnaire': { bg: '#f1f5f9', color: '#334155' }
    };
    const style = colors[role] || colors['gestionnaire'];
    return (
      <span style={{
        ...styles.roleBadge,
        backgroundColor: style.bg,
        color: style.color
      }}>
        {role}
      </span>
    );
  };

  const getActionBadge = (action) => {
    const config = {
      'CREATE': { bg: '#dcfce7', color: '#166534', label: 'Création', icon: '➕' },
      'UPDATE': { bg: '#fef3c7', color: '#92400e', label: 'Modification', icon: '✏️' },
      'DELETE': { bg: '#fee2e2', color: '#b91c1c', label: 'Suppression', icon: '🗑️' }
    };
    const c = config[action] || { bg: '#e5e7eb', color: '#374151', label: action, icon: '📌' };
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '20px',
        fontSize: '0.7rem',
        fontWeight: '500',
        backgroundColor: c.bg,
        color: c.color
      }}>
        {c.icon} {c.label}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours} h`;
    if (days < 7) return `il y a ${days} j`;
    return formatDate(date);
  };

  const getEntityName = (tableName) => {
    const names = {
      'users': 'Utilisateur',
      'actifs': 'Actif',
      'contrats': 'Contrat',
      'categories_amortissement': 'Catégorie',
      'audit_logs': 'Log'
    };
    return names[tableName] || tableName;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={styles.errorContainer}>
        <FiUser size={48} color="#ef4444" />
        <p>{error || 'Utilisateur non trouvé'}</p>
        <button onClick={() => navigate('/utilisateurs')} style={styles.backButton}>
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/utilisateurs')} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
        <h1 style={styles.title}>Détail de l'utilisateur</h1>
        {can(['admin']) && (
          <div style={styles.headerActions}>
            <button
              onClick={() => navigate(`/utilisateurs/modifier/${id}`)}
              style={styles.editButton}
            >
              <FiEdit /> Modifier
            </button>
            <button onClick={handleDelete} style={styles.deleteButton}>
              <FiTrash2 /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('info')}
          style={activeTab === 'info' ? styles.tabActive : styles.tab}
        >
          <FiUser /> Informations
        </button>
        <button
          onClick={() => setActiveTab('activite')}
          style={activeTab === 'activite' ? styles.tabActive : styles.tab}
        >
          <FiActivity /> Activité récente
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            style={activeTab === 'audit' ? styles.tabActive : styles.tab}
          >
            <FiFileText /> Logs d'audit
          </button>
        )}
      </div>

      {/* Rafraîchir */}
      {(activeTab === 'activite' || activeTab === 'audit') && (
        <div style={styles.refreshBar}>
          <button onClick={handleRefresh} style={styles.refreshButton}>
            <FiRefreshCw /> Rafraîchir
          </button>
        </div>
      )}

      {/* Contenu des onglets */}
      <div style={styles.tabContent}>
        {/* Onglet Informations */}
        {activeTab === 'info' && (
          <div style={styles.infoCard}>
            <div style={styles.infoHeader}>
              <div style={styles.avatar}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={styles.userName}>{user.full_name}</h2>
                <div style={styles.userEmail}>{user.email}</div>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <FiShield />
                <div>
                  <span style={styles.infoLabel}>Rôle</span>
                  <div style={styles.infoValue}>
                    {getRoleBadge(user.role)}
                  </div>
                </div>
              </div>

              <div style={styles.infoItem}>
                <FiCalendar />
                <div>
                  <span style={styles.infoLabel}>Créé le</span>
                  <span style={styles.infoValue}>{formatDate(user.created_at)}</span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <FiClock />
                <div>
                  <span style={styles.infoLabel}>Dernière modification</span>
                  <span style={styles.infoValue}>{formatDate(user.updated_at)}</span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <FiMail />
                <div>
                  <span style={styles.infoLabel}>Email vérifié</span>
                  <span style={styles.infoValue}>
                    {user.email_verified ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Activité récente */}
        {activeTab === 'activite' && (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>
              <FiActivity /> Activité récente de {user.full_name}
            </h3>
            
            {loadingActivity ? (
              <div style={styles.loadingSmall}>
                <div style={styles.spinnerSmall}></div>
                <p>Chargement de l'activité...</p>
              </div>
            ) : activities.length === 0 ? (
              <div style={styles.emptyState}>
                <FiActivity size={48} color="#cbd5e1" />
                <p>Aucune activité récente</p>
              </div>
            ) : (
              <div style={styles.activityList}>
                {activities.map((activity) => (
                  <div key={activity.id} style={styles.activityItem}>
                    <div style={{ ...styles.activityIcon, backgroundColor: `${activity.color}20` }}>
                      <span style={{ color: activity.color }}>{activity.icon}</span>
                    </div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityHeader}>
                        <span style={styles.activityAction}>{activity.description}</span>
                        <span style={styles.activityTime}>{formatRelativeTime(activity.created_at)}</span>
                      </div>
                      <div style={styles.activityDetails}>
                        <span style={styles.activityEntity}>
                          {getEntityName(activity.entity_type)}
                        </span>
                        {activity.ip_address && (
                          <span style={styles.activityIp}>IP: {activity.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Logs d'audit (admin uniquement) */}
        {activeTab === 'audit' && isAdmin && (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>
              <FiFileText /> Logs d'audit de {user.full_name}
            </h3>

            {/* Filtres */}
            <div style={styles.filtersHeader}>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                style={styles.filterToggle}
              >
                <FiSearch /> {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
              </button>
              {(filters.action || filters.table_name) && (
                <button onClick={resetFilters} style={styles.resetFilters}>
                  <FiX /> Réinitialiser
                </button>
              )}
            </div>

            {showFilters && (
              <div style={styles.filtersPanel}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="">Toutes</option>
                    <option value="CREATE">Création</option>
                    <option value="UPDATE">Modification</option>
                    <option value="DELETE">Suppression</option>
                  </select>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Table</label>
                  <select
                    value={filters.table_name}
                    onChange={(e) => handleFilterChange('table_name', e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="">Toutes</option>
                    <option value="users">Utilisateurs</option>
                    <option value="actifs">Actifs</option>
                    <option value="contrats">Contrats</option>
                    <option value="categories_amortissement">Catégories</option>
                  </select>
                </div>
              </div>
            )}

            {loadingAudit ? (
              <div style={styles.loadingSmall}>
                <div style={styles.spinnerSmall}></div>
                <p>Chargement des logs...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={styles.emptyState}>
                <FiFileText size={48} color="#cbd5e1" />
                <p>Aucun log d'audit trouvé</p>
              </div>
            ) : (
              <>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Action</th>
                        <th style={styles.th}>Table</th>
                        <th style={styles.th}>IP</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} style={styles.tr}>
                          <td style={styles.td}>{formatDate(log.created_at)}</td>
                          <td style={styles.td}>{getActionBadge(log.action)}</td>
                          <td style={styles.td}>{getEntityName(log.table_name)}</td>
                          <td style={styles.td}>
                            <code style={styles.ipCode}>{log.ip_address || '-'}</code>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => viewLogDetails(log)}
                              style={styles.viewButton}
                              title="Voir détails"
                            >
                              <FiEye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      style={styles.pageButton}
                    >
                      <FiChevronLeft />
                    </button>
                    <span style={styles.pageInfo}>
                      Page {pagination.page} sur {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      style={styles.pageButton}
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal détails log */}
      {showModal && selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiInfo /> Détails du log
              </h3>
              <button onClick={() => setShowModal(false)} style={styles.modalClose}>
                <FiX />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailRow}>
                <strong>Action :</strong> {getActionBadge(selectedLog.action)}
              </div>
              <div style={styles.detailRow}>
                <strong>Table :</strong> {getEntityName(selectedLog.table_name)}
              </div>
              <div style={styles.detailRow}>
                <strong>ID enregistrement :</strong> <code>{selectedLog.record_id}</code>
              </div>
              <div style={styles.detailRow}>
                <strong>Date :</strong> {formatDate(selectedLog.created_at)}
              </div>
              <div style={styles.detailRow}>
                <strong>IP :</strong> {selectedLog.ip_address || '-'}
              </div>
              {selectedLog.old_data && (
                <div style={styles.detailSection}>
                  <strong>Anciennes données :</strong>
                  <pre style={styles.jsonPre}>{JSON.stringify(selectedLog.old_data, null, 2)}</pre>
                </div>
              )}
              {selectedLog.new_data && (
                <div style={styles.detailSection}>
                  <strong>Nouvelles données :</strong>
                  <pre style={styles.jsonPre}>{JSON.stringify(selectedLog.new_data, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569'
  },
  title: {
    fontSize: '1.5rem',
    color: '#1e293b',
    margin: 0,
    flex: 1
  },
  headerActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0.5rem'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tabActive: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  refreshBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '1rem'
  },
  refreshButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569'
  },
  tabContent: {
    marginTop: '1.5rem'
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  userName: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.5rem',
    color: '#1e293b'
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  infoValue: {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  roleBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  activityItem: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  activityIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem'
  },
  activityContent: {
    flex: 1
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '0.5rem'
  },
  activityAction: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  activityTime: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  activityDetails: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.7rem',
    color: '#64748b'
  },
  activityEntity: {
    padding: '0.125rem 0.5rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px'
  },
  activityIp: {
    fontFamily: 'monospace'
  },
  filtersHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  filterToggle: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569'
  },
  resetFilters: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#b91c1c'
  },
  filtersPanel: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: '150px'
  },
  filterLabel: {
    fontSize: '0.7rem',
    fontWeight: '500',
    color: '#64748b'
  },
  filterSelect: {
    padding: '0.4rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.8rem',
    backgroundColor: '#ffffff'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    fontSize: '0.8rem',
    color: '#475569'
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.8rem',
    color: '#1e293b'
  },
  tr: {
    transition: 'background-color 0.2s'
  },
  ipCode: {
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    backgroundColor: '#f1f5f9',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px'
  },
  viewButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.2s'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  pageButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569',
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  pageInfo: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#64748b'
  },
  modalBody: {
    padding: '1.5rem',
    overflowY: 'auto'
  },
  detailRow: {
    marginBottom: '0.75rem',
    fontSize: '0.85rem',
    color: '#1e293b'
  },
  detailSection: {
    marginTop: '1rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e5e7eb'
  },
  jsonPre: {
    backgroundColor: '#f8fafc',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    overflowX: 'auto',
    fontFamily: 'monospace',
    marginTop: '0.5rem'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
  },
  loadingSmall: {
    textAlign: 'center',
    padding: '2rem'
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
  spinnerSmall: {
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #2563eb',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 0.5rem'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#94a3b8'
  }
};

export default UtilisateurDetail;
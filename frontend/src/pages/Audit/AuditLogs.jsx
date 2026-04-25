import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLogs } from '../../store/auditSlice';
import {
  FiSearch, FiFilter, FiDownload,
  FiUser, FiCalendar, FiDatabase,
  FiChevronDown, FiChevronUp, FiEye,
  FiActivity, FiClock, FiShield, FiInfo
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const AuditLogs = () => {
  const dispatch = useDispatch();
  const { logs, loading, total } = useSelector((state) => state.audit);
  const { users } = useSelector((state) => state.users);
  
  const [filters, setFilters] = useState({
    userId: '',
    table: '',
    action: '',
    dateDebut: '',
    dateFin: '',
    recherche: ''
  });
  
  const [expandedRows, setExpandedRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // État pour les logs triés
  const [sortedLogs, setSortedLogs] = useState([]);

  useEffect(() => {
    dispatch(fetchAuditLogs({ ...filters, ...pagination }));
  }, [dispatch, filters, pagination]);

  // Effet pour trier les logs quand ils arrivent du Redux
  useEffect(() => {
    if (logs && logs.length > 0) {
      const sorted = [...logs].sort((a, b) => {
        const dateA = new Date(a.action_date || a.created_at);
        const dateB = new Date(b.action_date || b.created_at);
        return dateB - dateA;
      });
      setSortedLogs(sorted);
    } else {
      setSortedLogs(logs || []);
    }
  }, [logs]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      userId: '',
      table: '',
      action: '',
      dateDebut: '',
      dateFin: '',
      recherche: ''
    });
    setPagination({ page: 1, limit: 20 });
  };

  const toggleRow = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const openDetailModal = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOperationDate = (log) => {
    return log.action_date || log.created_at;
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: '#10b981',
      UPDATE: '#f59e0b',
      DELETE: '#ef4444'
    };
    return colors[action] || '#64748b';
  };

  const getActionBadgeClass = (action) => {
    const classes = {
      CREATE: 'success',
      UPDATE: 'warning',
      DELETE: 'danger'
    };
    return classes[action] || 'secondary';
  };

  const getActionIcon = (action) => {
    const icons = {
      CREATE: '➕',
      UPDATE: '✏️',
      DELETE: '🗑️'
    };
    return icons[action] || '📋';
  };

  const getTableLabel = (table) => {
    const labels = {
      actifs: 'Actifs',
      users: 'Utilisateurs',
      amortissements: 'Amortissements',
      contrats: 'Contrats',
      depreciations: 'Dépréciations',
      reevaluations: 'Réévaluations',
      mouvements: 'Mouvements',
      documents: 'Documents'
    };
    return labels[table] || table;
  };

  const tableOptions = [
    { value: '', label: 'Toutes les tables' },
    { value: 'actifs', label: 'Actifs' },
    { value: 'users', label: 'Utilisateurs' },
    { value: 'amortissements', label: 'Amortissements' },
    { value: 'contrats', label: 'Contrats' },
    { value: 'depreciations', label: 'Dépréciations' },
    { value: 'reevaluations', label: 'Réévaluations' },
    { value: 'mouvements', label: 'Mouvements' },
    { value: 'documents', label: 'Documents' }
  ];

  const actionOptions = [
    { value: '', label: 'Toutes les actions' },
    { value: 'CREATE', label: 'Création' },
    { value: 'UPDATE', label: 'Modification' },
    { value: 'DELETE', label: 'Suppression' }
  ];

  // Filtrer par onglet
  const getFilteredLogs = () => {
    if (activeTab === 'all') return sortedLogs;
    return sortedLogs.filter(log => log.action === activeTab.toUpperCase());
  };

  const filteredLogs = getFilteredLogs();
  const stats = {
    total: total,
    create: logs.filter(l => l.action === 'CREATE').length,
    update: logs.filter(l => l.action === 'UPDATE').length,
    delete: logs.filter(l => l.action === 'DELETE').length
  };

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .audit-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .audit-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .table-row-hover {
      transition: background-color 0.2s ease;
    }
    .table-row-hover:hover {
      background-color: rgba(13, 110, 253, 0.05);
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="container-fluid py-4 px-3 px-md-4 audit-fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Modal de détails */}
        <div className={`modal fade ${showDetailModal ? 'show d-block' : ''}`} 
             style={{ display: showDetailModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
             onClick={() => setShowDetailModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FiEye size={18} /> Détails de l'événement
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body">
                {selectedLog && (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <small className="text-muted d-block">Action</small>
                        <span className={`badge bg-${getActionBadgeClass(selectedLog.action)} bg-opacity-10 text-${getActionBadgeClass(selectedLog.action)}`}>
                          {getActionIcon(selectedLog.action)} {selectedLog.action}
                        </span>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted d-block">Table</small>
                        <span className="badge bg-info bg-opacity-10 text-info">
                          <FiDatabase size={12} className="me-1" /> {getTableLabel(selectedLog.table_name)}
                        </span>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <small className="text-muted d-block">Date</small>
                        <div><FiClock size={12} className="me-1" /> {formatDate(getOperationDate(selectedLog))}</div>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted d-block">Utilisateur</small>
                        <div><FiUser size={12} className="me-1" /> {selectedLog.user?.full_name || 'Système'}</div>
                        <small className="text-muted">{selectedLog.user?.email}</small>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <small className="text-muted d-block">ID Enregistrement</small>
                        <code className="bg-light px-2 py-1 rounded small">{selectedLog.record_id}</code>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted d-block">IP Address</small>
                        <div>{selectedLog.ip_address || 'N/A'}</div>
                      </div>
                    </div>
                    <hr />
                    <div className="row">
                      {selectedLog.old_data && (
                        <div className="col-md-6">
                          <h6 className="small fw-semibold text-danger mb-2">Anciennes valeurs</h6>
                          <pre className="bg-light p-3 rounded-3 small" style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px' }}>
                            {JSON.stringify(selectedLog.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.new_data && (
                        <div className="col-md-6">
                          <h6 className="small fw-semibold text-success mb-2">Nouvelles valeurs</h6>
                          <pre className="bg-light p-3 rounded-3 small" style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px' }}>
                            {JSON.stringify(selectedLog.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FiShield size={32} /> Journal d'audit
            </h1>
            <p className="text-muted mb-0">
              {total} événement(s) enregistré(s)
            </p>
          </div>
          <div className="d-flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
            >
              <FiFilter size={16} /> Filtres
            </button>
            <button className="btn btn-success d-flex align-items-center gap-2">
              <FiDownload size={16} /> Exporter
            </button>
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-primary bg-opacity-10 text-center">
              <div className="card-body py-2">
                <small className="text-primary d-flex align-items-center justify-content-center gap-1">
                  <FiActivity size={12} /> Total
                </small>
                <div className="h5 mb-0 fw-bold text-primary">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-success bg-opacity-10 text-center">
              <div className="card-body py-2">
                <small className="text-success">➕ Créations</small>
                <div className="h5 mb-0 fw-bold text-success">{stats.create}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-warning bg-opacity-10 text-center">
              <div className="card-body py-2">
                <small className="text-warning">✏️ Modifications</small>
                <div className="h5 mb-0 fw-bold text-warning">{stats.update}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-danger bg-opacity-10 text-center">
              <div className="card-body py-2">
                <small className="text-danger">🗑️ Suppressions</small>
                <div className="h5 mb-0 fw-bold text-danger">{stats.delete}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            Tous ({stats.total})
          </button>
          <button 
            onClick={() => setActiveTab('create')} 
            className={`btn ${activeTab === 'create' ? 'btn-success' : 'btn-outline-secondary'}`}
          >
            ➕ Créations ({stats.create})
          </button>
          <button 
            onClick={() => setActiveTab('update')} 
            className={`btn ${activeTab === 'update' ? 'btn-warning' : 'btn-outline-secondary'}`}
          >
            ✏️ Modifications ({stats.update})
          </button>
          <button 
            onClick={() => setActiveTab('delete')} 
            className={`btn ${activeTab === 'delete' ? 'btn-danger' : 'btn-outline-secondary'}`}
          >
            🗑️ Suppressions ({stats.delete})
          </button>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="card shadow-sm border-0 rounded-3 mb-4 audit-slide-in">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiUser size={14} /> Utilisateur
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.userId}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                  >
                    <option value="">Tous les utilisateurs</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiDatabase size={14} /> Table
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.table}
                    onChange={(e) => handleFilterChange('table', e.target.value)}
                  >
                    {tableOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold">Action</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                  >
                    {actionOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiCalendar size={14} /> Période
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={filters.dateDebut}
                      onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                      placeholder="Date début"
                    />
                    <span className="text-muted align-self-center">-</span>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={filters.dateFin}
                      onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                      placeholder="Date fin"
                    />
                  </div>
                </div>

                <div className="col-md-12">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiSearch size={14} /> Recherche
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Rechercher dans les données..."
                      value={filters.recherche}
                      onChange={(e) => handleFilterChange('recherche', e.target.value)}
                    />
                    <button className="btn btn-outline-secondary" onClick={resetFilters}>
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des logs */}
        <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="text-muted">Chargement des logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-5">
              <FiShield size={48} className="text-muted mb-3" />
              <p className="text-muted">Aucun log trouvé pour cette période</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '160px' }}>Date/Heure</th>
                      <th style={{ width: '180px' }}>Utilisateur</th>
                      <th style={{ width: '100px' }}>Action</th>
                      <th style={{ width: '120px' }}>Table</th>
                      <th style={{ width: '200px' }}>ID Enregistrement</th>
                      <th style={{ width: '100px' }}>IP</th>
                      <th style={{ width: '80px' }}>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="table-row-hover">
                          <td className="text-nowrap small">{formatDate(getOperationDate(log))}</td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="fw-semibold small">{log.user?.full_name || 'Système'}</span>
                              <small className="text-muted">{log.user?.email}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`badge bg-${getActionBadgeClass(log.action)} bg-opacity-10 text-${getActionBadgeClass(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info bg-opacity-10 text-info">
                              {getTableLabel(log.table_name)}
                            </span>
                          </td>
                          <td>
                            <code className="bg-light px-2 py-1 rounded small">{log.record_id?.substring(0, 12)}…</code>
                          </td>
                          <td>
                            <small className="text-muted">{log.ip_address || 'N/A'}</small>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                onClick={() => toggleRow(log.id)}
                                className="btn btn-outline-secondary"
                                title={expandedRows.includes(log.id) ? "Masquer" : "Afficher"}
                              >
                                {expandedRows.includes(log.id) ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                              </button>
                              <button
                                onClick={() => openDetailModal(log)}
                                className="btn btn-outline-primary"
                                title="Détails complets"
                              >
                                <FiEye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRows.includes(log.id) && (
                          <tr className="bg-light">
                            <td colSpan="7" className="p-3">
                              <div className="row g-3">
                                {log.old_data && (
                                  <div className="col-md-6">
                                    <div className="card border-danger h-100">
                                      <div className="card-header bg-danger bg-opacity-10 text-danger">
                                        <strong>📄 Anciennes valeurs</strong>
                                      </div>
                                      <div className="card-body p-2">
                                        <pre className="bg-white p-2 rounded small mb-0" style={{ maxHeight: '250px', overflow: 'auto', fontSize: '11px' }}>
                                          {JSON.stringify(log.old_data, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div className="col-md-6">
                                    <div className="card border-success h-100">
                                      <div className="card-header bg-success bg-opacity-10 text-success">
                                        <strong>✨ Nouvelles valeurs</strong>
                                      </div>
                                      <div className="card-body p-2">
                                        <pre className="bg-white p-2 rounded small mb-0" style={{ maxHeight: '250px', overflow: 'auto', fontSize: '11px' }}>
                                          {JSON.stringify(log.new_data, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {!log.old_data && !log.new_data && (
                                  <div className="col-12">
                                    <div className="alert alert-info mb-0">
                                      <FiInfo size={14} className="me-2" />
                                      Aucune donnée détaillée disponible pour cette action
                                    </div>
                                  </div>
                                )}
                              </div>
                             </td>
                           </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > pagination.limit && (
                <div className="card-footer bg-white border-top-0 pt-3">
                  <nav aria-label="Page navigation">
                    <ul className="pagination justify-content-center mb-0">
                      <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                        >
                          ← Précédent
                        </button>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link">
                          Page {pagination.page} sur {Math.ceil(total / pagination.limit)}
                        </span>
                      </li>
                      <li className={`page-item ${pagination.page >= Math.ceil(total / pagination.limit) ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= Math.ceil(total / pagination.limit)}
                        >
                          Suivant →
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>

        {/* Note d'information */}
        <div className="alert alert-info mt-3 mb-0 py-2">
          <small className="d-flex align-items-center gap-2">
            <FiInfo size={14} />
            Les logs d'audit sont conservés pour une durée de 12 mois. Les données sont triées du plus récent au plus ancien.
          </small>
        </div>
      </div>
    </>
  );
};

export default AuditLogs;
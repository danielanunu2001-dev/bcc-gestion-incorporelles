import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLogs } from '../../store/auditSlice';
import {
  FiSearch, FiFilter, FiDownload,
  FiUser, FiCalendar, FiDatabase,
  FiChevronDown, FiChevronUp, FiEye
} from 'react-icons/fi';

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

  useEffect(() => {
    dispatch(fetchAuditLogs({ ...filters, ...pagination }));
  }, [dispatch, filters, pagination]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleRow = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
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

  const getActionColor = (action) => {
    const colors = {
      CREATE: '#10b981',
      UPDATE: '#f59e0b',
      DELETE: '#ef4444'
    };
    return colors[action] || 'var(--text-secondary)';
  };

  const getTableLabel = (table) => {
    const labels = {
      actifs: 'Actifs',
      users: 'Utilisateurs',
      amortissements: 'Amortissements'
    };
    return labels[table] || table;
  };

  const tableOptions = [
    { value: '', label: 'Toutes les tables' },
    { value: 'actifs', label: 'Actifs' },
    { value: 'users', label: 'Utilisateurs' },
    { value: 'amortissements', label: 'Amortissements' }
  ];

  const actionOptions = [
    { value: '', label: 'Toutes les actions' },
    { value: 'CREATE', label: 'Création' },
    { value: 'UPDATE', label: 'Modification' },
    { value: 'DELETE', label: 'Suppression' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Journal d'audit</h1>
          <p style={styles.subtitle}>
            {total} événement(s) enregistré(s)
          </p>
        </div>
        <button style={styles.exportButton}>
          <FiDownload /> Exporter
        </button>
      </div>

      {/* Filtres */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiUser /> Utilisateur
            </label>
            <select
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiDatabase /> Table
            </label>
            <select
              value={filters.table}
              onChange={(e) => handleFilterChange('table', e.target.value)}
              style={styles.filterSelect}
            >
              {tableOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              style={styles.filterSelect}
            >
              {actionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiCalendar /> Période
            </label>
            <div style={styles.dateRange}>
              <input
                type="date"
                value={filters.dateDebut}
                onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                style={styles.dateInput}
                placeholder="Date début"
              />
              <span style={styles.dateSeparator}>-</span>
              <input
                type="date"
                value={filters.dateFin}
                onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                style={styles.dateInput}
                placeholder="Date fin"
              />
            </div>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FiSearch /> Recherche
            </label>
            <input
              type="text"
              placeholder="Rechercher dans les données..."
              value={filters.recherche}
              onChange={(e) => handleFilterChange('recherche', e.target.value)}
              style={styles.filterInput}
            />
          </div>
        </div>
      </div>

      {/* Tableau des logs */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Chargement des logs...</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date/Heure</th>
                  <th style={styles.th}>Utilisateur</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Table</th>
                  <th style={styles.th}>ID Enregistrement</th>
                  <th style={styles.th}>IP</th>
                  <th style={styles.th}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr style={styles.tr}>
                      <td style={styles.td}>{formatDate(log.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <FiUser size={14} />
                          <span>{log.user?.full_name || 'Système'}</span>
                          <span style={styles.userEmail}>{log.user?.email}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.actionBadge,
                          backgroundColor: getActionColor(log.action) + '20',
                          color: getActionColor(log.action)
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={styles.td}>{getTableLabel(log.table_name)}</td>
                      <td style={styles.td}>
                        <code style={styles.code}>{log.record_id}</code>
                      </td>
                      <td style={styles.td}>{log.ip_address || 'N/A'}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => toggleRow(log.id)}
                          style={styles.viewButton}
                        >
                          <FiEye />
                          {expandedRows.includes(log.id) ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.includes(log.id) && (
                      <tr style={styles.expandedRow}>
                        <td colSpan="7" style={styles.expandedContent}>
                          <div style={styles.dataComparison}>
                            {log.old_data && (
                              <div style={styles.dataBlock}>
                                <h4 style={styles.dataTitle}>Anciennes valeurs</h4>
                                <pre style={styles.dataPre}>
                                  {JSON.stringify(log.old_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div style={styles.dataBlock}>
                                <h4 style={styles.dataTitle}>Nouvelles valeurs</h4>
                                <pre style={styles.dataPre}>
                                  {JSON.stringify(log.new_data, null, 2)}
                                </pre>
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
        )}

        {/* Pagination */}
        {total > pagination.limit && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              style={styles.paginationButton}
            >
              Précédent
            </button>
            <span style={styles.paginationInfo}>
              Page {pagination.page} sur {Math.ceil(total / pagination.limit)}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= Math.ceil(total / pagination.limit)}
              style={styles.paginationButton}
            >
              Suivant
            </button>
          </div>
        )}
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
    marginBottom: '2rem'
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
  exportButton: {
    padding: '0.75rem 1.5rem',
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
  filtersCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  filterLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  filterSelect: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  filterInput: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  dateInput: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  dateSeparator: {
    color: '#9ca3af'
  },
  tableCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'var(--bg-secondary)'
    }
  },
  td: {
    padding: '1rem',
    color: '#4b5563'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  userEmail: {
    fontSize: '0.75rem',
    color: '#666'
  },
  actionBadge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace'
  },
  viewButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  expandedRow: {
    backgroundColor: 'var(--bg-secondary)'
  },
  expandedContent: {
    padding: '1rem'
  },
  dataComparison: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem'
  },
  dataBlock: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '4px',
    padding: '1rem'
  },
  dataTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: 'var(--text-primary)'
  },
  dataPre: {
    backgroundColor: '#f3f4f6',
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    overflow: 'auto',
    maxHeight: '200px',
    margin: 0
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: '#666'
  }
};

export default AuditLogs;
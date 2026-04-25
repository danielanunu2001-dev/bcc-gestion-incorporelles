// frontend/src/components/Audit/AdvancedAuditViewer.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FiActivity, FiUser, FiCalendar, FiFilter, FiSearch,
  FiDownload, FiRefreshCw, FiFileText, FiPackage,
  FiTrendingDown, FiTrendingUp, FiClock, FiEye, FiEdit,
  FiTrash2, FiPlus, FiChevronDown, FiChevronUp, FiGrid,
  FiList, FiBarChart2, FiInfo, FiServer, FiMail, FiGlobe,
  FiPrinter, FiX, FiShield, FiEyeOff
} from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

// Couleurs pour les actions (gardées pour les badges)
const ACTION_COLORS = {
  CREATE: '#10b981',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  REEVALUATION: '#8b5cf6',
  DEPRECIATION: '#ec489a',
  RECALCUL: '#3b82f6',
  SORTIE: '#64748b',
  CONTRAT_CREATE: '#14b8a6',
  CONTRAT_UPDATE: '#f97316',
  CONTRAT_DELETE: '#dc2626'
};

const ACTION_LABELS = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  REEVALUATION: 'Réévaluation',
  DEPRECIATION: 'Dépréciation',
  RECALCUL: 'Recalcul',
  SORTIE: 'Sortie',
  CONTRAT_CREATE: 'Contrat créé',
  CONTRAT_UPDATE: 'Contrat modifié',
  CONTRAT_DELETE: 'Contrat supprimé'
};

const TABLE_LABELS = {
  actifs: 'Actifs',
  users: 'Utilisateurs',
  contrats: 'Contrats',
  reevaluations: 'Réévaluations',
  depreciations: 'Dépréciations',
  mouvements: 'Mouvements',
  documents: 'Documents',
  audit_logs: 'Audit'
};

const AdvancedAuditViewer = () => {
  const { can } = usePermissions();
  const { user: currentUser } = useSelector(state => state.auth || { user: null });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [expandedIds, setExpandedIds] = useState([]);
  const [stats, setStats] = useState({ parAction: [], parTable: [], evolution: [] });
  const [users, setUsers] = useState([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfIframeRef = useRef(null);
  const [usersLoadingError, setUsersLoadingError] = useState(false);

  // Déterminer les permissions selon le rôle
  const role = currentUser?.role || 'guest';
  const isJuridique = role === 'juridique';
  const isAuditeur = role === 'auditeur';
  const canViewFullUserList = ['admin', 'super_admin', 'auditeur'].includes(role);
  const canViewUserEmails = ['admin', 'super_admin', 'auditeur'].includes(role);
  const canFilterByUser = ['admin', 'super_admin', 'auditeur'].includes(role);
  const canViewAudit = ['admin', 'auditeur'].includes(role);

  // Filtres
  const [filters, setFilters] = useState({
    userId: '',
    table: '',
    action: '',
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    search: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  // Chargement des utilisateurs
  useEffect(() => {
    if (isJuridique) {
      setUsers([]);
      setUsersLoadingError(false);
      return;
    }
    
    if (canViewFullUserList) {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users/audit-list');
          setUsers(res.data);
          setUsersLoadingError(false);
        } catch (err) {
          setUsers([
            { id: '1', full_name: 'Admin User', email: 'admin@example.com' },
            { id: '2', full_name: 'Auditeur Principal', email: 'auditeur@example.com' },
            { id: '3', full_name: 'Comptable Général', email: 'comptable@example.com' },
          ]);
          setUsersLoadingError(false);
        }
      };
      fetchUsers();
    }
  }, [canViewFullUserList, isJuridique]);

  // Charger les logs
  const fetchLogs = useCallback(async () => {
    if (!canViewAudit) return;
    
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.userId && canFilterByUser && { userId: filters.userId }),
        ...(filters.table && { table: filters.table }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: startOfDay(filters.startDate).toISOString() }),
        ...(filters.endDate && { endDate: endOfDay(filters.endDate).toISOString() })
      });
      
      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Erreur de chargement des logs');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, canFilterByUser, canViewAudit]);

  // Charger les statistiques
  const fetchStats = useCallback(async () => {
    if (!canViewAudit) return;
    
    try {
      const statsRes = await api.get('/audit-logs/stats');
      setStats({
        parAction: statsRes.data.parAction || [],
        parTable: statsRes.data.parTable || [],
        evolution: []
      });
      
      try {
        const summaryRes = await api.get('/audit-logs/summary?periode=30d');
        if (summaryRes.data?.resume) {
          const evolutionData = summaryRes.data.resume.map(item => ({
            date: item.periode || item.date,
            count: item.total
          }));
          setStats(prev => ({ ...prev, evolution: evolutionData }));
        }
      } catch (e) {}
    } catch (err) {}
  }, [canViewAudit]);

  useEffect(() => {
    if (canViewAudit) {
      fetchLogs();
      fetchStats();
    }
  }, [fetchLogs, fetchStats, canViewAudit]);

  const handleSearch = async () => {
    if (!canViewAudit) return;
    if (!filters.search || filters.search.length < 3) return;
    setLoading(true);
    try {
      const res = await api.get(`/audit-logs/search?q=${filters.search}&page=1&limit=${pagination.limit}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPagination(prev => ({ ...prev, page: 1 }));
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      userId: '',
      table: '',
      action: '',
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      search: ''
    });
    setPagination({ page: 1, limit: 20 });
  };

  const generatePDF = async () => {
    if (!canViewAudit) return;
    setGeneratingPdf(true);
    try {
      const params = new URLSearchParams({
        limit: 1000,
        ...(filters.userId && canFilterByUser && { userId: filters.userId }),
        ...(filters.table && { table: filters.table }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: startOfDay(filters.startDate).toISOString() }),
        ...(filters.endDate && { endDate: endOfDay(filters.endDate).toISOString() })
      });
      const res = await api.get(`/audit-logs?${params.toString()}`);
      const allLogs = res.data.logs || [];

      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(18);
      doc.setTextColor(0, 255, 247);
      doc.text("Journal d'audit", pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const periode = filters.startDate && filters.endDate 
        ? `${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`
        : 'Toute période';
      doc.text(`Période: ${periode}`, pageWidth / 2, 22, { align: 'center' });
      doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 29, { align: 'center' });
      
      const tableData = allLogs.map(log => [
        format(getRealOperationDate(log), 'dd/MM/yyyy HH:mm:ss'),
        log.utilisateur?.full_name || 'Système',
        ACTION_LABELS[log.action] || log.action,
        TABLE_LABELS[log.table_name] || log.table_name,
        log.record_id?.substring(0, 12) || '',
        log.ip_address || 'N/A'
      ]);
      
      autoTable(doc, {
        startY: 35,
        head: [['Date/heure', 'Utilisateur', 'Action', 'Table', 'ID', 'IP']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 255, 247], textColor: [0, 0, 0], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 20 }
        }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10);
      }
      
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(blobUrl);
      setShowPdfModal(true);
    } catch (err) {
      setError('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const closePdfModal = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setShowPdfModal(false);
  };

  const printPdf = () => {
    if (pdfIframeRef.current) {
      pdfIframeRef.current.contentWindow.print();
    }
  };

  const downloadPdf = () => {
    if (pdfBlobUrl) {
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      link.download = `audit_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
      link.click();
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: fr });
  };

  const getRealOperationDate = (log) => {
    const findDateInObject = (obj) => {
      if (!obj) return null;
      const dateFields = [
        'date_acquisition', 'date_debut', 'date_fin', 'date_validite',
        'date_reevaluation', 'date_test', 'date_mouvement', 'date_sortie',
        'updated_at', 'created_at', 'date', 'action_date'
      ];
      for (const field of dateFields) {
        if (obj[field]) {
          const parsed = new Date(obj[field]);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
      for (const key of Object.keys(obj)) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          const found = findDateInObject(obj[key]);
          if (found) return found;
        }
      }
      return null;
    };

    if (log.table_name === 'actifs' && log.action === 'CREATE' && log.new_data?.date_acquisition) {
      return new Date(log.new_data.date_acquisition);
    }
    if (log.table_name === 'actifs' && log.action === 'UPDATE') {
      if (log.new_data?.updated_at) return new Date(log.new_data.updated_at);
      if (log.old_data?.updated_at) return new Date(log.old_data.updated_at);
    }
    if (log.table_name === 'contrats' && log.action === 'CONTRAT_CREATE' && log.new_data?.date_debut) {
      return new Date(log.new_data.date_debut);
    }
    const dateFromNew = findDateInObject(log.new_data);
    if (dateFromNew) return dateFromNew;
    const dateFromOld = findDateInObject(log.old_data);
    if (dateFromOld) return dateFromOld;

    return new Date(log.action_date || log.created_at);
  };

  const toggleDetails = (id) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderDiff = (oldData, newData) => {
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    const changes = [];
    for (const key of allKeys) {
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, oldVal, newVal });
      }
    }
    if (changes.length === 0) return <p style={styles.noDiff}>Aucune modification détectée</p>;
    return (
      <div style={styles.diffGrid}>
        {changes.map(change => (
          <div key={change.key} style={styles.diffRow}>
            <div style={styles.diffKey}>{change.key}</div>
            <div style={styles.diffValues}>
              <span style={styles.oldValue}>{change.oldVal !== undefined ? String(change.oldVal) : 'null'}</span>
              <span style={styles.arrow}>→</span>
              <span style={styles.newValue}>{change.newVal !== undefined ? String(change.newVal) : 'null'}</span>
            </div>
          </div>
        ))}
      </div>
    );
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
          <span>Mode Juridique - Accès limité (conformité RGPD)</span>
          <FiEyeOff size={14} />
        </div>
      )}
      {isAuditeur && (
        <div style={{...styles.roleBanner, background: 'linear-gradient(135deg, rgba(0,255,247,0.15), rgba(124,58,237,0.15))', color: '#00fff7'}}>
          <FiEye size={16} />
          <span>Mode Auditeur - Accès complet aux logs</span>
        </div>
      )}

      {/* Modale PDF */}
      <AnimatePresence>
        {showPdfModal && pdfBlobUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay} 
            onClick={closePdfModal}
          >
            <motion.div 
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -20 }}
              style={styles.modalContent} 
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}><FiFileText /> Aperçu du rapport d'audit</h3>
                <button onClick={closePdfModal} style={styles.modalClose}><FiX /></button>
              </div>
              <div style={styles.pdfContainer}>
                <iframe
                  ref={pdfIframeRef}
                  src={pdfBlobUrl}
                  style={styles.pdfIframe}
                  title="Aperçu PDF"
                />
              </div>
              <div style={styles.modalActions}>
                <button onClick={printPdf} style={styles.printButton}><FiPrinter /> Imprimer</button>
                <button onClick={downloadPdf} style={styles.downloadButton}><FiDownload /> Télécharger</button>
                <button onClick={closePdfModal} style={styles.closeModalButton}>Fermer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Journal d'audit avancé</h1>
          <p style={styles.subtitle}>Traçabilité complète des actions utilisateurs</p>
        </div>
        <div style={styles.headerActions}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')} 
            style={styles.iconButton}
          >
            {viewMode === 'table' ? <FiGrid size={18} /> : <FiList size={18} />}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generatePDF} 
            disabled={generatingPdf} 
            style={styles.pdfButton}
          >
            <FiFileText /> {generatingPdf ? 'Génération...' : 'PDF'}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { fetchLogs(); fetchStats(); }} 
            style={styles.refreshButton}
          >
            <FiRefreshCw /> Rafraîchir
          </motion.button>
        </div>
      </div>

      {/* Statistiques futuristes */}
      <div style={styles.statsSection}>
        <div style={styles.statsCards}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={styles.statCard}
          >
            <span style={styles.statValue}>{total}</span>
            <span style={styles.statLabel}>Événements</span>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={styles.statCard}
          >
            <span style={styles.statValue}>{logs.length}</span>
            <span style={styles.statLabel}>Affichés</span>
          </motion.div>
          {canViewFullUserList && !usersLoadingError ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={styles.statCard}
            >
              <span style={styles.statValue}>{users.length}</span>
              <span style={styles.statLabel}>Utilisateurs</span>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={styles.statCard}
            >
              <span style={styles.statValue}>---</span>
              <span style={styles.statLabel}>Accès restreint</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Filtres futuristes */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          {canFilterByUser ? (
            <div style={styles.filterGroup}>
              <label><FiUser /> Utilisateur</label>
              <select 
                value={filters.userId} 
                onChange={e => setFilters({...filters, userId: e.target.value})}
                disabled={usersLoadingError}
              >
                <option value="">Tous</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                    {canViewUserEmails && u.email && ` (${u.email})`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={styles.filterGroup}>
              <label><FiUser /> Utilisateur</label>
              <select disabled style={styles.filterSelectDisabled}>
                <option>Filtre indisponible pour ce rôle</option>
              </select>
              <small style={{ color: '#64748b' }}>
                {isJuridique ? 'Conformité RGPD' : 'Accès non autorisé'}
              </small>
            </div>
          )}

          <div style={styles.filterGroup}>
            <label><FiServer /> Table</label>
            <select value={filters.table} onChange={e => setFilters({...filters, table: e.target.value})}>
              <option value="">Toutes</option>
              {Object.entries(TABLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label><FiActivity /> Action</label>
            <select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})}>
              <option value="">Toutes</option>
              {Object.entries(ACTION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label><FiCalendar /> Période</label>
            <div style={styles.dateRange}>
              <DatePicker 
                selected={filters.startDate} 
                onChange={date => setFilters({...filters, startDate: date})} 
                dateFormat="dd/MM/yyyy" 
              />
              <span>→</span>
              <DatePicker 
                selected={filters.endDate} 
                onChange={date => setFilters({...filters, endDate: date})} 
                dateFormat="dd/MM/yyyy" 
              />
            </div>
          </div>

          <div style={styles.filterGroup}>
            <label><FiSearch /> Recherche</label>
            <div style={styles.searchBox}>
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={filters.search} 
                onChange={e => setFilters({...filters, search: e.target.value})} 
                onKeyPress={e => e.key === 'Enter' && handleSearch()} 
              />
              <button onClick={handleSearch} style={styles.searchButton}>
                <FiSearch />
              </button>
            </div>
          </div>
        </div>
        <div style={styles.filterActions}>
          <button onClick={resetFilters} style={styles.resetButton}>Réinitialiser</button>
          <button onClick={() => setPagination({...pagination, page: 1})} style={styles.applyButton}>
            Appliquer
          </button>
        </div>
      </div>

      {/* Affichage des logs */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Chargement des logs...</p>
        </div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : logs.length === 0 ? (
        <div style={styles.noData}>Aucun log trouvé pour cette période</div>
      ) : viewMode === 'table' ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date/heure</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Table</th>
                <th>ID</th>
                <th>IP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const isExpanded = expandedIds.includes(log.id);
                return (
                  <React.Fragment key={log.id}>
                    <tr style={styles.tableRow}>
                      <td>{formatDate(getRealOperationDate(log))}</td>
                      <td>
                        {log.utilisateur?.full_name || 'Système'}
                        {canViewUserEmails && log.utilisateur?.email && (
                          <>
                            <br/>
                            <small style={styles.smallEmail}>{log.utilisateur.email}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <span style={{
                          ...styles.actionBadge,
                          backgroundColor: ACTION_COLORS[log.action] + '20',
                          color: ACTION_COLORS[log.action]
                        }}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td>{TABLE_LABELS[log.table_name] || log.table_name}</td>
                      <td><code style={styles.code}>{log.record_id?.substring(0, 8)}…</code></td>
                      <td>{log.ip_address || 'N/A'}</td>
                      <td>
                        <button onClick={() => toggleDetails(log.id)} style={styles.detailButton}>
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" style={styles.expandedCell}>
                          <div style={styles.expandedContent}>
                            <div><strong>ID complet :</strong> {log.record_id}</div>
                            <div><strong>Détails des modifications :</strong></div>
                            {renderDiff(log.old_data, log.new_data)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.cardsGrid}>
          {logs.map(log => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.card}
            >
              <div style={styles.cardHeader}>
                <span style={{
                  ...styles.actionBadge,
                  backgroundColor: ACTION_COLORS[log.action] + '20',
                  color: ACTION_COLORS[log.action]
                }}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span style={styles.cardDate}>{formatDate(getRealOperationDate(log))}</span>
              </div>
              <div style={styles.cardBody}>
                <div><FiUser /> {log.utilisateur?.full_name || 'Système'}</div>
                <div><FiServer /> Table : {TABLE_LABELS[log.table_name] || log.table_name}</div>
                <div><FiInfo /> ID : <code>{log.record_id?.substring(0, 12)}…</code></div>
                <div><FiGlobe /> IP : {log.ip_address || 'N/A'}</div>
              </div>
              <button onClick={() => toggleDetails(log.id)} style={styles.cardButton}>
                Voir les changements
              </button>
              {expandedIds.includes(log.id) && (
                <div style={styles.cardDetails}>{renderDiff(log.old_data, log.new_data)}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pagination.limit && (
        <div style={styles.pagination}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={pagination.page === 1} 
            onClick={() => setPagination({...pagination, page: pagination.page - 1})}
          >
            Précédent
          </motion.button>
          <span>Page {pagination.page} sur {Math.ceil(total / pagination.limit)}</span>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={pagination.page >= Math.ceil(total / pagination.limit)} 
            onClick={() => setPagination({...pagination, page: pagination.page + 1})}
          >
            Suivant
          </motion.button>
        </div>
      )}
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
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '1.5rem', 
    flexWrap: 'wrap' 
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
  headerActions: { 
    display: 'flex', 
    gap: '0.75rem' 
  },
  iconButton: { 
    padding: '0.5rem', 
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,255,247,0.2)', 
    borderRadius: '10px', 
    cursor: 'pointer',
    color: '#00fff7'
  },
  pdfButton: { 
    padding: '0.5rem 1rem', 
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: '1px solid rgba(0,255,247,0.3)',
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  refreshButton: { 
    padding: '0.5rem 1rem', 
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  statsSection: { 
    marginBottom: '2rem' 
  },
  statsCards: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3, 1fr)', 
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
    gap: '0.5rem' 
  },
  filterGroup: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0.5rem' 
  },
  filterSelectDisabled: { 
    padding: '0.5rem', 
    border: '1px solid rgba(0,255,247,0.2)', 
    borderRadius: '8px', 
    fontSize: '0.875rem', 
    backgroundColor: 'rgba(15,23,42,0.5)', 
    color: '#64748b', 
    cursor: 'not-allowed' 
  },
  dateRange: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  searchBox: { 
    display: 'flex', 
    gap: '0.5rem' 
  },
  searchButton: { 
    padding: '0.5rem 0.75rem', 
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
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
    cursor: 'pointer',
    color: '#e2e8f0'
  },
  applyButton: { 
    padding: '0.5rem 1rem', 
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer' 
  },
  tableWrapper: { 
    overflowX: 'auto', 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px', 
    border: '1px solid rgba(0,255,247,0.15)'
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse',
    color: '#e2e8f0'
  },
  tableRow: { 
    borderBottom: '1px solid rgba(0,255,247,0.1)' 
  },
  actionBadge: { 
    padding: '0.25rem 0.75rem', 
    borderRadius: '20px', 
    fontSize: '0.75rem', 
    fontWeight: '500', 
    display: 'inline-block' 
  },
  code: { 
    fontSize: '0.75rem', 
    fontFamily: 'monospace', 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    padding: '0.125rem 0.25rem', 
    borderRadius: '4px' 
  },
  smallEmail: { 
    fontSize: '0.7rem', 
    color: '#64748b' 
  },
  detailButton: { 
    background: 'rgba(0,255,247,0.1)', 
    border: '1px solid rgba(0,255,247,0.2)', 
    borderRadius: '6px', 
    padding: '0.25rem 0.5rem', 
    cursor: 'pointer',
    color: '#00fff7'
  },
  expandedCell: { 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    padding: '1rem' 
  },
  expandedContent: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0.75rem' 
  },
  cardsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
    gap: '1rem' 
  },
  card: { 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px', 
    padding: '1rem', 
    border: '1px solid rgba(0,255,247,0.15)',
    transition: 'all 0.3s ease'
  },
  cardHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    marginBottom: '0.75rem', 
    alignItems: 'center' 
  },
  cardDate: { 
    fontSize: '0.7rem', 
    color: '#64748b' 
  },
  cardBody: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0.5rem', 
    fontSize: '0.8rem', 
    color: '#cbd5e1' 
  },
  cardButton: { 
    marginTop: '0.75rem', 
    width: '100%', 
    padding: '0.5rem', 
    background: 'rgba(0,255,247,0.1)', 
    border: '1px solid rgba(0,255,247,0.2)', 
    borderRadius: '8px', 
    cursor: 'pointer',
    color: '#00fff7'
  },
  cardDetails: { 
    marginTop: '0.75rem', 
    paddingTop: '0.75rem', 
    borderTop: '1px solid rgba(0,255,247,0.15)' 
  },
  diffGrid: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0.5rem' 
  },
  diffRow: { 
    display: 'flex', 
    gap: '1rem', 
    alignItems: 'baseline', 
    flexWrap: 'wrap', 
    padding: '0.5rem', 
    background: 'rgba(245,158,11,0.1)', 
    borderRadius: '8px' 
  },
  diffKey: { 
    fontWeight: '600', 
    fontFamily: 'monospace', 
    minWidth: '100px', 
    fontSize: '0.7rem',
    color: '#00fff7'
  },
  diffValues: { 
    display: 'flex', 
    gap: '0.5rem', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  oldValue: { 
    backgroundColor: 'rgba(239,68,68,0.2)', 
    color: '#f87171', 
    padding: '0.125rem 0.375rem', 
    borderRadius: '4px', 
    fontSize: '0.7rem' 
  },
  newValue: { 
    backgroundColor: 'rgba(16,185,129,0.2)', 
    color: '#34d399', 
    padding: '0.125rem 0.375rem', 
    borderRadius: '4px', 
    fontSize: '0.7rem' 
  },
  arrow: { 
    color: '#64748b' 
  },
  noDiff: { 
    fontSize: '0.75rem', 
    color: '#64748b', 
    fontStyle: 'italic' 
  },
  loading: { 
    textAlign: 'center', 
    padding: '3rem', 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,255,247,0.15)'
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
  error: { 
    backgroundColor: 'rgba(239,68,68,0.1)', 
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', 
    padding: '1rem', 
    borderRadius: '12px', 
    textAlign: 'center' 
  },
  noData: { 
    textAlign: 'center', 
    padding: '3rem', 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    color: '#64748b',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  pagination: { 
    display: 'flex', 
    justifyContent: 'center', 
    gap: '1rem', 
    marginTop: '2rem', 
    alignItems: 'center', 
    padding: '1rem', 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  modalOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    backdropFilter: 'blur(8px)',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 2000 
  },
  modalContent: { 
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px', 
    border: '1px solid rgba(0,255,247,0.2)',
    width: '90%', 
    maxWidth: '1200px', 
    height: '85vh', 
    display: 'flex', 
    flexDirection: 'column', 
    overflow: 'hidden' 
  },
  modalHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '1rem 1.5rem', 
    borderBottom: '1px solid rgba(0,255,247,0.15)' 
  },
  modalTitle: { 
    fontSize: '1.1rem', 
    fontWeight: '600', 
    color: '#e2e8f0', 
    margin: 0, 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  modalClose: { 
    background: 'none', 
    border: 'none', 
    fontSize: '1.5rem', 
    cursor: 'pointer', 
    color: '#94a3b8', 
    padding: '0.25rem 0.5rem' 
  },
  pdfContainer: { 
    flex: 1, 
    padding: '1rem', 
    minHeight: 0 
  },
  pdfIframe: { 
    width: '100%', 
    height: '100%', 
    border: 'none', 
    borderRadius: '12px' 
  },
  modalActions: { 
    display: 'flex', 
    justifyContent: 'flex-end', 
    gap: '1rem', 
    padding: '1rem 1.5rem', 
    borderTop: '1px solid rgba(0,255,247,0.15)' 
  },
  printButton: { 
    padding: '0.5rem 1rem', 
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  downloadButton: { 
    padding: '0.5rem 1rem', 
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  closeModalButton: { 
    padding: '0.5rem 1rem', 
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    color: '#e2e8f0', 
    borderRadius: '8px', 
    cursor: 'pointer' 
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

export default AdvancedAuditViewer;
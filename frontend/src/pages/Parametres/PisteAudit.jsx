import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiEye, FiCalendar, FiFilter, FiSearch, 
  FiDownload, FiRefreshCw, FiUser, FiClock, FiActivity,
  FiShield, FiLock, FiUnlock, FiDollarSign, FiGlobe,
  FiTrendingUp, FiBookOpen, FiCheckCircle, FiXCircle,
  FiPrinter, FiZoomIn, FiZoomOut, FiMaximize2, FiMinimize2,
  FiFileText, FiAlertCircle, FiUpload, FiTrash2, FiTrendingDown,
  FiEdit2, FiFile, FiArchive
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';

// Composant de dialogue PDF intégré
const PDFDialog = ({ isOpen, onClose, pdfBlob, filename }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen && pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setLoading(false);
    }
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, pdfBlob]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.print();
    }
  };

  const toggleFullscreen = () => {
    const element = document.getElementById('pdf-dialog-content');
    if (!fullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setFullscreen(!fullscreen);
  };

  if (!isOpen) return null;

  return (
    <div style={stylesDialog.overlay}>
      <div id="pdf-dialog-content" style={{ ...stylesDialog.container, ...(fullscreen ? stylesDialog.fullscreen : {}) }}>
        <div style={stylesDialog.header}>
          <div style={stylesDialog.headerInfo}>
            <FiFileText size={20} color="#10b981" />
            <div>
              <h3 style={stylesDialog.title}>Piste d'audit BCC</h3>
              <p style={stylesDialog.subtitle}>{filename}</p>
            </div>
          </div>
          <div style={stylesDialog.controls}>
            <button onClick={() => setScale(scale + 0.1)} style={stylesDialog.controlBtn} title="Zoom avant">
              <FiZoomIn />
            </button>
            <button onClick={() => setScale(scale - 0.1)} style={stylesDialog.controlBtn} title="Zoom arrière">
              <FiZoomOut />
            </button>
            <span style={stylesDialog.zoomValue}>{Math.round(scale * 100)}%</span>
            <button onClick={handleDownload} style={stylesDialog.controlBtn} title="Télécharger">
              <FiDownload />
            </button>
            <button onClick={handlePrint} style={stylesDialog.controlBtn} title="Imprimer">
              <FiPrinter />
            </button>
            <button onClick={toggleFullscreen} style={stylesDialog.controlBtn} title="Plein écran">
              {fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
            <button onClick={onClose} style={stylesDialog.closeBtn}>
              <FiXCircle />
            </button>
          </div>
        </div>
        <div style={stylesDialog.content}>
          {loading ? (
            <div style={stylesDialog.loadingContainer}>
              <div style={stylesDialog.spinner}></div>
              <p>Chargement du PDF...</p>
            </div>
          ) : error ? (
            <div style={stylesDialog.errorContainer}>
              <FiAlertCircle size={48} color="#ef4444" />
              <p>{error}</p>
            </div>
          ) : (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${100 / scale}%`,
                height: `${100 / scale}%`
              }}
              title="PDF Viewer"
              onError={() => setError('Erreur de chargement du PDF')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const stylesDialog = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    transition: 'all 0.3s ease'
  },
  fullscreen: {
    width: '100%',
    height: '100%',
    borderRadius: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: 'var(--bg-secondary)',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  title: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  subtitle: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  controls: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  controlBtn: {
    padding: '0.5rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
    transition: 'all 0.2s'
  },
  closeBtn: {
    padding: '0.5rem',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--bg-card)',
    transition: 'all 0.2s'
  },
  zoomValue: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    minWidth: '45px',
    textAlign: 'center'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#f3f4f6',
    position: 'relative'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    color: '#ef4444'
  }
};

const PisteAuditBCC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    dateDebut: '',
    dateFin: '',
    action: '',
    utilisateur: '',
    module: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    connexions: 0,
    creations: 0,
    modifications: 0,
    suppressions: 0,
    consultations: 0,
    operationsMonetaires: 0,
    reservesChange: 0
  });
  
  const [pdfDialog, setPdfDialog] = useState({
    open: false,
    blob: null,
    filename: null
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      const params = new URLSearchParams();
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters.dateFin) params.append('dateFin', filters.dateFin);
      if (filters.action) params.append('action', filters.action);
      if (filters.utilisateur) params.append('utilisateur', filters.utilisateur);
      if (filters.module) params.append('module', filters.module);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      params.append('_t', Date.now());

      const response = await api.get(`/audit-logs?${params.toString()}`);
      
      console.log('📊 Réponse API:', response.data);
      
      let logsData = [];
      
      // ✅ Format: { total, page, limit, logs: [...] }
      if (response.data && response.data.logs && Array.isArray(response.data.logs)) {
        logsData = response.data.logs;
        console.log('✅ Format reconnu: logs dans data.logs,', logsData.length, 'logs');
        
        setPagination({
          page: response.data.page || pagination.page,
          limit: response.data.limit || pagination.limit,
          total: response.data.total || logsData.length,
          pages: Math.ceil((response.data.total || logsData.length) / (response.data.limit || pagination.limit))
        });
      } 
      else if (response.data && Array.isArray(response.data)) {
        logsData = response.data;
        console.log('✅ Format tableau direct,', logsData.length, 'logs');
      }
      else {
        console.warn('⚠️ Format non reconnu:', response.data);
        logsData = [];
      }
      
      if (logsData.length === 0) {
        setLogs([]);
        setFilteredLogs([]);
        setStats({ total: 0, connexions: 0, creations: 0, modifications: 0, suppressions: 0, consultations: 0, operationsMonetaires: 0, reservesChange: 0 });
        setLoading(false);
        return;
      }
      
      const formattedLogs = logsData.map(log => ({
        id: log.id,
        date: log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : new Date().toLocaleString(),
        utilisateur: log.user?.email || log.user?.full_name || log.email || log.utilisateur?.email || 'Système',
        action: log.action,
        module: log.table_name || log.module,
        details: log.new_data?.details || log.details || `Action ${log.action}`,
        ip: log.ip_address,
        niveau: log.new_data?.niveau || 'INFO'
      }));
      
      setLogs(formattedLogs);
      setFilteredLogs(formattedLogs);
      calculateStats(formattedLogs);
      
    } catch (err) {
      console.error('❌ Erreur fetchLogs:', err);
      setErrorMsg('Impossible de charger la piste d\'audit');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logsData) => {
    const newStats = {
      total: logsData.length,
      connexions: logsData.filter(l => l.action === 'CONNEXION' || l.action === 'CONNEXION_ECHOUEE').length,
      creations: logsData.filter(l => l.action === 'CREATION' || l.action === 'DOCUMENT_UPLOAD').length,
      modifications: logsData.filter(l => l.action === 'MODIFICATION' || l.action === 'DOCUMENT_DOWNLOAD' || l.action === 'DEPRECIATION').length,
      suppressions: logsData.filter(l => l.action === 'SUPPRESSION' || l.action === 'DOCUMENT_DELETE').length,
      consultations: logsData.filter(l => l.action === 'CONSULTATION').length,
      operationsMonetaires: logsData.filter(l => l.module === 'OPERATIONS_MONETAIRES').length,
      reservesChange: logsData.filter(l => l.module === 'RESERVES_CHANGE').length
    };
    setStats(newStats);
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const resetFilters = () => {
    setFilters({
      dateDebut: '',
      dateFin: '',
      action: '',
      utilisateur: '',
      module: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 297, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('BANQUE CENTRALE DU CONGO', 20, 20);
      doc.setFontSize(12);
      doc.text('PISTE D\'AUDIT - RAPPORT D\'ACTIVITÉS', 20, 28);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const dateStr = new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Généré le : ${dateStr}`, 20, 40);
      doc.text(`Nombre d'actions : ${filteredLogs.length}`, 20, 47);
      doc.text(`Période : ${filters.dateDebut || 'Début'} - ${filters.dateFin || 'Aujourd\'hui'}`, 20, 54);
      
      let yPos = 65;
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 257, 25, 'F');
      doc.setFontSize(9);
      doc.text(`Total actions: ${stats.total}`, 25, yPos + 7);
      doc.text(`Connexions: ${stats.connexions}`, 25, yPos + 14);
      doc.text(`Créations: ${stats.creations}`, 25, yPos + 21);
      doc.text(`Modifications: ${stats.modifications}`, 95, yPos + 7);
      doc.text(`Suppressions: ${stats.suppressions}`, 95, yPos + 14);
      doc.text(`Consultations: ${stats.consultations}`, 95, yPos + 21);
      doc.text(`Opérations monétaires: ${stats.operationsMonetaires}`, 165, yPos + 7);
      doc.text(`Réserves de change: ${stats.reservesChange}`, 165, yPos + 14);
      
      const tableData = filteredLogs.map(log => [
        log.date,
        log.utilisateur,
        log.module,
        log.action === 'CONNEXION_ECHOUEE' ? 'CONNEXION ÉCHOUÉE' : log.action,
        log.niveau,
        log.details.length > 40 ? log.details.substring(0, 37) + '...' : log.details,
        log.ip
      ]);
      
      autoTable(doc, {
        startY: 100,
        head: [['Date', 'Utilisateur', 'Module', 'Action', 'Niveau', 'Détails', 'IP']],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 20 },
          5: { cellWidth: 65 },
          6: { cellWidth: 30 }
        }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} sur ${pageCount} - Document officiel BCC - Piste d'audit`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      const pdfBlob = doc.output('blob');
      const fileName = `piste_audit_bcc_${new Date().toISOString().split('T')[0]}.pdf`;
      
      setPdfDialog({
        open: true,
        blob: pdfBlob,
        filename: fileName
      });
      
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de la génération du PDF');
    }
  };
  
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `piste_audit_bcc_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const closePDFDialog = () => {
    setPdfDialog({ open: false, blob: null, filename: null });
  };

  const getActionBadgeStyle = (action, niveau) => {
    const styles = {
      CONNEXION: { bg: '#10b98120', color: '#10b981', icon: <FiUnlock size={12} /> },
      CONNEXION_ECHOUEE: { bg: '#ef444420', color: '#ef4444', icon: <FiLock size={12} /> },
      CREATION: { bg: '#3b82f620', color: '#3b82f6', icon: <FiCheckCircle size={12} /> },
      MODIFICATION: { bg: '#f59e0b20', color: '#f59e0b', icon: <FiActivity size={12} /> },
      SUPPRESSION: { bg: '#ef444420', color: '#ef4444', icon: <FiXCircle size={12} /> },
      CONSULTATION: { bg: '#8b5cf620', color: '#8b5cf6', icon: <FiEye size={12} /> },
      VALIDATION: { bg: '#10b98120', color: '#10b981', icon: <FiCheckCircle size={12} /> },
      EXPORT: { bg: '#f59e0b20', color: '#f59e0b', icon: <FiDownload size={12} /> },
      CLOTURE: { bg: '#ef444420', color: '#ef4444', icon: <FiLock size={12} /> },
      DOCUMENT_UPLOAD: { bg: '#10b98120', color: '#10b981', icon: <FiUpload size={12} /> },
      DOCUMENT_DOWNLOAD: { bg: '#3b82f620', color: '#3b82f6', icon: <FiDownload size={12} /> },
      DOCUMENT_DELETE: { bg: '#ef444420', color: '#ef4444', icon: <FiTrash2 size={12} /> },
      DEPRECIATION: { bg: '#f59e0b20', color: '#f59e0b', icon: <FiTrendingDown size={12} /> },
      REEVALUATION: { bg: '#8b5cf620', color: '#8b5cf6', icon: <FiRefreshCw size={12} /> }
    };
    return styles[action] || { bg: '#6b728020', color: 'var(--text-secondary)', icon: <FiActivity size={12} /> };
  };

  const getModuleBadgeStyle = (module) => {
    const styles = {
      AUTHENTIFICATION: { bg: '#3b82f620', color: '#3b82f6' },
      RESERVES_CHANGE: { bg: '#f59e0b20', color: '#f59e0b' },
      OPERATIONS_MONETAIRES: { bg: '#10b98120', color: '#10b981' },
      IMMOBILISATIONS: { bg: '#8b5cf620', color: '#8b5cf6' },
      RAPPORTS: { bg: '#ec489a20', color: '#ec489a' },
      UTILISATEURS: { bg: '#6b728020', color: 'var(--text-secondary)' },
      POLITIQUE_MONETAIRE: { bg: '#14b8a620', color: '#14b8a6' },
      EXERCICES: { bg: '#f9731620', color: '#f97316' },
      ETATS_FINANCIERS: { bg: '#06b6d420', color: '#06b6d4' },
      DOCUMENTS: { bg: '#8b5cf620', color: '#8b5cf6' },
      ACTIFS: { bg: '#10b98120', color: '#10b981' },
      CONTRATS: { bg: '#3b82f620', color: '#3b82f6' }
    };
    return styles[module] || { bg: 'var(--border-color)', color: '#475569' };
  };

  const getNiveauStyle = (niveau) => {
    const styles = {
      INFO: { bg: '#10b98120', color: '#10b981' },
      WARNING: { bg: '#f59e0b20', color: '#f59e0b' },
      ERROR: { bg: '#ef444420', color: '#ef4444' }
    };
    return styles[niveau] || styles.INFO;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement de la piste d'audit BCC...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/parametres')} style={styles.backButton}>
            <FiArrowLeft /> Retour
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.iconWrapper}>
              <FiShield size={28} color="#10b981" />
            </div>
            <div>
              <h1 style={styles.title}>Piste d'audit - BCC</h1>
              <p style={styles.subtitle}>
                Traçabilité des actions et opérations - Banque Centrale du Congo
              </p>
            </div>
          </div>
          <div style={styles.exportGroup}>
            <button onClick={generatePDF} style={styles.exportButtonPDF}>
              <FiPrinter /> PDF
            </button>
            <button onClick={handleExportJSON} style={styles.exportButton}>
              <FiDownload /> JSON
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={styles.errorMessage}>
            <FiAlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total actions</div>
            <FiActivity size={20} color="#10b981" style={styles.statIcon} />
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.connexions}</div>
            <div style={styles.statLabel}>Connexions</div>
            <FiUnlock size={20} color="#10b981" style={styles.statIcon} />
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.operationsMonetaires}</div>
            <div style={styles.statLabel}>Opérations monétaires</div>
            <FiTrendingUp size={20} color="#f59e0b" style={styles.statIcon} />
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.reservesChange}</div>
            <div style={styles.statLabel}>Réserves de change</div>
            <FiGlobe size={20} color="#3b82f6" style={styles.statIcon} />
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.filtersSection}>
            <div style={styles.filtersRow}>
              <div style={styles.filterGroup}>
                <FiCalendar style={styles.filterIcon} />
                <input
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
                  style={styles.input}
                  placeholder="Date début"
                />
              </div>
              <div style={styles.filterGroup}>
                <FiCalendar style={styles.filterIcon} />
                <input
                  type="date"
                  value={filters.dateFin}
                  onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
                  style={styles.input}
                  placeholder="Date fin"
                />
              </div>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                style={styles.select}
              >
                <option value="">Toutes actions</option>
                <option value="CONNEXION">Connexion</option>
                <option value="CONNEXION_ECHOUEE">Connexion échouée</option>
                <option value="CREATION">Création</option>
                <option value="MODIFICATION">Modification</option>
                <option value="SUPPRESSION">Suppression</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="VALIDATION">Validation</option>
                <option value="EXPORT">Export</option>
                <option value="CLOTURE">Clôture</option>
                <option value="DOCUMENT_UPLOAD">Upload document</option>
                <option value="DOCUMENT_DOWNLOAD">Téléchargement</option>
                <option value="DEPRECIATION">Dépréciation</option>
                <option value="REEVALUATION">Réévaluation</option>
              </select>
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                style={styles.filterButton}
              >
                <FiFilter /> {showAdvancedFilters ? 'Filtres simples' : 'Filtres avancés'}
              </button>
              <button onClick={resetFilters} style={styles.resetButton}>
                <FiRefreshCw /> Réinitialiser
              </button>
            </div>

            {showAdvancedFilters && (
              <div style={styles.advancedFilters}>
                <div style={styles.filterGroup}>
                  <FiUser style={styles.filterIcon} />
                  <input
                    type="text"
                    value={filters.utilisateur}
                    onChange={(e) => setFilters({ ...filters, utilisateur: e.target.value })}
                    style={styles.input}
                    placeholder="Utilisateur"
                  />
                </div>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Tous les modules</option>
                  <option value="AUTHENTIFICATION">Authentification</option>
                  <option value="RESERVES_CHANGE">Réserves de change</option>
                  <option value="OPERATIONS_MONETAIRES">Opérations monétaires</option>
                  <option value="IMMOBILISATIONS">Immobilisations</option>
                  <option value="RAPPORTS">Rapports</option>
                  <option value="UTILISATEURS">Utilisateurs</option>
                  <option value="POLITIQUE_MONETAIRE">Politique monétaire</option>
                  <option value="EXERCICES">Exercices comptables</option>
                  <option value="ETATS_FINANCIERS">États financiers</option>
                  <option value="DOCUMENTS">Documents</option>
                  <option value="ACTIFS">Actifs</option>
                  <option value="CONTRATS">Contrats</option>
                </select>
                <div style={styles.filterInfo}>
                  <FiSearch size={14} /> {filteredLogs.length} résultat(s)
                </div>
              </div>
            )}
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date et heure</th>
                  <th style={styles.th}>Utilisateur</th>
                  <th style={styles.th}>Module</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Niveau</th>
                  <th style={styles.th}>Détails</th>
                  <th style={styles.th}>IP</th>
                 </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.emptyCell}>
                      <FiEye size={32} color="#cbd5e1" />
                      <p>Aucune trace d'audit trouvée</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const actionStyle = getActionBadgeStyle(log.action, log.niveau);
                    const moduleStyle = getModuleBadgeStyle(log.module);
                    const niveauStyle = getNiveauStyle(log.niveau);
                    return (
                      <tr key={log.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.dateCell}>
                            <FiClock size={12} color="#94a3b8" />
                            <span>{log.date}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.userCell}>
                            <FiUser size={12} color="#94a3b8" />
                            <span>{log.utilisateur}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.moduleBadge, ...moduleStyle }}>
                            {log.module}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.actionBadge, ...actionStyle }}>
                            {actionStyle.icon} {log.action === 'CONNEXION_ECHOUEE' ? 'CONNEXION ÉCHOUÉE' : log.action}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.niveauBadge, ...niveauStyle }}>
                            {log.niveau}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.detailsText}>{log.details}</span>
                        </td>
                        <td style={styles.td}>
                          <code style={styles.ipCode}>{log.ip}</code>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {pagination.pages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  style={styles.paginationButton}
                >
                  Précédent
                </button>
                <span style={styles.paginationInfo}>
                  Page {pagination.page} sur {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  style={styles.paginationButton}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PDFDialog
        isOpen={pdfDialog.open}
        onClose={closePDFDialog}
        pdfBlob={pdfDialog.blob}
        filename={pdfDialog.filename}
      />
    </>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#d1fae5',
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
  exportGroup: {
    display: 'flex',
    gap: '0.5rem'
  },
  exportButtonPDF: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#991b1b',
    fontSize: '0.875rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1rem',
    position: 'relative',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#10b981'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem'
  },
  statIcon: {
    position: 'absolute',
    right: '1rem',
    top: '1rem',
    opacity: 0.5
  },
  content: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  filtersSection: {
    marginBottom: '2rem'
  },
  filtersRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    flex: 1,
    minWidth: '150px'
  },
  filterIcon: {
    color: '#94a3b8',
    marginRight: '0.5rem'
  },
  input: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    flex: 1,
    fontSize: '0.875rem'
  },
  select: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    fontSize: '0.875rem',
    minWidth: '150px'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569'
  },
  advancedFilters: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filterInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '10px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    fontSize: '0.75rem',
    color: '#475569'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  actionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  moduleBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  niveauBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  detailsText: {
    fontSize: '0.8rem',
    color: '#475569'
  },
  ipCode: {
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    backgroundColor: 'var(--bg-primary)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },
  emptyCell: {
    textAlign: 'center',
    padding: '3rem',
    color: '#94a3b8'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '2rem',
    padding: '1rem'
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
  }
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default PisteAuditBCC;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiArrowLeft, FiEye, FiCalendar, FiFilter, FiSearch, 
  FiDownload, FiRefreshCw, FiUser, FiClock, FiActivity,
  FiShield, FiLock, FiUnlock, FiDollarSign, FiGlobe,
  FiTrendingUp, FiBookOpen, FiCheckCircle, FiXCircle,
  FiPrinter, FiZoomIn, FiZoomOut, FiMaximize2, FiMinimize2,
  FiFileText, FiAlertCircle, FiUpload, FiTrash2, FiTrendingDown,
  FiEdit2, FiFile, FiArchive, FiInfo, FiBarChart2
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Modal, Table, Pagination } from 'react-bootstrap';

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
    <div className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, padding: '1rem' }}>
      <div id="pdf-dialog-content" className="bg-white rounded-3 d-flex flex-column overflow-hidden shadow-lg" style={{ width: '90%', height: '90%', transition: 'all 0.3s ease', ...(fullscreen && { width: '100%', height: '100%', borderRadius: 0 }) }}>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FiFileText size={20} className="text-success" />
            <div>
              <h3 className="h6 fw-semibold mb-0">Piste d'audit BCC</h3>
              <p className="small text-muted mb-0">{filename}</p>
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Button variant="outline-secondary" size="sm" onClick={() => setScale(scale + 0.1)} title="Zoom avant"><FiZoomIn /></Button>
            <Button variant="outline-secondary" size="sm" onClick={() => setScale(scale - 0.1)} title="Zoom arrière"><FiZoomOut /></Button>
            <span className="small text-muted" style={{ minWidth: '45px' }}>{Math.round(scale * 100)}%</span>
            <Button variant="success" size="sm" onClick={handleDownload} title="Télécharger"><FiDownload /></Button>
            <Button variant="info" size="sm" onClick={handlePrint} title="Imprimer"><FiPrinter /></Button>
            <Button variant="secondary" size="sm" onClick={toggleFullscreen} title="Plein écran">{fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}</Button>
            <Button variant="danger" size="sm" onClick={onClose}><FiXCircle /></Button>
          </div>
        </div>
        <div className="flex-grow-1 overflow-auto bg-light position-relative">
          {loading ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3">
              <Spinner animation="border" variant="success" />
              <p className="text-muted">Chargement du PDF...</p>
            </div>
          ) : error ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-danger">
              <FiAlertCircle size={48} />
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

const PisteAuditBCC = () => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ dateDebut: '', dateFin: '', action: '', utilisateur: '', module: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0, connexions: 0, creations: 0, modifications: 0,
    suppressions: 0, consultations: 0, operationsMonetaires: 0, reservesChange: 0
  });
  const [pdfDialog, setPdfDialog] = useState({ open: false, blob: null, filename: null });

  const userRole = user?.role;
  const allowedRoles = ['admin', 'super_admin', 'auditeur'];
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <Container className="py-5 text-center">
        <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
          <Card.Body className="py-5">
            <FiShield size={48} className="text-danger mb-3" />
            <h2 className="text-danger">Accès non autorisé</h2>
            <p className="text-muted">Vous n'avez pas les droits nécessaires pour accéder à la piste d'audit.</p>
            <p className="text-muted small">Cette fonctionnalité est réservée aux administrateurs et auditeurs.</p>
            <Button variant="primary" onClick={() => navigate('/')} className="mt-3">
              <FiArrowLeft /> Retour à l'accueil
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

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
      let logsData = [];
      if (response.data && response.data.logs && Array.isArray(response.data.logs)) {
        logsData = response.data.logs;
        setPagination({
          page: response.data.page || pagination.page,
          limit: response.data.limit || pagination.limit,
          total: response.data.total || logsData.length,
          pages: Math.ceil((response.data.total || logsData.length) / (response.data.limit || pagination.limit))
        });
      } else if (response.data && Array.isArray(response.data)) {
        logsData = response.data;
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
    setStats({
      total: logsData.length,
      connexions: logsData.filter(l => l.action === 'CONNEXION' || l.action === 'CONNEXION_ECHOUEE').length,
      creations: logsData.filter(l => l.action === 'CREATION' || l.action === 'DOCUMENT_UPLOAD').length,
      modifications: logsData.filter(l => l.action === 'MODIFICATION' || l.action === 'DOCUMENT_DOWNLOAD' || l.action === 'DEPRECIATION').length,
      suppressions: logsData.filter(l => l.action === 'SUPPRESSION' || l.action === 'DOCUMENT_DELETE').length,
      consultations: logsData.filter(l => l.action === 'CONSULTATION').length,
      operationsMonetaires: logsData.filter(l => l.module === 'OPERATIONS_MONETAIRES').length,
      reservesChange: logsData.filter(l => l.module === 'RESERVES_CHANGE').length
    });
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const resetFilters = () => {
    setFilters({ dateDebut: '', dateFin: '', action: '', utilisateur: '', module: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
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
      const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        log.date, log.utilisateur, log.module,
        log.action === 'CONNEXION_ECHOUEE' ? 'CONNEXION ÉCHOUÉE' : log.action,
        log.niveau, log.details.length > 40 ? log.details.substring(0, 37) + '...' : log.details, log.ip
      ]);
      
      autoTable(doc, {
        startY: 100,
        head: [['Date', 'Utilisateur', 'Module', 'Action', 'Niveau', 'Détails', 'IP']],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 45 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 20 }, 5: { cellWidth: 65 }, 6: { cellWidth: 30 } }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} sur ${pageCount} - Document officiel BCC - Piste d'audit`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }
      
      const pdfBlob = doc.output('blob');
      setPdfDialog({ open: true, blob: pdfBlob, filename: `piste_audit_bcc_${new Date().toISOString().split('T')[0]}.pdf` });
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de la génération du PDF');
    }
  };
  
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `piste_audit_bcc_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
  };
  
  const closePDFDialog = () => setPdfDialog({ open: false, blob: null, filename: null });

  const getActionBadge = (action, niveau) => {
    const config = {
      CONNEXION: { variant: 'success', icon: <FiUnlock size={12} />, label: 'CONNEXION' },
      CONNEXION_ECHOUEE: { variant: 'danger', icon: <FiLock size={12} />, label: 'CONNEXION ÉCHOUÉE' },
      CREATION: { variant: 'primary', icon: <FiCheckCircle size={12} />, label: 'CRÉATION' },
      MODIFICATION: { variant: 'warning', icon: <FiActivity size={12} />, label: 'MODIFICATION' },
      SUPPRESSION: { variant: 'danger', icon: <FiXCircle size={12} />, label: 'SUPPRESSION' },
      CONSULTATION: { variant: 'info', icon: <FiEye size={12} />, label: 'CONSULTATION' },
      DOCUMENT_UPLOAD: { variant: 'success', icon: <FiUpload size={12} />, label: 'UPLOAD' },
      DOCUMENT_DOWNLOAD: { variant: 'primary', icon: <FiDownload size={12} />, label: 'TÉLÉCHARGEMENT' },
      DEPRECIATION: { variant: 'warning', icon: <FiTrendingDown size={12} />, label: 'DÉPRÉCIATION' },
      REEVALUATION: { variant: 'purple', icon: <FiRefreshCw size={12} />, label: 'RÉÉVALUATION' }
    };
    const conf = config[action] || { variant: 'secondary', icon: <FiActivity size={12} />, label: action };
    return <Badge bg={conf.variant} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: `var(--bs-${conf.variant})` }}>{conf.icon} {conf.label}</Badge>;
  };

  const getModuleBadge = (module) => {
    const config = {
      AUTHENTIFICATION: 'primary', RESERVES_CHANGE: 'warning', OPERATIONS_MONETAIRES: 'success',
      IMMOBILISATIONS: 'info', RAPPORTS: 'danger', UTILISATEURS: 'secondary',
      DOCUMENTS: 'purple', ACTIFS: 'success', CONTRATS: 'primary'
    };
    const variant = config[module] || 'secondary';
    return <Badge bg={variant} className="bg-opacity-10 text-dark px-2 py-1">{module}</Badge>;
  };

  const getNiveauBadge = (niveau) => {
    const config = { INFO: 'success', WARNING: 'warning', ERROR: 'danger' };
    const variant = config[niveau] || 'secondary';
    return <Badge bg={variant} className="bg-opacity-10 px-2 py-1">{niveau}</Badge>;
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="success" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
        <p className="text-muted">Chargement de la piste d'audit BCC...</p>
      </Container>
    );
  }

  return (
    <>
      <Container fluid className="py-4 px-3 px-md-4" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <Button variant="outline-secondary" onClick={() => navigate('/parametres')} className="mb-3 d-inline-flex align-items-center gap-2">
              <FiArrowLeft size={16} /> Retour
            </Button>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-success bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
                <FiShield size={28} className="text-success" />
              </div>
              <div>
                <h1 className="h3 fw-bold mb-1">Piste d'audit - BCC</h1>
                <p className="text-muted small mb-0">Traçabilité des actions et opérations - Banque Centrale du Congo</p>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="danger" onClick={generatePDF} className="d-flex align-items-center gap-2"><FiPrinter size={14} /> PDF</Button>
            <Button variant="success" onClick={handleExportJSON} className="d-flex align-items-center gap-2"><FiDownload size={14} /> JSON</Button>
          </div>
        </div>

        {/* Messages d'erreur */}
        {errorMsg && (
          <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="mb-3">
            <div className="d-flex align-items-center gap-2"><FiAlertCircle size={18} /><span>{errorMsg}</span></div>
          </Alert>
        )}

        {/* Cartes statistiques */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100">
              <Card.Body><div className="h2 mb-0 fw-bold text-success">{stats.total}</div><small className="text-muted">Total actions</small><FiActivity size={20} className="text-success mt-2 opacity-50" /></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100">
              <Card.Body><div className="h2 mb-0 fw-bold text-success">{stats.connexions}</div><small className="text-muted">Connexions</small><FiUnlock size={20} className="text-success mt-2 opacity-50" /></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100">
              <Card.Body><div className="h2 mb-0 fw-bold text-warning">{stats.operationsMonetaires}</div><small className="text-muted">Opérations monétaires</small><FiTrendingUp size={20} className="text-warning mt-2 opacity-50" /></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100">
              <Card.Body><div className="h2 mb-0 fw-bold text-primary">{stats.reservesChange}</div><small className="text-muted">Réserves de change</small><FiGlobe size={20} className="text-primary mt-2 opacity-50" /></Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Filtres */}
        <Card className="border-0 shadow-sm rounded-3 mb-4">
          <Card.Body>
            <div className="d-flex gap-3 flex-wrap align-items-center mb-3">
              <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border" style={{ backgroundColor: '#f8fafc' }}>
                <FiCalendar size={14} className="text-muted" />
                <input type="date" value={filters.dateDebut} onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })} className="border-0 bg-transparent" style={{ outline: 'none' }} placeholder="Date début" />
              </div>
              <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border" style={{ backgroundColor: '#f8fafc' }}>
                <FiCalendar size={14} className="text-muted" />
                <input type="date" value={filters.dateFin} onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })} className="border-0 bg-transparent" style={{ outline: 'none' }} placeholder="Date fin" />
              </div>
              <Form.Select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} style={{ width: 'auto', minWidth: '160px' }}>
                <option value="">Toutes actions</option>
                <option value="CONNEXION">Connexion</option>
                <option value="CONNEXION_ECHOUEE">Connexion échouée</option>
                <option value="CREATION">Création</option>
                <option value="MODIFICATION">Modification</option>
                <option value="SUPPRESSION">Suppression</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="DOCUMENT_UPLOAD">Upload document</option>
                <option value="DOCUMENT_DOWNLOAD">Téléchargement</option>
                <option value="DEPRECIATION">Dépréciation</option>
                <option value="REEVALUATION">Réévaluation</option>
              </Form.Select>
              <Button variant="primary" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="d-flex align-items-center gap-2"><FiFilter size={14} /> {showAdvancedFilters ? 'Filtres simples' : 'Filtres avancés'}</Button>
              <Button variant="outline-secondary" onClick={resetFilters} className="d-flex align-items-center gap-2"><FiRefreshCw size={14} /> Réinitialiser</Button>
            </div>

            {showAdvancedFilters && (
              <div className="d-flex gap-3 flex-wrap align-items-center pt-3 border-top">
                <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border flex-grow-1" style={{ backgroundColor: '#f8fafc', maxWidth: '300px' }}>
                  <FiUser size={14} className="text-muted" />
                  <input type="text" value={filters.utilisateur} onChange={(e) => setFilters({ ...filters, utilisateur: e.target.value })} className="border-0 bg-transparent w-100" style={{ outline: 'none' }} placeholder="Utilisateur" />
                </div>
                <Form.Select value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })} style={{ width: 'auto', minWidth: '180px' }}>
                  <option value="">Tous les modules</option>
                  <option value="AUTHENTIFICATION">Authentification</option>
                  <option value="RESERVES_CHANGE">Réserves de change</option>
                  <option value="OPERATIONS_MONETAIRES">Opérations monétaires</option>
                  <option value="IMMOBILISATIONS">Immobilisations</option>
                  <option value="RAPPORTS">Rapports</option>
                  <option value="DOCUMENTS">Documents</option>
                  <option value="ACTIFS">Actifs</option>
                  <option value="CONTRATS">Contrats</option>
                </Form.Select>
                <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 bg-light"><FiSearch size={14} className="text-muted" /><span className="small">{filteredLogs.length} résultat(s)</span></div>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Tableau des logs */}
        <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr><th>Date et heure</th><th>Utilisateur</th><th>Module</th><th>Action</th><th>Niveau</th><th>Détails</th><th>IP</th></tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted"><FiEye size={32} className="mb-2 opacity-50" /><p>Aucune trace d'audit trouvée</p></td></tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td className="text-nowrap"><div className="d-flex align-items-center gap-1"><FiClock size={12} className="text-muted" /><span className="small">{log.date}</span></div></td>
                      <td><div className="d-flex align-items-center gap-1"><FiUser size={12} className="text-muted" /><span>{log.utilisateur}</span></div></td>
                      <td>{getModuleBadge(log.module)}</td>
                      <td>{getActionBadge(log.action, log.niveau)}</td>
                      <td>{getNiveauBadge(log.niveau)}</td>
                      <td><span className="small text-secondary">{log.details}</span></td>
                      <td><code className="small bg-light px-2 py-1 rounded">{log.ip}</code></td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          
          {pagination.pages > 1 && (
            <div className="card-footer bg-white border-top-0 pt-3">
              <Pagination className="justify-content-center mb-0">
                <Pagination.Prev onClick={() => pagination.page > 1 && setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} />
                <Pagination.Item active>{pagination.page}</Pagination.Item>
                <Pagination.Ellipsis />
                <Pagination.Item>{pagination.pages}</Pagination.Item>
                <Pagination.Next onClick={() => pagination.page < pagination.pages && setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.pages} />
              </Pagination>
            </div>
          )}
        </Card>

        {/* Footer info */}
        <div className="text-center mt-3"><small className="text-muted d-flex align-items-center justify-content-center gap-2"><FiShield size={12} /> Piste d'audit conforme aux normes BCC — Document officiel</small></div>
      </Container>

      <PDFDialog isOpen={pdfDialog.open} onClose={closePDFDialog} pdfBlob={pdfDialog.blob} filename={pdfDialog.filename} />
    </>
  );
};

export default PisteAuditBCC;
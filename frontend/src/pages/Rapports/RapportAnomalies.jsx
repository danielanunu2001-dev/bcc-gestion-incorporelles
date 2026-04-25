import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiAlertCircle, FiDownload, FiFilter, FiRefreshCw,
  FiPieChart, FiBarChart2, FiCalendar, FiCheck,
  FiX, FiClock, FiMapPin, FiUser, FiPackage,
  FiTrendingUp, FiChevronDown, FiChevronUp,
  FiShield, FiInfo, FiEye, FiFileText, FiTrash2
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Table, Modal } from 'react-bootstrap';

const RapportAnomalies = () => {
  const { can } = usePermissions();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  
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
  const [selectedAnomalie, setSelectedAnomalie] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // États pour la suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [anomalieToDelete, setAnomalieToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      let anomaliesData = res.data.anomalies || res.data;
      
      if (anomaliesData && anomaliesData.length > 0) {
        anomaliesData = anomaliesData.map(anomalie => ({
          ...anomalie,
          actifInfo: anomalie.actif || anomalie.Actif || null,
          createurInfo: anomalie.createurAnomalie || anomalie.createur || null
        }));
      }
      
      setAnomalies(anomaliesData);
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

  // Fonction de suppression d'une anomalie
  const handleDeleteClick = (anomalie, e) => {
    e.stopPropagation();
    setAnomalieToDelete(anomalie);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!anomalieToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/anomalies/${anomalieToDelete.id}`);
      await chargerAnomalies();
      await chargerStats();
      alert('Anomalie supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de l\'anomalie');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setAnomalieToDelete(null);
    }
  };

  // Export UNIQUEMENT en PDF
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams();
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.dateDebut) params.append('startDate', filtres.dateDebut);
      if (filtres.dateFin) params.append('endDate', filtres.dateFin);
      
      const url = `/anomalies/export-pdf${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('📤 Export PDF vers:', url);
      
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      
      if (!newWindow) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `anomalies_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        alert('Le PDF a été téléchargé. Vérifiez vos paramètres de popup pour l\'affichage direct.');
      }
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);
      
    } catch (err) {
      console.error('❌ Erreur export PDF:', err);
      let errorMessage = 'Erreur lors de l\'export PDF';
      if (err.response?.status === 401) {
        errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Vous n\'avez pas les droits pour exporter ce rapport.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Route d\'export PDF non trouvée. Vérifiez la configuration du serveur.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      alert(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'manquant': 'Bien manquant',
      'endommage': 'Endommagé',
      'non_conforme': 'Non conforme',
      'autre': 'Autre'
    };
    return types[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'manquant': <FiX size={14} />,
      'endommage': <FiAlertCircle size={14} />,
      'non_conforme': <FiAlertCircle size={14} />,
      'autre': <FiAlertCircle size={14} />
    };
    return icons[type] || <FiAlertCircle size={14} />;
  };

  const getTypeVariant = (type) => {
    const variants = {
      'manquant': 'danger',
      'endommage': 'warning',
      'non_conforme': 'warning',
      'autre': 'secondary'
    };
    return variants[type] || 'secondary';
  };

  const getStatutConfig = (statut) => {
    const configs = {
      'signalé': { variant: 'danger', icon: <FiAlertCircle size={12} />, label: 'Signalé' },
      'en_cours': { variant: 'warning', icon: <FiClock size={12} />, label: 'En cours' },
      'résolu': { variant: 'success', icon: <FiCheck size={12} />, label: 'Résolu' }
    };
    return configs[statut] || configs['signalé'];
  };

  const getActifDisplay = (anomalie) => {
    const actif = anomalie.actif || anomalie.Actif || anomalie.actifInfo;
    
    if (actif && actif.code && actif.nom) {
      return `${actif.code} - ${actif.nom}`;
    }
    if (actif && actif.code) {
      return actif.code;
    }
    if (actif && actif.nom) {
      return actif.nom;
    }
    if (anomalie.actif_id) {
      return `ID: ${anomalie.actif_id}`;
    }
    return 'Non spécifié';
  };

  const getCreateurDisplay = (anomalie) => {
    const createur = anomalie.createurAnomalie || anomalie.createur || anomalie.createurInfo;
    if (createur && createur.full_name) {
      return createur.full_name;
    }
    if (anomalie.created_by) {
      return `ID: ${anomalie.created_by}`;
    }
    return 'Système';
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

  const openDetailModal = (anomalie) => {
    setSelectedAnomalie(anomalie);
    setShowDetailModal(true);
  };

  // Styles
  const modalWhiteTextStyle = { color: '#ffffff' };
  const modalWhiteMutedStyle = { color: '#cccccc' };
  const blackTextStyle = { color: '#000000' };
  const blackTextMutedStyle = { color: '#555555' };

  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    .spin { animation: spin 1s linear infinite; }
    .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .table-row-hover { transition: background-color 0.2s ease; }
    .table-row-hover:hover { background-color: rgba(13, 110, 253, 0.05); cursor: pointer; }
    
    .modal-white-text .modal-content {
      background-color: #1e293b !important;
      color: #ffffff !important;
    }
    .modal-white-text .modal-header {
      border-bottom-color: rgba(255, 255, 255, 0.2) !important;
      background-color: #1e293b !important;
    }
    .modal-white-text .modal-footer {
      border-top-color: rgba(255, 255, 255, 0.2) !important;
      background-color: #1e293b !important;
    }
    .modal-white-text .btn-close {
      filter: invert(1) grayscale(100%) brightness(200%);
    }
    .modal-white-text .bg-light {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1400px', backgroundColor: '#ffffff', minHeight: '100vh' }}>
        
        {/* Modal de confirmation de suppression - TEXTE EN NOIR */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiTrash2 size={18} /> Confirmer la suppression
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p style={{ color: '#000000' }}>Êtes-vous sûr de vouloir supprimer cette anomalie ?</p>
            <p style={{ color: '#555555', fontSize: '0.875rem' }}>Cette action est irréversible et supprimera toutes les données associées à cette anomalie.</p>
            {anomalieToDelete && (
              <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                <small><strong style={{ color: '#000000' }}>Détails :</strong></small><br />
                <small style={{ color: '#000000' }}>Type : {getTypeLabel(anomalieToDelete.type_anomalie)}</small><br />
                <small style={{ color: '#000000' }}>Date : {formatDate(anomalieToDelete.date_constat)}</small><br />
                <small style={{ color: '#000000' }}>Statut : {anomalieToDelete.statut}</small>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Spinner as="span" size="sm" animation="border" /> : <><FiTrash2 size={14} /> Confirmer la suppression</>}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal des détails - TEXTE EN BLANC */}
        <Modal 
          show={showDetailModal} 
          onHide={() => setShowDetailModal(false)} 
          size="lg" 
          centered
          dialogClassName="modal-white-text"
        >
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2" style={modalWhiteTextStyle}>
              <FiAlertCircle size={20} className="text-danger" />
              <span>Détails de l'anomalie</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedAnomalie && (
              <div>
                <Row className="mb-3">
                  <Col md={6}>
                    <small className="d-block" style={modalWhiteMutedStyle}>Actif concerné</small>
                    <div className="fw-semibold" style={modalWhiteTextStyle}>
                      {getActifDisplay(selectedAnomalie)}
                    </div>
                  </Col>
                  <Col md={6}>
                    <small className="d-block" style={modalWhiteMutedStyle}>Date de constat</small>
                    <div style={modalWhiteTextStyle}>{formatDate(selectedAnomalie.date_constat)}</div>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <small className="d-block" style={modalWhiteMutedStyle}>Type d'anomalie</small>
                    <Badge bg={getTypeVariant(selectedAnomalie.type_anomalie)} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: getTypeVariant(selectedAnomalie.type_anomalie) === 'danger' ? '#f87171' : getTypeVariant(selectedAnomalie.type_anomalie) === 'warning' ? '#fbbf24' : '#94a3b8' }}>
                      {getTypeIcon(selectedAnomalie.type_anomalie)} {getTypeLabel(selectedAnomalie.type_anomalie)}
                    </Badge>
                  </Col>
                  <Col md={6}>
                    <small className="d-block" style={modalWhiteMutedStyle}>Statut</small>
                    {(() => {
                      const config = getStatutConfig(selectedAnomalie.statut);
                      const statusColor = config.variant === 'danger' ? '#f87171' : config.variant === 'warning' ? '#fbbf24' : '#4ade80';
                      return (
                        <Badge bg={config.variant} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: statusColor }}>
                          {config.icon} {config.label}
                        </Badge>
                      );
                    })()}
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <small className="d-block" style={modalWhiteMutedStyle}>Localisation constatée</small>
                    <div className="d-flex align-items-center gap-1" style={modalWhiteTextStyle}>
                      <FiMapPin size={14} style={modalWhiteTextStyle} /> {selectedAnomalie.localisation_constatee || 'Non spécifiée'}
                    </div>
                  </Col>
                  <Col md={6}>
                    <small className="d-block" style={modalWhiteMutedStyle}>Créé par</small>
                    <div className="d-flex align-items-center gap-1" style={modalWhiteTextStyle}>
                      <FiUser size={14} style={modalWhiteTextStyle} /> {getCreateurDisplay(selectedAnomalie)}
                    </div>
                  </Col>
                </Row>
                <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <small className="fw-semibold d-block mb-2" style={modalWhiteTextStyle}>Description détaillée</small>
                  <p className="mb-0" style={modalWhiteTextStyle}>{selectedAnomalie.description || 'Aucune description fournie'}</p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Fermer</Button>
          </Modal.Footer>
        </Modal>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-danger bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <FiAlertCircle size={28} className="text-danger" />
            </div>
            <div>
              <h1 className="h3 fw-bold mb-1" style={blackTextStyle}>Rapport des anomalies</h1>
              <p className="small mb-0" style={blackTextMutedStyle}>Suivi et gestion des anomalies d'inventaire</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => chargerAnomalies()} disabled={loading} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
            </Button>
            <Button variant="outline-secondary" onClick={() => setShowFilters(!showFilters)} className="d-flex align-items-center gap-2">
              <FiFilter size={16} /> Filtres {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleExportPDF} 
              disabled={exporting || anomalies.length === 0} 
              className="d-flex align-items-center gap-2"
            >
              <FiFileText size={16} /> {exporting ? 'Génération...' : 'Exporter PDF'}
            </Button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body>
              <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={blackTextStyle}><FiFilter size={14} /> Filtres de recherche</h6>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Label className="fw-semibold small" style={blackTextMutedStyle}>Statut</Form.Label>
                  <Form.Select value={filtres.statut} onChange={(e) => setFiltres({ ...filtres, statut: e.target.value })}>
                    <option value="">Tous les statuts</option>
                    <option value="signalé">Signalé</option>
                    <option value="en_cours">En cours</option>
                    <option value="résolu">Résolu</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="fw-semibold small" style={blackTextMutedStyle}>Type d'anomalie</Form.Label>
                  <Form.Select value={filtres.type} onChange={(e) => setFiltres({ ...filtres, type: e.target.value })}>
                    <option value="">Tous les types</option>
                    <option value="manquant">Bien manquant</option>
                    <option value="endommage">Endommagé</option>
                    <option value="non_conforme">Non conforme</option>
                    <option value="autre">Autre</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label className="fw-semibold small d-flex align-items-center gap-1" style={blackTextMutedStyle}><FiCalendar size={12} /> Date début</Form.Label>
                  <Form.Control type="date" value={filtres.dateDebut} onChange={(e) => setFiltres({ ...filtres, dateDebut: e.target.value })} />
                </Col>
                <Col md={3}>
                  <Form.Label className="fw-semibold small d-flex align-items-center gap-1" style={blackTextMutedStyle}><FiCalendar size={12} /> Date fin</Form.Label>
                  <Form.Control type="date" value={filtres.dateFin} onChange={(e) => setFiltres({ ...filtres, dateFin: e.target.value })} />
                </Col>
              </Row>
              <div className="d-flex gap-2 justify-content-end mt-3">
                <Button variant="outline-secondary" size="sm" onClick={() => { setFiltres({ statut: '', type: '', dateDebut: '', dateFin: '' }); chargerAnomalies(); }}>Réinitialiser</Button>
                <Button variant="primary" size="sm" onClick={chargerAnomalies}>Appliquer les filtres</Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Statistiques */}
        {stats && (
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} md={3}>
              <Card className="border-0 shadow-sm text-center h-100 stat-card">
                <Card.Body>
                  <div className="h2 mb-0 fw-bold text-primary" style={blackTextStyle}>{stats.total || 0}</div>
                  <small className="text-muted" style={blackTextMutedStyle}>Total anomalies</small>
                  <FiAlertCircle size={20} className="text-primary mt-2 opacity-50" />
                </Card.Body>
              </Card>
            </Col>
            {stats.parType?.slice(0, 3).map((item, idx) => (
              <Col key={idx} xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-sm text-center h-100 stat-card">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                      <Badge bg={getTypeVariant(item.type_anomalie)} className="bg-opacity-10 p-2 rounded-circle">
                        {getTypeIcon(item.type_anomalie)}
                      </Badge>
                    </div>
                    <div className="h4 mb-0 fw-bold" style={blackTextStyle}>{item.count}</div>
                    <small className="text-muted" style={blackTextMutedStyle}>{getTypeLabel(item.type_anomalie)}</small>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Tableau des anomalies */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p className="text-muted" style={blackTextStyle}>Chargement des anomalies...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body className="text-center py-5">
              <FiAlertCircle size={48} className="text-muted opacity-50 mb-3" />
              <h5 className="text-muted mb-2" style={blackTextStyle}>Aucune anomalie trouvée</h5>
              <p className="text-muted small mb-3" style={blackTextMutedStyle}>Aucune anomalie ne correspond à vos critères de recherche</p>
              <Button variant="outline-secondary" size="sm" onClick={() => { setFiltres({ statut: '', type: '', dateDebut: '', dateFin: '' }); chargerAnomalies(); }}>Réinitialiser les filtres</Button>
            </Card.Body>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr style={blackTextStyle}>
                    <th style={blackTextStyle}>Date</th>
                    <th style={blackTextStyle}>Actif</th>
                    <th style={blackTextStyle}>Type</th>
                    <th style={blackTextStyle}>Description</th>
                    <th style={blackTextStyle}>Localisation</th>
                    <th style={blackTextStyle}>Statut</th>
                    <th style={blackTextStyle}>Créé par</th>
                    <th style={blackTextStyle}>Actions</th>
                    {isAdmin && <th style={blackTextStyle}>Suppression</th>}
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((anomalie, index) => {
                    const statutConfig = getStatutConfig(anomalie.statut);
                    const actif = anomalie.actif || anomalie.Actif || anomalie.actifInfo;
                    return (
                      <tr key={anomalie.id} className="table-row-hover">
                        <td className="text-nowrap">
                          <div className="d-flex align-items-center gap-1"><FiCalendar size={12} className="text-muted" /><span className="small" style={blackTextStyle}>{formatDate(anomalie.date_constat)}</span></div>
                        </td>
                        <td>
                          <div><code className="small bg-light px-1 py-0 rounded" style={blackTextStyle}>{actif?.code || anomalie.actif_id || '-'}</code></div>
                          <small className="text-muted" style={blackTextMutedStyle}>{actif?.nom || ''}</small>
                        </td>
                        <td>
                          <Badge bg={getTypeVariant(anomalie.type_anomalie)} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: getTypeVariant(anomalie.type_anomalie) === 'danger' ? '#dc2626' : getTypeVariant(anomalie.type_anomalie) === 'warning' ? '#f59e0b' : '#64748b' }}>
                            {getTypeIcon(anomalie.type_anomalie)} {getTypeLabel(anomalie.type_anomalie)}
                          </Badge>
                        </td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '200px', color: '#000000' }} title={anomalie.description}>
                            {anomalie.description || '-'}
                          </div>
                        </td>
                        <td>
                          {anomalie.localisation_constatee ? (
                            <div className="d-flex align-items-center gap-1"><FiMapPin size={12} className="text-muted" /><span className="small" style={blackTextStyle}>{anomalie.localisation_constatee}</span></div>
                          ) : '-'}
                        </td>
                        <td>
                          <Badge bg={statutConfig.variant} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: `var(--bs-${statutConfig.variant})` }}>
                            {statutConfig.icon} {statutConfig.label}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1"><FiUser size={12} className="text-muted" /><span className="small" style={blackTextStyle}>{getCreateurDisplay(anomalie)}</span></div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline-primary" size="sm" onClick={() => openDetailModal(anomalie)} className="d-flex align-items-center gap-1">
                            <FiEye size={12} /> Détails
                          </Button>
                        </td>
                        {isAdmin && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={(e) => handleDeleteClick(anomalie, e)} 
                              className="d-flex align-items-center gap-1"
                              title="Supprimer l'anomalie"
                            >
                              <FiTrash2 size={12} /> Supprimer
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        )}

        {/* Footer info */}
        <div className="text-center mt-4">
          <small className="d-flex align-items-center justify-content-center gap-2" style={blackTextMutedStyle}>
            <FiShield size={12} /> Rapport des anomalies — Mise à jour en temps réel
            {isAdmin && <span className="ms-2 text-danger">● Mode administrateur</span>}
          </small>
        </div>
      </Container>
    </>
  );
};

export default RapportAnomalies;
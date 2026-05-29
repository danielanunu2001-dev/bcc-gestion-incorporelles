// frontend/src/pages/Rapports/RapportAnomalies.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { 
  FiAlertCircle, FiDownload, FiFilter, FiRefreshCw,
  FiPieChart, FiBarChart2, FiCalendar, FiCheck,
  FiX, FiClock, FiMapPin, FiUser, FiPackage,
  FiTrendingUp, FiChevronDown, FiChevronUp,
  FiShield, FiInfo, FiEye, FiFileText, FiTrash2,
  FiCpu, FiStar, FiMaximize2, FiMinimize2
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Table, Modal, ProgressBar } from 'react-bootstrap';

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
  
  // États IA
  const [showAIAnalyse, setShowAIAnalyse] = useState(false);
  const [aiAnalyse, setAiAnalyse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // États pour la suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [anomalieToDelete, setAnomalieToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    chargerAnomalies();
    chargerStats();
  }, [filtres]);

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

  // Analyse IA des anomalies
  const handleAIAnalyse = async () => {
    setAiLoading(true);
    setShowAIAnalyse(true);
    try {
      const response = await api.post('/ai/analyser-anomalies', {
        anomalies: anomalies,
        stats: stats,
        filtres: filtres
      });
      setAiAnalyse(response.data);
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      
      // Analyse locale fallback
      const totalAnomalies = stats?.total || anomalies.length;
      const anomaliesNonResolues = anomalies.filter(a => a.statut !== 'résolu').length;
      const tauxResolution = totalAnomalies > 0 ? ((totalAnomalies - anomaliesNonResolues) / totalAnomalies) * 100 : 0;
      
      const anomaliesParType = stats?.parType || [];
      
      const anomaliesCritiques = anomalies.filter(a => a.type_anomalie === 'manquant' && a.statut !== 'résolu').length;
      
      const alertes = [];
      const recommandations = [];
      
      if (anomaliesCritiques > 0) {
        alertes.push(`${anomaliesCritiques} anomalie(s) critique(s) de type "bien manquant" non résolues`);
        recommandations.push("Lancer une enquête approfondie sur les biens manquants");
      }
      
      if (tauxResolution < 50) {
        alertes.push(`Taux de résolution faible: ${tauxResolution.toFixed(1)}%`);
        recommandations.push("Accélérer le traitement des anomalies en cours");
      }
      
      if (anomaliesParType.some(t => t.type_anomalie === 'endommage' && t.count > 5)) {
        alertes.push("Nombre élevé d'actifs endommagés signalés");
        recommandations.push("Renforcer les mesures de protection des actifs");
      }
      
      const scoreSante = Math.max(0, 100 - (anomaliesCritiques * 10) - (100 - tauxResolution) / 2);
      
      setAiAnalyse({
        score_sante: Math.min(100, Math.floor(scoreSante)),
        niveau_risque: scoreSante >= 80 ? "faible" : scoreSante >= 50 ? "moyen" : "élevé",
        resume: `Analyse de ${totalAnomalies} anomalie(s). Taux de résolution: ${tauxResolution.toFixed(1)}%. ${anomaliesCritiques} anomalie(s) critique(s) non résolues.`,
        anomalies: alertes.length > 0 ? alertes : ["Aucune anomalie majeure détectée"],
        recommandations: recommandations.length > 0 ? recommandations : [
          "Maintenir un suivi régulier des anomalies signalées",
          "Former le personnel à la détection précoce des anomalies",
          "Mettre en place des audits périodiques"
        ],
        metriques: {
          total_anomalies: totalAnomalies,
          anomalies_resolues: totalAnomalies - anomaliesNonResolues,
          taux_resolution: parseFloat(tauxResolution.toFixed(1)),
          anomalies_par_type: anomaliesParType
        }
      });
    } finally {
      setAiLoading(false);
    }
  };

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

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams();
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.dateDebut) params.append('startDate', filtres.dateDebut);
      if (filtres.dateFin) params.append('endDate', filtres.dateFin);
      
      const url = `/anomalies/export-pdf${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `anomalies_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (err) {
      console.error('❌ Erreur export PDF:', err);
      alert('Erreur lors de l\'export PDF');
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

  const getTypeColor = (type) => {
    const colors = {
      'manquant': '#ef4444',
      'endommage': '#f59e0b',
      'non_conforme': '#f59e0b',
      'autre': '#64748b'
    };
    return colors[type] || '#64748b';
  };

  const getStatutConfig = (statut) => {
    const configs = {
      'signalé': { variant: 'danger', icon: <FiAlertCircle size={12} />, label: 'Signalé', color: '#ef4444' },
      'en_cours': { variant: 'warning', icon: <FiClock size={12} />, label: 'En cours', color: '#f59e0b' },
      'résolu': { variant: 'success', icon: <FiCheck size={12} />, label: 'Résolu', color: '#10b981' }
    };
    return configs[statut] || configs['signalé'];
  };

  const getActifDisplay = (anomalie) => {
    const actif = anomalie.actif || anomalie.Actif || anomalie.actifInfo;
    if (actif && actif.code && actif.nom) return `${actif.code} - ${actif.nom}`;
    if (actif && actif.code) return actif.code;
    if (actif && actif.nom) return actif.nom;
    if (anomalie.actif_id) return `ID: ${anomalie.actif_id}`;
    return 'Non spécifié';
  };

  const getCreateurDisplay = (anomalie) => {
    const createur = anomalie.createurAnomalie || anomalie.createur || anomalie.createurInfo;
    if (createur && createur.full_name) return createur.full_name;
    if (anomalie.created_by) return `ID: ${anomalie.created_by}`;
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

  const modalWhiteTextStyle = { color: '#ffffff' };
  const modalWhiteMutedStyle = { color: '#cccccc' };

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
    .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
    .table-row-hover { transition: background-color 0.2s ease; }
    .table-row-hover:hover { background-color: rgba(37, 99, 235, 0.05); cursor: pointer; }
    
    .modal-white-text .modal-content {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
      color: #ffffff !important;
    }
    .modal-white-text .modal-header {
      border-bottom-color: rgba(255, 255, 255, 0.2) !important;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
    }
    .modal-white-text .modal-footer {
      border-top-color: rgba(255, 255, 255, 0.2) !important;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
    }
    .modal-white-text .btn-close {
      filter: invert(1) grayscale(100%) brightness(200%);
    }
    .modal-white-text .bg-light {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
  `;

  const totalAnomalies = stats?.total || anomalies.length;
  const anomaliesResolues = anomalies.filter(a => a.statut === 'résolu').length;
  const tauxResolution = totalAnomalies > 0 ? (anomaliesResolues / totalAnomalies) * 100 : 0;

  return (
    <>
      <style>{animationStyles}</style>
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <Container fluid className="py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1400px' }}>
          
          {/* Modal Analyse IA */}
          <Modal show={showAIAnalyse} onHide={() => setShowAIAnalyse(false)} size="lg" centered>
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
              <Modal.Title className="d-flex align-items-center gap-2">
                <GiArtificialIntelligence size={24} /> Analyse IA des anomalies
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
              {aiLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-white">Analyse en cours...</p>
                </div>
              ) : aiAnalyse ? (
                <div>
                  <div className="text-center mb-4">
                    <div className="display-4 fw-bold" style={{ color: aiAnalyse.score_sante >= 80 ? '#10b981' : aiAnalyse.score_sante >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {aiAnalyse.score_sante || 75}/100
                    </div>
                    <Badge bg={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 50 ? 'warning' : 'danger'}>
                      Santé du processus d'anomalies
                    </Badge>
                  </div>
                  
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #06b6d4' }}>
                    <strong className="text-info">📋 Résumé</strong>
                    <p className="mt-2 text-white-50">{aiAnalyse.resume}</p>
                  </div>
                  
                  {aiAnalyse.metriques && (
                    <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                      <strong className="text-warning">📊 Métriques clés</strong>
                      <div className="row mt-2">
                        <div className="col-6">
                          <small className="text-muted">Total anomalies</small>
                          <div className="fw-bold text-white">{aiAnalyse.metriques.total_anomalies}</div>
                        </div>
                        <div className="col-6">
                          <small className="text-muted">Taux de résolution</small>
                          <div className="fw-bold" style={{ color: aiAnalyse.metriques.taux_resolution >= 70 ? '#10b981' : '#f59e0b' }}>
                            {aiAnalyse.metriques.taux_resolution}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {aiAnalyse.anomalies && aiAnalyse.anomalies.length > 0 && (
                    <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #ef4444' }}>
                      <strong className="text-danger">⚠️ Points d'attention</strong>
                      <ul className="mt-2 mb-0">
                        {aiAnalyse.anomalies.map((a, i) => (
                          <li key={i} className="text-white-50 small">{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {aiAnalyse.recommandations && aiAnalyse.recommandations.length > 0 && (
                    <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #10b981' }}>
                      <strong className="text-success">💡 Recommandations</strong>
                      <ul className="mt-2 mb-0">
                        {aiAnalyse.recommandations.map((r, i) => (
                          <li key={i} className="text-white-50 small">{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-white-50">Cliquez sur "Analyser" pour générer un rapport IA</p>
              )}
            </Modal.Body>
            <Modal.Footer style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', borderTop: '1px solid #333' }}>
              <Button variant="secondary" onClick={() => setShowAIAnalyse(false)}>Fermer</Button>
              <Button variant="primary" onClick={handleAIAnalyse} disabled={aiLoading} className="d-flex align-items-center gap-2">
                {aiLoading ? <Spinner size="sm" animation="border" /> : <><GiArtificialIntelligence className="me-1" /> Analyser avec l'IA</>}
              </Button>
            </Modal.Footer>
          </Modal>
          
          {/* Modal de confirmation de suppression */}
          <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
            <Modal.Header closeButton className="bg-danger text-white">
              <Modal.Title className="d-flex align-items-center gap-2"><FiTrash2 size={18} /> Confirmer la suppression</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p style={{ color: '#000000' }}>Êtes-vous sûr de vouloir supprimer cette anomalie ?</p>
              <p style={{ color: '#555555', fontSize: '0.875rem' }}>Cette action est irréversible.</p>
              {anomalieToDelete && (
                <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                  <small><strong style={{ color: '#000000' }}>Type :</strong></small><br />
                  <small style={{ color: '#000000' }}>{getTypeLabel(anomalieToDelete.type_anomalie)}</small><br />
                  <small><strong style={{ color: '#000000' }}>Date :</strong></small><br />
                  <small style={{ color: '#000000' }}>{formatDate(anomalieToDelete.date_constat)}</small><br />
                  <small><strong style={{ color: '#000000' }}>Statut :</strong></small><br />
                  <small style={{ color: '#000000' }}>{anomalieToDelete.statut}</small>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Annuler</Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <Spinner as="span" size="sm" animation="border" /> : <><FiTrash2 size={14} /> Supprimer</>}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Modal des détails */}
          <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered dialogClassName="modal-white-text">
            <Modal.Header closeButton>
              <Modal.Title className="d-flex align-items-center gap-2" style={modalWhiteTextStyle}>
                <FiAlertCircle size={20} className="text-danger" /> Détails de l'anomalie
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedAnomalie && (
                <div>
                  <Row className="mb-3">
                    <Col md={6}>
                      <small className="d-block" style={modalWhiteMutedStyle}>Actif concerné</small>
                      <div className="fw-semibold" style={modalWhiteTextStyle}>{getActifDisplay(selectedAnomalie)}</div>
                    </Col>
                    <Col md={6}>
                      <small className="d-block" style={modalWhiteMutedStyle}>Date de constat</small>
                      <div style={modalWhiteTextStyle}>{formatDate(selectedAnomalie.date_constat)}</div>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={6}>
                      <small className="d-block" style={modalWhiteMutedStyle}>Type d'anomalie</small>
                      <Badge style={{ backgroundColor: getTypeColor(selectedAnomalie.type_anomalie), color: 'white' }}>
                        {getTypeIcon(selectedAnomalie.type_anomalie)} {getTypeLabel(selectedAnomalie.type_anomalie)}
                      </Badge>
                    </Col>
                    <Col md={6}>
                      <small className="d-block" style={modalWhiteMutedStyle}>Statut</small>
                      {(() => {
                        const config = getStatutConfig(selectedAnomalie.statut);
                        return (
                          <Badge style={{ backgroundColor: config.color, color: 'white' }}>
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
                        <FiMapPin size={14} /> {selectedAnomalie.localisation_constatee || 'Non spécifiée'}
                      </div>
                    </Col>
                    <Col md={6}>
                      <small className="d-block" style={modalWhiteMutedStyle}>Créé par</small>
                      <div className="d-flex align-items-center gap-1" style={modalWhiteTextStyle}>
                        <FiUser size={14} /> {getCreateurDisplay(selectedAnomalie)}
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
              <div className="rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ background: 'rgba(255,255,255,0.2)', width: '56px', height: '56px' }}>
                <FiAlertCircle size={28} className="text-white" />
              </div>
              <div>
                <h1 className="h3 fw-bold mb-1 text-white">Rapport des anomalies</h1>
                <p className="text-white-50 small mb-0">Suivi et gestion des anomalies d'inventaire</p>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-light" onClick={handleAIAnalyse} className="d-flex align-items-center gap-2">
                <GiArtificialIntelligence size={16} /> Analyse IA
              </Button>
              <Button variant="outline-light" onClick={() => setShowFilters(!showFilters)} className="d-flex align-items-center gap-2">
                <FiFilter size={16} /> Filtres {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </Button>
              <Button variant="light" onClick={handleExportPDF} disabled={exporting} className="d-flex align-items-center gap-2">
                <FiFileText size={16} /> {exporting ? 'Génération...' : 'Exporter PDF'}
              </Button>
              <Button variant="light" onClick={chargerAnomalies} disabled={loading} className="d-flex align-items-center gap-2">
                <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Filtres */}
          {showFilters && (
            <Card className="border-0 shadow-lg rounded-3 mb-4" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
              <Card.Body>
                <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2 text-secondary"><FiFilter size={14} /> Filtres de recherche</h6>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Label className="fw-semibold small text-secondary">Statut</Form.Label>
                    <Form.Select value={filtres.statut} onChange={(e) => setFiltres({ ...filtres, statut: e.target.value })}>
                      <option value="">Tous les statuts</option>
                      <option value="signalé">Signalé</option>
                      <option value="en_cours">En cours</option>
                      <option value="résolu">Résolu</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold small text-secondary">Type d'anomalie</Form.Label>
                    <Form.Select value={filtres.type} onChange={(e) => setFiltres({ ...filtres, type: e.target.value })}>
                      <option value="">Tous les types</option>
                      <option value="manquant">Bien manquant</option>
                      <option value="endommage">Endommagé</option>
                      <option value="non_conforme">Non conforme</option>
                      <option value="autre">Autre</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold small d-flex align-items-center gap-1 text-secondary"><FiCalendar size={12} /> Date début</Form.Label>
                    <Form.Control type="date" value={filtres.dateDebut} onChange={(e) => setFiltres({ ...filtres, dateDebut: e.target.value })} />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold small d-flex align-items-center gap-1 text-secondary"><FiCalendar size={12} /> Date fin</Form.Label>
                    <Form.Control type="date" value={filtres.dateFin} onChange={(e) => setFiltres({ ...filtres, dateFin: e.target.value })} />
                  </Col>
                </Row>
                <div className="d-flex gap-2 justify-content-end mt-3">
                  <Button variant="outline-secondary" size="sm" onClick={() => { setFiltres({ statut: '', type: '', dateDebut: '', dateFin: '' }); chargerAnomalies(); }}>Réinitialiser</Button>
                  <Button variant="primary" size="sm" onClick={chargerAnomalies}>Appliquer</Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Statistiques */}
          {stats && (
            <Row className="g-3 mb-4">
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-lg text-center h-100 stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white' }}>
                  <Card.Body>
                    <FiAlertCircle size={28} className="mb-2 opacity-75" />
                    <div className="display-4 fw-bold mb-0">{totalAnomalies}</div>
                    <small className="opacity-75">Total anomalies</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-lg text-center h-100 stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white' }}>
                  <Card.Body>
                    <FiCheck size={28} className="mb-2 opacity-75" />
                    <div className="display-4 fw-bold mb-0">{anomaliesResolues}</div>
                    <small className="opacity-75">Résolues</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-lg text-center h-100 stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                  <Card.Body>
                    <FiClock size={28} className="mb-2 opacity-75" />
                    <div className="display-4 fw-bold mb-0">{anomalies.filter(a => a.statut === 'en_cours').length}</div>
                    <small className="opacity-75">En cours</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-lg text-center h-100 stat-card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
                  <Card.Body>
                    <FiTrendingUp size={28} className="mb-2 opacity-75" />
                    <div className="display-4 fw-bold mb-0">{tauxResolution.toFixed(0)}%</div>
                    <small className="opacity-75">Taux de résolution</small>
                    <ProgressBar className="mt-2" style={{ height: '4px', background: 'rgba(255,255,255,0.3)' }}>
                      <ProgressBar now={tauxResolution} style={{ background: 'white' }} />
                    </ProgressBar>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Vue Tableau - UNIQUEMENT (vue graphique supprimée) */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="light" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
              <p className="text-white">Chargement des anomalies...</p>
            </div>
          ) : anomalies.length === 0 ? (
            <Card className="border-0 shadow-lg rounded-3" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <Card.Body className="text-center py-5">
                <FiAlertCircle size={48} className="text-muted opacity-50 mb-3" />
                <h5 className="text-muted mb-2">Aucune anomalie trouvée</h5>
                <Button variant="outline-secondary" size="sm" onClick={() => { setFiltres({ statut: '', type: '', dateDebut: '', dateFin: '' }); chargerAnomalies(); }}>Réinitialiser</Button>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg rounded-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Date</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Actif</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Type</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Description</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Localisation</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Statut</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Créé par</th>
                      <th style={{ color: '#000000', fontWeight: '600' }}>Actions</th>
                      {isAdmin && <th style={{ color: '#000000', fontWeight: '600' }}>Suppression</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((anomalie) => {
                      const statutConfig = getStatutConfig(anomalie.statut);
                      const actif = anomalie.actif || anomalie.Actif || anomalie.actifInfo;
                      return (
                        <tr key={anomalie.id} className="table-row-hover">
                          <td className="text-nowrap">
                            <div className="d-flex align-items-center gap-1">
                              <FiCalendar size={12} className="text-muted" />
                              <span className="small">{formatDate(anomalie.date_constat)}</span>
                            </div>
                          </td>
                          <td>
                            <div><code className="small bg-light px-1 py-0 rounded">{actif?.code || anomalie.actif_id || '-'}</code></div>
                            <small className="text-muted">{actif?.nom || ''}</small>
                          </td>
                          <td>
                            <Badge style={{ backgroundColor: getTypeColor(anomalie.type_anomalie), color: 'white' }}>
                              {getTypeIcon(anomalie.type_anomalie)} {getTypeLabel(anomalie.type_anomalie)}
                            </Badge>
                          </td>
                          <td>
                            <div className="text-truncate" style={{ maxWidth: '200px' }} title={anomalie.description}>
                              {anomalie.description || '-'}
                            </div>
                          </td>
                          <td>
                            {anomalie.localisation_constatee ? (
                              <div className="d-flex align-items-center gap-1">
                                <FiMapPin size={12} className="text-muted" />
                                <span className="small">{anomalie.localisation_constatee}</span>
                              </div>
                            ) : '-'}
                          </td>
                          <td>
                            <Badge style={{ backgroundColor: statutConfig.color, color: 'white' }}>
                              {statutConfig.icon} {statutConfig.label}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <FiUser size={12} className="text-muted" />
                              <span className="small">{getCreateurDisplay(anomalie)}</span>
                            </div>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline-primary" size="sm" onClick={() => openDetailModal(anomalie)} className="d-flex align-items-center gap-1">
                              <FiEye size={12} /> Détails
                            </Button>
                          </td>
                          {isAdmin && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline-danger" size="sm" onClick={(e) => handleDeleteClick(anomalie, e)} className="d-flex align-items-center gap-1">
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
            <small className="text-white-50 d-flex align-items-center justify-content-center gap-2">
              <FiShield size={12} /> Rapport des anomalies — Mise à jour en temps réel
              {isAdmin && <span className="text-danger ms-2">● Mode administrateur</span>}
            </small>
          </div>
        </Container>
      </div>
    </>
  );
};

export default RapportAnomalies;
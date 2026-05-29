// frontend/src/pages/Rapports/Alertes.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import aiService from '../../services/aiService';
import { 
  FiAlertCircle, FiClock, FiPackage, FiFileText,
  FiTrendingUp, FiTrendingDown, FiRefreshCw,
  FiEye, FiCalendar, FiMapPin, FiTag, FiFilter,
  FiChevronRight, FiChevronDown, FiBell, FiX,
  FiCpu, FiStar, FiCheckCircle, FiInfo, FiShield
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import { Modal, Spinner, Button, Badge, ProgressBar } from 'react-bootstrap';

const Alertes = () => {
  const navigate = useNavigate();
  const [alertes, setAlertes] = useState({
    finLicence: [],
    maintenance: [],
    echeancesContrats: [],
    actifsEnMaintenance: [],
    anomalies: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    finLicence: true,
    maintenance: true,
    echeancesContrats: true,
    actifsEnMaintenance: true,
    anomalies: true
  });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // États IA
  const [showAIAnalyse, setShowAIAnalyse] = useState(false);
  const [aiAnalyse, setAiAnalyse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAlertes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/reports/alertes');
      
      console.log('🔔 Alertes reçues:', response.data);
      setAlertes(response.data);
    } catch (err) {
      console.error('❌ Erreur chargement alertes:', err);
      setError(err.response?.data?.message || 'Erreur de chargement des alertes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Analyse IA des alertes
  const handleAIAnalyse = async () => {
    setAiLoading(true);
    setShowAIAnalyse(true);
    try {
      const response = await api.post('/ai/analyser-alertes', {
        alertes: alertes,
        total_alertes: totalAlertes
      });
      setAiAnalyse(response.data);
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      
      // Analyse locale fallback
      const alertesCritiques = totalAlertesCritiques;
      const alertesParType = {
        finLicence: alertes.finLicence?.length || 0,
        contrats: alertes.echeancesContrats?.length || 0,
        maintenance: alertes.actifsEnMaintenance?.length || 0,
        anomalies: alertes.anomalies?.length || 0
      };
      
      const anomalies = [];
      const recommandations = [];
      
      if (alertesCritiques > 0) {
        anomalies.push(`${alertesCritiques} alerte(s) critique(s) nécessitent une action immédiate`);
        recommandations.push("Traiter en priorité les alertes critiques");
      }
      
      if (alertesParType.finLicence > 3) {
        anomalies.push(`${alertesParType.finLicence} licences vont expirer prochainement`);
        recommandations.push("Planifier le renouvellement des licences");
      }
      
      if (alertesParType.contrats > 5) {
        anomalies.push(`${alertesParType.contrats} contrats arrivent à échéance`);
        recommandations.push("Revoir les conditions de renouvellement des contrats");
      }
      
      const scoreUrgence = Math.max(0, 100 - (alertesCritiques * 15) - (totalAlertes * 2));
      
      setAiAnalyse({
        score_urgence: Math.min(100, scoreUrgence),
        niveau_urgence: scoreUrgence >= 80 ? "faible" : scoreUrgence >= 50 ? "modéré" : "élevé",
        resume: `Analyse des ${totalAlertes} alertes actives. ${alertesCritiques} alerte(s) critique(s) nécessitent une attention immédiate.`,
        anomalies: anomalies,
        recommandations: recommandations,
        metriques: {
          total_alertes: totalAlertes,
          alertes_critiques: alertesCritiques,
          alertes_par_type: alertesParType
        }
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlertes();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleViewActif = (id) => {
    if (id) {
      navigate(`/actifs/${id}`);
    }
  };

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getPrioriteColor = (priorite) => {
    switch(priorite) {
      case 'critique': return '#ef4444';
      case 'haute': return '#f97316';
      case 'moyenne': return '#f59e0b';
      case 'basse': return '#10b981';
      default: return '#64748b';
    }
  };

  const getPrioriteBgColor = (priorite) => {
    switch(priorite) {
      case 'critique': return 'rgba(239, 68, 68, 0.1)';
      case 'haute': return 'rgba(249, 115, 22, 0.1)';
      case 'moyenne': return 'rgba(245, 158, 11, 0.1)';
      case 'basse': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(100, 116, 139, 0.1)';
    }
  };

  const getPrioriteLabel = (priorite) => {
    switch(priorite) {
      case 'critique': return 'Critique';
      case 'haute': return 'Haute';
      case 'moyenne': return 'Moyenne';
      case 'basse': return 'Basse';
      default: return priorite || 'Moyenne';
    }
  };

  const getDaysRemaining = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysBadge = (days) => {
    if (days === null) return null;
    if (days < 0) {
      return <Badge bg="secondary" className="px-2 py-1">Expiré depuis {Math.abs(days)}j</Badge>;
    }
    if (days <= 7) {
      return <Badge bg="danger" className="px-2 py-1">Urgent! {days}j</Badge>;
    }
    if (days <= 30) {
      return <Badge bg="warning" className="px-2 py-1">{days}j restants</Badge>;
    }
    return <Badge bg="info" className="px-2 py-1 text-dark">{days}j</Badge>;
  };

  const filterAlerte = (alerte) => {
    if (filter !== 'all' && alerte.priorite !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (alerte.code?.toLowerCase().includes(searchLower) ||
              alerte.nom?.toLowerCase().includes(searchLower));
    }
    return true;
  };

  const getSectionCount = (section) => {
    return alertes[section]?.filter(filterAlerte).length || 0;
  };

  const totalAlertes = 
    (alertes.finLicence?.length || 0) + 
    (alertes.maintenance?.length || 0) + 
    (alertes.echeancesContrats?.length || 0) +
    (alertes.actifsEnMaintenance?.length || 0) +
    (alertes.anomalies?.length || 0);

  const totalAlertesCritiques = 
    (alertes.finLicence?.filter(a => a.priorite === 'critique' || a.priorite === 'haute').length || 0) +
    (alertes.echeancesContrats?.filter(a => a.priorite === 'critique' || a.priorite === 'haute').length || 0) +
    (alertes.actifsEnMaintenance?.filter(a => a.priorite === 'critique' || a.priorite === 'haute').length || 0) +
    (alertes.anomalies?.filter(a => a.priorite === 'critique' || a.priorite === 'haute').length || 0);

  const filteredTotal = 
    (alertes.finLicence?.filter(filterAlerte).length || 0) + 
    (alertes.maintenance?.filter(filterAlerte).length || 0) + 
    (alertes.echeancesContrats?.filter(filterAlerte).length || 0) +
    (alertes.actifsEnMaintenance?.filter(filterAlerte).length || 0) +
    (alertes.anomalies?.filter(filterAlerte).length || 0);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <Spinner animation="border" variant="light" className="mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </Spinner>
          <p className="text-white">Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-5 text-center" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
          <div className="card-body py-5">
            <FiAlertCircle size={48} className="text-danger mb-3" />
            <p className="text-danger">{error}</p>
            <button onClick={fetchAlertes} className="btn btn-danger mt-3">
              <FiRefreshCw className="me-2" /> Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
      <div className="container py-4 px-3 px-md-4" style={{ maxWidth: '1400px' }}>
        
        {/* Modal Analyse IA */}
        <Modal show={showAIAnalyse} onHide={() => setShowAIAnalyse(false)} size="lg" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <GiArtificialIntelligence size={24} /> Analyse IA des alertes
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
                  <div className="display-4 fw-bold" style={{ color: aiAnalyse.score_urgence >= 80 ? '#10b981' : aiAnalyse.score_urgence >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {aiAnalyse.score_urgence || 75}/100
                  </div>
                  <Badge bg={aiAnalyse.score_urgence >= 80 ? 'success' : aiAnalyse.score_urgence >= 50 ? 'warning' : 'danger'}>
                    Niveau d'urgence
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
                        <small className="text-muted">Total alertes</small>
                        <div className="fw-bold text-white">{aiAnalyse.metriques.total_alertes}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Alertes critiques</small>
                        <div className="fw-bold text-danger">{aiAnalyse.metriques.alertes_critiques}</div>
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
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold text-white mb-1 d-flex align-items-center gap-2">
              <FiBell size={32} /> Alertes et échéances
            </h1>
            <p className="text-white-50 small mb-0">
              {filteredTotal} alerte(s) active(s) • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-light" onClick={handleAIAnalyse} className="d-flex align-items-center gap-2">
              <GiArtificialIntelligence size={16} /> Analyse IA
            </Button>
            <Button variant="light" onClick={handleRefresh} disabled={refreshing} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-2 flex-wrap p-1 rounded" style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px' }}>
            <FiFilter size={18} className="text-primary mx-2" />
            <button 
              onClick={() => setFilter('all')} 
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              Toutes
            </button>
            <button 
              onClick={() => setFilter('critique')} 
              className={`btn btn-sm d-flex align-items-center gap-1 ${filter === 'critique' ? 'btn-danger' : 'btn-outline-danger'}`}
            >
              <span className="bg-danger rounded-circle" style={{ width: '8px', height: '8px' }}></span>
              Critique
            </button>
            <button 
              onClick={() => setFilter('haute')} 
              className={`btn btn-sm d-flex align-items-center gap-1 ${filter === 'haute' ? 'btn-warning' : 'btn-outline-warning'}`}
            >
              <span className="bg-warning rounded-circle" style={{ width: '8px', height: '8px' }}></span>
              Haute
            </button>
            <button 
              onClick={() => setFilter('moyenne')} 
              className={`btn btn-sm d-flex align-items-center gap-1 ${filter === 'moyenne' ? 'btn-info' : 'btn-outline-info'}`}
            >
              <span className="bg-info rounded-circle" style={{ width: '8px', height: '8px' }}></span>
              Moyenne
            </button>
            <button 
              onClick={() => setFilter('basse')} 
              className={`btn btn-sm d-flex align-items-center gap-1 ${filter === 'basse' ? 'btn-success' : 'btn-outline-success'}`}
            >
              <span className="bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
              Basse
            </button>
          </div>
          
          <div className="position-relative" style={{ minWidth: '250px' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Rechercher par code ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '2rem', background: 'rgba(255,255,255,0.95)' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="btn btn-link position-absolute p-0 text-muted"
                style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Résumé avec cartes colorées */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-md-3">
            <div className="card border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white' }}>
              <div className="card-body">
                <FiBell size={28} className="mb-2 opacity-75" />
                <div className="display-4 fw-bold mb-0">{filteredTotal}</div>
                <small className="opacity-75">Alertes totales</small>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <div className="card border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
              <div className="card-body">
                <FiTrendingUp size={28} className="mb-2 opacity-75" />
                <div className="display-4 fw-bold mb-0">{getSectionCount('finLicence')}</div>
                <small className="opacity-75">Fin de licence</small>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <div className="card border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white' }}>
              <div className="card-body">
                <FiFileText size={28} className="mb-2 opacity-75" />
                <div className="display-4 fw-bold mb-0">{getSectionCount('echeancesContrats')}</div>
                <small className="opacity-75">Échéances contrats</small>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <div className="card border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
              <div className="card-body">
                <FiTrendingDown size={28} className="mb-2 opacity-75" />
                <div className="display-4 fw-bold mb-0">{getSectionCount('actifsEnMaintenance')}</div>
                <small className="opacity-75">En maintenance</small>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des alertes */}
        <div className="d-flex flex-column gap-3">
          {/* Alertes fin de licence */}
          {alertes.finLicence?.length > 0 && getSectionCount('finLicence') > 0 && (
            <div className="card border-0 shadow-lg rounded-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <div 
                className="card-header d-flex justify-content-between align-items-center cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', cursor: 'pointer' }}
                onClick={() => toggleSection('finLicence')}
              >
                <div className="d-flex align-items-center gap-2">
                  <FiTrendingUp size={18} />
                  <strong>Fins de licence imminentes</strong>
                  <Badge bg="light" text="dark" className="ms-2">{getSectionCount('finLicence')}</Badge>
                </div>
                {expandedSections.finLicence ? <FiChevronDown /> : <FiChevronRight />}
              </div>
              {expandedSections.finLicence && (
                <div className="list-group list-group-flush">
                  {alertes.finLicence.filter(filterAlerte).map((alerte, index) => {
                    const daysRemaining = getDaysRemaining(alerte.date);
                    const actifId = alerte.id || alerte.actif_id;
                    return (
                      <div 
                        key={index} 
                        className="list-group-item list-group-item-action d-flex align-items-center gap-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleViewActif(actifId)}
                      >
                        <div className="bg-light rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          <FiClock size={20} color="#f59e0b" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <code className="bg-light px-2 py-1 rounded small">{alerte.code}</code>
                            <span className="fw-semibold">{alerte.nom}</span>
                          </div>
                          <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                            <FiCalendar size={12} /> Expire le {formatDate(alerte.date)}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getDaysBadge(daysRemaining)}
                          <Badge style={{ backgroundColor: getPrioriteColor(alerte.priorite) }}>
                            {getPrioriteLabel(alerte.priorite)}
                          </Badge>
                          <FiEye size={16} className="text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Alertes échéances contrats */}
          {alertes.echeancesContrats?.length > 0 && getSectionCount('echeancesContrats') > 0 && (
            <div className="card border-0 shadow-lg rounded-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <div 
                className="card-header d-flex justify-content-between align-items-center cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white', cursor: 'pointer' }}
                onClick={() => toggleSection('echeancesContrats')}
              >
                <div className="d-flex align-items-center gap-2">
                  <FiFileText size={18} />
                  <strong>Échéances de contrats</strong>
                  <Badge bg="light" text="dark" className="ms-2">{getSectionCount('echeancesContrats')}</Badge>
                </div>
                {expandedSections.echeancesContrats ? <FiChevronDown /> : <FiChevronRight />}
              </div>
              {expandedSections.echeancesContrats && (
                <div className="list-group list-group-flush">
                  {alertes.echeancesContrats.filter(filterAlerte).map((alerte, index) => {
                    const daysRemaining = getDaysRemaining(alerte.date);
                    const actifId = alerte.id || alerte.actif_id;
                    return (
                      <div 
                        key={index} 
                        className="list-group-item list-group-item-action d-flex align-items-center gap-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleViewActif(actifId)}
                      >
                        <div className="bg-light rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          <FiFileText size={20} color="#3b82f6" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <code className="bg-light px-2 py-1 rounded small">{alerte.code}</code>
                            <span className="fw-semibold">{alerte.nom}</span>
                          </div>
                          <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                            <FiCalendar size={12} /> Contrat expire le {formatDate(alerte.date)}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getDaysBadge(daysRemaining)}
                          <Badge style={{ backgroundColor: getPrioriteColor(alerte.priorite) }}>
                            {getPrioriteLabel(alerte.priorite)}
                          </Badge>
                          <FiEye size={16} className="text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Alertes actifs en maintenance */}
          {alertes.actifsEnMaintenance?.length > 0 && getSectionCount('actifsEnMaintenance') > 0 && (
            <div className="card border-0 shadow-lg rounded-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <div 
                className="card-header d-flex justify-content-between align-items-center cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', cursor: 'pointer' }}
                onClick={() => toggleSection('actifsEnMaintenance')}
              >
                <div className="d-flex align-items-center gap-2">
                  <FiTrendingDown size={18} />
                  <strong>Actifs en maintenance/réparation</strong>
                  <Badge bg="light" text="dark" className="ms-2">{getSectionCount('actifsEnMaintenance')}</Badge>
                </div>
                {expandedSections.actifsEnMaintenance ? <FiChevronDown /> : <FiChevronRight />}
              </div>
              {expandedSections.actifsEnMaintenance && (
                <div className="list-group list-group-flush">
                  {alertes.actifsEnMaintenance.filter(filterAlerte).map((alerte, index) => {
                    const actifId = alerte.id || alerte.actif_id;
                    return (
                      <div 
                        key={index} 
                        className="list-group-item list-group-item-action d-flex align-items-center gap-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleViewActif(actifId)}
                      >
                        <div className="bg-light rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          <FiTrendingDown size={20} color="#ef4444" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <code className="bg-light px-2 py-1 rounded small">{alerte.code}</code>
                            <span className="fw-semibold">{alerte.nom}</span>
                          </div>
                          <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                            <FiTag size={12} /> État: <span style={{ color: getPrioriteColor(alerte.priorite) }}>{alerte.etat}</span>
                            {alerte.localisation && <span><FiMapPin size={12} className="ms-2" /> {alerte.localisation}</span>}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Badge style={{ backgroundColor: getPrioriteColor(alerte.priorite) }}>
                            {getPrioriteLabel(alerte.priorite)}
                          </Badge>
                          <FiEye size={16} className="text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Alertes anomalies */}
          {alertes.anomalies?.length > 0 && getSectionCount('anomalies') > 0 && (
            <div className="card border-0 shadow-lg rounded-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <div 
                className="card-header d-flex justify-content-between align-items-center cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', cursor: 'pointer' }}
                onClick={() => toggleSection('anomalies')}
              >
                <div className="d-flex align-items-center gap-2">
                  <FiAlertCircle size={18} />
                  <strong>Anomalies non résolues</strong>
                  <Badge bg="light" text="dark" className="ms-2">{getSectionCount('anomalies')}</Badge>
                </div>
                {expandedSections.anomalies ? <FiChevronDown /> : <FiChevronRight />}
              </div>
              {expandedSections.anomalies && (
                <div className="list-group list-group-flush">
                  {alertes.anomalies.filter(filterAlerte).map((alerte, index) => {
                    const actifId = alerte.id || alerte.actif_id;
                    return (
                      <div 
                        key={index} 
                        className="list-group-item list-group-item-action d-flex align-items-center gap-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleViewActif(actifId)}
                      >
                        <div className="bg-light rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          <FiAlertCircle size={20} color="#8b5cf6" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <code className="bg-light px-2 py-1 rounded small">{alerte.code}</code>
                            <span className="fw-semibold">{alerte.nom}</span>
                          </div>
                          <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                            <FiCalendar size={12} /> Signalé le {formatDate(alerte.date)}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Badge style={{ backgroundColor: getPrioriteColor(alerte.priorite) }}>
                            {getPrioriteLabel(alerte.priorite)}
                          </Badge>
                          <FiEye size={16} className="text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {filteredTotal === 0 && (
            <div className="text-center py-5" style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px' }}>
              <FiAlertCircle size={48} className="text-muted opacity-50 mb-3" />
              <p className="text-muted">Aucune alerte trouvée</p>
              {(filter !== 'all' || searchTerm) && (
                <button 
                  onClick={() => { setFilter('all'); setSearchTerm(''); }} 
                  className="btn btn-primary btn-sm mt-2"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-4">
          <small className="text-white-50 d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <FiShield size={12} /> Données en temps réel — Alertes générées automatiquement
          </small>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin { animation: spin 1s linear infinite; }
          .cursor-pointer { cursor: pointer; }
          .list-group-item-action:hover { background-color: rgba(37, 99, 235, 0.05) !important; }
        `}</style>
      </div>
    </div>
  );
};

export default Alertes;
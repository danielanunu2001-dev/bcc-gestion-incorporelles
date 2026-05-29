// frontend/src/pages/Conformite/ConformiteDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiShield, FiCheckCircle, FiAlertCircle, 
  FiTrendingUp, FiCalendar, FiLock, FiUnlock, FiBarChart2,
  FiClock, FiFileText, FiRefreshCw, FiInfo, FiMessageSquare,
  FiAward, FiTarget, FiZap, FiDatabase, FiUsers, FiServer
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import api from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, ProgressBar, Nav, Tab } from 'react-bootstrap';

// Import du chatbot
import ConformityChatbot from '../../components/IA/ConformityChatbot';

const ConformiteDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [conformite, setConformite] = useState({
    score_global: 85,
    indicateurs: [],
    alertes: [],
    recommandations: []
  });
  const [derniereVerification, setDerniereVerification] = useState(null);
  const [showChatbot, setShowChatbot] = useState(true);

  useEffect(() => {
    chargerTableauBord();
  }, []);

  const chargerTableauBord = async () => {
    setLoading(true);
    try {
      const response = await api.get('/conformite/dashboard');
      if (response.data && response.data.success) {
        setConformite(response.data);
      } else {
        setConformite({
          score_global: 92,
          indicateurs: [
            { nom: "Plan comptable GCEC", statut: "conforme", valeur: 100, seuil: 80, description: "Conformité au plan comptable" },
            { nom: "Clôture exercices", statut: "conforme", valeur: 100, seuil: 80, description: "Exercices comptables clôturés" },
            { nom: "Piste d'audit", statut: "conforme", valeur: 95, seuil: 80, description: "Traçabilité des opérations" },
            { nom: "Taux de change", statut: "conforme", valeur: 100, seuil: 80, description: "Actualisation des taux" },
            { nom: "Sécurité BCC", statut: "attention", valeur: 65, seuil: 80, description: "Authentification renforcée" },
            { nom: "Archivage légal", statut: "critique", valeur: 45, seuil: 80, description: "Archivage des documents" }
          ],
          alertes: [
            { niveau: "critique", message: "5 utilisateurs ont des mots de passe expirés", action: "Vérifier", date: "2025-05-15" },
            { niveau: "warning", message: "Session d'audit non active depuis 7 jours", action: "Activer", date: "2025-05-14" },
            { niveau: "info", message: "Clôture d'exercice dans 30 jours", action: "Planifier", date: "2025-05-10" }
          ],
          recommandations: [
            "Mettre en place la double authentification pour tous les administrateurs",
            "Archiver les logs d'audit de plus de 12 mois",
            "Planifier la clôture de l'exercice en cours",
            "Réviser les droits d'accès aux données sensibles"
          ],
          statistiques: {
            total_exercices: 5,
            exercices_clotures: 3,
            total_actifs: 45,
            actifs_actifs: 38,
            logs_30_jours: 1250,
            utilisateurs_2fa: 8,
            total_utilisateurs: 12
          }
        });
      }
      setDerniereVerification(new Date());
    } catch (error) {
      console.error('Erreur chargement tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut) => {
    const colors = {
      'conforme': '#10b981',
      'attention': '#f59e0b',
      'critique': '#ef4444',
      'non_conforme': '#dc2626'
    };
    return colors[statut] || '#6b7280';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      'conforme': 'Conforme',
      'attention': 'À surveiller',
      'critique': 'Critique',
      'non_conforme': 'Non conforme'
    };
    return labels[statut] || statut;
  };

  const getNiveauColor = (niveau) => {
    const colors = {
      'critique': '#ef4444',
      'warning': '#f59e0b',
      'info': '#06b6d4',
      'haute': '#ef4444',
      'moyenne': '#f59e0b'
    };
    return colors[niveau] || '#6c757d';
  };

  const getNiveauIcon = (niveau) => {
    const icons = {
      'critique': <FiAlertCircle size={14} />,
      'warning': <FiAlertCircle size={14} />,
      'info': <FiInfo size={14} />
    };
    return icons[niveau] || <FiInfo size={14} />;
  };

  const getScoreColor = () => {
    const score = conformite.score_global;
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreVariant = () => {
    const score = conformite.score_global;
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  if (loading) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', minHeight: '100vh', position: 'relative' }}>
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="light" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p style={{ color: '#ffffff' }}>Chargement du tableau de bord de conformité...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', minHeight: '100vh', position: 'relative' }}>
      
      {/* Effet de particules en arrière-plan */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle at 80% 80%, rgba(139,92,246,0.1) 0%, transparent 60%)' }} />
      </div>

      <Container fluid className="py-4 px-3 px-md-4" style={{ maxWidth: '1400px', position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <Button 
              variant="light" 
              onClick={() => navigate('/parametres')} 
              className="mb-3 d-inline-flex align-items-center gap-2 border-0"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                color: '#ffffff',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
            >
              <FiArrowLeft size={16} /> Retour
            </Button>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ 
                width: '64px', 
                height: '64px', 
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <FiShield size={32} color="#ffffff" />
              </div>
              <div>
                <h1 className="h3 fw-bold mb-1" style={{ color: '#ffffff' }}>Tableau de bord - Conformité BCC</h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Suivi des exigences GCEC et normes prudentielles</p>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button 
              variant="light" 
              onClick={() => setShowChatbot(!showChatbot)} 
              className="d-flex align-items-center gap-2 border-0"
              style={{ 
                backgroundColor: showChatbot ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.15)', 
                color: '#ffffff',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = showChatbot ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.15)'}
              title={showChatbot ? "Masquer l'assistant" : "Afficher l'assistant"}
            >
              <GiArtificialIntelligence size={16} /> {showChatbot ? 'Masquer IA' : 'Afficher IA'}
            </Button>
            <Button 
              variant="light" 
              onClick={chargerTableauBord} 
              className="d-flex align-items-center gap-2 border-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', backdropFilter: 'blur(10px)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
            >
              <FiRefreshCw size={14} /> Rafraîchir
            </Button>
          </div>
        </div>

        {/* Tabs de navigation */}
        <div className="mb-4">
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="border-0 gap-2">
            <Nav.Item>
              <Nav.Link 
                eventKey="overview" 
                style={{ 
                  backgroundColor: activeTab === 'overview' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  marginRight: '8px',
                  fontWeight: 500
                }}
              >
                <FiBarChart2 size={14} className="me-2" /> Vue d'ensemble
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                eventKey="indicators" 
                style={{ 
                  backgroundColor: activeTab === 'indicators' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  marginRight: '8px',
                  fontWeight: 500
                }}
              >
                <FiTarget size={14} className="me-2" /> Indicateurs
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                eventKey="alerts" 
                style={{ 
                  backgroundColor: activeTab === 'alerts' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  marginRight: '8px',
                  fontWeight: 500
                }}
              >
                <FiAlertCircle size={14} className="me-2" /> Alertes
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                eventKey="stats" 
                style={{ 
                  backgroundColor: activeTab === 'stats' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  marginRight: '8px',
                  fontWeight: 500
                }}
              >
                <FiDatabase size={14} className="me-2" /> Statistiques
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        {/* Vue d'ensemble */}
        {activeTab === 'overview' && (
          <>
            {/* Score global */}
            <Row className="mb-4">
              <Col md={12}>
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Card.Body className="text-center py-5">
                    <h5 className="mb-4" style={{ color: '#ffffff', opacity: 0.9 }}>Score global de conformité</h5>
                    <div className="position-relative d-inline-block">
                      <div className="display-1 fw-bold" style={{ color: getScoreColor(), fontSize: '4rem', fontWeight: 'bold' }}>
                        {conformite.score_global}%
                      </div>
                      <Badge 
                        bg={getScoreVariant()} 
                        className="position-absolute top-0 end-0 translate-middle-y"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '20px' }}
                      >
                        {conformite.score_global >= 80 ? 'Excellent' : conformite.score_global >= 60 ? 'Moyen' : 'Critique'}
                      </Badge>
                    </div>
                    <div style={{ maxWidth: '400px', margin: '1.5rem auto 0' }}>
                      <ProgressBar 
                        now={conformite.score_global} 
                        variant={getScoreVariant()}
                        style={{ height: '12px', borderRadius: '6px' }}
                      />
                    </div>
                    <div className="d-flex justify-content-center gap-4 mt-4">
                      <div className="text-center">
                        <div className="small" style={{ color: 'rgba(255,255,255,0.6)' }}>Conformes</div>
                        <div className="fw-bold" style={{ color: '#10b981' }}>
                          {conformite.indicateurs?.filter(i => i.statut === 'conforme').length || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="small" style={{ color: 'rgba(255,255,255,0.6)' }}>À surveiller</div>
                        <div className="fw-bold" style={{ color: '#f59e0b' }}>
                          {conformite.indicateurs?.filter(i => i.statut === 'attention').length || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="small" style={{ color: 'rgba(255,255,255,0.6)' }}>Critiques</div>
                        <div className="fw-bold" style={{ color: '#ef4444' }}>
                          {conformite.indicateurs?.filter(i => i.statut === 'critique').length || 0}
                        </div>
                      </div>
                    </div>
                    <p className="small mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Dernière vérification: {derniereVerification ? new Date(derniereVerification).toLocaleString('fr-FR') : 'Non disponible'}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Indicateurs clés */}
            <Row className="g-4 mb-4">
              <Col xs={12}>
                <h3 className="h5 fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: '#ffffff' }}>
                  <FiTarget size={18} /> Indicateurs de conformité
                </h3>
              </Col>
              {conformite.indicateurs?.map((ind, idx) => (
                <Col key={idx} xs={12} md={6} lg={4}>
                  <Card className="border-0 shadow-sm rounded-4 h-100" style={{ 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="fw-semibold mb-1" style={{ color: '#ffffff' }}>{ind.nom}</h6>
                          <small style={{ color: 'rgba(255,255,255,0.5)' }}>{ind.description}</small>
                        </div>
                        <Badge 
                          style={{ 
                            backgroundColor: `${getStatutColor(ind.statut)}20`, 
                            color: getStatutColor(ind.statut),
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px'
                          }}
                        >
                          {getStatutLabel(ind.statut)}
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between align-items-end mt-3">
                        <div>
                          <div className="h2 mb-0" style={{ color: '#ffffff', fontWeight: 'bold' }}>{ind.valeur}%</div>
                          <small style={{ color: 'rgba(255,255,255,0.5)' }}>Seuil: {ind.seuil}%</small>
                        </div>
                        <div style={{ width: '120px' }}>
                          <ProgressBar 
                            now={ind.valeur} 
                            variant={ind.valeur >= ind.seuil ? 'success' : 'danger'}
                            style={{ height: '8px', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Alertes et recommandations */}
            <Row className="g-4">
              <Col md={6}>
                <Card className="border-0 shadow-sm rounded-4 h-100" style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Card.Body>
                    <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: '#ffffff' }}>
                      <FiAlertCircle size={18} style={{ color: '#f59e0b' }} /> Alertes de conformité
                      {conformite.alertes?.length > 0 && (
                        <Badge style={{ backgroundColor: '#ef4444', color: '#ffffff', borderRadius: '20px' }}>
                          {conformite.alertes.length}
                        </Badge>
                      )}
                    </h5>
                    {conformite.alertes?.length === 0 ? (
                      <div className="text-center py-4">
                        <FiCheckCircle size={48} style={{ color: '#10b981' }} />
                        <p className="mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Aucune alerte active</p>
                      </div>
                    ) : (
                      <div className="vstack gap-3">
                        {conformite.alertes.map((alerte, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 rounded-3"
                            style={{ 
                              backgroundColor: `${getNiveauColor(alerte.niveau)}10`,
                              borderLeft: `3px solid ${getNiveauColor(alerte.niveau)}`,
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="d-flex align-items-center gap-2">
                                <span style={{ color: getNiveauColor(alerte.niveau) }}>
                                  {alerte.niveau === 'critique' ? '🔴' : alerte.niveau === 'warning' ? '🟡' : '🔵'}
                                </span>
                                <span className="small fw-semibold" style={{ color: getNiveauColor(alerte.niveau) }}>
                                  {alerte.niveau === 'critique' ? 'Critique' : alerte.niveau === 'warning' ? 'Attention' : 'Information'}
                                </span>
                              </div>
                              {alerte.date && (
                                <small style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  <FiClock size={12} className="me-1" />
                                  {new Date(alerte.date).toLocaleDateString('fr-FR')}
                                </small>
                              )}
                            </div>
                            <p className="mb-2 mt-2 small" style={{ color: '#ffffff' }}>{alerte.message}</p>
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 text-decoration-none"
                              style={{ color: '#8b5cf6', fontSize: '0.7rem' }}
                            >
                              {alerte.action} →
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="border-0 shadow-sm rounded-4 h-100" style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Card.Body>
                    <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: '#ffffff' }}>
                      <FiTrendingUp size={18} style={{ color: '#10b981' }} /> Recommandations
                    </h5>
                    {conformite.recommandations?.length === 0 ? (
                      <div className="text-center py-4">
                        <FiCheckCircle size={48} style={{ color: '#10b981' }} />
                        <p className="mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Aucune recommandation</p>
                      </div>
                    ) : (
                      <div className="vstack gap-3">
                        {conformite.recommandations.map((rec, idx) => (
                          <div 
                            key={idx} 
                            className="d-flex gap-3 p-3 rounded-3"
                            style={{ 
                              backgroundColor: 'rgba(139,92,246,0.15)',
                              border: '1px solid rgba(139,92,246,0.3)',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              backgroundColor: 'rgba(139,92,246,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <FiZap size={14} style={{ color: '#a78bfa' }} />
                            </div>
                            <span className="small" style={{ color: '#ffffff' }}>{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Onglet Indicateurs */}
        {activeTab === 'indicators' && (
          <Row className="g-4">
            {conformite.indicateurs?.map((ind, idx) => (
              <Col key={idx} xs={12} md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-4" style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="fw-semibold mb-1" style={{ color: '#ffffff' }}>{ind.nom}</h6>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>{ind.description}</small>
                      </div>
                      <Badge 
                        style={{ 
                          backgroundColor: `${getStatutColor(ind.statut)}20`, 
                          color: getStatutColor(ind.statut),
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px'
                        }}
                      >
                        {getStatutLabel(ind.statut)}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Progression</span>
                        <span style={{ color: '#ffffff', fontWeight: 500 }}>{ind.valeur}%</span>
                      </div>
                      <ProgressBar 
                        now={ind.valeur} 
                        variant={ind.valeur >= ind.seuil ? 'success' : 'danger'}
                        style={{ height: '10px', borderRadius: '5px' }}
                      />
                      <div className="d-flex justify-content-between mt-2">
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>Seuil: {ind.seuil}%</small>
                        <small style={{ color: ind.valeur >= ind.seuil ? '#10b981' : '#ef4444' }}>
                          {ind.valeur >= ind.seuil ? '✔️ Conforme' : '⚠️ Non conforme'}
                        </small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Onglet Alertes */}
        {activeTab === 'alerts' && (
          <Row className="g-4">
            <Col md={12}>
              <Card className="border-0 shadow-sm rounded-4" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <Card.Body>
                  <h5 className="fw-semibold mb-3" style={{ color: '#ffffff' }}>Toutes les alertes</h5>
                  {conformite.alertes?.length === 0 ? (
                    <div className="text-center py-4">
                      <FiCheckCircle size={48} style={{ color: '#10b981' }} />
                      <p className="mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Aucune alerte</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table" style={{ color: '#ffffff' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ color: 'rgba(255,255,255,0.7)' }}>Niveau</th>
                            <th style={{ color: 'rgba(255,255,255,0.7)' }}>Message</th>
                            <th style={{ color: 'rgba(255,255,255,0.7)' }}>Date</th>
                            <th style={{ color: 'rgba(255,255,255,0.7)' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conformite.alertes.map((alerte, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td>
                                <Badge style={{ backgroundColor: `${getNiveauColor(alerte.niveau)}20`, color: getNiveauColor(alerte.niveau) }}>
                                  {getNiveauIcon(alerte.niveau)} {alerte.niveau === 'critique' ? 'Critique' : alerte.niveau === 'warning' ? 'Attention' : 'Info'}
                                </Badge>
                              </td>
                              <td style={{ color: '#ffffff' }}>{alerte.message}</td>
                              <td style={{ color: 'rgba(255,255,255,0.5)' }}>{alerte.date ? new Date(alerte.date).toLocaleDateString('fr-FR') : '-'}</td>
                              <td>
                                <Button variant="link" size="sm" className="p-0" style={{ color: '#8b5cf6' }}>{alerte.action}</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Onglet Statistiques */}
        {activeTab === 'stats' && (
          <Row className="g-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm rounded-4" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <Card.Body>
                  <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: '#ffffff' }}>
                    <FiDatabase size={18} /> Statistiques générales
                  </h5>
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>Exercices</small>
                        <div className="h3 mb-0 fw-bold" style={{ color: '#ffffff' }}>{conformite.statistiques?.total_exercices || 0}</div>
                        <small style={{ color: '#10b981' }}>{conformite.statistiques?.exercices_clotures || 0} clôturés</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>Actifs</small>
                        <div className="h3 mb-0 fw-bold" style={{ color: '#ffffff' }}>{conformite.statistiques?.total_actifs || 0}</div>
                        <small style={{ color: '#10b981' }}>{conformite.statistiques?.actifs_actifs || 0} actifs</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>Logs d'audit</small>
                        <div className="h3 mb-0 fw-bold" style={{ color: '#ffffff' }}>{conformite.statistiques?.logs_30_jours || 0}</div>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>30 derniers jours</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>Sécurité 2FA</small>
                        <div className="h3 mb-0 fw-bold" style={{ color: '#ffffff' }}>{conformite.statistiques?.utilisateurs_2fa || 0}</div>
                        <small style={{ color: 'rgba(255,255,255,0.5)' }}>/ {conformite.statistiques?.total_utilisateurs || 0} utilisateurs</small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="border-0 shadow-sm rounded-4" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <Card.Body>
                  <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: '#ffffff' }}>
                    <FiUsers size={18} /> Distribution des statuts
                  </h5>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Conformes</span>
                      <span style={{ color: '#10b981' }}>
                        {conformite.indicateurs?.filter(i => i.statut === 'conforme').length || 0}
                      </span>
                    </div>
                    <ProgressBar 
                      now={(conformite.indicateurs?.filter(i => i.statut === 'conforme').length / (conformite.indicateurs?.length || 1)) * 100} 
                      variant="success"
                      style={{ height: '8px', borderRadius: '4px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>À surveiller</span>
                      <span style={{ color: '#f59e0b' }}>
                        {conformite.indicateurs?.filter(i => i.statut === 'attention').length || 0}
                      </span>
                    </div>
                    <ProgressBar 
                      now={(conformite.indicateurs?.filter(i => i.statut === 'attention').length / (conformite.indicateurs?.length || 1)) * 100} 
                      variant="warning"
                      style={{ height: '8px', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Critiques</span>
                      <span style={{ color: '#ef4444' }}>
                        {conformite.indicateurs?.filter(i => i.statut === 'critique').length || 0}
                      </span>
                    </div>
                    <ProgressBar 
                      now={(conformite.indicateurs?.filter(i => i.statut === 'critique').length / (conformite.indicateurs?.length || 1)) * 100} 
                      variant="danger"
                      style={{ height: '8px', borderRadius: '4px' }}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Footer */}
        <div className="text-center mt-4 pt-3">
          <small className="d-flex align-items-center justify-content-center gap-2 flex-wrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <FiShield size={12} /> Conformité GCEC et normes prudentielles BCC — Audit en temps réel
            <span className="mx-2">•</span>
            <FiClock size={12} /> Mise à jour automatique quotidienne
          </small>
        </div>
      </Container>

      {/* Chatbot en bas à gauche */}
      {showChatbot && (
        <ConformityChatbot 
          currentConformite={conformite}
          onClose={() => setShowChatbot(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card {
          animation: fadeIn 0.5s ease-out;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
};

export default ConformiteDashboard;
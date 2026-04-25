import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPieChart, FiTrendingUp, FiDollarSign, FiAlertCircle, 
  FiTrendingDown, FiBarChart2, FiFileText, FiShield,
  FiChevronRight, FiDownload, FiCalendar, FiClock
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';

const Rapports = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'etat-immobilisations',
      titre: 'État des immobilisations',
      description: 'Analyse de la répartition par catégorie, localisation ou service',
      icon: <FiPieChart size={24} />,
      couleur: '#2563eb',
      bgCouleur: '#eff6ff',
      path: '/rapports/etat-immobilisations',
      badge: 'Analyse',
      stats: 'Vue d\'ensemble'
    },
    {
      id: 'plan-amortissement',
      titre: "Plan d'amortissement",
      description: 'Prévisionnel et réalisé des amortissements',
      icon: <FiTrendingUp size={24} />,
      couleur: '#16a34a',
      bgCouleur: '#f0fdf4',
      path: '/rapports/plan-amortissement',
      badge: 'Financier',
      stats: 'Prévisions'
    },
    {
      id: 'investissements',
      titre: 'Suivi des investissements',
      description: 'Comparaison budget vs réalisé',
      icon: <FiDollarSign size={24} />,
      couleur: '#f59e0b',
      bgCouleur: '#fef3c7',
      path: '/rapports/investissements',
      badge: 'Budget',
      stats: 'Suivi'
    },
    {
      id: 'alertes',
      titre: 'Alertes',
      description: 'Fin de licence, maintenance, anomalies',
      icon: <FiAlertCircle size={24} />,
      couleur: '#dc2626',
      bgCouleur: '#fef2f2',
      path: '/rapports/alertes',
      badge: 'Urgent',
      stats: 'À surveiller'
    },
    {
      id: 'rapport-amortissements',
      titre: 'Rapport des amortissements',
      description: 'Analyse détaillée des amortissements par actif',
      icon: <FiTrendingDown size={24} />,
      couleur: '#8b5cf6',
      bgCouleur: '#f3e8ff',
      path: '/rapports/rapport-amortissements',
      badge: 'Détail',
      stats: 'Par actif'
    },
    {
      id: 'rapport-anomalies',
      titre: 'Rapport des anomalies',
      description: 'Suivi des anomalies d\'inventaire',
      icon: <FiAlertCircle size={24} />,
      couleur: '#ef4444',
      bgCouleur: '#fee2e2',
      path: '/rapports/rapport-anomalies',
      badge: 'Qualité',
      stats: 'Non-conformités'
    },
    {
      id: 'rapport-immobilisations',
      titre: 'Rapport immobilisations',
      description: 'Synthèse complète du patrimoine',
      icon: <FiFileText size={24} />,
      couleur: '#64748b',
      bgCouleur: '#f1f5f9',
      path: '/rapports/rapport-immobilisations',
      badge: 'Synthèse',
      stats: 'Global'
    },
    {
      id: 'suivi-mouvements',
      titre: 'Suivi des mouvements',
      description: 'Traçabilité des transferts et modifications',
      icon: <FiBarChart2 size={24} />,
      couleur: '#06b6d4',
      bgCouleur: '#ecfeff',
      path: '/rapports/suivi-mouvements',
      badge: 'Traçabilité',
      stats: 'Historique'
    }
  ];

  const statsRapides = {
    rapportsDisponibles: sections.length,
    categories: [...new Set(sections.map(s => s.badge))].length,
    dernierRapport: 'Aujourd\'hui'
  };

  // Animation styles
  const animationStyles = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .report-card {
      animation: fadeInUp 0.4s ease-out forwards;
      opacity: 0;
    }
    .report-card:nth-child(1) { animation-delay: 0.05s; }
    .report-card:nth-child(2) { animation-delay: 0.1s; }
    .report-card:nth-child(3) { animation-delay: 0.15s; }
    .report-card:nth-child(4) { animation-delay: 0.2s; }
    .report-card:nth-child(5) { animation-delay: 0.25s; }
    .report-card:nth-child(6) { animation-delay: 0.3s; }
    .report-card:nth-child(7) { animation-delay: 0.35s; }
    .report-card:nth-child(8) { animation-delay: 0.4s; }
    .card-hover {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FiBarChart2 size={32} /> Rapports et tableaux de bord
            </h1>
            <p className="text-muted small mb-0">
              Analysez et visualisez les données de la Banque Centrale du Congo
            </p>
          </div>
          <div className="d-flex gap-2">
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 bg-white shadow-sm">
              <FiCalendar size={14} className="text-muted" />
              <small className="text-muted">Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}</small>
            </div>
          </div>
        </div>

        {/* Cartes statistiques rapides */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={4}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body>
                <div className="h2 mb-0 fw-bold text-primary">{statsRapides.rapportsDisponibles}</div>
                <small className="text-muted">Rapports disponibles</small>
                <FiFileText size={20} className="text-primary mt-2 opacity-50" />
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body>
                <div className="h2 mb-0 fw-bold text-success">{statsRapides.categories}</div>
                <small className="text-muted">Catégories de rapports</small>
                <FiPieChart size={20} className="text-success mt-2 opacity-50" />
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body>
                <div className="h6 mb-0 fw-bold text-info">Mise à jour</div>
                <small className="text-muted">Données en temps réel</small>
                <FiClock size={20} className="text-info mt-2 opacity-50" />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Grille des rapports */}
        <Row className="g-4">
          {sections.map((section, index) => (
            <Col key={section.id} xs={12} md={6} lg={4} xl={3}>
              <div 
                className="report-card card-hover"
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  height: '100%'
                }}
              >
                <Card 
                  className="border-0 shadow-sm rounded-3 h-100 cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(section.path)}
                >
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-start gap-3">
                      <div className="rounded-circle p-2 d-flex align-items-center justify-content-center flex-shrink-0" 
                           style={{ width: '48px', height: '48px', backgroundColor: section.bgCouleur }}>
                        <span style={{ color: section.couleur }}>{section.icon}</span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <h3 className="h6 fw-semibold mb-1">{section.titre}</h3>
                          <Badge bg={section.badge === 'Urgent' ? 'danger' : section.badge === 'Analyse' ? 'info' : section.badge === 'Financier' ? 'success' : 'secondary'} 
                                 className="bg-opacity-10 text-dark px-2 py-1">
                            {section.badge}
                          </Badge>
                        </div>
                        <p className="small text-muted mb-2">{section.description}</p>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <small className="text-muted">{section.stats}</small>
                          <FiChevronRight size={14} className="text-muted" />
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          ))}
        </Row>

        {/* Section d'information */}
        <Row className="mt-4">
          <Col xs={12}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 p-3 bg-white rounded-3 shadow-sm">
              <div className="d-flex align-items-center gap-3">
                <FiShield size={20} className="text-primary" />
                <div>
                  <small className="fw-semibold d-block">Données certifiées BCC</small>
                  <small className="text-muted">Tous les rapports sont générés à partir des données officielles</small>
                </div>
              </div>
              <Button variant="outline-primary" size="sm" onClick={() => window.print()} className="d-flex align-items-center gap-2">
                <FiDownload size={14} /> Exporter cette page
              </Button>
            </div>
          </Col>
        </Row>

      </Container>

      <style>{`
        .stat-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .cursor-pointer {
          cursor: pointer;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );
};

export default Rapports;
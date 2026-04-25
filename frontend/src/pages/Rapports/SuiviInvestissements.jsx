// frontend/src/pages/Rapports/SuiviInvestissements.jsx

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import {
  FiTrendingUp, FiDollarSign, FiPieChart, FiBarChart2,
  FiCalendar, FiRefreshCw, FiDownload, FiChevronDown,
  FiChevronUp, FiAlertCircle, FiCheckCircle, FiXCircle,
  FiShield, FiInfo
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, Table, ProgressBar } from 'react-bootstrap';

const SuiviInvestissements = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('graph');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/reports/suivi-investissements?annee=${annee}`);
      
      console.log('📊 Données reçues:', response.data);
      
      if (response.data.annee) {
        setData([response.data]);
      } else if (Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.response?.data?.message || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [annee]);

  const handleExport = async (format = 'csv') => {
    try {
      setExporting(true);
      const response = await api.get(`/reports/suivi-investissements/export?format=${format}&annee=${annee}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `suivi_investissements_${annee}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export:', err);
      alert('Erreur lors de l\'export des données');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getTauxRealisationVariant = (taux) => {
    if (taux >= 100) return 'danger';
    if (taux >= 80) return 'warning';
    if (taux >= 50) return 'success';
    return 'secondary';
  };

  const getTauxRealisationIcon = (taux) => {
    if (taux >= 100) return <FiXCircle size={16} className="text-danger" />;
    if (taux >= 80) return <FiAlertCircle size={16} className="text-warning" />;
    if (taux >= 50) return <FiCheckCircle size={16} className="text-success" />;
    return <FiTrendingUp size={16} className="text-secondary" />;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-3 shadow-lg border">
          <p className="fw-semibold mb-2">Année {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '0.25rem 0' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Animation styles
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
  `;

  if (loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="warning" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p className="text-muted">Chargement des données d'investissements...</p>
          </div>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="py-5 text-center">
          <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
            <Card.Body className="py-5">
              <FiAlertCircle size={48} className="text-danger mb-3" />
              <h3 className="text-danger">Erreur de chargement</h3>
              <p className="text-muted">{error}</p>
              <Button variant="danger" onClick={fetchData} className="mt-3">
                <FiRefreshCw className="me-2" /> Réessayer
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </>
    );
  }

  const currentData = data[0] || { annee, realise: 0, budget: 0 };
  const tauxRealisation = currentData.budget ? (currentData.realise / currentData.budget) * 100 : 0;

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-warning bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <FiTrendingUp size={28} className="text-warning" />
            </div>
            <div>
              <h1 className="h3 fw-bold mb-1">Suivi des investissements</h1>
              <p className="text-muted small mb-0">Analyse comparative des budgets prévisionnels et réalisés</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowFilters(!showFilters)}
              className="d-flex align-items-center gap-2"
            >
              <FiCalendar size={14} /> {annee} {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </Button>
            <Button variant="primary" onClick={() => handleExport('csv')} disabled={exporting || data.length === 0} className="d-flex align-items-center gap-2">
              <FiDownload size={14} /> {exporting ? 'Export...' : 'Exporter'}
            </Button>
            <Button variant="outline-secondary" onClick={fetchData} disabled={loading} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body>
              <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2"><FiCalendar size={14} /> Sélectionner une année</h6>
              <div className="d-flex gap-3 flex-wrap align-items-end">
                <div style={{ minWidth: '180px' }}>
                  <Form.Label className="fw-semibold small text-muted">Année</Form.Label>
                  <Form.Select value={annee} onChange={(e) => setAnnee(parseInt(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(an => (
                      <option key={an} value={an}>{an}</option>
                    ))}
                  </Form.Select>
                </div>
                <div>
                  <Form.Label className="fw-semibold small text-muted">Mode d'affichage</Form.Label>
                  <div className="btn-group" role="group">
                    <Button variant={viewMode === 'graph' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('graph')} className="d-flex align-items-center gap-2">
                      <FiBarChart2 size={14} /> Graphique
                    </Button>
                    <Button variant={viewMode === 'table' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('table')} className="d-flex align-items-center gap-2">
                      <FiPieChart size={14} /> Tableau
                    </Button>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Cartes statistiques */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body><div className="h2 mb-0 fw-bold text-warning">{formatCurrency(currentData.budget)}</div><small className="text-muted">Budget prévisionnel</small><FiDollarSign size={20} className="text-warning mt-2 opacity-50" /></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body><div className="h2 mb-0 fw-bold text-success">{formatCurrency(currentData.realise)}</div><small className="text-muted">Réalisé</small><FiTrendingUp size={20} className="text-success mt-2 opacity-50" /></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body>
                <div className="h2 mb-0 fw-bold text-danger">{formatCurrency(Math.abs(currentData.budget - currentData.realise))}</div>
                <small className="text-muted">Écart</small>
                <Badge bg={currentData.realise > currentData.budget ? 'danger' : 'success'} className="mt-2 bg-opacity-10 text-dark">
                  {currentData.realise > currentData.budget ? 'Dépassement' : 'Sous-budget'}
                </Badge>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm text-center h-100 stat-card">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                  {getTauxRealisationIcon(tauxRealisation)}
                  <div className="h2 mb-0 fw-bold" style={{ color: tauxRealisation >= 100 ? '#dc2626' : tauxRealisation >= 80 ? '#f59e0b' : tauxRealisation >= 50 ? '#10b981' : '#64748b' }}>
                    {tauxRealisation.toFixed(1)}%
                  </div>
                </div>
                <small className="text-muted">Taux de réalisation</small>
                <ProgressBar className="mt-2" style={{ height: '6px' }}>
                  <ProgressBar 
                    variant={getTauxRealisationVariant(tauxRealisation)} 
                    now={Math.min(100, tauxRealisation)} 
                    style={{ borderRadius: '3px' }}
                  />
                </ProgressBar>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Graphique ou Tableau */}
        {data.length > 0 ? (
          viewMode === 'graph' ? (
            <Card className="border-0 shadow-sm rounded-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h3 className="h6 fw-semibold mb-0 d-flex align-items-center gap-2"><FiBarChart2 size={16} /> Évolution des investissements</h3>
                  <Badge bg="secondary" className="px-2 py-1">Budget vs Réalisé</Badge>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="annee" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="budget" fill="#f59e0b" name="Budget prévisionnel" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realise" fill="#10b981" name="Réalisé" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
              <Card.Body className="p-0">
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2 bg-light">
                  <h3 className="h6 fw-semibold mb-0 d-flex align-items-center gap-2"><FiPieChart size={16} /> Détail des investissements</h3>
                  <Badge bg="secondary" className="px-2 py-1">{data.length} année(s) disponible(s)</Badge>
                </div>
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Année</th>
                        <th className="text-end">Budget (CDF)</th>
                        <th className="text-end">Réalisé (CDF)</th>
                        <th className="text-end">Écart (CDF)</th>
                        <th>Taux de réalisation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => {
                        const taux = item.budget ? (item.realise / item.budget) * 100 : 0;
                        const isOverBudget = item.realise > item.budget;
                        return (
                          <tr key={index}>
                            <td className="fw-semibold text-primary">{item.annee}</td>
                            <td className="text-end">{formatCurrency(item.budget)}</td>
                            <td className="text-end">{formatCurrency(item.realise)}</td>
                            <td className={`text-end fw-semibold ${isOverBudget ? 'text-danger' : 'text-success'}`}>
                              {isOverBudget ? '+' : '-'}{formatCurrency(Math.abs(item.budget - item.realise))}
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                  <div className={`progress-bar bg-${getTauxRealisationVariant(taux)}`} style={{ width: `${Math.min(100, taux)}%` }} />
                                </div>
                                <span className={`small fw-semibold text-${getTauxRealisationVariant(taux)}`}>{taux.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )
        ) : (
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body className="text-center py-5">
              <FiAlertCircle size={48} className="text-muted opacity-50 mb-3" />
              <h5 className="text-muted mb-2">Aucune donnée disponible</h5>
              <p className="text-muted small mb-3">Aucune donnée d'investissement trouvée pour l'année {annee}</p>
              <Button variant="outline-primary" size="sm" onClick={() => setAnnee(new Date().getFullYear())}>
                Voir l'année en cours
              </Button>
            </Card.Body>
          </Card>
        )}

        {/* Footer info */}
        <div className="text-center mt-4">
          <small className="text-muted d-flex align-items-center justify-content-center gap-2">
            <FiShield size={12} /> Données en temps réel — Suivi conforme aux normes BCC
          </small>
        </div>
      </Container>
    </>
  );
};

export default SuiviInvestissements;
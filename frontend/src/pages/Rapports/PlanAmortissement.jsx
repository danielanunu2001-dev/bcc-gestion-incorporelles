// frontend/src/pages/Rapports/PlanAmortissement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import api from '../../services/api';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { 
  FiCalendar, FiRefreshCw, FiDownload, 
  FiTrendingUp, FiTrendingDown, FiBarChart2,
  FiPieChart, FiEye, FiFileText, FiDollarSign,
  FiAlertCircle, FiShield, FiInfo
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Nav, Table } from 'react-bootstrap';

const PlanAmortissement = () => {
  const navigate = useNavigate();
  const { isAuditeur, can } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('chart');
  const [totaux, setTotaux] = useState({
    valeur_brute: 0,
    annuite: 0,
    cumul: 0,
    vnc: 0
  });

  // REDIRECTION SI AUDITEUR (pas autorisé)
  useEffect(() => {
    if (isAuditeur) {
      navigate('/rapports', { replace: true });
    }
  }, [isAuditeur, navigate]);

  const fetchData = async () => {
    if (isAuditeur) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/reports/tableau-amortissements?exercice=${exercice}`);
      
      console.log('📊 Données reçues:', response.data);
      
      const amortissements = response.data.amortissements || [];
      setData(amortissements);
      setTotaux({
        valeur_brute: amortissements.reduce((s, i) => s + (i.valeur_brute || 0), 0),
        annuite: amortissements.reduce((s, i) => s + (i.annuite || 0), 0),
        cumul: amortissements.reduce((s, i) => s + (i.cumul || 0), 0),
        vnc: amortissements.reduce((s, i) => s + (i.vnc || 0), 0)
      });
    } catch (err) {
      console.error('❌ Erreur:', err);
      if (err.response?.status === 403) {
        setError('Accès non autorisé. Cette page est réservée aux administrateurs et comptables.');
        setTimeout(() => navigate('/rapports'), 2000);
      } else {
        setError(err.response?.data?.message || 'Erreur de chargement');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleExport = () => {
    const csvContent = [
      ['Code actif', 'Nom actif', 'Type', 'Compte', 'Valeur brute (CDF)', 'Annuité (CDF)', 'Cumul (CDF)', 'VNC (CDF)'],
      ...data.map(item => [
        item.actif_code,
        item.actif_nom,
        item.type || 'N/A',
        item.compte,
        item.valeur_brute,
        item.annuite,
        item.cumul,
        item.vnc
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `plan_amortissement_${exercice}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewActif = (actifId) => {
    if (actifId) navigate(`/actifs/${actifId}`);
  };

  useEffect(() => {
    if (!isAuditeur) fetchData();
  }, [exercice, isAuditeur]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `${(value || 0).toLocaleString()} FC`;
    }
  };

  const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(value || 0);

  const annees = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  // PAGE D'ACCÈS REFUSÉ POUR L'AUDITEUR
  if (isAuditeur) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <Card className="border-0 shadow-sm text-center" style={{ maxWidth: '500px', width: '90%' }}>
          <Card.Body className="py-5">
            <div className="bg-danger bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
              <FiAlertCircle size={48} className="text-danger" />
            </div>
            <h2 className="h4 fw-bold text-danger mb-2">Accès non autorisé</h2>
            <p className="text-muted mb-2">Vous n'avez pas les droits pour accéder au plan d'amortissement.</p>
            <p className="text-muted small mb-4">Cette page est réservée aux administrateurs et comptables.</p>
            <Button variant="primary" onClick={() => navigate('/rapports')}>
              Retour aux rapports
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <p className="text-muted">Chargement des données...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5 text-center">
        <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
          <Card.Body className="py-5">
            <FiTrendingDown size={48} className="text-danger mb-3" />
            <p className="text-danger">{error}</p>
            <Button variant="danger" onClick={fetchData} className="mt-3 me-2">
              <FiRefreshCw className="me-2" /> Réessayer
            </Button>
            <Button variant="secondary" onClick={() => navigate('/rapports')} className="mt-3">
              Retour aux rapports
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-3 px-md-4" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="display-6 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
            <FiTrendingUp size={32} /> Plan d'amortissement
          </h1>
          <p className="text-muted small mb-0">
            Suivi des amortissements pour l'exercice {exercice}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleExport} className="d-flex align-items-center gap-2">
            <FiDownload size={16} /> CSV
          </Button>
          <Button variant="primary" onClick={handleRefresh} disabled={refreshing} className="d-flex align-items-center gap-2">
            <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <FiCalendar size={18} className="text-muted" />
              <span className="fw-semibold small text-muted">Exercice :</span>
              <Form.Select 
                value={exercice} 
                onChange={(e) => setExercice(parseInt(e.target.value))}
                style={{ width: 'auto', minWidth: '100px' }}
              >
                {annees.map(an => <option key={an} value={an}>{an}</option>)}
              </Form.Select>
            </div>
            <div className="btn-group" role="group">
              <Button variant={viewMode === 'chart' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('chart')} className="d-flex align-items-center gap-2">
                <FiBarChart2 size={14} /> Graphique
              </Button>
              <Button variant={viewMode === 'table' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('table')} className="d-flex align-items-center gap-2">
                <FiFileText size={14} /> Tableau
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Cartes résumé */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-primary">{formatCurrency(totaux.valeur_brute)}</div><small className="text-muted">Valeur brute totale</small><FiDollarSign size={20} className="text-primary mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-success">{formatCurrency(totaux.annuite)}</div><small className="text-muted">Annuité totale</small><FiTrendingUp size={20} className="text-success mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-warning">{formatCurrency(totaux.cumul)}</div><small className="text-muted">Cumul total</small><FiTrendingDown size={20} className="text-warning mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-info">{formatCurrency(totaux.vnc)}</div><small className="text-muted">VNC totale</small><FiFileText size={20} className="text-info mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
      </Row>

      {data.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Body className="text-center py-5">
            <FiFileText size={48} className="text-muted opacity-50 mb-3" />
            <p className="text-muted">Aucune donnée disponible pour l'exercice {exercice}</p>
            <Button variant="primary" onClick={fetchData}>
              <FiRefreshCw className="me-2" /> Actualiser
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Vue Graphique */}
          {viewMode === 'chart' && (
            <>
              <div className="d-flex justify-content-end gap-2 mb-3">
                <div className="btn-group" role="group">
                  <Button variant={chartType === 'bar' ? 'primary' : 'outline-secondary'} onClick={() => setChartType('bar')} className="d-flex align-items-center gap-2">
                    <FiBarChart2 size={14} /> Barres
                  </Button>
                  <Button variant={chartType === 'line' ? 'primary' : 'outline-secondary'} onClick={() => setChartType('line')} className="d-flex align-items-center gap-2">
                    <FiTrendingUp size={14} /> Lignes
                  </Button>
                  <Button variant={chartType === 'area' ? 'primary' : 'outline-secondary'} onClick={() => setChartType('area')} className="d-flex align-items-center gap-2">
                    <FiPieChart size={14} /> Aires
                  </Button>
                </div>
              </div>

              <Card className="border-0 shadow-sm rounded-3 mb-4">
                <Card.Body>
                  <h3 className="h6 fw-semibold mb-3">
                    {chartType === 'bar' && 'Amortissements par actif (barres)'}
                    {chartType === 'line' && 'Évolution des amortissements'}
                    {chartType === 'area' && 'Répartition des valeurs'}
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    {chartType === 'bar' ? (
                      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="annuite" fill="#3b82f6" name="Annuité" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cumul" fill="#10b981" name="Cumul" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="vnc" fill="#f59e0b" name="VNC" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="annuite" stroke="#3b82f6" name="Annuité" strokeWidth={2} />
                        <Line type="monotone" dataKey="cumul" stroke="#10b981" name="Cumul" strokeWidth={2} />
                        <Line type="monotone" dataKey="vnc" stroke="#f59e0b" name="VNC" strokeWidth={2} />
                      </LineChart>
                    ) : (
                      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="vnc" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="VNC" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="cumul" stackId="1" stroke="#10b981" fill="#10b981" name="Cumul" fillOpacity={0.6} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </>
          )}

          {/* Vue Tableau */}
          {viewMode === 'table' && (
            <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
              <Card.Body className="p-0">
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2 bg-light">
                  <h3 className="h6 fw-semibold mb-0">Détail des amortissements - Exercice {exercice}</h3>
                  <div className="d-flex gap-3">
                    <Badge bg="secondary" className="px-2 py-1">{data.length} actif(s)</Badge>
                    <Badge bg="success" className="px-2 py-1">Total annuités: {formatCurrency(totaux.annuite)}</Badge>
                  </div>
                </div>
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Code actif</th>
                        <th>Nom actif</th>
                        <th>Type</th>
                        <th>Compte</th>
                        <th className="text-end">Valeur brute</th>
                        <th className="text-end">Annuité</th>
                        <th className="text-end">Cumul</th>
                        <th className="text-end">VNC</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr key={index}>
                          <td><code className="bg-info bg-opacity-25 px-2 py-1 rounded">{item.actif_code}</code></td>
                          <td className="fw-semibold">{item.actif_nom}</td>
                          <td><Badge bg="secondary" className="bg-opacity-10 text-dark">{item.type || 'N/A'}</Badge></td>
                          <td><code className="bg-warning bg-opacity-25 px-2 py-1 rounded">{item.compte}</code></td>
                          <td className="text-end">{formatCurrency(item.valeur_brute)}</td>
                          <td className="text-end">{formatCurrency(item.annuite)}</td>
                          <td className="text-end">{formatCurrency(item.cumul)}</td>
                          <td className="text-end"><span className="fw-semibold text-primary">{formatCurrency(item.vnc)}</span></td>
                          <td>
                            <Button variant="outline-primary" size="sm" onClick={() => handleViewActif(item.actif_id)} title="Voir l'actif">
                              <FiEye size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan="4">Total</td>
                        <td className="text-end">{formatCurrency(totaux.valeur_brute)}</td>
                        <td className="text-end">{formatCurrency(totaux.annuite)}</td>
                        <td className="text-end">{formatCurrency(totaux.cumul)}</td>
                        <td className="text-end">{formatCurrency(totaux.vnc)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Footer info */}
      <div className="text-center mt-4">
        <small className="text-muted d-flex align-items-center justify-content-center gap-2">
          <FiShield size={12} /> Données en temps réel — Plan d'amortissement conforme aux normes BCC
        </small>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      `}</style>
    </Container>
  );
};

export default PlanAmortissement;
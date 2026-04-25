// src/pages/Rapports/RapportImmobilisations.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  FiPieChart, FiBarChart2, FiRefreshCw, FiDownload,
  FiPackage, FiDollarSign, FiTrendingUp, FiTrendingDown,
  FiCalendar, FiMapPin, FiUser, FiEye, FiShield,
  FiGrid, FiList, FiInfo
} from 'react-icons/fi';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, Table } from 'react-bootstrap';

const RapportImmobilisations = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('chart');
  const [groupePar, setGroupePar] = useState('categorie');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/rapports/etat-immobilisations?groupePar=${groupePar}`);
      setData(res.data);
    } catch (error) {
      console.error('Erreur chargement rapport immobilisations:', error);
      setError('Erreur lors du chargement des données');
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
    if (!data?.resultats) return;
    
    const csvContent = [
      ['Groupe', 'Nombre', 'Valeur brute (CDF)', 'Valeur nette (CDF)', '% du total'],
      ...data.resultats.map(item => [
        item.groupe,
        item.nombre,
        item.valeur_brute,
        item.valeur_nette,
        ((item.valeur_nette / data.totaux.valeur_nette) * 100).toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `rapport_immobilisations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewGroupe = (groupe) => {
    navigate(`/actifs?${groupePar}=${encodeURIComponent(groupe)}`);
  };

  useEffect(() => {
    fetchData();
  }, [groupePar]);

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

  const getGroupeLabel = () => {
    switch(groupePar) {
      case 'categorie': return 'Catégorie';
      case 'localisation': return 'Localisation';
      case 'affectation': return 'Service/Affectation';
      default: return 'Groupe';
    }
  };

  const getGroupeIcon = () => {
    switch(groupePar) {
      case 'categorie': return '🏷️';
      case 'localisation': return '📍';
      case 'affectation': return '👥';
      default: return '📊';
    }
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <p className="text-muted">Chargement du rapport...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5 text-center">
        <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
          <Card.Body className="py-5">
            <FiPieChart size={48} className="text-danger mb-3" />
            <p className="text-danger">{error}</p>
            <Button variant="danger" onClick={fetchData} className="mt-3">
              <FiRefreshCw className="me-2" /> Réessayer
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (!data?.resultats || data.resultats.length === 0) {
    return (
      <Container className="py-5 text-center">
        <Card className="border-0 shadow-sm">
          <Card.Body className="py-5">
            <FiPieChart size={48} className="text-muted opacity-50 mb-3" />
            <p className="text-muted">Aucune donnée disponible</p>
            <Button variant="primary" onClick={fetchData} className="mt-3">
              <FiRefreshCw className="me-2" /> Actualiser
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const totaux = data.totaux || {
    nombre: data.resultats.reduce((s, r) => s + (r.nombre || 0), 0),
    valeur_brute: data.resultats.reduce((s, r) => s + (r.valeur_brute || 0), 0),
    valeur_nette: data.resultats.reduce((s, r) => s + (r.valeur_nette || 0), 0)
  };

  return (
    <Container fluid className="py-4 px-3 px-md-4" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-circle bg-primary bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
            <FiPieChart size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="h3 fw-bold mb-1">Rapport des immobilisations</h1>
            <p className="text-muted small mb-0">Analyse détaillée du patrimoine immobilisé</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleRefresh} disabled={refreshing} className="d-flex align-items-center gap-2">
            <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
          <Button variant="success" onClick={handleExport} className="d-flex align-items-center gap-2">
            <FiDownload size={16} /> CSV
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="fw-semibold small text-muted">Grouper par :</span>
              <Form.Select 
                value={groupePar} 
                onChange={(e) => setGroupePar(e.target.value)}
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="categorie">🏷️ Catégorie</option>
                <option value="localisation">📍 Localisation</option>
                <option value="affectation">👥 Service/Affectation</option>
              </Form.Select>
            </div>
            <div className="btn-group" role="group">
              <Button variant={viewMode === 'chart' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('chart')} className="d-flex align-items-center gap-2">
                <FiBarChart2 size={14} /> Graphique
              </Button>
              <Button variant={viewMode === 'table' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('table')} className="d-flex align-items-center gap-2">
                <FiGrid size={14} /> Tableau
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Cartes résumé */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-primary">{formatNumber(totaux.nombre)}</div><small className="text-muted">Total actifs</small><FiPackage size={20} className="text-primary mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-success">{formatCurrency(totaux.valeur_brute)}</div><small className="text-muted">Valeur brute</small><FiDollarSign size={20} className="text-success mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-warning">{formatCurrency(totaux.valeur_nette)}</div><small className="text-muted">Valeur nette</small><FiTrendingUp size={20} className="text-warning mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100 stat-card">
            <Card.Body><div className="h2 mb-0 fw-bold text-info">{data.resultats.length}</div><small className="text-muted">{getGroupeLabel()}s</small><FiPieChart size={20} className="text-info mt-2 opacity-50" /></Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Vue Graphique */}
      {viewMode === 'chart' && (
        <>
          <div className="d-flex justify-content-end gap-2 mb-3">
            <div className="btn-group" role="group">
              <Button variant={chartType === 'bar' ? 'primary' : 'outline-secondary'} onClick={() => setChartType('bar')} className="d-flex align-items-center gap-2">
                <FiBarChart2 size={14} /> Barres
              </Button>
              <Button variant={chartType === 'pie' ? 'primary' : 'outline-secondary'} onClick={() => setChartType('pie')} className="d-flex align-items-center gap-2">
                <FiPieChart size={14} /> Camembert
              </Button>
              <Button variant={chartType === 'area' ? 'primary' : 'outline-secondary'} onClick={() => setChartType('area')} className="d-flex align-items-center gap-2">
                <FiTrendingUp size={14} /> Aires
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body>
              <h3 className="h6 fw-semibold mb-3">
                {chartType === 'bar' && 'Répartition par barres'}
                {chartType === 'pie' && 'Répartition par valeur nette'}
                {chartType === 'area' && 'Évolution par aires'}
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'bar' ? (
                  <BarChart data={data.resultats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="groupe" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'nombre') return [formatNumber(value), 'Nombre'];
                      return [formatCurrency(value), name === 'valeur_brute' ? 'Valeur brute' : 'Valeur nette'];
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="nombre" fill="#2563eb" name="Nombre d'actifs" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="valeur_brute" fill="#10b981" name="Valeur brute" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="valeur_nette" fill="#f59e0b" name="Valeur nette" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={data.resultats}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ groupe, percent }) => `${groupe} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="valeur_nette"
                      nameKey="groupe"
                    >
                      {data.resultats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                ) : (
                  <AreaChart data={data.resultats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="groupe" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="valeur_brute" stackId="1" stroke="#10b981" fill="#10b981" name="Valeur brute" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="valeur_nette" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Valeur nette" fillOpacity={0.6} />
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
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{getGroupeLabel()} {getGroupeIcon()}</th>
                  <th className="text-end">Nombre</th>
                  <th className="text-end">Valeur brute</th>
                  <th className="text-end">Valeur nette</th>
                  <th className="text-end">% du total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.resultats.map((item, index) => {
                  const pourcentage = ((item.valeur_nette / totaux.valeur_nette) * 100).toFixed(1);
                  return (
                    <tr key={index}>
                      <td className="fw-semibold">{item.groupe}</td>
                      <td className="text-end">{formatNumber(item.nombre)}</td>
                      <td className="text-end">{formatCurrency(item.valeur_brute)}</td>
                      <td className="text-end fw-semibold text-primary">{formatCurrency(item.valeur_nette)}</td>
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end gap-2">
                          <div className="progress flex-grow-1" style={{ width: '80px', height: '6px' }}>
                            <div className="progress-bar bg-primary" style={{ width: `${pourcentage}%` }} />
                          </div>
                          <span className="small text-muted" style={{ minWidth: '45px' }}>{pourcentage}%</span>
                        </div>
                      </td>
                      <td>
                        <Button variant="outline-primary" size="sm" onClick={() => handleViewGroupe(item.groupe)} title={`Voir les actifs de ${item.groupe}`}>
                          <FiEye size={14} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr>
                  <td>Total</td>
                  <td className="text-end">{formatNumber(totaux.nombre)}</td>
                  <td className="text-end">{formatCurrency(totaux.valeur_brute)}</td>
                  <td className="text-end">{formatCurrency(totaux.valeur_nette)}</td>
                  <td className="text-end">100%</td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          </div>
        </Card>
      )}

      {/* Footer info */}
      <div className="text-center mt-4">
        <small className="text-muted d-flex align-items-center justify-content-center gap-2">
          <FiShield size={12} /> Données en temps réel — Rapport conforme aux normes BCC
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

export default RapportImmobilisations;
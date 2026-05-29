import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActifById, fetchAmortissements } from '../../store/actifSlice';
import usePermissions from '../../hooks/usePermissions';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area, Cell
} from 'recharts';
import {
  FiDownload, FiCalendar, FiTrendingUp,
  FiPieChart, FiBarChart2, FiLock, FiArrowLeft,
  FiInfo, FiDollarSign, FiClock,
  FiAlertCircle, FiCheckCircle, FiTrendingDown
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';
import aiService from '../../services/aiService';

const AmortissementsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { can } = usePermissions();
  
  const canViewAmortissements = can(['admin', 'comptable', 'gestionnaire']);
  
  const { actifCourant, amortissements, loading } = useSelector((state) => state.actifs);
  const [viewType, setViewType] = useState('combined');
  const [yearRange, setYearRange] = useState({ start: 0, end: 0 });
  const [showExportModal, setShowExportModal] = useState(false);
  const [analyseIA, setAnalyseIA] = useState(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [showAnalyseModal, setShowAnalyseModal] = useState(false);

  useEffect(() => {
    if (!canViewAmortissements && !loading) {
      setTimeout(() => navigate('/actifs'), 2000);
    }
  }, [canViewAmortissements, loading, navigate]);

  useEffect(() => {
    if (canViewAmortissements && id && id.length > 10 && id !== 'dashboard' && id !== 'undefined') {
      console.log('Chargement des amortissements pour l\'actif:', id);
      dispatch(fetchActifById(id));
      dispatch(fetchAmortissements(id));
    } else if (id && id !== 'dashboard' && id !== 'undefined') {
      console.warn('ID invalide pour les amortissements:', id);
    }
  }, [dispatch, id, canViewAmortissements]);

  useEffect(() => {
    if (amortissements.length > 0) {
      const years = amortissements.map(a => a.exercice);
      setYearRange({
        start: Math.min(...years),
        end: Math.max(...years)
      });
    }
  }, [amortissements]);

  const handleAnalyseIA = async () => {
    if (!id || !actifCourant) return;
    
    setAnalyseLoading(true);
    setShowAnalyseModal(true);
    
    try {
      const response = await aiService.analyserActif(id);
      setAnalyseIA(response.analyse);
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      setAnalyseIA({
        est_coherent: false,
        anomalies: ["Erreur de connexion avec le service IA"],
        taux_moyen: "N/A",
        recommandations: ["Verifiez votre connexion internet", "Reessayez plus tard"],
        resume: "Impossible d'analyser les amortissements pour le moment."
      });
    } finally {
      setAnalyseLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const getEvolutionData = () => {
    if (!amortissements.length || !actifCourant) return [];
    return amortissements.map(am => ({
      annee: am.exercice,
      annuite: am.annuite,
      cumul: am.cumul_amortissements,
      valeurNette: am.valeur_nette,
      taux: ((am.cumul_amortissements / actifCourant.cout_acquisition) * 100).toFixed(1)
    }));
  };

  const getStats = () => {
    if (amortissements.length === 0) return null;
    
    const dernier = amortissements[amortissements.length - 1];
    
    return {
      duree: amortissements.length,
      annuiteMoyenne: amortissements.reduce((sum, a) => sum + (a.annuite || 0), 0) / amortissements.length,
      totalAmorti: dernier?.cumul_amortissements || 0,
      restant: dernier?.valeur_nette || 0,
      progression: ((dernier?.cumul_amortissements || 0) / (actifCourant?.cout_acquisition || 1) * 100).toFixed(1),
      annuiteMax: Math.max(...amortissements.map(a => a.annuite || 0)),
      annuiteMin: Math.min(...amortissements.map(a => a.annuite || 0))
    };
  };

  const stats = getStats();

  const handleExportCSV = () => {
    if (!amortissements.length) return;
    
    const headers = ['Exercice', 'Annuité (CDF)', 'Cumul (CDF)', 'Valeur nette (CDF)', 'Taux (%)'];
    const rows = amortissements.map(am => [
      am.exercice,
      am.annuite,
      am.cumul_amortissements,
      am.valeur_nette,
      ((am.cumul_amortissements / (actifCourant?.cout_acquisition || 1)) * 100).toFixed(2)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `amortissements_${actifCourant?.code || 'actif'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .amortissement-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .amortissement-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .stat-card-hover {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-card-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `;

  if (!canViewAmortissements && !loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#fef2f2' }}>
          <div className="text-center p-5 bg-white rounded-4 shadow-lg" style={{ maxWidth: '500px' }}>
            <div className="bg-danger bg-opacity-10 rounded-circle p-4 d-inline-flex mb-4">
              <FiLock size={64} className="text-danger" />
            </div>
            <h2 className="h3 fw-bold text-danger mb-3">Acces non autorise</h2>
            <p className="text-muted mb-2">Vous n'avez pas les droits pour consulter les amortissements.</p>
            <p className="text-secondary small mb-4">Cette section est reservee aux administrateurs, comptables et gestionnaires.</p>
            <button onClick={() => navigate('/actifs')} className="btn btn-primary px-4 py-2">
              <FiArrowLeft className="me-2" /> Retour a la liste des actifs
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!id || id === 'dashboard' || id.length < 10) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center p-5 bg-light rounded-4">
          <FiInfo size={48} className="text-warning mb-3" />
          <h2 className="h3 fw-bold mb-2">ID d'actif invalide</h2>
          <p className="text-muted mb-4">L'identifiant fourni n'est pas valide.</p>
          <button onClick={() => window.history.back()} className="btn btn-primary">
            <FiArrowLeft className="me-2" /> Retour
          </button>
        </div>
      </div>
    );
  }

  if (loading || !actifCourant) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Chargement des amortissements...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div className="container-fluid py-4 px-3 px-md-4 amortissement-fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Modal d'analyse IA */}
        <div className={`modal fade ${showAnalyseModal ? 'show d-block' : ''}`} 
             style={{ display: showAnalyseModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
             onClick={() => !analyseLoading && setShowAnalyseModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <h5 className="modal-title text-white d-flex align-items-center gap-2">
                  <GiArtificialIntelligence size={20} /> Analyse IA - Mistral
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAnalyseModal(false)}></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {analyseLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p className="text-muted">Mistral AI analyse les amortissements...</p>
                    <small className="text-secondary">Analyse en cours, veuillez patienter</small>
                  </div>
                ) : analyseIA ? (
                  <div>
                    <div className={`alert ${analyseIA.est_coherent ? 'alert-success' : 'alert-warning'} mb-3`}>
                      <div className="d-flex align-items-center gap-2">
                        {analyseIA.est_coherent ? 
                          <FiCheckCircle size={20} className="text-success" /> : 
                          <FiAlertCircle size={20} className="text-warning" />
                        }
                        <strong>{analyseIA.resume}</strong>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-6">
                        <div className="card bg-light">
                          <div className="card-body text-center py-2">
                            <small className="text-muted">Taux d'amortissement moyen</small>
                            <div className="h4 mb-0 text-primary">{analyseIA.taux_moyen}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="card bg-light">
                          <div className="card-body text-center py-2">
                            <small className="text-muted">Cohérence globale</small>
                            <div className="h4 mb-0">
                              <span className={`badge ${analyseIA.est_coherent ? 'bg-success' : 'bg-warning'}`}>
                                {analyseIA.est_coherent ? 'Cohérent' : 'Attention'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {analyseIA.anomalies && analyseIA.anomalies.length > 0 && (
                      <div className="alert alert-danger mb-3">
                        <strong><FiAlertCircle className="me-2" />Anomalies détectées :</strong>
                        <ul className="mb-0 mt-2">
                          {analyseIA.anomalies.map((anomalie, idx) => (
                            <li key={idx} className="small">{anomalie}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analyseIA.recommandations && analyseIA.recommandations.length > 0 && (
                      <div className="alert alert-info mb-0">
                        <strong><FiTrendingUp className="me-2" />Recommandations :</strong>
                        <ul className="mb-0 mt-2">
                          {analyseIA.recommandations.map((reco, idx) => (
                            <li key={idx} className="small">{reco}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAnalyseModal(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal d'export */}
        <div className={`modal fade ${showExportModal ? 'show d-block' : ''}`} 
             style={{ display: showExportModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
             onClick={() => setShowExportModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FiDownload size={18} /> Exporter les amortissements
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowExportModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Choisissez le format d'export :</p>
                <div className="d-flex gap-3">
                  <button onClick={handleExportCSV} className="btn btn-outline-success flex-grow-1">
                    CSV (Excel)
                  </button>
                  <button onClick={() => window.print()} className="btn btn-outline-primary flex-grow-1">
                    PDF (Impression)
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FiTrendingUp size={32} /> Plan d'amortissement
            </h1>
            <p className="text-muted mb-0">
              {actifCourant.code} - {actifCourant.nom}
            </p>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <div className="btn-group" role="group">
              <button
                onClick={() => setViewType('combined')}
                className={`btn ${viewType === 'combined' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Vue combinée"
              >
                <FiTrendingUp size={16} /> Evolution
              </button>
              <button
                onClick={() => setViewType('annuities')}
                className={`btn ${viewType === 'annuities' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Annuités"
              >
                <FiBarChart2 size={16} /> Annuités
              </button>
              <button
                onClick={() => setViewType('cumul')}
                className={`btn ${viewType === 'cumul' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Cumul"
              >
                <FiPieChart size={16} /> Cumul
              </button>
            </div>
            <button 
              onClick={handleAnalyseIA} 
              disabled={analyseLoading}
              className="btn btn-outline-primary d-flex align-items-center gap-2"
              title="Analyser avec Mistral AI"
            >
              {analyseLoading ? 
                <div className="spinner-border spinner-border-sm" role="status" /> : 
                <GiArtificialIntelligence size={16} />
              }
              Analyse IA
            </button>
            <button onClick={() => setShowExportModal(true)} className="btn btn-success d-flex align-items-center gap-2">
              <FiDownload size={16} /> Exporter
            </button>
          </div>
        </div>

        {/* Informations de l'actif */}
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-3">
                <small className="text-muted d-block">Code</small>
                <span className="fw-semibold">{actifCourant.code}</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Nom</small>
                <span className="fw-semibold">{actifCourant.nom}</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Type</small>
                <span className="badge bg-info bg-opacity-10 text-info">{actifCourant.type}</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Mode</small>
                <span className="badge bg-primary bg-opacity-10 text-primary">
                  {actifCourant.mode_amortissement === 'lineaire' ? 'Lineaire' : 'Degressif'}
                </span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Cout acquisition</small>
                <span className="fw-bold text-success">{formatCurrency(actifCourant.cout_acquisition)}</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Duree</small>
                <span className="fw-semibold">{actifCourant.duree_utile_ans} ans</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Periode</small>
                <span className="fw-semibold">{yearRange.start} - {yearRange.end}</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Progression</small>
                <div className="progress" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ width: `${stats?.progression || 0}%` }}
                    aria-valuenow={stats?.progression} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  />
                </div>
                <small className="text-muted">{stats?.progression || 0}% amorti</small>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes statistiques */}
        {stats && (
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    <FiClock size={12} /> Duree
                  </small>
                  <div className="h5 mb-0 fw-bold text-primary">{stats.duree} ans</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    <FiDollarSign size={12} /> Annuite moyenne
                  </small>
                  <div className="h6 mb-0 text-success">{formatCurrency(stats.annuiteMoyenne)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    Total amorti
                  </small>
                  <div className="h6 mb-0 text-warning">{formatCurrency(stats.totalAmorti)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    Valeur residuelle
                  </small>
                  <div className="h6 mb-0 text-info">{formatCurrency(stats.restant)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Graphique principal */}
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          <div className="card-body p-4">
            <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
              <FiTrendingUp size={16} /> Evolution de la valeur nette
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              {viewType === 'combined' && (
                <ComposedChart data={getEvolutionData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="annee" />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v).replace('FC', '')} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="annuite" fill="#f59e0b" name="Annuité" />
                  <Line yAxisId="right" type="monotone" dataKey="valeurNette" stroke="#2563eb" name="Valeur nette" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="cumul" fill="#10b981" stroke="#10b981" name="Cumul" fillOpacity={0.3} />
                </ComposedChart>
              )}
              {viewType === 'annuities' && (
                <BarChart data={getEvolutionData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="annee" />
                  <YAxis tickFormatter={(v) => formatCurrency(v).replace('FC', '')} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="annuite" fill="#f59e0b" name="Annuité" radius={[4, 4, 0, 0]}>
                    {getEvolutionData().map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.annuite === stats?.annuiteMax ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              )}
              {viewType === 'cumul' && (
                <LineChart data={getEvolutionData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="annee" />
                  <YAxis tickFormatter={(v) => formatCurrency(v).replace('FC', '')} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="cumul" stroke="#10b981" name="Cumul" strokeWidth={3} />
                  <Line type="monotone" dataKey="valeurNette" stroke="#2563eb" name="Valeur nette" strokeWidth={3} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tableau des amortissements */}
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-body p-4">
            <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
              <FiCalendar size={16} /> Detail par exercice
            </h3>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Exercice</th>
                    <th className="text-end">Annuité</th>
                    <th className="text-end">Cumul</th>
                    <th className="text-end">Valeur nette</th>
                    <th>Taux d'amortissement</th>
                  </tr>
                </thead>
                <tbody>
                  {amortissements.map((am, index) => {
                    const pourcentage = ((am.cumul_amortissements / (actifCourant.cout_acquisition || 1)) * 100).toFixed(1);
                    return (
                      <tr key={index}>
                        <td className="fw-semibold">{am.exercice}</td>
                        <td className="text-end">{formatCurrency(am.annuite)}</td>
                        <td className="text-end">{formatCurrency(am.cumul_amortissements)}</td>
                        <td className="text-end">
                          <span className={`fw-bold ${am.valeur_nette > 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(am.valeur_nette)}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-primary" 
                                role="progressbar" 
                                style={{ width: `${pourcentage}%` }}
                                aria-valuenow={pourcentage} 
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              />
                            </div>
                            <small className="text-muted" style={{ minWidth: '45px' }}>{pourcentage}%</small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td>Total / Moyenne</td>
                    <td className="text-end">{formatCurrency(stats?.annuiteMoyenne)}</td>
                    <td className="text-end">{formatCurrency(stats?.totalAmorti)}</td>
                    <td className="text-end">{formatCurrency(stats?.restant)}</td>
                    <td>{stats?.progression}% amorti</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="alert alert-info mt-3 mb-0 py-2">
              <small className="d-flex align-items-center gap-2">
                <FiInfo size={14} />
                Les amortissements sont calcules selon la methode {actifCourant.mode_amortissement === 'lineaire' ? 'lineaire' : 'degressive'}.
                La valeur nette comptable evolue jusqu a la valeur residuelle.
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AmortissementsPage;
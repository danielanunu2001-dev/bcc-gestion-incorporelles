import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActifById, fetchAmortissements } from '../../store/actifSlice';
import usePermissions from '../../hooks/usePermissions';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import {
  FiDownload, FiCalendar, FiTrendingUp,
  FiPieChart, FiBarChart2, FiLock, FiArrowLeft,
  FiInfo, FiPercent, FiDollarSign, FiClock
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const AmortissementsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { can } = usePermissions();
  
  // Vérification des droits - Seuls admin, comptable et gestionnaire peuvent voir les amortissements
  const canViewAmortissements = can(['admin', 'comptable', 'gestionnaire']);
  
  const { actifCourant, amortissements, loading } = useSelector((state) => state.actifs);
  const [viewType, setViewType] = useState('combined');
  const [yearRange, setYearRange] = useState({ start: 0, end: 0 });
  const [showExportModal, setShowExportModal] = useState(false);

  // Redirection si l'utilisateur n'a pas les droits
  useEffect(() => {
    if (!canViewAmortissements && !loading) {
      setTimeout(() => navigate('/actifs'), 2000);
    }
  }, [canViewAmortissements, loading, navigate]);

  // Validation stricte de l'ID
  useEffect(() => {
    if (canViewAmortissements && id && id.length > 10 && id !== 'dashboard' && id !== 'undefined') {
      console.log('📊 Chargement des amortissements pour l\'actif:', id);
      dispatch(fetchActifById(id));
      dispatch(fetchAmortissements(id));
    } else if (id && id !== 'dashboard' && id !== 'undefined') {
      console.warn('⚠️ ID invalide pour les amortissements:', id);
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  // Données pour le graphique d'évolution
  const getEvolutionData = () => {
    return amortissements.map(am => ({
      annee: am.exercice,
      annuite: am.annuite,
      cumul: am.cumul_amortissements,
      valeurNette: am.valeur_nette,
      taux: ((am.cumul_amortissements / actifCourant?.cout_acquisition) * 100).toFixed(1)
    }));
  };

  // Statistiques
  const getStats = () => {
    if (amortissements.length === 0) return null;
    
    const dernier = amortissements[amortissements.length - 1];
    const premier = amortissements[0];
    
    return {
      duree: amortissements.length,
      annuiteMoyenne: amortissements.reduce((sum, a) => sum + a.annuite, 0) / amortissements.length,
      totalAmorti: dernier.cumul_amortissements,
      restant: dernier.valeur_nette,
      progression: ((dernier.cumul_amortissements / actifCourant?.cout_acquisition) * 100).toFixed(1),
      annuiteMax: Math.max(...amortissements.map(a => a.annuite)),
      annuiteMin: Math.min(...amortissements.map(a => a.annuite))
    };
  };

  const stats = getStats();

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Exercice', 'Annuité (CDF)', 'Cumul (CDF)', 'Valeur nette (CDF)', 'Taux (%)'];
    const rows = amortissements.map(am => [
      am.exercice,
      am.annuite,
      am.cumul_amortissements,
      am.valeur_nette,
      ((am.cumul_amortissements / actifCourant?.cout_acquisition) * 100).toFixed(2)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `amortissements_${actifCourant?.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  // Animation styles
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

  // Message d'accès refusé
  if (!canViewAmortissements && !loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#fef2f2' }}>
          <div className="text-center p-5 bg-white rounded-4 shadow-lg" style={{ maxWidth: '500px' }}>
            <div className="bg-danger bg-opacity-10 rounded-circle p-4 d-inline-flex mb-4">
              <FiLock size={64} className="text-danger" />
            </div>
            <h2 className="h3 fw-bold text-danger mb-3">Accès non autorisé</h2>
            <p className="text-muted mb-2">Vous n'avez pas les droits pour consulter les amortissements.</p>
            <p className="text-secondary small mb-4">Cette section est réservée aux administrateurs, comptables et gestionnaires.</p>
            <button onClick={() => navigate('/actifs')} className="btn btn-primary px-4 py-2">
              <FiArrowLeft className="me-2" /> Retour à la liste des actifs
            </button>
          </div>
        </div>
      </>
    );
  }

  // Redirection ou message si ID invalide
  if (!id || id === 'dashboard' || id.length < 10) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center p-5 bg-light rounded-4">
          <FiInfo size={48} className="text-warning mb-3" />
          <h2 className="h3 fw-bold mb-2">❌ ID d'actif invalide</h2>
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
                    📊 CSV (Excel)
                  </button>
                  <button onClick={() => window.print()} className="btn btn-outline-primary flex-grow-1">
                    🖨️ PDF (Impression)
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
                <FiTrendingUp size={16} /> Évolution
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
                  {actifCourant.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif'}
                </span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Coût acquisition</small>
                <span className="fw-bold text-success">{formatCurrency(actifCourant.cout_acquisition)}</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Durée</small>
                <span className="fw-semibold">{actifCourant.duree_utile_ans} ans</span>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Période</small>
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
                    <FiClock size={12} /> Durée
                  </small>
                  <div className="h5 mb-0 fw-bold text-primary">{stats.duree} ans</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    <FiDollarSign size={12} /> Annuité moyenne
                  </small>
                  <div className="h6 mb-0 text-success">{formatCurrency(stats.annuiteMoyenne)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    📊 Total amorti
                  </small>
                  <div className="h6 mb-0 text-warning">{formatCurrency(stats.totalAmorti)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center stat-card-hover">
                <div className="card-body py-2">
                  <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                    💰 Valeur résiduelle
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
              <FiTrendingUp size={16} /> Évolution de la valeur nette
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
              <FiCalendar size={16} /> Détail par exercice
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
                    const pourcentage = ((am.cumul_amortissements / actifCourant.cout_acquisition) * 100).toFixed(1);
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
            
            {/* Note d'information */}
            <div className="alert alert-info mt-3 mb-0 py-2">
              <small className="d-flex align-items-center gap-2">
                <FiInfo size={14} />
                Les amortissements sont calculés selon la méthode {actifCourant.mode_amortissement === 'lineaire' ? 'linéaire' : 'dégressive'}.
                La valeur nette comptable évolue jusqu'à la valeur résiduelle.
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AmortissementsPage;
// frontend/src/components/Reevaluations/ReevaluationsList.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import ReevaluationForm from './ReevaluationForm'; 
import usePermissions from '../../hooks/usePermissions';
import { 
  FiTrash2, FiCalendar, FiPlus, FiTrendingUp, FiTrendingDown, 
  FiInfo, FiFileText, FiPercent, FiClock, FiRefreshCw,
  FiChevronDown, FiChevronUp, FiEye, FiEyeOff
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import 'bootstrap/dist/css/bootstrap.min.css';

// ==================== FONCTIONS UTILITAIRES ====================
const formatCurrency = (value) => {
  if (!value && value !== 0) return '0 FC';
  try {
    const num = parseFloat(value) || 0;
    return Math.round(num).toLocaleString() + ' FC';
  } catch {
    return (value || 0).toLocaleString() + ' FC';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
};

const calculateVariation = (avant, apres) => {
  if (!avant || avant === 0) return 0;
  return ((apres - avant) / avant) * 100;
};

// ==================== STYLES ====================
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .fade-in { animation: fadeIn 0.3s ease-out; }
  .slide-in { animation: slideIn 0.3s ease-out; }
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  }
  .bg-soft-green { background: rgba(16,185,129,0.1); }
  .bg-soft-red { background: rgba(239,68,68,0.1); }
  .bg-soft-blue { background: rgba(59,130,246,0.1); }
  .text-soft-green { color: #10b981; }
  .text-soft-red { color: #ef4444; }
  .text-soft-blue { color: #3b82f6; }
`;

const ReevaluationsList = ({ actifId, canEdit: propCanEdit }) => {
  const { id } = useParams();
  const finalActifId = actifId || id;
  const { can } = usePermissions();
  
  const canEdit = propCanEdit !== undefined ? propCanEdit : can(['admin', 'comptable']);
  
  const [reevaluations, setReevaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  useEffect(() => {
    if (finalActifId) {
      fetchReevaluations();
    }
  }, [finalActifId]);

  const fetchReevaluations = async () => {
    if (!finalActifId) return;
    try {
      setLoading(true);
      const res = await api.get(`/actifs/${finalActifId}/reevaluations`);
      setReevaluations(res.data || []);
    } catch (err) {
      console.error('Erreur chargement réévaluations:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des réévaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reevaluationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réévaluation ? Cette action est irréversible.')) {
      return;
    }

    try {
      await api.delete(`/actifs/${finalActifId}/reevaluations/${reevaluationId}`);
      
      setMessage({ type: 'success', text: '✅ Réévaluation supprimée avec succès !' });
      fetchReevaluations();
      setTimeout(() => setMessage(null), 3000);
      
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la suppression' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const stats = {
    total: reevaluations.length,
    plusValueTotale: reevaluations.reduce((sum, r) => sum + (r.plus_value || 0), 0),
    moinsValueTotale: reevaluations.reduce((sum, r) => sum + (r.moins_value || 0), 0),
    derniereReevaluation: reevaluations[reevaluations.length - 1]
  };

  if (loading && reevaluations.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Chargement des réévaluations...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="fade-in">
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h4 className="h5 fw-semibold text-primary mb-1">
              Historique des réévaluations
              <span className="badge bg-primary bg-opacity-10 text-primary ms-2">{reevaluations.length}</span>
            </h4>
            <p className="text-muted small mb-0">Suivi des réévaluations et ajustements de valeur</p>
          </div>
          <div className="d-flex gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')} 
              className="btn btn-outline-secondary btn-sm"
            >
              {viewMode === 'cards' ? '📋 Vue liste' : '🃏 Vue cartes'}
            </button>
            {canEdit && (
              <button 
                onClick={() => setShowForm(!showForm)} 
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                <FiPlus size={16} /> {showForm ? 'Annuler' : 'Nouvelle réévaluation'}
              </button>
            )}
          </div>
        </div>

        {/* Cartes statistiques */}
        {reevaluations.length > 0 && (
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-sm text-center h-100">
                <div className="card-body py-3">
                  <small className="text-muted">Total réévaluations</small>
                  <div className="h3 mb-0 fw-bold text-primary">{stats.total}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-sm text-center h-100">
                <div className="card-body py-3">
                  <small className="text-muted">Plus-value totale</small>
                  <div className="h4 mb-0 fw-bold text-success">{formatCurrency(stats.plusValueTotale)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-sm text-center h-100">
                <div className="card-body py-3">
                  <small className="text-muted">Moins-value totale</small>
                  <div className="h4 mb-0 fw-bold text-danger">{formatCurrency(stats.moinsValueTotale)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-sm text-center h-100">
                <div className="card-body py-3">
                  <small className="text-muted">Dernière réévaluation</small>
                  <div className="fw-semibold">{stats.derniereReevaluation ? formatDate(stats.derniereReevaluation.date_reevaluation) : '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire d'ajout */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title mb-3 d-flex align-items-center gap-2">
                    <FiTrendingUp /> Nouvelle réévaluation
                  </h5>
                  <ReevaluationForm
                    actifId={finalActifId}
                    onSuccess={() => {
                      setShowForm(false);
                      fetchReevaluations();
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mb-3`}>
            <div className="d-flex align-items-center gap-2">
              {message.type === 'success' ? '✅' : '⚠️'}
              <span>{message.text}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {error && (
          <div className="alert alert-danger mb-3">
            <div className="d-flex align-items-center gap-2">
              <FiInfo size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Liste des réévaluations */}
        {reevaluations.length === 0 ? (
          <div className="text-center py-5 bg-light rounded-3">
            <FiTrendingUp size={48} className="text-muted mb-3 opacity-50" />
            <p className="text-muted mb-0">Aucune réévaluation enregistrée pour cet actif</p>
            {canEdit && (
              <button onClick={() => setShowForm(true)} className="btn btn-primary mt-3 d-inline-flex align-items-center gap-2">
                <FiPlus size={14} /> Première réévaluation
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="row g-3">
            {reevaluations.map((reeval, index) => {
              const variation = calculateVariation(reeval.valeur_avant, reeval.valeur_apres);
              const isExpanded = expandedId === reeval.id;
              
              return (
                <motion.div 
                  key={reeval.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="col-md-6 col-xl-4"
                >
                  <div className="card h-100 border-0 shadow-sm rounded-3 hover-lift fade-in">
                    <div className="card-body p-3">
                      {/* En-tête */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                            <FiCalendar size={14} className="text-primary" />
                          </div>
                          <span className="fw-semibold">{formatDate(reeval.date_reevaluation)}</span>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(reeval.id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Supprimer"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Valeurs */}
                      <div className="text-center mb-3">
                        <div className="d-flex justify-content-center align-items-center gap-3">
                          <div>
                            <small className="text-muted d-block">Avant</small>
                            <span className="text-danger text-decoration-line-through">
                              {formatCurrency(reeval.valeur_avant)}
                            </span>
                          </div>
                          <FiTrendingUp size={20} className="text-muted" />
                          <div>
                            <small className="text-muted d-block">Après</small>
                            <span className="fw-bold text-success">
                              {formatCurrency(reeval.valeur_apres)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Variation */}
                        <div className="mt-2">
                          <span className={`badge ${variation > 0 ? 'bg-success' : variation < 0 ? 'bg-danger' : 'bg-secondary'} bg-opacity-10 text-${variation > 0 ? 'success' : variation < 0 ? 'danger' : 'secondary'}`}>
                            {variation > 0 ? <FiTrendingUp size={10} /> : variation < 0 ? <FiTrendingDown size={10} /> : null}
                            {' '}{variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Plus-value / Moins-value */}
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="bg-soft-green rounded-2 p-2 text-center">
                            <small className="text-muted d-block">Plus-value</small>
                            <span className="fw-semibold text-success">
                              {reeval.plus_value > 0 ? formatCurrency(reeval.plus_value) : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="bg-soft-red rounded-2 p-2 text-center">
                            <small className="text-muted d-block">Moins-value</small>
                            <span className="fw-semibold text-danger">
                              {reeval.moins_value > 0 ? formatCurrency(reeval.moins_value) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bouton détails */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : reeval.id)}
                        className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                      >
                        {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        {isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
                      </button>

                      {/* Détails expansés */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-top mt-3 pt-3">
                              {(reeval.nouvelle_duree_ans || reeval.nouveau_taux) && (
                                <div className="mb-2">
                                  <small className="fw-semibold text-muted d-block mb-1">Nouveaux paramètres</small>
                                  <div className="d-flex flex-wrap gap-2">
                                    {reeval.nouvelle_duree_ans && (
                                      <span className="badge bg-info bg-opacity-10 text-info">
                                        <FiClock size={10} /> Durée: {reeval.nouvelle_duree_ans} ans
                                      </span>
                                    )}
                                    {reeval.nouveau_taux && (
                                      <span className="badge bg-warning bg-opacity-10 text-warning">
                                        <FiPercent size={10} /> Taux: {reeval.nouveau_taux}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {reeval.compte_reevaluation && (
                                <div className="mb-2">
                                  <small className="text-muted d-flex align-items-center gap-1">
                                    <FiFileText size={10} /> Compte comptable: {reeval.compte_reevaluation}
                                  </small>
                                </div>
                              )}
                              
                              {reeval.document_reference && (
                                <div className="mb-2">
                                  <small className="text-muted d-flex align-items-center gap-1">
                                    <FiFileText size={10} /> Référence: {reeval.document_reference}
                                  </small>
                                </div>
                              )}
                              
                              {reeval.commentaire && (
                                <div className="mt-2 p-2 bg-light rounded-2">
                                  <small className="fw-semibold text-muted d-block mb-1">Commentaire</small>
                                  <p className="small mb-0">{reeval.commentaire}</p>
                                </div>
                              )}
                              
                              <div className="mt-2 pt-1">
                                <small className="text-muted d-flex align-items-center gap-1">
                                  <FiInfo size={10} />
                                  Créé par: {reeval.createur?.full_name || 'Utilisateur inconnu'}
                                </small>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Valeur avant</th>
                    <th>Valeur après</th>
                    <th>Variation</th>
                    <th>Plus-value</th>
                    <th>Moins-value</th>
                    <th>Créé par</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {reevaluations.map((reeval) => {
                    const variation = calculateVariation(reeval.valeur_avant, reeval.valeur_apres);
                    return (
                      <tr key={reeval.id}>
                        <td>{formatDate(reeval.date_reevaluation)}</td>
                        <td className="text-danger">{formatCurrency(reeval.valeur_avant)}</td>
                        <td className="text-success fw-bold">{formatCurrency(reeval.valeur_apres)}</td>
                        <td>
                          <span className={`badge ${variation > 0 ? 'bg-success' : variation < 0 ? 'bg-danger' : 'bg-secondary'}`}>
                            {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-success">{reeval.plus_value > 0 ? formatCurrency(reeval.plus_value) : '-'}</td>
                        <td className="text-danger">{reeval.moins_value > 0 ? formatCurrency(reeval.moins_value) : '-'}</td>
                        <td><small>{reeval.createur?.full_name || '-'}</small></td>
                        {canEdit && (
                          <td>
                            <button
                              onClick={() => handleDelete(reeval.id)}
                              className="btn btn-sm btn-outline-danger"
                              title="Supprimer"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Graphique d'évolution */}
        {reevaluations.length > 1 && (
          <div className="card border-0 bg-light rounded-3 mt-4 fade-in">
            <div className="card-body">
              <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                <FiTrendingUp size={14} /> Évolution des valeurs réévaluées
              </h6>
              <div className="d-flex justify-content-between align-items-end" style={{ height: '120px' }}>
                {reevaluations.map((reeval, index) => {
                  const maxValue = Math.max(...reevaluations.map(r => r.valeur_apres));
                  const height = Math.max(20, (reeval.valeur_apres / maxValue) * 100);
                  return (
                    <div key={reeval.id} className="text-center flex-grow-1">
                      <div 
                        className={`rounded-2 mx-1 ${reeval.plus_value > 0 ? 'bg-success' : reeval.moins_value > 0 ? 'bg-danger' : 'bg-primary'}`}
                        style={{ 
                          height: `${height}px`, 
                          width: '100%',
                          transition: 'height 0.3s ease'
                        }}
                      />
                      <small className="text-muted" style={{ fontSize: '10px' }}>
                        {formatDate(reeval.date_reevaluation).slice(0, 5)}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReevaluationsList;
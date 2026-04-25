// frontend/src/components/Reevaluations/ReevaluationsList.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { FiTrash2, FiCalendar, FiPlus, FiTrendingUp, FiTrendingDown, FiInfo, FiFileText, FiPercent, FiClock } from 'react-icons/fi';
import ReevaluationForm from './ReevaluationForm';
import 'bootstrap/dist/css/bootstrap.min.css';

const ReevaluationsList = ({ actifId, canEdit }) => {
  const { id } = useParams();
  const finalActifId = actifId || id;
  const { can } = usePermissions();
  
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
    try {
      setLoading(true);
      const res = await api.get(`/actifs/${finalActifId}/reevaluations`);
      setReevaluations(res.data);
    } catch (err) {
      console.error('Erreur chargement réévaluations:', err);
      setError('Erreur lors du chargement des réévaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reevaluationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réévaluation ? Cette action est irréversible.')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/actifs/${finalActifId}/reevaluations/${reevaluationId}`);
      
      setMessage({ type: 'success', text: 'Réévaluation supprimée avec succès !' });
      fetchReevaluations();
      setTimeout(() => setMessage(null), 3000);
      
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la suppression' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `${(value || 0).toLocaleString()} FC`;
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

  // Statistiques
  const stats = {
    total: reevaluations.length,
    plusValueTotale: reevaluations.reduce((sum, r) => sum + (r.plus_value || 0), 0),
    moinsValueTotale: reevaluations.reduce((sum, r) => sum + (r.moins_value || 0), 0),
    derniereReevaluation: reevaluations[reevaluations.length - 1]
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
    .reevaluation-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .reevaluation-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .hover-lift {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .hover-lift:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `;

  // Affichage du chargement initial
  if (loading && reevaluations.length === 0) {
    return (
      <>
        <style>{animationStyles}</style>
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
      <style>{animationStyles}</style>
      <div className="reevaluation-fade-in">
        {/* En-tête avec statistiques */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h4 className="h5 fw-semibold text-primary mb-1">
              Liste des réévaluations
              <span className="badge bg-primary bg-opacity-10 text-primary ms-2">{reevaluations.length}</span>
            </h4>
            <p className="text-muted small mb-0">Historique des réévaluations de l'actif</p>
          </div>
          <div className="d-flex gap-2">
            {(can(['admin', 'comptable']) || canEdit) && (
              <button onClick={() => setShowForm(true)} className="btn btn-primary d-flex align-items-center gap-2">
                <FiPlus size={16} /> Nouvelle réévaluation
              </button>
            )}
          </div>
        </div>

        {/* Cartes statistiques */}
        {reevaluations.length > 0 && (
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Total réévaluations</small>
                  <div className="h5 mb-0">{stats.total}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Plus-value totale</small>
                  <div className="h5 mb-0 text-success">{formatCurrency(stats.plusValueTotale)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Moins-value totale</small>
                  <div className="h5 mb-0 text-danger">{formatCurrency(stats.moinsValueTotale)}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Dernière réévaluation</small>
                  <div className="h6 mb-0">{stats.derniereReevaluation ? formatDate(stats.derniereReevaluation.date_reevaluation) : '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire d'ajout */}
        {showForm && (
          <div className="mb-4 reevaluation-slide-in">
            <ReevaluationForm
              actifId={finalActifId}
              onSuccess={() => {
                setShowForm(false);
                fetchReevaluations();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Message de notification */}
        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mb-3`} role="alert">
            <div className="d-flex align-items-center gap-2">
              {message.type === 'success' ? '✅' : '⚠️'}
              <span>{message.text}</span>
            </div>
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="alert alert-danger mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiInfo size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Liste des réévaluations */}
        {reevaluations.length === 0 ? (
          <div className="text-center py-5 bg-light rounded-3">
            <FiTrendingUp size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">Aucune réévaluation enregistrée pour cet actif</p>
            {(can(['admin', 'comptable']) || canEdit) && (
              <button onClick={() => setShowForm(true)} className="btn btn-primary mt-3 d-inline-flex align-items-center gap-2">
                <FiPlus size={14} /> Première réévaluation
              </button>
            )}
          </div>
        ) : (
          <div className="row g-3">
            {reevaluations.map((reeval) => {
              const variation = calculateVariation(reeval.valeur_avant, reeval.valeur_apres);
              const isExpanded = expandedId === reeval.id;
              
              return (
                <div key={reeval.id} className="col-md-6 col-xl-4">
                  <div className="card h-100 shadow-sm border-0 rounded-3 hover-lift reevaluation-fade-in">
                    <div className="card-body">
                      {/* En-tête */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                            <FiCalendar size={14} className="text-primary" />
                          </div>
                          <span className="fw-semibold">{formatDate(reeval.date_reevaluation)}</span>
                        </div>
                        {(can(['admin', 'comptable']) || canEdit) && (
                          <button
                            onClick={() => handleDelete(reeval.id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Supprimer cette réévaluation"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Valeurs */}
                      <div className="text-center mb-3">
                        <div className="d-flex justify-content-center align-items-center gap-3">
                          <div>
                            <small className="text-muted d-block">Ancienne valeur</small>
                            <span className="text-danger text-decoration-line-through fw-semibold">
                              {formatCurrency(reeval.valeur_avant)}
                            </span>
                          </div>
                          <FiTrendingUp size={20} className="text-muted" />
                          <div>
                            <small className="text-muted d-block">Nouvelle valeur</small>
                            <span className="text-success fw-semibold">
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
                          <div className="bg-light rounded-2 p-2 text-center">
                            <small className="text-muted d-block">Plus-value</small>
                            <span className="fw-semibold text-success">
                              {reeval.plus_value > 0 ? formatCurrency(reeval.plus_value) : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="bg-light rounded-2 p-2 text-center">
                            <small className="text-muted d-block">Moins-value</small>
                            <span className="fw-semibold text-danger">
                              {reeval.moins_value > 0 ? formatCurrency(reeval.moins_value) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Détails supplémentaires (réductibles) */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : reeval.id)}
                        className="btn btn-sm btn-light w-100 mb-2 d-flex align-items-center justify-content-center gap-1"
                      >
                        {isExpanded ? '▼ Moins de détails' : '▶ Plus de détails'}
                      </button>

                      {isExpanded && (
                        <div className="reevaluation-slide-in">
                          <div className="border-top pt-2 mt-2">
                            {(reeval.nouvelle_duree_ans || reeval.nouveau_taux) && (
                              <div className="mb-2">
                                <small className="fw-semibold text-muted d-block mb-1">Nouveaux paramètres</small>
                                <div className="d-flex gap-2">
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
                                  <FiFileText size={10} /> Compte: {reeval.compte_reevaluation}
                                </small>
                              </div>
                            )}
                            
                            {reeval.document_reference && (
                              <div className="mb-2">
                                <small className="text-muted d-flex align-items-center gap-1">
                                  <FiFileText size={10} /> Réf: {reeval.document_reference}
                                </small>
                              </div>
                            )}
                            
                            {reeval.commentaire && (
                              <div className="mt-2 p-2 bg-light rounded-2">
                                <small className="fw-semibold text-muted d-block mb-1">Commentaire</small>
                                <p className="small mb-0">{reeval.commentaire}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-3 pt-2 border-top">
                        <small className="text-muted d-flex align-items-center gap-1">
                          <FiInfo size={10} />
                          Créé par {reeval.createurReevaluation?.full_name || 'Utilisateur inconnu'}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Évolution des valeurs (graphique simplifié) */}
        {reevaluations.length > 1 && (
          <div className="card border-0 bg-light rounded-3 mt-4">
            <div className="card-body">
              <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                <FiTrendingUp size={14} /> Évolution des valeurs
              </h6>
              <div className="d-flex justify-content-between align-items-end" style={{ height: '100px' }}>
                {reevaluations.map((reeval, index) => {
                  const maxValue = Math.max(...reevaluations.map(r => r.valeur_apres));
                  const height = (reeval.valeur_apres / maxValue) * 80;
                  return (
                    <div key={reeval.id} className="text-center flex-grow-1">
                      <div 
                        className="bg-primary rounded-2 mx-1" 
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
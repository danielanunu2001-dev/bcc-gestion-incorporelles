import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import MouvementForm from './MouvementForm';
import {
  FiClock, FiCheck, FiX, FiEye, FiEdit, FiTrash2,
  FiArrowUp, FiArrowDown, FiRefreshCw, FiTool,
  FiTruck, FiHome, FiArchive, FiDollarSign, FiUser,
  FiMapPin, FiBriefcase, FiInfo, FiCalendar, FiFileText
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const MouvementsList = ({ onRefresh }) => {
  const { id } = useParams();
  const { can } = usePermissions();
  
  // Vérification des droits
  const canCreateMouvement = can(['admin', 'comptable', 'gestionnaire']);
  const canEditMouvement = can(['admin', 'comptable', 'gestionnaire']);
  const canDeleteMouvement = can(['admin', 'comptable']);
  const canValidateMouvement = can(['admin', 'comptable', 'gestionnaire']);
  const canViewMouvements = can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire']);
  
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMouvement, setSelectedMouvement] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [expandedMouvement, setExpandedMouvement] = useState(null);

  useEffect(() => {
    if (canViewMouvements) {
      fetchMouvements();
    } else {
      setPermissionDenied(true);
      setLoading(false);
    }
  }, [id, canViewMouvements]);

  const fetchMouvements = async () => {
    try {
      setLoading(true);
      console.log('📦 Chargement des mouvements pour actif:', id);
      const res = await api.get(`/actifs/${id}/mouvements`);
      console.log('✅ Mouvements reçus:', res.data.length);
      setMouvements(res.data);
      setError('');
    } catch (err) {
      console.error('❌ Erreur chargement mouvements:', err);
      setError('Erreur lors du chargement des mouvements');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMouvement = () => {
    setSelectedMouvement(null);
    setShowForm(true);
  };

  const handleEditMouvement = (mouvement) => {
    setSelectedMouvement(mouvement);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedMouvement(null);
    fetchMouvements();
    if (onRefresh) onRefresh();
    setMessage({ type: 'success', text: 'Mouvement enregistré avec succès !' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleValider = async (mouvementId) => {
    if (!window.confirm('Confirmer la validation de ce mouvement ?')) return;
    
    try {
      setLoading(true);
      await api.put(`/actifs/${id}/mouvements/${mouvementId}/valider`);
      setMessage({ type: 'success', text: 'Mouvement validé avec succès !' });
      fetchMouvements();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('❌ Erreur validation:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la validation' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnuler = async (mouvementId) => {
    if (!window.confirm('Confirmer l\'annulation de ce mouvement ?')) return;
    
    try {
      setLoading(true);
      await api.put(`/actifs/${id}/mouvements/${mouvementId}/annuler`);
      setMessage({ type: 'success', text: 'Mouvement annulé avec succès !' });
      fetchMouvements();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('❌ Erreur annulation:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'annulation' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mouvementId) => {
    if (!window.confirm('Supprimer ce mouvement définitivement ?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/actifs/${id}/mouvements/${mouvementId}`);
      setMessage({ type: 'success', text: 'Mouvement supprimé !' });
      fetchMouvements();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la suppression' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'entree': return <FiArrowDown className="text-success" size={16} />;
      case 'transfert_interne': return <FiRefreshCw className="text-primary" size={16} />;
      case 'maintenance':
      case 'reparation': return <FiTool className="text-warning" size={16} />;
      case 'mise_hors_service':
      case 'reforme': return <FiArchive className="text-secondary" size={16} />;
      case 'cession': return <FiDollarSign className="text-purple" size={16} />;
      case 'don': return <FiUser className="text-pink" size={16} />;
      default: return <FiClock className="text-muted" size={16} />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'entree': 'Entrée',
      'transfert_interne': 'Transfert interne',
      'maintenance': 'Maintenance',
      'reparation': 'Réparation',
      'mise_hors_service': 'Mise hors service',
      'cession': 'Cession',
      'don': 'Don',
      'reforme': 'Réforme'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      'entree': 'success',
      'transfert_interne': 'primary',
      'maintenance': 'warning',
      'reparation': 'warning',
      'mise_hors_service': 'secondary',
      'cession': 'purple',
      'don': 'pink',
      'reforme': 'secondary'
    };
    return colors[type] || 'secondary';
  };

  const getStatutBadge = (statut) => {
    const config = {
      'brouillon': { variant: 'warning', label: 'Brouillon', icon: <FiClock size={10} /> },
      'valide': { variant: 'success', label: 'Validé', icon: <FiCheck size={10} /> },
      'annule': { variant: 'danger', label: 'Annulé', icon: <FiX size={10} /> }
    };
    const { variant, label, icon } = config[statut] || config.brouillon;
    return (
      <span className={`badge bg-${variant} bg-opacity-10 text-${variant} d-inline-flex align-items-center gap-1 px-2 py-1`}>
        {icon}
        <span className="small">{label}</span>
      </span>
    );
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0
      }).format(value);
    } catch {
      return `${value} FC`;
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
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
    .mouvement-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .mouvement-slide-in {
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

  // Message d'accès refusé pour le Juridique
  if (permissionDenied) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="text-center py-5 bg-danger bg-opacity-10 rounded-3">
          <FiClock size={48} className="text-danger mb-3" />
          <p className="text-danger fw-semibold">Accès non autorisé</p>
          <p className="text-muted small">Vous n'avez pas les droits pour consulter l'historique des mouvements.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div className="mouvement-fade-in">
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

        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="h5 fw-semibold text-primary mb-1">
              Historique des mouvements
              <span className="badge bg-primary bg-opacity-10 text-primary ms-2">{mouvements.length}</span>
            </h3>
            <p className="text-muted small mb-0">Traçabilité des mouvements de l'actif</p>
          </div>
          {canCreateMouvement && (
            <button
              onClick={handleAddMouvement}
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <FiArrowUp size={14} /> Nouveau mouvement
            </button>
          )}
        </div>

        {/* Formulaire d'ajout/modification */}
        {showForm && canCreateMouvement && (
          <div className="mb-4 mouvement-slide-in">
            <MouvementForm
              actifId={id}
              mouvement={selectedMouvement}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Liste des mouvements */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">Chargement des mouvements...</p>
          </div>
        ) : mouvements.length === 0 ? (
          <div className="text-center py-5 bg-light rounded-3">
            <FiClock size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">Aucun mouvement enregistré pour cet actif</p>
            {canCreateMouvement && (
              <button
                onClick={handleAddMouvement}
                className="btn btn-primary mt-3 d-inline-flex align-items-center gap-2"
              >
                <FiArrowUp size={14} /> Enregistrer un premier mouvement
              </button>
            )}
          </div>
        ) : (
          <div className="vstack gap-3">
            {mouvements.map((mouvement) => (
              <div
                key={mouvement.id}
                className="card border-0 shadow-sm rounded-3 hover-lift mouvement-fade-in"
              >
                <div className="card-body p-3">
                  {/* En-tête du mouvement */}
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-light p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                        {getTypeIcon(mouvement.type_mouvement)}
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <h6 className="mb-0 fw-semibold">
                            {getTypeLabel(mouvement.type_mouvement)}
                          </h6>
                          {getStatutBadge(mouvement.statut)}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <small className="text-muted d-flex align-items-center gap-1">
                            <FiCalendar size={10} /> {formatDate(mouvement.date_mouvement)}
                          </small>
                          {mouvement.createurMouvement && (
                            <small className="text-muted d-flex align-items-center gap-1">
                              <FiUser size={10} /> {mouvement.createurMouvement.full_name || 'Utilisateur'}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {canCreateMouvement && (
                      <div className="d-flex gap-2">
                        {mouvement.statut === 'brouillon' && canValidateMouvement && (
                          <>
                            <button
                              onClick={() => handleValider(mouvement.id)}
                              className="btn btn-sm btn-success d-flex align-items-center gap-1"
                              title="Valider"
                            >
                              <FiCheck size={12} /> Valider
                            </button>
                            <button
                              onClick={() => handleAnnuler(mouvement.id)}
                              className="btn btn-sm btn-warning d-flex align-items-center gap-1"
                              title="Annuler"
                            >
                              <FiX size={12} /> Annuler
                            </button>
                          </>
                        )}
                        
                        {canEditMouvement && mouvement.statut !== 'valide' && (
                          <button
                            onClick={() => handleEditMouvement(mouvement)}
                            className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                            title="Modifier"
                          >
                            <FiEdit size={12} /> Modifier
                          </button>
                        )}
                        
                        {canDeleteMouvement && mouvement.statut !== 'valide' && (
                          <button
                            onClick={() => handleDelete(mouvement.id)}
                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                            title="Supprimer"
                          >
                            <FiTrash2 size={12} /> Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {mouvement.description && (
                    <div className="mb-3 p-2 bg-light rounded-2">
                      <div className="d-flex align-items-start gap-2">
                        <FiFileText size={12} className="text-muted mt-1 flex-shrink-0" />
                        <p className="small text-muted mb-0">{mouvement.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Informations spécifiques en grille */}
                  <div className="row g-2 mt-2">
                    {/* Pour les entrées */}
                    {mouvement.type_mouvement === 'entree' && (
                      <>
                        {mouvement.provenance && (
                          <div className="col-md-6">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiMapPin size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Provenance</small>
                                <small className="fw-medium">{mouvement.provenance}</small>
                              </div>
                            </div>
                          </div>
                        )}
                        {mouvement.document_reference && (
                          <div className="col-md-6">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiFileText size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Document</small>
                                <small className="fw-medium">{mouvement.document_reference}</small>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Pour les transferts */}
                    {mouvement.type_mouvement === 'transfert_interne' && (
                      <>
                        {mouvement.localisation_source && (
                          <div className="col-md-6">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiArrowUp size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">De</small>
                                <small className="fw-medium">{mouvement.localisation_source}</small>
                              </div>
                            </div>
                          </div>
                        )}
                        {mouvement.localisation_destination && (
                          <div className="col-md-6">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiArrowDown size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Vers</small>
                                <small className="fw-medium">{mouvement.localisation_destination}</small>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Pour les maintenances */}
                    {(mouvement.type_mouvement === 'maintenance' || mouvement.type_mouvement === 'reparation') && (
                      <>
                        {mouvement.cout_maintenance > 0 && (
                          <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiDollarSign size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Coût</small>
                                <small className="fw-medium">{formatCurrency(mouvement.cout_maintenance)}</small>
                              </div>
                            </div>
                          </div>
                        )}
                        {mouvement.fournisseur_maintenance && (
                          <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiBriefcase size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Prestataire</small>
                                <small className="fw-medium">{mouvement.fournisseur_maintenance}</small>
                              </div>
                            </div>
                          </div>
                        )}
                        {mouvement.duree_maintenance && (
                          <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiClock size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Durée</small>
                                <small className="fw-medium">{mouvement.duree_maintenance} jours</small>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Pour les sorties/cessions */}
                    {(mouvement.type_mouvement === 'cession' || mouvement.type_mouvement === 'don') && (
                      <>
                        {mouvement.prix_cession > 0 && (
                          <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiDollarSign size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Prix</small>
                                <small className="fw-medium">{formatCurrency(mouvement.prix_cession)}</small>
                              </div>
                            </div>
                          </div>
                        )}
                        {mouvement.acquereur && (
                          <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiUser size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Acquéreur</small>
                                <small className="fw-medium">{mouvement.acquereur}</small>
                              </div>
                            </div>
                          </div>
                        )}
                        {mouvement.plus_moins_value !== 0 && (
                          <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                              <FiTrendingUp size={12} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">Plus/moins-value</small>
                                <small className={`fw-medium ${mouvement.plus_moins_value > 0 ? 'text-success' : 'text-danger'}`}>
                                  {formatCurrency(mouvement.plus_moins_value)}
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Mise à jour de l'état/localisation/affectation */}
                    {(mouvement.nouvel_etat || mouvement.nouvelle_localisation || mouvement.nouvelle_affectation) && (
                      <div className="col-12">
                        <div className="d-flex flex-wrap gap-2 p-2 bg-light rounded-2">
                          {mouvement.nouvel_etat && (
                            <span className="badge bg-info bg-opacity-10 text-info">
                              État: {mouvement.nouvel_etat}
                            </span>
                          )}
                          {mouvement.nouvelle_localisation && (
                            <span className="badge bg-primary bg-opacity-10 text-primary">
                              Localisation: {mouvement.nouvelle_localisation}
                            </span>
                          )}
                          {mouvement.nouvelle_affectation && (
                            <span className="badge bg-success bg-opacity-10 text-success">
                              Affectation: {mouvement.nouvelle_affectation}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info de validation */}
                  {mouvement.statut === 'valide' && mouvement.date_validation && (
                    <div className="mt-3 pt-2 border-top d-flex justify-content-end">
                      <small className="text-muted d-flex align-items-center gap-1">
                        <FiCheck size={10} className="text-success" />
                        Validé le {formatDateTime(mouvement.date_validation)}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Statistiques des mouvements */}
        {mouvements.length > 0 && (
          <div className="row g-3 mt-3">
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Total mouvements</small>
                  <div className="h5 mb-0">{mouvements.length}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Validés</small>
                  <div className="h5 mb-0 text-success">{mouvements.filter(m => m.statut === 'valide').length}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Brouillons</small>
                  <div className="h5 mb-0 text-warning">{mouvements.filter(m => m.statut === 'brouillon').length}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-light text-center">
                <div className="card-body py-2">
                  <small className="text-muted">Annulés</small>
                  <div className="h5 mb-0 text-danger">{mouvements.filter(m => m.statut === 'annule').length}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MouvementsList;
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import MouvementForm from './MouvementForm';
import {
  FiClock, FiCheck, FiX, FiEye, FiEdit, FiTrash2,
  FiArrowUp, FiArrowDown, FiRefreshCw, FiTool,
  FiTruck, FiHome, FiArchive, FiDollarSign, FiUser,
  FiMapPin, FiBriefcase
} from 'react-icons/fi';

const MouvementsList = ({ onRefresh }) => {
  const { id } = useParams();
  const { can } = usePermissions();
  
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMouvement, setSelectedMouvement] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchMouvements();
  }, [id]);

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

  // ✅ FONCTION DE VALIDATION CORRIGÉE (PUT, pas POST)
  const handleValider = async (mouvementId) => {
  if (!window.confirm('Confirmer la validation de ce mouvement ?')) return;
  
  try {
    setLoading(true);
    console.log('✅ Validation du mouvement:', mouvementId);
    console.log('📡 URL:', `/actifs/${id}/mouvements/${mouvementId}/valider`);
    
    // Utiliser PUT (pas POST)
    const response = await api.put(`/actifs/${id}/mouvements/${mouvementId}/valider`);
    
    console.log('✅ Réponse:', response.data);
    setMessage({ type: 'success', text: 'Mouvement validé avec succès !' });
    fetchMouvements(); // Recharger la liste
    setTimeout(() => setMessage(null), 3000);
    
  } catch (err) {
    console.error('❌ Erreur validation:', err);
    console.error('❌ Status:', err.response?.status);
    console.error('❌ Data:', err.response?.data);
    setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la validation' });
    setTimeout(() => setMessage(null), 3000);
  } finally {
    setLoading(false);
  }
};

  // ✅ FONCTION D'ANNULATION CORRIGÉE
 const handleAnnuler = async (mouvementId) => {
  if (!window.confirm('Confirmer l\'annulation de ce mouvement ?')) return;
  
  try {
    setLoading(true);
    console.log('❌ Annulation du mouvement:', mouvementId);
    console.log('📡 URL:', `/actifs/${id}/mouvements/${mouvementId}/annuler`);
    
    const response = await api.put(`/actifs/${id}/mouvements/${mouvementId}/annuler`);
    
    console.log('✅ Réponse:', response.data);
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
      case 'entree': return <FiArrowDown color="#10b981" />;
      case 'transfert_interne': return <FiRefreshCw color="#3b82f6" />;
      case 'maintenance':
      case 'reparation': return <FiTool color="#f59e0b" />;
      case 'mise_hors_service':
      case 'reforme': return <FiArchive color='var(--text-secondary)' />;
      case 'cession': return <FiDollarSign color="#8b5cf6" />;
      case 'don': return <FiUser color="#ec4899" />;
      default: return <FiClock />;
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

  // ✅ STATUT CORRIGÉ (brouillon, valide, annule)
  const getStatutBadge = (statut) => {
    const colors = {
      'brouillon': { bg: '#fef3c7', color: '#92400e', label: 'Brouillon' },
      'valide': { bg: '#d1fae5', color: '#065f46', label: 'Validé' },
      'annule': { bg: '#fee2e2', color: '#991b1b', label: 'Annulé' }
    };
    const style = colors[statut] || colors.brouillon;
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.label}
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
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <div>
      {/* Message de notification */}
      {message && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#b91c1c'
        }}>
          {message.text}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* En-tête avec bouton d'ajout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          Historique des mouvements ({mouvements.length})
        </h3>
        {can(['admin', 'comptable']) && (
          <button
            onClick={handleAddMouvement}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'var(--bg-card)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            + Nouveau mouvement
          </button>
        )}
      </div>

      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <MouvementForm
          actifId={id}
          mouvement={selectedMouvement}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Liste des mouvements */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={styles.spinner}></div>
          <p>Chargement des mouvements...</p>
        </div>
      ) : mouvements.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '4px',
          color: '#666'
        }}>
          <p>Aucun mouvement enregistré pour cet actif</p>
          {can(['admin', 'comptable']) && (
            <button
              onClick={handleAddMouvement}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'var(--bg-card)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + Enregistrer un premier mouvement
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mouvements.map((mouvement) => (
            <div
              key={mouvement.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid #e5e7eb',
                transition: 'box-shadow 0.2s'
              }}
            >
              {/* En-tête du mouvement */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    {getTypeIcon(mouvement.type_mouvement)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '600' }}>
                        {getTypeLabel(mouvement.type_mouvement)}
                      </span>
                      {getStatutBadge(mouvement.statut)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {formatDate(mouvement.date_mouvement)}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* ✅ Boutons pour mouvements en brouillon */}
                  {mouvement.statut === 'brouillon' && can(['admin', 'comptable']) && (
                    <>
                      <button
                        onClick={() => handleValider(mouvement.id)}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: '#10b981',
                          color: 'var(--bg-card)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Valider"
                      >
                        <FiCheck size={14} />
                      </button>
                      <button
                        onClick={() => handleAnnuler(mouvement.id)}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: '#f59e0b',
                          color: 'var(--bg-card)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Annuler"
                      >
                        <FiX size={14} />
                      </button>
                    </>
                  )}
                  
                  {/* Boutons d'édition/suppression pour tous */}
                  {can(['admin', 'comptable']) && mouvement.statut !== 'valide' && (
                    <>
                      <button
                        onClick={() => handleEditMouvement(mouvement)}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: '#f59e0b',
                          color: 'var(--bg-card)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Modifier"
                      >
                        <FiEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(mouvement.id)}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: '#ef4444',
                          color: 'var(--bg-card)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Supprimer"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {mouvement.description && (
                <div style={{
                  fontSize: '0.875rem',
                  color: '#4b5563',
                  marginBottom: '0.5rem',
                  paddingLeft: '2.75rem'
                }}>
                  {mouvement.description}
                </div>
              )}

              {/* Informations spécifiques selon le type */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.5rem',
                marginTop: '0.5rem',
                paddingLeft: '2.75rem',
                fontSize: '0.875rem'
              }}>
                {/* Pour les entrées */}
                {mouvement.type_mouvement === 'entree' && (
                  <>
                    {mouvement.provenance && (
                      <div>
                        <span style={{ color: '#666' }}>Provenance:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.provenance}</span>
                      </div>
                    )}
                    {mouvement.document_reference && (
                      <div>
                        <span style={{ color: '#666' }}>Document:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.document_reference}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Pour les transferts */}
                {mouvement.type_mouvement === 'transfert_interne' && (
                  <>
                    {mouvement.localisation_source && (
                      <div>
                        <span style={{ color: '#666' }}>De:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.localisation_source}</span>
                      </div>
                    )}
                    {mouvement.localisation_destination && (
                      <div>
                        <span style={{ color: '#666' }}>Vers:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.localisation_destination}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Pour les maintenances */}
                {(mouvement.type_mouvement === 'maintenance' || mouvement.type_mouvement === 'reparation') && (
                  <>
                    {mouvement.cout_maintenance > 0 && (
                      <div>
                        <span style={{ color: '#666' }}>Coût:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{formatCurrency(mouvement.cout_maintenance)}</span>
                      </div>
                    )}
                    {mouvement.fournisseur_maintenance && (
                      <div>
                        <span style={{ color: '#666' }}>Prestataire:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.fournisseur_maintenance}</span>
                      </div>
                    )}
                    {mouvement.duree_maintenance && (
                      <div>
                        <span style={{ color: '#666' }}>Durée:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.duree_maintenance} jours</span>
                      </div>
                    )}
                  </>
                )}

                {/* Pour les sorties/cessions */}
                {(mouvement.type_mouvement === 'cession' || mouvement.type_mouvement === 'don') && (
                  <>
                    {mouvement.prix_cession > 0 && (
                      <div>
                        <span style={{ color: '#666' }}>Prix:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{formatCurrency(mouvement.prix_cession)}</span>
                      </div>
                    )}
                    {mouvement.acquereur && (
                      <div>
                        <span style={{ color: '#666' }}>Acquéreur:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.acquereur}</span>
                      </div>
                    )}
                    {mouvement.plus_moins_value !== 0 && (
                      <div>
                        <span style={{ color: '#666' }}>Plus/moins-value:</span>{' '}
                        <span style={{
                          fontWeight: '500',
                          color: mouvement.plus_moins_value > 0 ? '#10b981' : '#ef4444'
                        }}>
                          {formatCurrency(mouvement.plus_moins_value)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Mise à jour de l'état/localisation/affectation */}
                {(mouvement.nouvel_etat || mouvement.nouvelle_localisation || mouvement.nouvelle_affectation) && (
                  <>
                    {mouvement.nouvel_etat && (
                      <div>
                        <span style={{ color: '#666' }}>Nouvel état:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.nouvel_etat}</span>
                      </div>
                    )}
                    {mouvement.nouvelle_localisation && (
                      <div>
                        <span style={{ color: '#666' }}>Nouvelle localisation:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.nouvelle_localisation}</span>
                      </div>
                    )}
                    {mouvement.nouvelle_affectation && (
                      <div>
                        <span style={{ color: '#666' }}>Nouvelle affectation:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{mouvement.nouvelle_affectation}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Info de validation */}
              {mouvement.statut === 'valide' && mouvement.date_validation && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#666',
                  marginTop: '0.5rem',
                  paddingLeft: '2.75rem',
                  borderTop: '1px dashed #e5e7eb',
                  paddingTop: '0.5rem'
                }}>
                  Validé le {formatDate(mouvement.date_validation)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  }
};

// Ajout des keyframes pour le spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default MouvementsList;
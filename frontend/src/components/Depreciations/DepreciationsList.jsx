import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { FiTrash2, FiAlertCircle, FiRefreshCw, FiCalendar, FiPlus, FiDollarSign, FiInfo } from 'react-icons/fi';
import DepreciationForm from './DepreciationForm';

const DepreciationsList = ({ actifId, canEdit = false }) => {
  const { id } = useParams();
  const finalActifId = actifId || id;
  const { can } = usePermissions();
  
  const [depreciations, setDepreciations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (finalActifId) {
      fetchDepreciations();
    }
  }, [finalActifId]);

  const fetchDepreciations = async () => {
    try {
      setLoading(true);
      console.log('📦 Chargement dépréciations pour actif:', finalActifId);
      const response = await api.get(`/actifs/${finalActifId}/depreciations`);
      setDepreciations(response.data);
      setError('');
    } catch (err) {
      console.error('❌ Erreur chargement dépréciations:', err);
      setError('Erreur lors du chargement des dépréciations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (depreciationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dépréciation ? Cette action est irréversible.')) {
      return;
    }

    try {
      setDeletingId(depreciationId);
      console.log('🗑️ Suppression dépréciation:', { actifId: finalActifId, depreciationId });
      
      const response = await api.delete(`/actifs/${finalActifId}/depreciations/${depreciationId}`);
      console.log('✅ Réponse suppression:', response.data);
      
      setMessage({ type: 'success', text: 'Dépréciation supprimée avec succès !' });
      await fetchDepreciations();
      setTimeout(() => setMessage(null), 3000);
      
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      console.error('Détails:', err.response?.data);
      
      let errorMessage = 'Erreur lors de la suppression';
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Requête invalide';
      } else if (err.response?.status === 404) {
        errorMessage = 'Dépréciation non trouvée';
      }
      
      setMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setDeletingId(null);
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

  // Affichage du chargement initial
  if (loading && depreciations.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des dépréciations...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête avec bouton d'ajout */}
      <div style={styles.header}>
        <h4 style={styles.title}>Liste des dépréciations</h4>
        {(can(['admin', 'comptable']) || canEdit) && (
          <button onClick={() => setShowForm(true)} style={styles.addButton}>
            <FiPlus /> Nouvelle dépréciation
          </button>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <DepreciationForm
          actifId={finalActifId}
          onSuccess={() => {
            setShowForm(false);
            fetchDepreciations();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Message de notification */}
      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#b91c1c'
        }}>
          {message.text}
        </div>
      )}

      {/* Message d'erreur global */}
      {error && !message && (
        <div style={styles.errorMessage}>
          <FiAlertCircle size={16} style={{ marginRight: '0.5rem' }} />
          {error}
          <button onClick={fetchDepreciations} style={styles.retryButton}>
            <FiRefreshCw /> Réessayer
          </button>
        </div>
      )}

      {/* Liste des dépréciations */}
      {depreciations.length === 0 ? (
        <div style={styles.noData}>
          <p>Aucune dépréciation enregistrée pour cet actif</p>
        </div>
      ) : (
        <div style={styles.list}>
          {depreciations.map((dep) => (
            <div key={dep.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.dateBadge}>
                  <FiCalendar size={14} />
                  <span>{formatDate(dep.date_test)}</span>
                </div>
                <div style={styles.valueInfo}>
                  <div style={styles.comptableValue}>
                    <span style={styles.label}>Valeur comptable:</span>
                    <span>{formatCurrency(dep.valeur_comptable)}</span>
                  </div>
                  <div style={styles.recouvrableValue}>
                    <span style={styles.label}>Valeur recouvrable:</span>
                    <span>{formatCurrency(dep.valeur_recouvrable)}</span>
                  </div>
                </div>
                <div style={{
                  ...styles.provisionBadge,
                  backgroundColor: dep.provision > 0 ? '#ef444420' : '#dcfce7',
                  color: dep.provision > 0 ? '#ef4444' : '#10b981'
                }}>
                  <FiDollarSign size={14} />
                  <span>Provision: {formatCurrency(dep.provision)}</span>
                </div>
                <div style={styles.actions}>
                  {(can(['admin', 'comptable']) || canEdit) && (
                    <button
                      onClick={() => handleDelete(dep.id)}
                      disabled={deletingId === dep.id}
                      style={styles.deleteButton}
                      title="Supprimer cette dépréciation"
                    >
                      {deletingId === dep.id ? (
                        <div style={styles.smallSpinner}></div>
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {dep.commentaire && (
                <div style={styles.commentaire}>
                  <span style={styles.commentaireLabel}>
                    <FiInfo size={12} /> Commentaire :
                  </span>
                  <p>{dep.commentaire}</p>
                </div>
              )}

              <div style={styles.cardFooter}>
                <span style={styles.createdBy}>
                  Créé le {formatDate(dep.created_at)} par {dep.createurDepreciation?.full_name || 'Utilisateur inconnu'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    color: 'var(--text-primary)'
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#1e40af'
    }
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '2rem'
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  smallSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid #ffffff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  retryButton: {
    marginLeft: 'auto',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#b91c1c',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem'
  },
  noData: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    color: '#666'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '1rem',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px'
  },
  valueInfo: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    flexWrap: 'wrap'
  },
  comptableValue: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center'
  },
  recouvrableValue: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center'
  },
  label: {
    color: 'var(--text-secondary)'
  },
  provisionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem'
  },
  deleteButton: {
    padding: '0.5rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#dc2626'
    },
    ':disabled': {
      opacity: 0.7,
      cursor: 'not-allowed'
    }
  },
  commentaire: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    color: '#4b5563'
  },
  commentaireLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem'
  },
  cardFooter: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e5e7eb',
    fontSize: '0.75rem',
    color: '#9ca3af',
    textAlign: 'right'
  },
  createdBy: {
    display: 'block'
  }
};

// Animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default DepreciationsList;
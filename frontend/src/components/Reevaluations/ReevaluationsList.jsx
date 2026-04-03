// frontend/src/components/Reevaluations/ReevaluationsList.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { FiTrash2, FiCalendar, FiPlus } from 'react-icons/fi';
import ReevaluationForm from './ReevaluationForm';

const ReevaluationsList = ({ actifId, canEdit }) => {
  const { id } = useParams();
  const finalActifId = actifId || id;
  const { can } = usePermissions();
  
  const [reevaluations, setReevaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);

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

  // ✅ FONCTION DE SUPPRESSION CORRIGÉE (avec bonne orthographe)
  const handleDelete = async (reevaluationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réévaluation ? Cette action est irréversible.')) {
      return;
    }

    try {
      setLoading(true);
      // ✅ URL CORRECTE : "reevaluations" (avec deux 'e')
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
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  };

  // Affichage du chargement initial
  if (loading && reevaluations.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des réévaluations...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête avec bouton d'ajout */}
      <div style={styles.header}>
        <h4 style={styles.title}>Liste des réévaluations</h4>
        {(can(['admin', 'comptable']) || canEdit) && (
          <button onClick={() => setShowForm(true)} style={styles.addButton}>
            <FiPlus /> Nouvelle réévaluation
          </button>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <ReevaluationForm
          actifId={finalActifId}
          onSuccess={() => {
            setShowForm(false);
            fetchReevaluations();
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

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Liste des réévaluations */}
      {reevaluations.length === 0 ? (
        <div style={styles.noData}>
          <p>Aucune réévaluation enregistrée pour cet actif</p>
        </div>
      ) : (
        <div style={styles.list}>
          {reevaluations.map((reeval) => (
            <div key={reeval.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.dateBadge}>
                  <FiCalendar size={14} />
                  <span>{formatDate(reeval.date_reevaluation)}</span>
                </div>
                <div style={styles.valueChange}>
                  <span style={styles.oldValue}>
                    {formatCurrency(reeval.valeur_avant)}
                  </span>
                  <span style={styles.arrow}>→</span>
                  <span style={styles.newValue}>
                    {formatCurrency(reeval.valeur_apres)}
                  </span>
                </div>
                <div style={styles.actions}>
                  {/* ✅ BOUTON DE SUPPRESSION */}
                  {(can(['admin', 'comptable']) || canEdit) && (
                    <button
                      onClick={() => handleDelete(reeval.id)}
                      style={styles.deleteButton}
                      title="Supprimer cette réévaluation"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Plus-value :</span>
                  <span style={styles.detailValue}>
                    {reeval.plus_value > 0 ? formatCurrency(reeval.plus_value) : '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Moins-value :</span>
                  <span style={styles.detailValue}>
                    {reeval.moins_value > 0 ? formatCurrency(reeval.moins_value) : '-'}
                  </span>
                </div>
                {reeval.nouvelle_duree_ans && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Nouvelle durée :</span>
                    <span style={styles.detailValue}>{reeval.nouvelle_duree_ans} ans</span>
                  </div>
                )}
                {reeval.nouveau_taux && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Nouveau taux :</span>
                    <span style={styles.detailValue}>{reeval.nouveau_taux}%</span>
                  </div>
                )}
                {reeval.compte_reevaluation && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Compte de réévaluation :</span>
                    <span style={styles.detailValue}>{reeval.compte_reevaluation}</span>
                  </div>
                )}
                {reeval.document_reference && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Référence :</span>
                    <span style={styles.detailValue}>{reeval.document_reference}</span>
                  </div>
                )}
              </div>

              {reeval.commentaire && (
                <div style={styles.commentaire}>
                  <span style={styles.commentaireLabel}>Commentaire :</span>
                  <p>{reeval.commentaire}</p>
                </div>
              )}

              <div style={styles.cardFooter}>
                <span style={styles.createdBy}>
                  Créé par {reeval.createurReevaluation?.full_name || 'Utilisateur inconnu'}
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
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
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
  valueChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600'
  },
  oldValue: {
    color: '#ef4444',
    textDecoration: 'line-through'
  },
  arrow: {
    color: 'var(--text-secondary)'
  },
  newValue: {
    color: '#10b981'
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
    }
  },
  cardBody: {
    marginBottom: '0.75rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.25rem 0',
    fontSize: '0.875rem',
    borderBottom: '1px dashed #e5e7eb'
  },
  detailLabel: {
    color: 'var(--text-secondary)'
  },
  detailValue: {
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  commentaire: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    color: '#4b5563'
  },
  commentaireLabel: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginRight: '0.5rem'
  },
  cardFooter: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e5e7eb',
    fontSize: '0.75rem',
    color: '#9ca3af',
    textAlign: 'right'
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

export default ReevaluationsList;
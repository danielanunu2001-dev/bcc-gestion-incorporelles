// frontend/src/components/Depreciations/DepreciationsList.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTrash2, FiAlertCircle, FiRefreshCw, FiCalendar, 
  FiPlus, FiDollarSign, FiInfo, FiChevronDown, FiChevronUp,
  FiTrendingDown, FiBarChart2
} from 'react-icons/fi';
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
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  useEffect(() => {
    if (finalActifId) {
      fetchDepreciations();
    }
  }, [finalActifId]);

  const fetchDepreciations = async () => {
    try {
      setLoading(true);
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
      await api.delete(`/actifs/${finalActifId}/depreciations/${depreciationId}`);
      setMessage({ type: 'success', text: 'Dépréciation supprimée avec succès !' });
      await fetchDepreciations();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      let errorMessage = 'Erreur lors de la suppression';
      if (err.response?.status === 404) {
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

  const calculateProvisionRate = (comptable, recouvrable) => {
    if (!comptable || comptable === 0) return 0;
    const provision = comptable - recouvrable;
    return (provision / comptable) * 100;
  };

  const totalProvision = depreciations.reduce((sum, d) => sum + (d.valeur_comptable - d.valeur_recouvrable), 0);
  const lastValeurRecouvrable = depreciations[depreciations.length - 1]?.valeur_recouvrable || 0;

  if (loading && depreciations.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement des dépréciations...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      {/* En-tête avec bouton d'ajout */}
      <div style={styles.header}>
        <div>
          <h4 style={styles.title}>
            <FiTrendingDown style={styles.titleIcon} /> Liste des dépréciations
          </h4>
          <p style={styles.subtitle}>
            {depreciations.length} dépréciation{depreciations.length > 1 ? 's' : ''} enregistrée{depreciations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div style={styles.headerActions}>
          {/* Vue toggle */}
          <div style={styles.viewToggle}>
            <button 
              style={{...styles.toggleButton, ...(viewMode === 'cards' ? styles.toggleActive : styles.toggleInactive)}}
              onClick={() => setViewMode('cards')}
            >
              Cartes
            </button>
            <button 
              style={{...styles.toggleButton, ...(viewMode === 'table' ? styles.toggleActive : styles.toggleInactive)}}
              onClick={() => setViewMode('table')}
            >
              Tableau
            </button>
          </div>
          {(can(['admin', 'comptable']) || canEdit) && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)} 
              style={styles.addButton}
            >
              <FiPlus size={16} /> Nouvelle dépréciation
            </motion.button>
          )}
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.formContainer}
          >
            <DepreciationForm
              actifId={finalActifId}
              onSuccess={() => {
                setShowForm(false);
                fetchDepreciations();
              }}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message de notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{...styles.messageAlert, ...(message.type === 'success' ? styles.successAlert : styles.errorAlert)}}
          >
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} style={styles.messageClose}>
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message d'erreur global */}
      {error && !message && (
        <div style={styles.globalError}>
          <div style={styles.globalErrorContent}>
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={fetchDepreciations} style={styles.retryButton}>
            <FiRefreshCw size={12} /> Réessayer
          </button>
        </div>
      )}

      {/* Liste des dépréciations */}
      {depreciations.length === 0 ? (
        <div style={styles.emptyState}>
          <FiDollarSign size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8' }}>Aucune dépréciation enregistrée pour cet actif</p>
          {(can(['admin', 'comptable']) || canEdit) && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)} 
              style={styles.emptyAddButton}
            >
              Créer la première dépréciation
            </motion.button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        // Vue Cartes futuriste
        <div style={styles.cardsGrid}>
          {depreciations.map((dep, index) => {
            const isExpanded = expandedId === dep.id;
            const provision = dep.valeur_comptable - dep.valeur_recouvrable;
            const provisionRate = calculateProvisionRate(dep.valeur_comptable, dep.valeur_recouvrable);
            
            return (
              <motion.div
                key={dep.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={styles.card}
              >
                <div style={styles.cardBody}>
                  {/* En-tête de la carte */}
                  <div style={styles.cardHeader}>
                    <div style={styles.cardDate}>
                      <div style={styles.dateIcon}>
                        <FiCalendar size={14} />
                      </div>
                      <span style={styles.dateText}>{formatDate(dep.date_test)}</span>
                    </div>
                    <div style={styles.cardActions}>
                      {(can(['admin', 'comptable']) || canEdit) && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(dep.id)}
                          disabled={deletingId === dep.id}
                          style={styles.deleteButton}
                          title="Supprimer cette dépréciation"
                        >
                          {deletingId === dep.id ? (
                            <div style={styles.smallSpinner}></div>
                          ) : (
                            <FiTrash2 size={14} />
                          )}
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setExpandedId(isExpanded ? null : dep.id)}
                        style={styles.expandButton}
                      >
                        {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                      </motion.button>
                    </div>
                  </div>

                  {/* Valeurs */}
                  <div style={styles.valuesContainer}>
                    <div style={styles.valueRow}>
                      <span style={styles.valueLabel}>Valeur comptable</span>
                      <span style={styles.valueAmount}>{formatCurrency(dep.valeur_comptable)}</span>
                    </div>
                    <div style={styles.valueRow}>
                      <span style={styles.valueLabel}>Valeur recouvrable</span>
                      <span style={{...styles.valueAmount, color: '#00fff7'}}>{formatCurrency(dep.valeur_recouvrable)}</span>
                    </div>
                    <div style={styles.valueRow}>
                      <span style={styles.valueLabel}>Provision</span>
                      <span style={{...styles.valueAmount, color: provision > 0 ? '#f87171' : '#34d399'}}>
                        {formatCurrency(provision)}
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression de la dépréciation */}
                  {provision > 0 && (
                    <div style={styles.progressContainer}>
                      <div style={styles.progressHeader}>
                        <span style={styles.progressLabel}>Taux de dépréciation</span>
                        <span style={styles.progressValue}>{provisionRate.toFixed(1)}%</span>
                      </div>
                      <div style={styles.progressTrack}>
                        <div style={{...styles.progressFill, width: `${provisionRate}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Commentaire (si présent et non développé) */}
                  {dep.commentaire && !isExpanded && (
                    <div style={styles.commentPreview}>
                      <FiInfo size={12} />
                      {dep.commentaire.length > 80 ? `${dep.commentaire.substring(0, 80)}...` : dep.commentaire}
                    </div>
                  )}

                  {/* Détails étendus */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={styles.expandedContent}
                      >
                        {dep.commentaire && (
                          <div style={styles.commentSection}>
                            <span style={styles.commentLabel}>Commentaire :</span>
                            <p style={styles.commentText}>{dep.commentaire}</p>
                          </div>
                        )}
                        <div style={styles.metaInfo}>
                          <div style={styles.metaRow}>
                            <span>Créé le :</span>
                            <span>{formatDate(dep.created_at)}</span>
                          </div>
                          <div style={styles.metaRow}>
                            <span>Par :</span>
                            <span>{dep.createurDepreciation?.full_name || 'Utilisateur inconnu'}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        // Vue Tableau futuriste
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date du test</th>
                <th>Valeur comptable</th>
                <th>Valeur recouvrable</th>
                <th>Provision</th>
                <th>Taux</th>
                <th>Commentaire</th>
                {(can(['admin', 'comptable']) || canEdit) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {depreciations.map((dep) => {
                const provision = dep.valeur_comptable - dep.valeur_recouvrable;
                const provisionRate = calculateProvisionRate(dep.valeur_comptable, dep.valeur_recouvrable);
                
                return (
                  <tr key={dep.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{formatDate(dep.date_test)}</td>
                    <td style={{...styles.tableCell, fontWeight: '600'}}>{formatCurrency(dep.valeur_comptable)}</td>
                    <td style={{...styles.tableCell, color: '#00fff7', fontWeight: '600'}}>{formatCurrency(dep.valeur_recouvrable)}</td>
                    <td style={{...styles.tableCell, color: provision > 0 ? '#f87171' : '#34d399'}}>
                      {formatCurrency(provision)}
                    </td>
                    <td style={styles.tableCell}>
                      {provision > 0 && (
                        <span style={styles.tableBadge}>{provisionRate.toFixed(1)}%</span>
                      )}
                    </td>
                    <td style={styles.tableCell}>
                      {dep.commentaire && (
                        <span style={styles.tableComment} title={dep.commentaire}>
                          {dep.commentaire.length > 30 ? `${dep.commentaire.substring(0, 30)}...` : dep.commentaire}
                        </span>
                      )}
                    </td>
                    {(can(['admin', 'comptable']) || canEdit) && (
                      <td style={styles.tableCell}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(dep.id)}
                          disabled={deletingId === dep.id}
                          style={styles.tableDeleteButton}
                          title="Supprimer cette dépréciation"
                        >
                          {deletingId === dep.id ? (
                            <div style={styles.smallSpinner}></div>
                          ) : (
                            <FiTrash2 size={14} />
                          )}
                        </motion.button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={styles.tableFooter}>
                  Total: {depreciations.length} dépréciation{depreciations.length > 1 ? 's' : ''}
                </td>
                {(can(['admin', 'comptable']) || canEdit) && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Résumé statistique */}
      {depreciations.length > 0 && (
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <FiBarChart2 size={20} style={{ color: '#f87171' }} />
            <div>
              <span style={styles.statLabel}>Provision totale</span>
              <strong style={{...styles.statValue, color: '#f87171'}}>{formatCurrency(totalProvision)}</strong>
            </div>
          </div>
          <div style={styles.statCard}>
            <FiDollarSign size={20} style={{ color: '#00fff7' }} />
            <div>
              <span style={styles.statLabel}>Valeur nette comptable</span>
              <strong style={{...styles.statValue, color: '#00fff7'}}>{formatCurrency(lastValeurRecouvrable)}</strong>
            </div>
          </div>
          <div style={styles.statCard}>
            <FiCalendar size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <span style={styles.statLabel}>Dernier test</span>
              <strong style={styles.statValue}>
                {depreciations.length > 0 ? formatDate(depreciations[depreciations.length - 1].date_test) : 'N/A'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ============ STYLES FUTURISTES ============
const styles = {
  container: {
    padding: '1.5rem',
    backgroundColor: 'transparent'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(0,255,247,0.2)',
    borderTop: '3px solid #00fff7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  loadingText: {
    color: '#94a3b8'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  titleIcon: {
    color: '#00fff7'
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.25rem'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  viewToggle: {
    display: 'flex',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  toggleButton: {
    padding: '0.4rem 1rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleActive: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none'
  },
  toggleInactive: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  formContainer: {
    marginBottom: '1.5rem',
    overflow: 'hidden'
  },
  messageAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    fontSize: '0.875rem'
  },
  successAlert: {
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    color: '#34d399'
  },
  errorAlert: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171'
  },
  messageClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  globalError: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    marginBottom: '1rem'
  },
  globalErrorContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#f87171',
    fontSize: '0.875rem'
  },
  retryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.75rem',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  emptyAddButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '8px',
    color: '#00fff7',
    cursor: 'pointer'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  card: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  cardBody: {
    padding: '1rem'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  cardDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  dateIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(0,255,247,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#00fff7'
  },
  dateText: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#e2e8f0'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  deleteButton: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  expandButton: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.2)',
    color: '#00fff7',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  valuesContainer: {
    marginBottom: '1rem'
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(0,255,247,0.08)'
  },
  valueLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8'
  },
  valueAmount: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  progressContainer: {
    marginBottom: '1rem'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
    fontSize: '0.7rem'
  },
  progressLabel: {
    color: '#94a3b8'
  },
  progressValue: {
    color: '#f87171'
  },
  progressTrack: {
    height: '4px',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ef4444, #f87171)',
    borderRadius: '2px'
  },
  commentPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.7rem',
    color: '#64748b',
    marginTop: '0.5rem',
    padding: '0.5rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px'
  },
  expandedContent: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(0,255,247,0.15)'
  },
  commentSection: {
    marginBottom: '1rem'
  },
  commentLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '0.25rem'
  },
  commentText: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    margin: 0
  },
  metaInfo: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem'
  },
  tableWrapper: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)',
    overflowX: 'auto',
    marginBottom: '1.5rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    color: '#e2e8f0'
  },
  tableRow: {
    borderBottom: '1px solid rgba(0,255,247,0.08)'
  },
  tableCell: {
    padding: '0.75rem 1rem',
    fontSize: '0.8rem'
  },
  tableBadge: {
    padding: '0.25rem 0.5rem',
    background: 'rgba(239,68,68,0.15)',
    borderRadius: '20px',
    fontSize: '0.7rem',
    color: '#f87171'
  },
  tableComment: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  tableDeleteButton: {
    padding: '0.25rem 0.5rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px',
    color: '#f87171',
    cursor: 'pointer'
  },
  tableFooter: {
    padding: '0.75rem 1rem',
    fontSize: '0.7rem',
    color: '#64748b',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  statLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#94a3b8'
  },
  statValue: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  smallSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(239,68,68,0.2)',
    borderTop: '2px solid #f87171',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default DepreciationsList;
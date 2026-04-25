// frontend/src/components/Contrats/ContratsList.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit, FiTrash2, FiX, FiSave, FiCalendar, 
  FiUser, FiFileText, FiDollarSign, FiRefreshCw,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const ContratsList = ({ actifId, canEdit, onContractUpdate }) => {
  const [contrats, setContrats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedContract, setExpandedContract] = useState(null);
  const [formData, setFormData] = useState({
    numero_contrat: '',
    fournisseur: '',
    date_debut: '',
    date_fin: '',
    montant: '',
    description: '',
    type_contrat: 'maintenance'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchContrats();
  }, [actifId]);

  const fetchContrats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/actifs/${actifId}/contrats`);
      setContrats(res.data);
    } catch (err) {
      console.error('Erreur chargement contrats:', err);
      setError('Impossible de charger les contrats');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.numero_contrat.trim()) errors.numero_contrat = 'Numéro de contrat requis';
    if (!formData.fournisseur.trim()) errors.fournisseur = 'Fournisseur requis';
    if (!formData.date_debut) errors.date_debut = 'Date de début requise';
    if (!formData.date_fin) errors.date_fin = 'Date de fin requise';
    if (formData.date_debut && formData.date_fin && new Date(formData.date_fin) < new Date(formData.date_debut)) {
      errors.date_fin = 'La date de fin doit être postérieure à la date de début';
    }
    if (formData.montant && isNaN(parseFloat(formData.montant))) errors.montant = 'Montant invalide';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/actifs/contrats/${editing.id}`, formData);
      } else {
        await api.post(`/actifs/${actifId}/contrats`, formData);
      }
      resetForm();
      fetchContrats();
      if (onContractUpdate) onContractUpdate();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce contrat ? Cette action est irréversible.')) {
      setLoading(true);
      try {
        await api.delete(`/actifs/contrats/${id}`);
        fetchContrats();
        if (onContractUpdate) onContractUpdate();
      } catch (err) {
        console.error('Erreur suppression:', err);
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormData({
      numero_contrat: '',
      fournisseur: '',
      date_debut: '',
      date_fin: '',
      montant: '',
      description: '',
      type_contrat: 'maintenance'
    });
    setFormErrors({});
  };

  const handleEdit = (contrat) => {
    setEditing(contrat);
    setFormData({
      numero_contrat: contrat.numero_contrat,
      fournisseur: contrat.fournisseur,
      date_debut: contrat.date_debut.split('T')[0],
      date_fin: contrat.date_fin.split('T')[0],
      montant: contrat.montant,
      description: contrat.description || '',
      type_contrat: contrat.type_contrat || 'maintenance'
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    setExpandedContract(expandedContract === id ? null : id);
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  };

  const getStatusBadge = (dateDebut, dateFin) => {
    const now = new Date();
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    
    if (now < debut) {
      return { text: 'À venir', variant: 'secondary', icon: '⏳' };
    } else if (now > fin) {
      return { text: 'Expiré', variant: 'danger', icon: '❌' };
    } else {
      const daysLeft = Math.ceil((fin - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 30) {
        return { text: `Expire bientôt (${daysLeft}j)`, variant: 'warning', icon: '⚠️' };
      }
      return { text: 'Actif', variant: 'success', icon: '✅' };
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      maintenance: 'Maintenance',
      location: 'Location',
      service: 'Service'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      maintenance: '#10b981',
      location: '#f59e0b',
      service: '#8b5cf6'
    };
    return colors[type] || '#64748b';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      {/* En-tête */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>
            <FiFileText style={styles.titleIcon} /> Contrats associés
          </h3>
          <p style={styles.subtitle}>
            {contrats.length} contrat{contrats.length > 1 ? 's' : ''} trouvé{contrats.length > 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)} 
            style={styles.addButton}
          >
            <FiPlus size={18} /> Ajouter un contrat
          </motion.button>
        )}
      </div>

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.errorAlert}
          >
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose}>
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chargement */}
      {loading && !showForm && (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Chargement des contrats...</p>
        </div>
      )}

      {/* Liste des contrats - Version Glassmorphism */}
      {!loading && contrats.length === 0 && !showForm && (
        <div style={styles.emptyState}>
          <FiFileText size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8' }}>Aucun contrat associé</p>
          {canEdit && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)} 
              style={styles.emptyAddButton}
            >
              Ajouter un contrat
            </motion.button>
          )}
        </div>
      )}

      {/* Liste des contrats */}
      {!loading && contrats.length > 0 && !showForm && (
        <div style={styles.contractsList}>
          {contrats.map((contrat, index) => {
            const status = getStatusBadge(contrat.date_debut, contrat.date_fin);
            const isExpanded = expandedContract === contrat.id;
            
            return (
              <motion.div
                key={contrat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={styles.contractCard}
              >
                {/* En-tête de la carte */}
                <div 
                  style={styles.contractHeader}
                  onClick={() => toggleExpand(contrat.id)}
                >
                  <div style={styles.contractHeaderLeft}>
                    <div style={styles.contractIcon}>
                      <FiFileText size={20} />
                    </div>
                    <div>
                      <div style={styles.contractNumero}>{contrat.numero_contrat}</div>
                      <div style={styles.contractFournisseur}>{contrat.fournisseur}</div>
                    </div>
                  </div>
                  <div style={styles.contractHeaderRight}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: status.variant === 'success' ? 'rgba(16,185,129,0.15)' :
                                     status.variant === 'warning' ? 'rgba(245,158,11,0.15)' :
                                     status.variant === 'danger' ? 'rgba(239,68,68,0.15)' :
                                     'rgba(100,116,139,0.15)',
                      color: status.variant === 'success' ? '#34d399' :
                             status.variant === 'warning' ? '#fbbf24' :
                             status.variant === 'danger' ? '#f87171' :
                             '#94a3b8'
                    }}>
                      {status.icon} {status.text}
                    </span>
                    {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                  </div>
                </div>

                {/* Détails expansés */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={styles.contractDetails}
                    >
                      <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Type</span>
                          <span style={{
                            ...styles.typeBadge,
                            backgroundColor: `${getTypeColor(contrat.type_contrat)}20`,
                            color: getTypeColor(contrat.type_contrat)
                          }}>
                            {getTypeLabel(contrat.type_contrat)}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Période</span>
                          <span style={styles.detailValue}>
                            {new Date(contrat.date_debut).toLocaleDateString()} → {new Date(contrat.date_fin).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Montant</span>
                          <span style={styles.montantValue}>{formatMontant(contrat.montant)}</span>
                        </div>
                        {contrat.description && (
                          <div style={styles.detailItemFull}>
                            <span style={styles.detailLabel}>Description</span>
                            <span style={styles.detailValue}>{contrat.description}</span>
                          </div>
                        )}
                      </div>
                      
                      {canEdit && (
                        <div style={styles.actionsContainer}>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEdit(contrat)} 
                            style={styles.editButton}
                          >
                            <FiEdit size={14} /> Modifier
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDelete(contrat.id)} 
                            style={styles.deleteButton}
                          >
                            <FiTrash2 size={14} /> Supprimer
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Formulaire futuriste */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -20 }}
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h5 style={styles.modalTitle}>
                  {editing ? 'Modifier le contrat' : 'Nouveau contrat'}
                </h5>
                <button onClick={resetForm} style={styles.modalClose}>
                  <FiX size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} style={styles.modalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <FiFileText size={14} /> Numéro de contrat *
                  </label>
                  <input
                    type="text"
                    style={{
                      ...styles.formInput,
                      borderColor: formErrors.numero_contrat ? '#ef4444' : 'rgba(0,255,247,0.2)'
                    }}
                    value={formData.numero_contrat}
                    onChange={(e) => setFormData({...formData, numero_contrat: e.target.value})}
                    placeholder="ex: CT-2024-001"
                  />
                  {formErrors.numero_contrat && <div style={styles.formError}>{formErrors.numero_contrat}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <FiUser size={14} /> Fournisseur *
                  </label>
                  <input
                    type="text"
                    style={{
                      ...styles.formInput,
                      borderColor: formErrors.fournisseur ? '#ef4444' : 'rgba(0,255,247,0.2)'
                    }}
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                    placeholder="Nom du fournisseur"
                  />
                  {formErrors.fournisseur && <div style={styles.formError}>{formErrors.fournisseur}</div>}
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <FiCalendar size={14} /> Date début *
                    </label>
                    <input
                      type="date"
                      style={{
                        ...styles.formInput,
                        borderColor: formErrors.date_debut ? '#ef4444' : 'rgba(0,255,247,0.2)'
                      }}
                      value={formData.date_debut}
                      onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
                    />
                    {formErrors.date_debut && <div style={styles.formError}>{formErrors.date_debut}</div>}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <FiCalendar size={14} /> Date fin *
                    </label>
                    <input
                      type="date"
                      style={{
                        ...styles.formInput,
                        borderColor: formErrors.date_fin ? '#ef4444' : 'rgba(0,255,247,0.2)'
                      }}
                      value={formData.date_fin}
                      onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                    />
                    {formErrors.date_fin && <div style={styles.formError}>{formErrors.date_fin}</div>}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <FiDollarSign size={14} /> Montant (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    style={{
                      ...styles.formInput,
                      borderColor: formErrors.montant ? '#ef4444' : 'rgba(0,255,247,0.2)'
                    }}
                    value={formData.montant}
                    onChange={(e) => setFormData({...formData, montant: e.target.value})}
                    placeholder="0.00"
                  />
                  {formErrors.montant && <div style={styles.formError}>{formErrors.montant}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Type de contrat</label>
                  <select
                    style={styles.formSelect}
                    value={formData.type_contrat}
                    onChange={(e) => setFormData({...formData, type_contrat: e.target.value})}
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="location">Location</option>
                    <option value="service">Service</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Description</label>
                  <textarea
                    style={styles.formTextarea}
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description du contrat..."
                  />
                </div>

                <div style={styles.modalActions}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    style={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div style={styles.smallSpinner}></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <FiSave size={16} /> {editing ? 'Mettre à jour' : 'Ajouter'}
                      </>
                    )}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button" 
                    onClick={resetForm} 
                    style={styles.cancelButton}
                  >
                    Annuler
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

// ============ STYLES FUTURISTES ============
const styles = {
  container: {
    backgroundColor: 'transparent',
    borderRadius: '16px',
    padding: '1.5rem'
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
    fontSize: '1.25rem',
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
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '0.25rem'
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
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    color: '#f87171',
    fontSize: '0.875rem'
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
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
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
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
  contractsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  contractCard: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,255,247,0.15)',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  contractHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  contractHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  contractIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#00fff7'
  },
  contractNumero: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  contractFournisseur: {
    fontSize: '0.7rem',
    color: '#94a3b8'
  },
  contractHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  contractDetails: {
    padding: '1rem',
    borderTop: '1px solid rgba(0,255,247,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  detailItemFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    gridColumn: '1 / -1'
  },
  detailLabel: {
    fontSize: '0.7rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailValue: {
    fontSize: '0.85rem',
    color: '#cbd5e1'
  },
  typeBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500',
    display: 'inline-block',
    width: 'fit-content'
  },
  montantValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#00fff7'
  },
  actionsContainer: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(0,255,247,0.08)'
  },
  editButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: '8px',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  deleteButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },
  modalContent: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.2)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid rgba(0,255,247,0.15)'
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0,
    color: '#e2e8f0'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  modalForm: {
    padding: '1.5rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '0'
  },
  formLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: '0.5rem'
  },
  formInput: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s'
  },
  formSelect: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  formTextarea: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  formError: {
    fontSize: '0.7rem',
    color: '#f87171',
    marginTop: '0.25rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  submitButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  cancelButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default ContratsList;
// frontend/src/components/Depreciations/DepreciationForm.jsx
import React, { useState } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSave, FiX, FiCalendar, FiDollarSign, FiMessageSquare, FiAlertCircle, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';

const DepreciationForm = ({ actifId, onSuccess, onCancel, actifInfo }) => {
  const [formData, setFormData] = useState({
    date_test: new Date().toISOString().split('T')[0],
    valeur_recouvrable: '',
    commentaire: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!formData.date_test) {
      errors.date_test = 'La date du test est requise';
    }
    if (!formData.valeur_recouvrable) {
      errors.valeur_recouvrable = 'La valeur recouvrable est requise';
    } else if (parseFloat(formData.valeur_recouvrable) < 0) {
      errors.valeur_recouvrable = 'La valeur recouvrable doit être positive';
    } else if (actifInfo && parseFloat(formData.valeur_recouvrable) > actifInfo.valeur_nette_comptable) {
      errors.valeur_recouvrable = `La valeur recouvrable ne peut pas dépasser la valeur nette comptable (${formatCurrency(actifInfo.valeur_nette_comptable)})`;
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    try {
      await api.post(`/actifs/${actifId}/depreciations`, formData);
      onSuccess();
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de l\'enregistrement de la dépréciation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 CDF';
    return new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(value);
  };

  const getDifference = () => {
    if (!formData.valeur_recouvrable || !actifInfo?.valeur_nette_comptable) return null;
    const diff = actifInfo.valeur_nette_comptable - parseFloat(formData.valeur_recouvrable);
    return { value: diff, isNegative: diff < 0 };
  };

  const difference = getDifference();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      <div style={styles.card}>
        {/* En-tête */}
        <div style={styles.cardHeader}>
          <div style={styles.headerIcon}>
            <FiDollarSign size={20} />
          </div>
          <div>
            <h4 style={styles.cardTitle}>Nouvelle dépréciation</h4>
            {actifInfo && (
              <p style={styles.cardSubtitle}>
                Actif: {actifInfo.nom || `ID: ${actifId}`}
              </p>
            )}
          </div>
        </div>
        
        <div style={styles.cardBody}>
          {/* Message d'erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={styles.errorAlert}
              >
                <FiAlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} style={styles.errorClose}>
                  <FiX size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Informations sur l'actif */}
          {actifInfo && (
            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Valeur d'acquisition</span>
                  <strong style={styles.infoValue}>{formatCurrency(actifInfo.valeur_acquisition)}</strong>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Valeur nette comptable</span>
                  <strong style={{...styles.infoValue, color: '#f59e0b'}}>{formatCurrency(actifInfo.valeur_nette_comptable)}</strong>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <FiCalendar size={14} /> Date du test <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="date_test"
                  style={{
                    ...styles.formInput,
                    borderColor: validationErrors.date_test ? '#ef4444' : 'rgba(0,255,247,0.2)'
                  }}
                  value={formData.date_test}
                  onChange={handleChange}
                  required
                />
                {validationErrors.date_test && (
                  <div style={styles.formError}>{validationErrors.date_test}</div>
                )}
                <small style={styles.formHint}>
                  Date à laquelle le test de dépréciation est effectué
                </small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <FiDollarSign size={14} /> Valeur recouvrable (CDF) <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputGroup}>
                  <span style={styles.inputGroupText}>FC</span>
                  <input
                    type="number"
                    name="valeur_recouvrable"
                    style={{
                      ...styles.formInput,
                      ...styles.inputGroupInput,
                      borderColor: validationErrors.valeur_recouvrable ? '#ef4444' : 'rgba(0,255,247,0.2)'
                    }}
                    value={formData.valeur_recouvrable}
                    onChange={handleChange}
                    required
                    min="0"
                    step="1000"
                    placeholder="0"
                  />
                </div>
                {validationErrors.valeur_recouvrable && (
                  <div style={styles.formError}>{validationErrors.valeur_recouvrable}</div>
                )}
                <small style={styles.formHint}>
                  La valeur la plus élevée entre la juste valeur et la valeur d'usage
                </small>

                {/* Aperçu de la différence */}
                {difference && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      ...styles.diffPreview,
                      backgroundColor: difference.isNegative ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      borderColor: difference.isNegative ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'
                    }}
                  >
                    <span style={styles.diffLabel}>Différence estimée:</span>
                    <span style={{
                      ...styles.diffValue,
                      color: difference.isNegative ? '#f87171' : '#34d399'
                    }}>
                      {formatCurrency(Math.abs(difference.value))}
                      {difference.isNegative ? ' (Dépassement)' : ' (Perte potentielle)'}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                <FiMessageSquare size={14} /> Commentaire
              </label>
              <textarea
                name="commentaire"
                style={styles.formTextarea}
                value={formData.commentaire}
                onChange={handleChange}
                rows="3"
                placeholder="Justification de la dépréciation, méthode de calcul utilisée..."
              />
              <small style={styles.formHint}>
                Optionnel - Décrivez les raisons de la dépréciation
              </small>
            </div>

            <div style={styles.divider} />

            <div style={styles.formActions}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onCancel}
                style={styles.cancelButton}
                disabled={loading}
              >
                <FiX size={16} /> Annuler
              </motion.button>
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
                    <FiSave size={16} /> Enregistrer la dépréciation
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* Informations supplémentaires */}
      <div style={styles.infoAlert}>
        <div style={styles.infoAlertIcon}>
          <FiAlertCircle size={16} />
        </div>
        <div>
          <h6 style={styles.infoAlertTitle}>À propos de la dépréciation</h6>
          <p style={styles.infoAlertText}>
            Une dépréciation est constatée lorsque la valeur nette comptable d'un actif dépasse sa valeur recouvrable.
            Cette opération est généralement effectuée annuellement ou lorsqu'il existe un indice de perte de valeur.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

// Version alternative avec assistant étape par étape (Wizard)
export const DepreciationFormWizard = ({ actifId, onSuccess, onCancel, actifInfo }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date_test: new Date().toISOString().split('T')[0],
    valeur_recouvrable: '',
    commentaire: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1 && !formData.date_test) {
      setError('Veuillez sélectionner une date');
      return;
    }
    if (step === 2 && !formData.valeur_recouvrable) {
      setError('Veuillez saisir la valeur recouvrable');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/actifs/${actifId}/depreciations`, formData);
      onSuccess();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 CDF';
    return new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(value);
  };

  const getStepProgress = () => ((step - 1) / 2) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={styles.wizardContainer}
    >
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Nouvelle dépréciation (Assistant)</h4>
        </div>
        
        <div style={styles.cardBody}>
          {/* Progress bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressSteps}>
              <span style={{...styles.progressStep, color: step >= 1 ? '#00fff7' : '#64748b'}}>Étape 1: Date</span>
              <span style={{...styles.progressStep, color: step >= 2 ? '#00fff7' : '#64748b'}}>Étape 2: Valeur</span>
              <span style={{...styles.progressStep, color: step >= 3 ? '#00fff7' : '#64748b'}}>Étape 3: Confirmation</span>
            </div>
            <div style={styles.progressBarTrack}>
              <div style={{...styles.progressBarFill, width: `${getStepProgress()}%` }} />
            </div>
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
                <FiAlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Étape 1: Date */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={styles.stepContent}
            >
              <label style={styles.formLabel}>
                <FiCalendar size={14} /> Date du test de dépréciation
              </label>
              <input
                type="date"
                style={styles.wizardInput}
                value={formData.date_test}
                onChange={(e) => setFormData({...formData, date_test: e.target.value})}
              />
              <small style={styles.formHint}>
                La date à laquelle le test de dépréciation est effectué
              </small>
            </motion.div>
          )}

          {/* Étape 2: Valeur recouvrable */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={styles.stepContent}
            >
              <label style={styles.formLabel}>
                <FiDollarSign size={14} /> Valeur recouvrable (CDF)
              </label>
              <div style={styles.inputGroup}>
                <span style={styles.inputGroupText}>FC</span>
                <input
                  type="number"
                  style={{...styles.formInput, ...styles.inputGroupInput}}
                  value={formData.valeur_recouvrable}
                  onChange={(e) => setFormData({...formData, valeur_recouvrable: e.target.value})}
                  placeholder="Saisir la valeur recouvrable"
                  min="0"
                  step="1000"
                />
              </div>
              
              {actifInfo && (
                <div style={styles.summaryCard}>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Valeur nette comptable</span>
                    <span style={styles.summaryValue}>{formatCurrency(actifInfo.valeur_nette_comptable)}</span>
                  </div>
                  {formData.valeur_recouvrable && (
                    <div style={styles.summaryRow}>
                      <span style={styles.summaryLabel}>Différence</span>
                      <span style={{
                        ...styles.summaryValue,
                        color: parseFloat(formData.valeur_recouvrable) < actifInfo.valeur_nette_comptable ? '#f87171' : '#34d399'
                      }}>
                        {formatCurrency(actifInfo.valeur_nette_comptable - parseFloat(formData.valeur_recouvrable))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Étape 3: Confirmation */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={styles.stepContent}
            >
              <h6 style={styles.confirmTitle}>Récapitulatif</h6>
              <div style={styles.confirmCard}>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Date du test:</span>
                  <span style={styles.confirmValue}>{new Date(formData.date_test).toLocaleDateString()}</span>
                </div>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Valeur recouvrable:</span>
                  <span style={{...styles.confirmValue, color: '#00fff7'}}>{formatCurrency(formData.valeur_recouvrable)}</span>
                </div>
                {formData.commentaire && (
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmLabel}>Commentaire:</span>
                    <span style={styles.confirmValue}>{formData.commentaire}</span>
                  </div>
                )}
              </div>

              <label style={styles.formLabel}>
                <FiMessageSquare size={14} /> Commentaire (optionnel)
              </label>
              <textarea
                style={styles.formTextarea}
                rows="3"
                value={formData.commentaire}
                onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
                placeholder="Ajoutez des informations supplémentaires..."
              />
            </motion.div>
          )}

          <div style={styles.divider} />

          <div style={styles.wizardActions}>
            <div>
              {step > 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handlePrevious}
                  style={styles.wizardPrevButton}
                  disabled={loading}
                >
                  <FiArrowLeft size={14} /> Précédent
                </motion.button>
              )}
            </div>
            <div style={styles.wizardRightActions}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onCancel}
                style={styles.wizardCancelButton}
                disabled={loading}
              >
                Annuler
              </motion.button>
              {step < 3 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleNext}
                  style={styles.wizardNextButton}
                >
                  Suivant <FiArrowRight size={14} />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleSubmit}
                  style={styles.wizardSubmitButton}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div style={styles.smallSpinner}></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} /> Confirmer
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============ STYLES FUTURISTES ============
const styles = {
  container: {
    marginBottom: '1.5rem'
  },
  wizardContainer: {
    marginBottom: '1.5rem'
  },
  card: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid rgba(0,255,247,0.15)'
  },
  headerIcon: {
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
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0,
    color: '#e2e8f0'
  },
  cardSubtitle: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.25rem'
  },
  cardBody: {
    padding: '1.5rem'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
    color: '#f87171',
    fontSize: '0.875rem'
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  infoCard: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  infoLabel: {
    fontSize: '0.7rem',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  infoValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  formLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#94a3b8'
  },
  required: {
    color: '#ef4444'
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
  formTextarea: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none'
  },
  formError: {
    fontSize: '0.7rem',
    color: '#f87171'
  },
  formHint: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'stretch'
  },
  inputGroupText: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRight: 'none',
    borderRadius: '10px 0 0 10px',
    color: '#00fff7',
    fontSize: '0.875rem'
  },
  inputGroupInput: {
    borderRadius: '0 10px 10px 0',
    borderLeft: 'none'
  },
  diffPreview: {
    marginTop: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem'
  },
  diffLabel: {
    color: '#94a3b8'
  },
  diffValue: {
    fontWeight: '600'
  },
  divider: {
    margin: '1.5rem 0',
    borderTop: '1px solid rgba(0,255,247,0.15)'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem'
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  infoAlert: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '12px',
    marginTop: '1rem'
  },
  infoAlertIcon: {
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'rgba(59,130,246,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3b82f6'
  },
  infoAlertTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    margin: 0,
    marginBottom: '0.25rem',
    color: '#e2e8f0'
  },
  infoAlertText: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    margin: 0
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  // Styles pour le Wizard
  progressContainer: {
    marginBottom: '1.5rem'
  },
  progressSteps: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.7rem'
  },
  progressStep: {
    transition: 'color 0.3s'
  },
  progressBarTrack: {
    height: '6px',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00fff7, #7c3aed)',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  stepContent: {
    marginBottom: '1.5rem'
  },
  wizardInput: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '1rem',
    outline: 'none'
  },
  summaryCard: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    marginTop: '1rem'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(0,255,247,0.08)'
  },
  summaryLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  summaryValue: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  confirmTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#e2e8f0'
  },
  confirmCard: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(0,255,247,0.08)'
  },
  confirmLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  confirmValue: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#e2e8f0'
  },
  wizardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  wizardRightActions: {
    display: 'flex',
    gap: '1rem'
  },
  wizardPrevButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  wizardCancelButton: {
    padding: '0.6rem 1.25rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    color: '#f87171',
    cursor: 'pointer'
  },
  wizardNextButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer'
  },
  wizardSubmitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer'
  }
};

export default DepreciationForm;
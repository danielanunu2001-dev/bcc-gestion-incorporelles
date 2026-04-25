import React, { useState } from 'react';
import api from '../../services/api';
import { FiSave, FiX, FiCalendar, FiDollarSign, FiClock, FiPercent, FiFileText, FiInfo, FiTrendingUp } from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const ReevaluationForm = ({ actifId, onSuccess, onCancel, actifInfo }) => {
  const [formData, setFormData] = useState({
    date_reevaluation: new Date().toISOString().split('T')[0],
    valeur_apres: '',
    nouvelle_duree_ans: '',
    nouveau_taux: '',
    compte_reevaluation: '1061',
    commentaire: '',
    document_reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!formData.date_reevaluation) {
      errors.date_reevaluation = 'La date de réévaluation est requise';
    }
    if (!formData.valeur_apres) {
      errors.valeur_apres = 'La nouvelle valeur est requise';
    } else if (parseFloat(formData.valeur_apres) < 0) {
      errors.valeur_apres = 'La valeur doit être positive';
    }
    if (formData.nouveau_taux && (parseFloat(formData.nouveau_taux) < 0 || parseFloat(formData.nouveau_taux) > 100)) {
      errors.nouveau_taux = 'Le taux doit être compris entre 0 et 100';
    }
    if (formData.nouvelle_duree_ans && parseInt(formData.nouvelle_duree_ans) < 1) {
      errors.nouvelle_duree_ans = 'La durée doit être d\'au moins 1 an';
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
      await api.post(`/actifs/${actifId}/reevaluations`, formData);
      onSuccess();
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de l\'enregistrement de la réévaluation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Styles d'animation
  const animationStyles = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .reevaluation-form-animate {
      animation: slideDown 0.3s ease-out;
    }
    
    .fade-in {
      animation: fadeIn 0.2s ease-out;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="reevaluation-form-animate">
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          <div className="card-header bg-gradient bg-primary bg-opacity-10 border-0 rounded-top-3 p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-white p-2 shadow-sm">
                <FiTrendingUp className="text-primary" size={20} />
              </div>
              <div>
                <h4 className="h5 fw-semibold text-primary mb-0">Nouvelle réévaluation</h4>
                {actifInfo && (
                  <small className="text-muted">
                    Actif: {actifInfo.nom || `ID: ${actifId}`}
                  </small>
                )}
              </div>
            </div>
          </div>
          
          <div className="card-body p-4">
            {/* Message d'erreur */}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                <div className="d-flex align-items-center gap-2">
                  <FiInfo size={16} />
                  <span>{error}</span>
                </div>
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
              </div>
            )}

            {/* Informations sur l'actif */}
            {actifInfo && (
              <div className="bg-light rounded-3 p-3 mb-4">
                <div className="row g-3">
                  <div className="col-md-4">
                    <small className="text-muted d-block">Valeur actuelle</small>
                    <strong className="text-primary">{formatCurrency(actifInfo.valeur_actuelle || actifInfo.valeur_nette_comptable)}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Durée restante</small>
                    <strong className="text-info">{actifInfo.duree_restante || actifInfo.duree_utile_ans} ans</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Taux actuel</small>
                    <strong className="text-warning">{actifInfo.taux_amortissement || actifInfo.taux}%</strong>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiCalendar size={14} /> Date de réévaluation <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_reevaluation"
                    className={`form-control ${validationErrors.date_reevaluation ? 'is-invalid' : ''}`}
                    value={formData.date_reevaluation}
                    onChange={handleChange}
                    required
                  />
                  {validationErrors.date_reevaluation && (
                    <div className="invalid-feedback">{validationErrors.date_reevaluation}</div>
                  )}
                  <small className="text-muted d-block mt-1">
                    Date à laquelle la réévaluation est effectuée
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiDollarSign size={14} /> Nouvelle valeur (CDF) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">FC</span>
                    <input
                      type="number"
                      name="valeur_apres"
                      className={`form-control ${validationErrors.valeur_apres ? 'is-invalid' : ''}`}
                      value={formData.valeur_apres}
                      onChange={handleChange}
                      required
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                  </div>
                  {validationErrors.valeur_apres && (
                    <div className="invalid-feedback d-block">{validationErrors.valeur_apres}</div>
                  )}
                  <small className="text-muted d-block mt-1">
                    La nouvelle valeur après réévaluation
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiClock size={14} /> Nouvelle durée (ans)
                  </label>
                  <input
                    type="number"
                    name="nouvelle_duree_ans"
                    className={`form-control ${validationErrors.nouvelle_duree_ans ? 'is-invalid' : ''}`}
                    value={formData.nouvelle_duree_ans}
                    onChange={handleChange}
                    min="1"
                    placeholder="Durée en années"
                  />
                  {validationErrors.nouvelle_duree_ans && (
                    <div className="invalid-feedback">{validationErrors.nouvelle_duree_ans}</div>
                  )}
                  <small className="text-muted d-block mt-1">
                    Optionnel - Nouvelle durée d'utilité
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiPercent size={14} /> Nouveau taux (%)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      name="nouveau_taux"
                      className={`form-control ${validationErrors.nouveau_taux ? 'is-invalid' : ''}`}
                      value={formData.nouveau_taux}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="Taux d'amortissement"
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  {validationErrors.nouveau_taux && (
                    <div className="invalid-feedback">{validationErrors.nouveau_taux}</div>
                  )}
                  <small className="text-muted d-block mt-1">
                    Optionnel - Nouveau taux d'amortissement
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiFileText size={14} /> Compte de réévaluation
                  </label>
                  <input
                    type="text"
                    name="compte_reevaluation"
                    className="form-control"
                    value={formData.compte_reevaluation}
                    onChange={handleChange}
                    placeholder="Numéro de compte"
                  />
                  <small className="text-muted d-block mt-1">
                    Compte comptable pour la réévaluation
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiFileText size={14} /> Référence document
                  </label>
                  <input
                    type="text"
                    name="document_reference"
                    className="form-control"
                    value={formData.document_reference}
                    onChange={handleChange}
                    placeholder="Numéro de rapport, expertise..."
                  />
                  <small className="text-muted d-block mt-1">
                    Référence du document justificatif
                  </small>
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiInfo size={14} /> Commentaire
                  </label>
                  <textarea
                    name="commentaire"
                    className="form-control"
                    value={formData.commentaire}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Justification de la réévaluation, méthode utilisée..."
                  />
                  <small className="text-muted d-block mt-1">
                    Optionnel - Décrivez les raisons de la réévaluation
                  </small>
                </div>
              </div>

              <hr className="my-4" />

              <div className="d-flex gap-3 justify-content-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn btn-outline-secondary d-flex align-items-center gap-2"
                  disabled={loading}
                >
                  <FiX size={16} /> Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-success d-flex align-items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={16} /> Enregistrer la réévaluation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Informations sur la réévaluation */}
        <div className="alert alert-info border-0 rounded-3 fade-in" role="alert">
          <div className="d-flex gap-3 align-items-start">
            <div className="flex-shrink-0">
              <div className="bg-info bg-opacity-25 rounded-circle p-2">
                <FiTrendingUp className="text-info" size={16} />
              </div>
            </div>
            <div>
              <h6 className="alert-heading mb-1">À propos de la réévaluation</h6>
              <small className="d-block text-muted">
                La réévaluation permet d'ajuster la valeur comptable d'un actif pour refléter sa valeur actuelle sur le marché.
                Cette opération peut impacter les amortissements futurs et générer des écarts de réévaluation.
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Version alternative avec assistant étape par étape
export const ReevaluationFormWizard = ({ actifId, onSuccess, onCancel, actifInfo }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date_reevaluation: new Date().toISOString().split('T')[0],
    valeur_apres: '',
    nouvelle_duree_ans: '',
    nouveau_taux: '',
    compte_reevaluation: '1061',
    commentaire: '',
    document_reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1 && !formData.date_reevaluation) {
      setError('Veuillez sélectionner une date');
      return;
    }
    if (step === 2 && !formData.valeur_apres) {
      setError('Veuillez saisir la nouvelle valeur');
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
      await api.post(`/actifs/${actifId}/reevaluations`, formData);
      onSuccess();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStepProgress = () => {
    return ((step - 1) / 3) * 100;
  };

  return (
    <div className="card shadow-sm border-0 rounded-3 mb-4">
      <div className="card-header bg-primary bg-opacity-10 border-0 p-3">
        <h4 className="h5 fw-semibold text-primary mb-0">Nouvelle réévaluation (Assistant)</h4>
      </div>
      
      <div className="card-body p-4">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2">
            <small className={`text-${step >= 1 ? 'primary' : 'secondary'}`}>Étape 1: Date</small>
            <small className={`text-${step >= 2 ? 'primary' : 'secondary'}`}>Étape 2: Valeur</small>
            <small className={`text-${step >= 3 ? 'primary' : 'secondary'}`}>Étape 3: Confirmation</small>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div 
              className="progress-bar bg-primary" 
              role="progressbar" 
              style={{ width: `${getStepProgress()}%` }}
              aria-valuenow={getStepProgress()} 
              aria-valuemin="0" 
              aria-valuemax="100"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}

        {/* Étape 1: Date */}
        {step === 1 && (
          <div className="fade-in">
            <label className="form-label fw-semibold d-flex align-items-center gap-2">
              <FiCalendar size={14} /> Date de réévaluation
            </label>
            <input
              type="date"
              className="form-control form-control-lg"
              value={formData.date_reevaluation}
              onChange={(e) => setFormData({...formData, date_reevaluation: e.target.value})}
            />
            <small className="text-muted d-block mt-2">
              La date à laquelle la réévaluation est effectuée
            </small>
          </div>
        )}

        {/* Étape 2: Nouvelle valeur */}
        {step === 2 && (
          <div className="fade-in">
            <label className="form-label fw-semibold d-flex align-items-center gap-2">
              <FiDollarSign size={14} /> Nouvelle valeur (CDF)
            </label>
            <div className="input-group input-group-lg mb-2">
              <span className="input-group-text bg-white">FC</span>
              <input
                type="number"
                className="form-control"
                value={formData.valeur_apres}
                onChange={(e) => setFormData({...formData, valeur_apres: e.target.value})}
                placeholder="Saisir la nouvelle valeur"
                min="0"
                step="1000"
              />
            </div>
            {actifInfo && (
              <div className="bg-light rounded-3 p-3 mt-3">
                <div className="row">
                  <div className="col-6">
                    <small className="text-muted">Valeur actuelle</small>
                    <div className="fw-bold">{formatCurrency(actifInfo.valeur_actuelle || actifInfo.valeur_nette_comptable)}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Écart</small>
                    <div className={`fw-bold ${parseFloat(formData.valeur_apres) > (actifInfo.valeur_actuelle || actifInfo.valeur_nette_comptable) ? 'text-success' : 'text-danger'}`}>
                      {formData.valeur_apres ? formatCurrency(parseFloat(formData.valeur_apres) - (actifInfo.valeur_actuelle || actifInfo.valeur_nette_comptable)) : '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Étape 3: Confirmation */}
        {step === 3 && (
          <div className="fade-in">
            <h6 className="fw-semibold mb-3">Récapitulatif</h6>
            <div className="bg-light rounded-3 p-3 mb-4">
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Date de réévaluation:</span>
                <span className="fw-medium">{new Date(formData.date_reevaluation).toLocaleDateString()}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                <span className="text-muted">Nouvelle valeur:</span>
                <span className="fw-medium text-primary">{formatCurrency(formData.valeur_apres)}</span>
              </div>
              {formData.nouvelle_duree_ans && (
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                  <span className="text-muted">Nouvelle durée:</span>
                  <span className="fw-medium">{formData.nouvelle_duree_ans} ans</span>
                </div>
              )}
              {formData.nouveau_taux && (
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                  <span className="text-muted">Nouveau taux:</span>
                  <span className="fw-medium">{formData.nouveau_taux}%</span>
                </div>
              )}
              {formData.commentaire && (
                <div className="mt-2">
                  <span className="text-muted d-block mb-1">Commentaire:</span>
                  <span className="small">{formData.commentaire}</span>
                </div>
              )}
            </div>

            <label className="form-label fw-semibold d-flex align-items-center gap-2">
              <FiInfo size={14} /> Commentaire (optionnel)
            </label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.commentaire}
              onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
              placeholder="Ajoutez des informations supplémentaires..."
            />
          </div>
        )}

        <hr className="my-4" />

        <div className="d-flex gap-2 justify-content-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="btn btn-outline-secondary"
                disabled={loading}
              >
                Précédent
              </button>
            )}
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-outline-danger"
              disabled={loading}
            >
              Annuler
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn btn-success d-flex align-items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={16} /> Confirmer
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReevaluationForm;
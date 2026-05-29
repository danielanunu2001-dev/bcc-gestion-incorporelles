// frontend/src/pages/Contrats/ContratForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import AIAssistantContrat from '../../components/IA/AIAssistantContrat';
import {
  FiSave, FiX, FiArrowLeft, FiFileText,
  FiUser, FiCalendar, FiDollarSign, FiInfo,
  FiAlertCircle, FiCheckCircle, FiTag, FiPackage,
  FiCpu, FiStar
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';

const ContratForm = () => {
  const navigate = useNavigate();
  const { id, contratId } = useParams();
  const { can } = usePermissions();
  
  const isEditMode = !!contratId;
  const canModify = can(['admin', 'comptable', 'juridique']);
  
  // États pour l'assistant IA
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState(null);
  
  // Référence pour le formulaire
  const formRef = useRef(null);
  
  const [formData, setFormData] = useState({
    numero_contrat: '',
    fournisseur: '',
    type: 'licence',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    montant: '',
    description: '',
    actif_id: id || ''
  });
  
  // État pour stocker l'actif courant (contexte)
  const [currentActif, setCurrentActif] = useState(null);
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Types de contrat disponibles
  const typesContrat = [
    { value: 'licence', label: '📜 Licence logicielle', description: 'Licence d\'utilisation de logiciel' },
    { value: 'maintenance', label: '🔧 Maintenance', description: 'Contrat de maintenance' },
    { value: 'support', label: '🛠️ Support technique', description: 'Support technique et assistance' },
    { value: 'service', label: '📋 Service', description: 'Prestation de service' },
    { value: 'location', label: '🏢 Location', description: 'Location d\'équipement' },
    { value: 'assurance', label: '🛡️ Assurance', description: 'Assurance de l\'actif' },
    { value: 'autre', label: '📄 Autre', description: 'Autre type de contrat' }
  ];

  useEffect(() => {
    if (!canModify) {
      setError('Vous n\'avez pas les droits pour créer ou modifier un contrat');
      setTimeout(() => navigate('/contrats'), 2000);
    }
  }, [canModify]);

  // Charger l'actif courant si un ID est présent (contexte pour l'IA)
  useEffect(() => {
    if (id && id !== 'undefined') {
      chargerActifCourant();
    }
  }, [id]);

  useEffect(() => {
    if (!id || id === 'undefined') {
      chargerActifs();
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && contratId && contratId !== 'undefined') {
      chargerContrat();
    }
  }, [contratId]);

  // Charger l'actif courant pour donner du contexte à l'IA
  const chargerActifCourant = async () => {
    try {
      const res = await api.get(`/actifs/${id}`);
      setCurrentActif(res.data);
      console.log('📦 Actif courant chargé pour contexte IA:', res.data.code, '-', res.data.nom);
    } catch (err) {
      console.error('Erreur chargement actif courant:', err);
    }
  };

  const chargerActifs = async () => {
    try {
      const res = await api.get('/actifs');
      setActifs(res.data.actifs || []);
    } catch (err) {
      console.error('Erreur chargement actifs:', err);
    }
  };

  const chargerContrat = async () => {
    if (!contratId || contratId === 'undefined') {
      setError('ID contrat invalide');
      return;
    }

    try {
      setLoading(true);
      console.log('📦 Chargement contrat ID:', contratId);
      
      const res = await api.get(`/contrats/${contratId}`);
      setFormData({
        numero_contrat: res.data.numero_contrat || '',
        fournisseur: res.data.fournisseur || '',
        type: res.data.type || 'licence',
        date_debut: res.data.date_debut?.split('T')[0] || '',
        date_fin: res.data.date_fin?.split('T')[0] || '',
        montant: res.data.montant || '',
        description: res.data.description || '',
        actif_id: res.data.actif_id || id || ''
      });
      
      // Si l'actif_id est différent, charger cet actif pour contexte
      if (res.data.actif_id && res.data.actif_id !== id) {
        try {
          const actifRes = await api.get(`/actifs/${res.data.actif_id}`);
          setCurrentActif(actifRes.data);
        } catch (err) {}
      }
    } catch (err) {
      console.error('❌ Erreur chargement contrat:', err);
      setError('Erreur lors du chargement du contrat');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.numero_contrat.trim()) {
      errors.numero_contrat = 'Le numéro de contrat est requis';
    }
    if (!formData.fournisseur.trim()) {
      errors.fournisseur = 'Le fournisseur est requis';
    }
    if (!formData.type) {
      errors.type = 'Le type de contrat est requis';
    }
    if (!formData.date_fin) {
      errors.date_fin = 'La date de fin est requise';
    }
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      errors.montant = 'Le montant doit être positif';
    }
    if (formData.date_debut && formData.date_fin && new Date(formData.date_fin) < new Date(formData.date_debut)) {
      errors.date_fin = 'La date de fin doit être postérieure à la date de début';
    }
    
    const actifId = id && id !== 'undefined' ? id : formData.actif_id;
    if (!actifId && (!id || id === 'undefined')) {
      errors.actif_id = 'Veuillez sélectionner un actif';
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

  // ✅ Recevoir les données de l'IA et remplir automatiquement le formulaire
  const handleAIFillForm = (draft) => {
    setAiGeneratedDraft(draft);
    setFormData(prev => ({
      ...prev,
      numero_contrat: draft.numero_contrat || prev.numero_contrat,
      fournisseur: draft.fournisseur || prev.fournisseur,
      type: draft.type || prev.type,
      date_debut: draft.date_debut || prev.date_debut,
      date_fin: draft.date_fin || prev.date_fin,
      montant: draft.montant_cdf || draft.montant || prev.montant,
      description: draft.description || prev.description,
      actif_id: draft.actif_id || prev.actif_id
    }));
    
    setSuccess('✅ Formulaire rempli automatiquement par l\'IA ! Vérifiez les champs avant création.');
    
    // Fermer l'assistant après application
    setTimeout(() => {
      setShowAIAssistant(false);
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const actifId = id && id !== 'undefined' ? id : formData.actif_id;
      
      if (!actifId) {
        throw new Error('Veuillez sélectionner un actif');
      }

      const dataToSend = {
        ...formData,
        actif_id: actifId,
        montant: parseFloat(formData.montant)
      };

      console.log('📤 Données envoyées:', dataToSend);

      let response;
      if (isEditMode) {
        if (id && id !== 'undefined') {
          response = await api.put(`/actifs/${id}/contrats/${contratId}`, dataToSend);
        } else {
          response = await api.put(`/contrats/${contratId}`, dataToSend);
        }
        setSuccess('Contrat modifié avec succès !');
      } else {
        if (id && id !== 'undefined') {
          response = await api.post(`/actifs/${id}/contrats`, dataToSend);
        } else {
          response = await api.post('/contrats', dataToSend);
        }
        setSuccess('Contrat créé avec succès ! Une facture a été générée automatiquement.');
      }

      console.log('✅ Réponse:', response.data);

      setTimeout(() => {
        if (id && id !== 'undefined') {
          navigate(`/actifs/${id}`);
        } else if (response.data?.id) {
          navigate(`/contrats/${response.data.id}`);
        } else {
          navigate('/contrats');
        }
      }, 2000);

    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.response?.data?.message || err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (id && id !== 'undefined') {
      navigate(`/actifs/${id}`);
    } else {
      navigate('/contrats');
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
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .contrat-form-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .contrat-form-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .ia-pulse {
      animation: pulse 2s infinite;
    }
  `;

  // Styles personnalisés
  const customStyles = `
    body, .container, .card, .card-body, .modal-content,
    h1, h2, h3, h4, h5, h6, p, span, div, small, strong,
    .text-muted, .fw-semibold, .fw-bold, label {
      color: #ffffff !important;
    }
    
    .form-control, .form-select {
      background: rgba(15, 23, 42, 0.8) !important;
      color: #ffffff !important;
      border: 1px solid rgba(0, 255, 247, 0.3) !important;
    }
    
    .form-control:focus, .form-select:focus {
      border-color: #00fff7 !important;
      box-shadow: 0 0 0 0.25rem rgba(0, 255, 247, 0.25) !important;
    }
    
    .form-control::placeholder {
      color: #94a3b8 !important;
    }
    
    .card {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75)) !important;
      backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(0, 255, 247, 0.2) !important;
    }
    
    .btn-outline-secondary {
      border-color: rgba(0, 255, 247, 0.3) !important;
      color: #ffffff !important;
    }
    
    .btn-outline-secondary:hover {
      background: rgba(0, 255, 247, 0.2) !important;
      border-color: #00fff7 !important;
    }
    
    .input-group-text {
      background: rgba(15, 23, 42, 0.8) !important;
      border: 1px solid rgba(0, 255, 247, 0.3) !important;
      color: #00fff7 !important;
    }
    
    .alert {
      background: rgba(0, 0, 0, 0.5) !important;
      border: 1px solid rgba(0, 255, 247, 0.2) !important;
    }
    
    svg {
      color: #00fff7 !important;
    }
  `;

  if (loading && isEditMode) {
    return (
      <>
        <style>{animationStyles}</style>
        <style>{customStyles}</style>
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p>Chargement du contrat...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <style>{customStyles}</style>
      
      {/* ✅ Assistant IA Flottant - avec contexte de l'actif et auto-remplissage */}
      {showAIAssistant && (
        <AIAssistantContrat 
          actifId={id && id !== 'undefined' ? id : formData.actif_id}
          actifContext={currentActif}
          existingNumbers={[]}
          onContratCreated={(contrat) => {
            console.log('Contrat créé par IA:', contrat);
            if (contrat && contrat.id) {
              navigate(`/contrats/${contrat.id}`);
            } else if (id && id !== 'undefined') {
              navigate(`/actifs/${id}`);
            } else {
              navigate('/contrats');
            }
          }}
          onFillForm={handleAIFillForm}
          onClose={() => setShowAIAssistant(false)}
        />
      )}
      
      <div className="container py-4 px-3 px-md-4 contrat-form-fade-in" style={{ maxWidth: '700px' }}>
        
        {/* Affichage du contexte actif pour l'utilisateur */}
        {currentActif && (
          <div className="alert alert-info mb-3 py-2" style={{ backgroundColor: 'rgba(0, 255, 247, 0.1)', borderColor: '#00fff7' }}>
            <small className="d-flex align-items-center gap-2">
              <FiPackage size={14} />
              <strong>Contexte :</strong> Contrat pour l'actif <strong>{currentActif.code}</strong> - {currentActif.nom}
              {currentActif.fournisseur && <span className="text-muted">(Fournisseur: {currentActif.fournisseur})</span>}
            </small>
          </div>
        )}
        
        {/* Header avec bouton IA */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <button onClick={handleGoBack} className="btn btn-outline-secondary d-flex align-items-center gap-2">
              <FiArrowLeft size={16} /> Retour
            </button>
            <h1 className="h3 fw-bold mb-0" style={{ background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isEditMode ? 'Modifier le contrat' : 'Nouveau contrat'}
            </h1>
          </div>
          
          {/* Bouton pour ouvrir l'assistant IA (uniquement en création) */}
          {!isEditMode && !showAIAssistant && (
            <button
              onClick={() => setShowAIAssistant(true)}
              className="btn btn-outline-primary d-flex align-items-center gap-2 ia-pulse"
              style={{ borderRadius: '50px' }}
            >
              <GiArtificialIntelligence size={18} />
              Créer avec l'IA
            </button>
          )}
        </div>

        {/* Bannière IA contextualisée (si assistant fermé) */}
        {!isEditMode && !showAIAssistant && (
          <div className="alert alert-info alert-dismissible fade show mb-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <FiStar size={24} className="text-primary" />
              <div>
                <strong className="text-primary">✨ Création assistée par IA</strong>
                <p className="mb-0 small">
                  Décrivez votre contrat en langage naturel. 
                  {currentActif && ` L'IA connaît déjà l'actif "${currentActif.code} - ${currentActif.nom}".`}
                  <br />
                  <span className="text-success">✅ Le formulaire sera rempli automatiquement !</span>
                </p>
              </div>
            </div>
            <button onClick={() => setShowAIAssistant(true)} className="btn btn-primary btn-sm">
              <GiArtificialIntelligence className="me-1" /> Essayer l'IA
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiAlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiCheckCircle size={16} />
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="contrat-form-slide-in" ref={formRef}>
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              
              {/* Affichage de l'actif sélectionné (si déjà connu) */}
              {(id && id !== 'undefined') && (
                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiPackage size={14} /> Actif associé
                  </label>
                  <div className="form-control bg-dark text-white" style={{ cursor: 'default' }}>
                    {currentActif ? `${currentActif.code} - ${currentActif.nom}` : 'Chargement...'}
                  </div>
                  <small className="text-muted">Contrat lié à cet actif</small>
                </div>
              )}

              {/* Sélection de l'actif (si pas d'ID dans l'URL) */}
              {(!id || id === 'undefined') && !isEditMode && (
                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiPackage size={14} /> Actif associé <span className="text-danger">*</span>
                  </label>
                  <select
                    name="actif_id"
                    value={formData.actif_id}
                    onChange={handleChange}
                    className={`form-select ${validationErrors.actif_id ? 'is-invalid' : ''}`}
                    required
                  >
                    <option value="">Sélectionner un actif</option>
                    {actifs.map(actif => (
                      <option key={actif.id} value={actif.id}>
                        {actif.code} - {actif.nom}
                      </option>
                    ))}
                  </select>
                  {validationErrors.actif_id && (
                    <div className="invalid-feedback">{validationErrors.actif_id}</div>
                  )}
                </div>
              )}

              {/* Numéro de contrat */}
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiFileText size={14} /> Numéro de contrat <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="numero_contrat"
                  value={formData.numero_contrat}
                  onChange={handleChange}
                  className={`form-control ${validationErrors.numero_contrat ? 'is-invalid' : ''}`}
                  placeholder="ex: CTR-2025-001"
                  required
                />
                {validationErrors.numero_contrat && (
                  <div className="invalid-feedback">{validationErrors.numero_contrat}</div>
                )}
              </div>

              {/* Fournisseur */}
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiUser size={14} /> Fournisseur <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="fournisseur"
                  value={formData.fournisseur}
                  onChange={handleChange}
                  className={`form-control ${validationErrors.fournisseur ? 'is-invalid' : ''}`}
                  placeholder="Nom du fournisseur"
                  required
                />
                {validationErrors.fournisseur && (
                  <div className="invalid-feedback">{validationErrors.fournisseur}</div>
                )}
              </div>

              {/* Type de contrat */}
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiTag size={14} /> Type de contrat <span className="text-danger">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={`form-select ${validationErrors.type ? 'is-invalid' : ''}`}
                  required
                >
                  {typesContrat.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {formData.type && (
                  <small className="text-muted d-block mt-1">
                    {typesContrat.find(t => t.value === formData.type)?.description}
                  </small>
                )}
                {validationErrors.type && (
                  <div className="invalid-feedback">{validationErrors.type}</div>
                )}
              </div>

              {/* Dates */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiCalendar size={14} /> Date de début
                  </label>
                  <input
                    type="date"
                    name="date_debut"
                    value={formData.date_debut}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiCalendar size={14} /> Date de fin <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_fin"
                    value={formData.date_fin}
                    onChange={handleChange}
                    className={`form-control ${validationErrors.date_fin ? 'is-invalid' : ''}`}
                    required
                  />
                  {validationErrors.date_fin && (
                    <div className="invalid-feedback">{validationErrors.date_fin}</div>
                  )}
                </div>
              </div>

              {/* Montant */}
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiDollarSign size={14} /> Montant (CDF) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">FC</span>
                  <input
                    type="number"
                    name="montant"
                    value={formData.montant}
                    onChange={handleChange}
                    className={`form-control ${validationErrors.montant ? 'is-invalid' : ''}`}
                    min="0"
                    step="1000"
                    placeholder="0"
                    required
                  />
                </div>
                {validationErrors.montant && (
                  <div className="invalid-feedback d-block">{validationErrors.montant}</div>
                )}
                <small className="text-muted d-block mt-1">
                  Le montant en Francs Congolais (CDF). La TVA (16%) sera calculée automatiquement sur la facture.
                </small>
              </div>

              {/* Description */}
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2">
                  <FiInfo size={14} /> Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-control"
                  rows="3"
                  placeholder="Description détaillée du contrat (prestations, conditions, etc.)..."
                />
              </div>

              {/* Boutons */}
              <hr className="my-4" style={{ borderColor: 'rgba(0,255,247,0.2)' }} />
              <div className="d-flex gap-3 justify-content-end">
                <button type="button" onClick={handleGoBack} className="btn btn-outline-secondary d-flex align-items-center gap-2">
                  <FiX size={16} /> Annuler
                </button>
                <button type="submit" className="btn btn-success d-flex align-items-center gap-2" disabled={loading}>
                  <FiSave size={16} /> 
                  {loading ? 'Enregistrement...' : (isEditMode ? 'Modifier' : 'Créer le contrat')}
                </button>
              </div>

            </div>
          </div>
        </form>

        {/* Note d'information */}
        <div className="alert alert-info mt-3 py-2">
          <small className="d-flex align-items-center gap-2">
            <FiInfo size={14} />
            <strong>Important :</strong> Une facture sera automatiquement générée lors de la création du contrat. 
            Vous pourrez la consulter et la télécharger depuis la page de détail du contrat.
          </small>
        </div>
      </div>
    </>
  );
};

export default ContratForm;
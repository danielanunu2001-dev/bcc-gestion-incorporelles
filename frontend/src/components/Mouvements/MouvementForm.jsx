import React, { useState } from 'react';
import api from '../../services/api';
import { FiX, FiCheck, FiSave, FiArrowRight, FiTool, FiTruck, FiShield, FiDollarSign, FiMapPin, FiUser, FiCalendar, FiFileText, FiClock } from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const MouvementForm = ({ actifId, mouvement, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    type_mouvement: mouvement?.type_mouvement || 'transfert_interne',
    date_mouvement: mouvement?.date_mouvement || new Date().toISOString().split('T')[0],
    description: mouvement?.description || '',
    localisation_source: mouvement?.localisation_source || '',
    localisation_destination: mouvement?.localisation_destination || '',
    nouvel_etat: mouvement?.nouvel_etat || '',
    nouvelle_localisation: mouvement?.nouvelle_localisation || '',
    nouvelle_affectation: mouvement?.nouvelle_affectation || '',
    provenance: mouvement?.provenance || '',
    document_reference: mouvement?.document_reference || '',
    cout_maintenance: mouvement?.cout_maintenance || '',
    fournisseur_maintenance: mouvement?.fournisseur_maintenance || '',
    duree_maintenance: mouvement?.duree_maintenance || '',
    prix_cession: mouvement?.prix_cession || '',
    acquereur: mouvement?.acquereur || '',
    plus_moins_value: mouvement?.plus_moins_value || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showValidationOption, setShowValidationOption] = useState(false);
  const [nouveauMouvement, setNouveauMouvement] = useState(null);

  const typesMouvement = [
    { value: 'entree', label: 'Entrée', icon: '📥', color: '#10b981', bg: 'success' },
    { value: 'transfert_interne', label: 'Transfert interne', icon: '🔄', color: '#3b82f6', bg: 'primary' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: '#f59e0b', bg: 'warning' },
    { value: 'reparation', label: 'Réparation', icon: '🛠️', color: '#ef4444', bg: 'danger' },
    { value: 'mise_hors_service', label: 'Mise hors service', icon: '⛔', color: '#6b7280', bg: 'secondary' },
    { value: 'cession', label: 'Cession', icon: '💰', color: '#8b5cf6', bg: 'purple' },
    { value: 'don', label: 'Don', icon: '🎁', color: '#ec4899', bg: 'pink' },
    { value: 'reforme', label: 'Réforme', icon: '📝', color: '#64748b', bg: 'secondary' }
  ];

  const etats = [
    { value: 'neuf', label: 'Neuf', color: '#10b981' },
    { value: 'bon', label: 'Bon état', color: '#3b82f6' },
    { value: 'moyen', label: 'État moyen', color: '#f59e0b' },
    { value: 'mauvais', label: 'Mauvais état', color: '#ef4444' },
    { value: 'reforme', label: 'Réformé', color: '#6b7280' }
  ];

  const getTypeIcon = (type) => {
    const found = typesMouvement.find(t => t.value === type);
    return found?.icon || '📋';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const prepareDataForSubmit = () => {
    const dataToSend = {
      type_mouvement: formData.type_mouvement,
      date_mouvement: formData.date_mouvement,
      description: formData.description || 'Aucune description',
      statut: 'brouillon'
    };

    if (formData.localisation_source?.trim()) {
      dataToSend.localisation_source = formData.localisation_source;
    }

    if (formData.localisation_destination?.trim()) {
      dataToSend.localisation_destination = formData.localisation_destination;
    }

    if (formData.nouvel_etat?.trim()) {
      dataToSend.nouvel_etat = formData.nouvel_etat;
    }

    if (formData.nouvelle_localisation?.trim()) {
      dataToSend.nouvelle_localisation = formData.nouvelle_localisation;
    }

    if (formData.nouvelle_affectation?.trim()) {
      dataToSend.nouvelle_affectation = formData.nouvelle_affectation;
    }

    switch (formData.type_mouvement) {
      case 'entree':
        if (formData.provenance?.trim()) dataToSend.provenance = formData.provenance;
        if (formData.document_reference?.trim()) dataToSend.document_reference = formData.document_reference;
        break;
      case 'maintenance':
      case 'reparation':
        if (formData.cout_maintenance) dataToSend.cout_maintenance = parseFloat(formData.cout_maintenance);
        if (formData.fournisseur_maintenance?.trim()) dataToSend.fournisseur_maintenance = formData.fournisseur_maintenance;
        if (formData.duree_maintenance) dataToSend.duree_maintenance = parseInt(formData.duree_maintenance);
        break;
      case 'cession':
        if (formData.prix_cession) dataToSend.prix_cession = parseFloat(formData.prix_cession);
        if (formData.acquereur?.trim()) dataToSend.acquereur = formData.acquereur;
        if (formData.plus_moins_value) dataToSend.plus_moins_value = parseFloat(formData.plus_moins_value);
        break;
      case 'don':
        if (formData.acquereur?.trim()) dataToSend.acquereur = formData.acquereur;
        break;
    }

    return dataToSend;
  };

  const handleValider = async (mouvementId) => {
    try {
      setLoading(true);
      await api.put(`/actifs/${actifId}/mouvements/${mouvementId}/valider`);
      onSuccess();
    } catch (err) {
      console.error('Erreur validation:', err);
      setError(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowValidationOption(false);
    setNouveauMouvement(null);

    try {
      const dataToSend = prepareDataForSubmit();
      console.log('📤 Données envoyées:', JSON.stringify(dataToSend, null, 2));

      let response;
      if (mouvement) {
        response = await api.put(`/actifs/${actifId}/mouvements/${mouvement.id}`, dataToSend);
        onSuccess();
      } else {
        response = await api.post(`/actifs/${actifId}/mouvements`, dataToSend);
        setNouveauMouvement(response.data);
        setShowValidationOption(true);
      }
      
    } catch (err) {
      console.error('❌ Erreur détaillée:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du mouvement');
    } finally {
      setLoading(false);
    }
  };

  const renderChampsSpecifiques = () => {
    const currentType = typesMouvement.find(t => t.value === formData.type_mouvement);
    
    switch (formData.type_mouvement) {
      case 'entree':
        return (
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label d-flex align-items-center gap-2">
                <FiMapPin size={14} className="text-muted" /> Provenance
              </label>
              <input
                type="text"
                name="provenance"
                value={formData.provenance}
                onChange={handleChange}
                className="form-control"
                placeholder="Achat, donation, transfert..."
              />
            </div>
            <div className="col-md-6">
              <label className="form-label d-flex align-items-center gap-2">
                <FiFileText size={14} className="text-muted" /> Document de référence
              </label>
              <input
                type="text"
                name="document_reference"
                value={formData.document_reference}
                onChange={handleChange}
                className="form-control"
                placeholder="Numéro facture, BL..."
              />
            </div>
          </div>
        );

      case 'transfert_interne':
        return (
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label d-flex align-items-center gap-2">
                <FiArrowRight size={14} className="text-muted" /> Service source
              </label>
              <input
                type="text"
                name="localisation_source"
                value={formData.localisation_source}
                onChange={handleChange}
                className="form-control"
                placeholder="Service d'origine"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label d-flex align-items-center gap-2">
                <FiMapPin size={14} className="text-muted" /> Service destination
              </label>
              <input
                type="text"
                name="localisation_destination"
                value={formData.localisation_destination}
                onChange={handleChange}
                className="form-control"
                placeholder="Service de destination"
              />
            </div>
          </div>
        );

      case 'maintenance':
      case 'reparation':
        return (
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <FiDollarSign size={14} className="text-muted" /> Coût (CDF)
              </label>
              <input
                type="number"
                name="cout_maintenance"
                value={formData.cout_maintenance}
                onChange={handleChange}
                className="form-control"
                min="0"
                placeholder="0"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <FiUser size={14} className="text-muted" /> Fournisseur/Prestataire
              </label>
              <input
                type="text"
                name="fournisseur_maintenance"
                value={formData.fournisseur_maintenance}
                onChange={handleChange}
                className="form-control"
                placeholder="Nom du prestataire"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <FiClock size={14} className="text-muted" /> Durée (jours)
              </label>
              <input
                type="number"
                name="duree_maintenance"
                value={formData.duree_maintenance}
                onChange={handleChange}
                className="form-control"
                min="1"
                placeholder="Durée"
              />
            </div>
          </div>
        );

      case 'cession':
        return (
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <FiDollarSign size={14} className="text-muted" /> Prix de cession (CDF)
              </label>
              <input
                type="number"
                name="prix_cession"
                value={formData.prix_cession}
                onChange={handleChange}
                className="form-control"
                min="0"
                placeholder="0"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <FiUser size={14} className="text-muted" /> Acquéreur
              </label>
              <input
                type="text"
                name="acquereur"
                value={formData.acquereur}
                onChange={handleChange}
                className="form-control"
                placeholder="Nom de l'acquéreur"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <FiTrendingUp size={14} className="text-muted" /> Plus/moins-value (CDF)
              </label>
              <input
                type="number"
                name="plus_moins_value"
                value={formData.plus_moins_value}
                onChange={handleChange}
                className="form-control"
                placeholder="0"
              />
            </div>
          </div>
        );

      case 'don':
        return (
          <div className="row g-3">
            <div className="col-md-12">
              <label className="form-label d-flex align-items-center gap-2">
                <FiUser size={14} className="text-muted" /> Bénéficiaire
              </label>
              <input
                type="text"
                name="acquereur"
                value={formData.acquereur}
                onChange={handleChange}
                className="form-control"
                placeholder="Organisation bénéficiaire"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Styles d'animation
  const animationStyles = `
    @keyframes slideIn {
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
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .form-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .fade-in {
      animation: fadeIn 0.2s ease-out;
    }
    .validation-pulse {
      animation: pulse 0.5s ease-out;
    }
  `;

  const currentTypeIcon = getTypeIcon(formData.type_mouvement);
  const currentTypeLabel = typesMouvement.find(t => t.value === formData.type_mouvement)?.label || 'Mouvement';

  return (
    <>
      <style>{animationStyles}</style>
      <div className="form-slide-in">
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          {/* En-tête avec icône du type de mouvement */}
          <div className="card-header bg-gradient bg-primary bg-opacity-10 border-0 rounded-top-3 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle bg-white p-2 shadow-sm">
                  <span style={{ fontSize: '24px' }}>{currentTypeIcon}</span>
                </div>
                <div>
                  <h3 className="h5 fw-semibold text-primary mb-0">
                    {mouvement ? 'Modifier le mouvement' : 'Nouveau mouvement'}
                  </h3>
                  <p className="small text-muted mb-0">
                    Type: <strong className="text-primary">{currentTypeLabel}</strong>
                  </p>
                </div>
              </div>
              <button onClick={onCancel} className="btn btn-sm btn-link text-secondary p-0">
                <FiX size={20} />
              </button>
            </div>
          </div>

          <div className="card-body p-4">
            {/* Message d'erreur */}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                <div className="d-flex align-items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
              </div>
            )}

            {/* Message après création avec option de validation */}
            {showValidationOption && nouveauMouvement && (
              <div className="alert alert-success validation-pulse mb-4" role="alert">
                <div className="d-flex align-items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="rounded-circle bg-success bg-opacity-25 p-2">
                      <FiCheck size={20} className="text-success" />
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="alert-heading mb-2">✅ Mouvement créé avec succès !</h6>
                    <p className="mb-3 small">Souhaitez-vous le valider immédiatement ?</p>
                    <div className="d-flex gap-3">
                      <button
                        onClick={() => handleValider(nouveauMouvement.id)}
                        className="btn btn-success btn-sm d-flex align-items-center gap-2"
                      >
                        <FiCheck size={14} /> Oui, valider maintenant
                      </button>
                      <button
                        onClick={onSuccess}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Non, je validerai plus tard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formulaire principal */}
            {!showValidationOption && (
              <form onSubmit={handleSubmit}>
                {/* Informations générales */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2">
                      <span>{currentTypeIcon}</span> Type de mouvement <span className="text-danger">*</span>
                    </label>
                    <select
                      name="type_mouvement"
                      value={formData.type_mouvement}
                      onChange={handleChange}
                      className="form-select"
                      required
                      disabled={!!mouvement}
                    >
                      {typesMouvement.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Le type de mouvement ne peut pas être modifié après création
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2">
                      <FiCalendar size={14} /> Date du mouvement <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_mouvement"
                      value={formData.date_mouvement}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                {/* Champs spécifiques au type */}
                <div className="mb-4">
                  <div className="border-bottom pb-2 mb-3">
                    <h6 className="fw-semibold text-primary mb-0">Détails spécifiques</h6>
                    <small className="text-muted">Informations relatives au type de mouvement</small>
                  </div>
                  {renderChampsSpecifiques()}
                </div>

                {/* Champs optionnels généraux */}
                <div className="mb-4">
                  <div className="border-bottom pb-2 mb-3">
                    <h6 className="fw-semibold text-primary mb-0">Informations complémentaires</h6>
                    <small className="text-muted">Champs optionnels</small>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label d-flex align-items-center gap-2">
                        <FiShield size={14} className="text-muted" /> Nouvel état
                      </label>
                      <select
                        name="nouvel_etat"
                        value={formData.nouvel_etat}
                        onChange={handleChange}
                        className="form-select"
                      >
                        <option value="">-- Non modifié --</option>
                        {etats.map(e => (
                          <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label d-flex align-items-center gap-2">
                        <FiMapPin size={14} className="text-muted" /> Nouvelle localisation
                      </label>
                      <input
                        type="text"
                        name="nouvelle_localisation"
                        value={formData.nouvelle_localisation}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Si changement de lieu"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label d-flex align-items-center gap-2">
                        <FiUser size={14} className="text-muted" /> Nouvelle affectation
                      </label>
                      <input
                        type="text"
                        name="nouvelle_affectation"
                        value={formData.nouvelle_affectation}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Service/personne responsable"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label d-flex align-items-center gap-2">
                        <FiFileText size={14} className="text-muted" /> Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="form-control"
                        rows="3"
                        placeholder="Détails du mouvement..."
                      />
                    </div>
                  </div>
                </div>

                {/* Actions du formulaire */}
                <div className="d-flex gap-3 justify-content-end pt-3 border-top">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-outline-secondary"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <FiSave size={14} /> {mouvement ? 'Modifier' : 'Enregistrer'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Info card pour les types de mouvement */}
        <div className="card border-0 bg-light rounded-3">
          <div className="card-body py-2 px-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="small text-muted">💡 Types de mouvements disponibles :</span>
              {typesMouvement.map(type => (
                <div key={type.value} className="d-flex align-items-center gap-1">
                  <span>{type.icon}</span>
                  <small className="text-muted">{type.label}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MouvementForm;
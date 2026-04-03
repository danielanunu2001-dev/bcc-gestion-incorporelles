import React, { useState } from 'react';
import api from '../../services/api';
import { FiX, FiCheck } from 'react-icons/fi';

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
    { value: 'entree', label: 'Entrée' },
    { value: 'transfert_interne', label: 'Transfert interne' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'reparation', label: 'Réparation' },
    { value: 'mise_hors_service', label: 'Mise hors service' },
    { value: 'cession', label: 'Cession' },
    { value: 'don', label: 'Don' },
    { value: 'reforme', label: 'Réforme' }
  ];

  const etats = [
    { value: 'neuf', label: 'Neuf' },
    { value: 'bon', label: 'Bon état' },
    { value: 'moyen', label: 'État moyen' },
    { value: 'mauvais', label: 'Mauvais état' },
    { value: 'reforme', label: 'Réformé' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const prepareDataForSubmit = () => {
    const dataToSend = {
      type_mouvement: formData.type_mouvement,
      date_mouvement: formData.date_mouvement,
      description: formData.description || 'Aucune description',
      statut: 'brouillon' // ← Par défaut, un mouvement est en brouillon
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

    // Champs spécifiques selon le type
    switch (formData.type_mouvement) {
      case 'entree':
        if (formData.provenance?.trim()) dataToSend.provenance = formData.provenance;
        if (formData.document_reference?.trim()) dataToSend.document_reference = formData.document_reference;
        break;
      case 'transfert_interne':
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

  // ✅ FONCTION POUR VALIDER LE MOUVEMENT
  const handleValider = async (mouvementId) => {
    try {
      setLoading(true);
      await api.put(`/actifs/${actifId}/mouvements/${mouvementId}/valider`);
      onSuccess(); // Recharger la liste
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
        // Modification
        response = await api.put(`/actifs/${actifId}/mouvements/${mouvement.id}`, dataToSend);
        onSuccess();
      } else {
        // Création
        response = await api.post(`/actifs/${actifId}/mouvements`, dataToSend);
        setNouveauMouvement(response.data);
        setShowValidationOption(true); // ← Affiche l'option de validation
      }
      
    } catch (err) {
      console.error('❌ Erreur détaillée:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du mouvement');
    } finally {
      setLoading(false);
    }
  };

  const renderChampsSpecifiques = () => {
    switch (formData.type_mouvement) {
      case 'entree':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Provenance</label>
              <input
                type="text"
                name="provenance"
                value={formData.provenance}
                onChange={handleChange}
                style={styles.input}
                placeholder="Achat, donation, transfert..."
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Document de référence</label>
              <input
                type="text"
                name="document_reference"
                value={formData.document_reference}
                onChange={handleChange}
                style={styles.input}
                placeholder="Numéro facture, BL..."
              />
            </div>
          </>
        );

      case 'transfert_interne':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Service source</label>
              <input
                type="text"
                name="localisation_source"
                value={formData.localisation_source}
                onChange={handleChange}
                style={styles.input}
                placeholder="Service d'origine"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Service destination</label>
              <input
                type="text"
                name="localisation_destination"
                value={formData.localisation_destination}
                onChange={handleChange}
                style={styles.input}
                placeholder="Service de destination"
              />
            </div>
          </>
        );

      case 'maintenance':
      case 'reparation':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Coût (CDF)</label>
              <input
                type="number"
                name="cout_maintenance"
                value={formData.cout_maintenance}
                onChange={handleChange}
                style={styles.input}
                min="0"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Fournisseur/Prestataire</label>
              <input
                type="text"
                name="fournisseur_maintenance"
                value={formData.fournisseur_maintenance}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Durée (jours)</label>
              <input
                type="number"
                name="duree_maintenance"
                value={formData.duree_maintenance}
                onChange={handleChange}
                style={styles.input}
                min="1"
              />
            </div>
          </>
        );

      case 'cession':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Prix de cession (CDF)</label>
              <input
                type="number"
                name="prix_cession"
                value={formData.prix_cession}
                onChange={handleChange}
                style={styles.input}
                min="0"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Acquéreur</label>
              <input
                type="text"
                name="acquereur"
                value={formData.acquereur}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Plus/moins-value (CDF)</label>
              <input
                type="number"
                name="plus_moins_value"
                value={formData.plus_moins_value}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </>
        );

      case 'don':
        return (
          <div style={styles.formGroup}>
            <label style={styles.label}>Bénéficiaire</label>
            <input
              type="text"
              name="acquereur"
              value={formData.acquereur}
              onChange={handleChange}
              style={styles.input}
              placeholder="Organisation bénéficiaire"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          {mouvement ? 'Modifier le mouvement' : 'Nouveau mouvement'}
        </h3>
        <button onClick={onCancel} style={styles.closeButton}>
          <FiX />
        </button>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* ✅ MESSAGE APRÈS CRÉATION AVEC OPTION DE VALIDATION */}
      {showValidationOption && nouveauMouvement && (
        <div style={styles.validationMessage}>
          <p style={{ marginBottom: '1rem' }}>
            ✅ Mouvement créé avec succès ! Souhaitez-vous le valider immédiatement ?
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => handleValider(nouveauMouvement.id)}
              style={styles.validerButton}
            >
              <FiCheck /> Oui, valider maintenant
            </button>
            <button
              onClick={onSuccess}
              style={styles.skipButton}
            >
              Non, je validerai plus tard
            </button>
          </div>
        </div>
      )}

      {!showValidationOption && (
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type de mouvement *</label>
              <select
                name="type_mouvement"
                value={formData.type_mouvement}
                onChange={handleChange}
                style={styles.select}
                required
                disabled={!!mouvement}
              >
                {typesMouvement.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Date du mouvement *</label>
              <input
                type="date"
                name="date_mouvement"
                value={formData.date_mouvement}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            {renderChampsSpecifiques()}

            <div style={styles.formGroup}>
              <label style={styles.label}>Nouvel état (optionnel)</label>
              <select
                name="nouvel_etat"
                value={formData.nouvel_etat}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="">-- Non modifié --</option>
                {etats.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nouvelle localisation (optionnel)</label>
              <input
                type="text"
                name="nouvelle_localisation"
                value={formData.nouvelle_localisation}
                onChange={handleChange}
                style={styles.input}
                placeholder="Si changement de lieu"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nouvelle affectation (optionnel)</label>
              <input
                type="text"
                name="nouvelle_affectation"
                value={formData.nouvelle_affectation}
                onChange={handleChange}
                style={styles.input}
                placeholder="Service/personne responsable"
              />
            </div>

            <div style={styles.formGroupFull}>
              <label style={styles.label}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={styles.textarea}
                rows="3"
                placeholder="Détails du mouvement..."
              />
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? 'Enregistrement...' : (mouvement ? 'Modifier' : 'Enregistrer')}
            </button>
            <button type="button" onClick={onCancel} style={styles.cancelButton}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
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
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#9ca3af',
    ':hover': {
      color: 'var(--text-secondary)'
    }
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formGroupFull: {
    gridColumn: '1 / -1',
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem'
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)'
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    resize: 'vertical'
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem'
  },
  submitButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  validationMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    border: '1px solid #10b981'
  },
  validerButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  skipButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  }
};

export default MouvementForm;
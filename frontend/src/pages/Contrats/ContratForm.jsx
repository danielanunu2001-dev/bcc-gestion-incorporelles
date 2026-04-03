import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiSave, FiX, FiArrowLeft, FiFileText,
  FiUser, FiCalendar, FiDollarSign
} from 'react-icons/fi';

const ContratForm = () => {
  const navigate = useNavigate();
  const { id, contratId } = useParams(); // id = actifId (optionnel), contratId = pour modification
  const { can } = usePermissions();
  
  const isEditMode = !!contratId;
  
  const [formData, setFormData] = useState({
    numero_contrat: '',
    fournisseur: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    montant: '',
    description: '',
    actif_id: id || '' // ← Important : utiliser l'ID de l'actif s'il existe
  });
  
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les actifs pour le select (si création sans actif)
  useEffect(() => {
    if (!id || id === 'undefined') {
      chargerActifs();
    }
  }, [id]);

  // Charger le contrat en mode édition
  useEffect(() => {
    if (isEditMode && contratId && contratId !== 'undefined') {
      chargerContrat();
    }
  }, [contratId]);

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
      
      // Essayer d'abord avec la route indépendante
      const res = await api.get(`/contrats/${contratId}`);
      setFormData({
        numero_contrat: res.data.numero_contrat || '',
        fournisseur: res.data.fournisseur || '',
        date_debut: res.data.date_debut?.split('T')[0] || '',
        date_fin: res.data.date_fin?.split('T')[0] || '',
        montant: res.data.montant || '',
        description: res.data.description || '',
        actif_id: res.data.actif_id || id || ''
      });
    } catch (err) {
      console.error('❌ Erreur chargement contrat:', err);
      setError('Erreur lors du chargement du contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!formData.numero_contrat || !formData.fournisseur || !formData.date_fin || !formData.montant) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      // Déterminer l'actif_id (soit de l'URL, soit du formulaire)
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
        // Mode édition
        if (id && id !== 'undefined') {
          response = await api.put(`/actifs/${id}/contrats/${contratId}`, dataToSend);
        } else {
          response = await api.put(`/contrats/${contratId}`, dataToSend);
        }
        setSuccess('Contrat modifié avec succès !');
      } else {
        // Mode création
        if (id && id !== 'undefined') {
          response = await api.post(`/actifs/${id}/contrats`, dataToSend);
        } else {
          response = await api.post('/contrats', dataToSend);
        }
        setSuccess('Contrat créé avec succès !');
      }

      console.log('✅ Réponse:', response.data);

      // Redirection après 1.5 secondes
      setTimeout(() => {
        if (id && id !== 'undefined') {
          navigate(`/actifs/${id}/contrats`);
        } else {
          navigate('/contrats');
        }
      }, 1500);

    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (id && id !== 'undefined') {
      navigate(`/actifs/${id}/contrats`);
    } else {
      navigate('/contrats');
    }
  };

  if (loading && isEditMode) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={handleGoBack} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
        <h1 style={styles.title}>
          {isEditMode ? 'Modifier le contrat' : 'Nouveau contrat'}
        </h1>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}
      {success && (
        <div style={styles.successMessage}>
          {success} Redirection...
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formCard}>
          {/* Sélection de l'actif (si pas d'ID dans l'URL) */}
          {(!id || id === 'undefined') && !isEditMode && (
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiFileText /> Actif associé <span style={styles.required}>*</span>
              </label>
              <select
                name="actif_id"
                value={formData.actif_id}
                onChange={handleChange}
                style={styles.select}
                required
              >
                <option value="">Sélectionner un actif</option>
                {actifs.map(actif => (
                  <option key={actif.id} value={actif.id}>
                    {actif.code} - {actif.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Numéro de contrat */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiFileText /> Numéro de contrat <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="numero_contrat"
              value={formData.numero_contrat}
              onChange={handleChange}
              style={styles.input}
              placeholder="ex: CTR-2025-001"
              required
            />
          </div>

          {/* Fournisseur */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiUser /> Fournisseur <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="fournisseur"
              value={formData.fournisseur}
              onChange={handleChange}
              style={styles.input}
              placeholder="Nom du fournisseur"
              required
            />
          </div>

          {/* Dates */}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiCalendar /> Date de début
              </label>
              <input
                type="date"
                name="date_debut"
                value={formData.date_debut}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiCalendar /> Date de fin <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="date_fin"
                value={formData.date_fin}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Montant */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiDollarSign /> Montant (CDF) <span style={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="montant"
              value={formData.montant}
              onChange={handleChange}
              style={styles.input}
              min="0"
              step="1000"
              placeholder="0"
              required
            />
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={styles.textarea}
              rows="3"
              placeholder="Description du contrat..."
            />
          </div>

          {/* Boutons */}
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveButton} disabled={loading}>
              <FiSave /> {loading ? 'Enregistrement...' : (isEditMode ? 'Modifier' : 'Créer')}
            </button>
            <button type="button" onClick={handleGoBack} style={styles.cancelButton}>
              <FiX /> Annuler
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  title: {
    flex: 1,
    fontSize: '1.5rem',
    color: '#1e3a8a',
    margin: 0,
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  form: {
    width: '100%',
  },
  formCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  required: {
    color: '#ef4444',
    marginLeft: '0.25rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem',
    backgroundColor: 'var(--bg-card)',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem',
    resize: 'vertical',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  saveButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  cancelButton: {
    padding: '0.75rem 2rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
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

export default ContratForm;
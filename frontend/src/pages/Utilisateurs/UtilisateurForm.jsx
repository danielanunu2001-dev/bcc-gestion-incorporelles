import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiSave, FiX, FiUser, FiMail, FiLock,
  FiShield, FiArrowLeft
} from 'react-icons/fi';

const UtilisateurForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { can } = usePermissions();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'gestionnaire',
    password: '',
    confirm_password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      chargerUtilisateur();
    }
  }, [id]);

  const chargerUtilisateur = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${id}`);
      setFormData({
        full_name: res.data.full_name,
        email: res.data.email,
        role: res.data.role,
        password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur de validation pour ce champ
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.full_name?.trim()) {
      errors.full_name = 'Le nom complet est requis';
    }

    if (!formData.email?.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email invalide';
    }

    if (!isEditMode && !formData.password) {
      errors.password = 'Le mot de passe est requis';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      } else if (formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Les mots de passe ne correspondent pas';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({});

    // Validation
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role
      };

      if (formData.password) {
        dataToSend.password = formData.password;
      }

      console.log('Données envoyées:', dataToSend); // Pour debug

      if (isEditMode) {
        await api.put(`/users/${id}`, dataToSend);
        setSuccess('Utilisateur modifié avec succès');
      } else {
        await api.post('/users', dataToSend);
        setSuccess('Utilisateur créé avec succès');
      }

      setTimeout(() => navigate('/utilisateurs'), 2000);
    } catch (err) {
      console.error('Erreur complète:', err);
      
      // Gérer les erreurs de l'API
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        // Gérer les erreurs de validation du backend
        const backendErrors = {};
        err.response.data.errors.forEach(e => {
          backendErrors[e.param] = e.msg;
        });
        setValidationErrors(backendErrors);
      } else {
        setError('Une erreur est survenue lors de l\'enregistrement');
      }
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'admin', label: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités' },
    { value: 'comptable', label: 'Comptable', description: 'Gestion des actifs et amortissements' },
    { value: 'auditeur', label: 'Auditeur', description: 'Consultation seule + accès aux logs' },
    { value: 'juridique', label: 'Juridique', description: 'Gestion des contrats et aspects légaux' },
    { value: 'informatique', label: 'Informatique', description: 'Gestion du parc informatique' },
    { value: 'inventoriste', label: 'Inventoriste', description: 'Inventaire physique avec application mobile' },
    { value: 'gestionnaire', label: 'Gestionnaire', description: 'Gestion courante des actifs' }
  ];

  if (!can(['admin'])) {
    return (
      <div style={styles.accessDenied}>
        <FiShield size={48} color="#ef4444" />
        <h2>Accès refusé</h2>
        <p>Vous n'avez pas les droits pour accéder à cette page.</p>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/utilisateurs')} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
        <h1 style={styles.title}>
          {isEditMode ? 'Modifier un utilisateur' : 'Nouvel utilisateur'}
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
          {/* Informations générales */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>
              <FiUser /> Informations générales
            </h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Nom complet <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Jean Dupont"
                style={{
                  ...styles.input,
                  borderColor: validationErrors.full_name ? '#ef4444' : '#d1d5db'
                }}
              />
              {validationErrors.full_name && (
                <div style={styles.fieldError}>{validationErrors.full_name}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jean.dupont@bcc.cd"
                style={{
                  ...styles.input,
                  borderColor: validationErrors.email ? '#ef4444' : '#d1d5db'
                }}
              />
              {validationErrors.email && (
                <div style={styles.fieldError}>{validationErrors.email}</div>
              )}
            </div>
          </div>

          {/* Rôle */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>
              <FiShield /> Rôle et permissions
            </h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Rôle <span style={styles.required}>*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={styles.select}
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <div style={styles.roleDescription}>
                {roles.find(r => r.value === formData.role)?.description}
              </div>
            </div>
          </div>

          {/* Mot de passe */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>
              <FiLock /> {isEditMode ? 'Changer le mot de passe' : 'Mot de passe'}
            </h3>
            <p style={styles.sectionNote}>
              {isEditMode 
                ? 'Laissez vide pour conserver le mot de passe actuel'
                : 'Le mot de passe doit contenir au moins 6 caractères'}
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                {isEditMode ? 'Nouveau mot de passe' : 'Mot de passe'}
                {!isEditMode && <span style={styles.required}>*</span>}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                style={{
                  ...styles.input,
                  borderColor: validationErrors.password ? '#ef4444' : '#d1d5db'
                }}
              />
              {validationErrors.password && (
                <div style={styles.fieldError}>{validationErrors.password}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Confirmer le mot de passe
                {!isEditMode && <span style={styles.required}>*</span>}
              </label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
                style={{
                  ...styles.input,
                  borderColor: validationErrors.confirm_password ? '#ef4444' : '#d1d5db'
                }}
              />
              {validationErrors.confirm_password && (
                <div style={styles.fieldError}>{validationErrors.confirm_password}</div>
              )}
            </div>
          </div>

          {/* Boutons */}
          <div style={styles.formActions}>
            <button 
              type="submit" 
              style={styles.saveButton} 
              disabled={loading}
            >
              <FiSave /> {loading ? 'Enregistrement...' : (isEditMode ? 'Modifier' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/utilisateurs')}
              style={styles.cancelButton}
              disabled={loading}
            >
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569',
    transition: 'all 0.2s'
  },
  title: {
    fontSize: '1.5rem',
    color: '#1e293b',
    margin: 0
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  form: {
    width: '100%'
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  formSection: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  sectionNote: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 1rem 0'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  required: {
    color: '#ef4444',
    marginLeft: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    backgroundColor: '#ffffff',
    cursor: 'pointer'
  },
  fieldError: {
    marginTop: '0.25rem',
    fontSize: '0.8rem',
    color: '#ef4444'
  },
  roleDescription: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#64748b',
    padding: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '4px'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#e5e7eb',
    color: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '400px',
    margin: '2rem auto'
  }
};

export default UtilisateurForm;
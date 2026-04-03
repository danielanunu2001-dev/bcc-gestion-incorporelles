import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiShield, FiLock, FiClock, 
  FiEye, FiBell, FiMapPin, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiAlertTriangle, FiSmartphone, FiMail
} from 'react-icons/fi';

const Securite = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    deux_facteurs: false,
    deux_facteurs_method: 'email',
    session_timeout: 30,
    historique_connexions: true,
    notifications_connexion: true,
    ip_restriction: false,
    ip_whitelist: '',
    mdp_expiration: 90,
    tentative_connexion_max: 5,
    verrouillage_temporaire: 30
  });

  useEffect(() => {
    loadSettingsFromLocalStorage();
  }, []);

  const loadSettingsFromLocalStorage = () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('security_settings');
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      localStorage.setItem('security_settings', JSON.stringify(settings));
      setSuccess('Paramètres de sécurité enregistrés avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError('Erreur lors de l\'enregistrement des paramètres');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      deux_facteurs: false,
      deux_facteurs_method: 'email',
      session_timeout: 30,
      historique_connexions: true,
      notifications_connexion: true,
      ip_restriction: false,
      ip_whitelist: '',
      mdp_expiration: 90,
      tentative_connexion_max: 5,
      verrouillage_temporaire: 30
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement de vos paramètres de sécurité...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/parametres')} style={styles.backButton}>
            <FiArrowLeft size={18} /> Retour
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.iconWrapper}>
              <FiShield size={28} color="#2563eb" />
            </div>
            <div>
              <h1 style={styles.title}>Sécurité</h1>
              <p style={styles.subtitle}>
                Gérez les paramètres de sécurité de votre compte
              </p>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleReset} style={styles.resetButton}>
            <FiRefreshCw /> Réinitialiser
          </button>
        </div>
      </div>

      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div style={styles.errorMessage}>
          <FiXCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Authentification */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiLock size={20} color="#2563eb" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Authentification</h3>
              <p style={styles.sectionDescription}>
                Renforcez la sécurité de votre compte
              </p>
            </div>
          </div>
          
          <div style={styles.option}>
            <input
              type="checkbox"
              id="deux_facteurs"
              name="deux_facteurs"
              checked={settings.deux_facteurs}
              onChange={handleChange}
              style={styles.checkbox}
            />
            <label htmlFor="deux_facteurs" style={styles.label}>
              <FiShield size={16} />
              <span>
                <strong>Authentification à deux facteurs (2FA)</strong>
                <small>Ajoute une couche de sécurité supplémentaire</small>
              </span>
            </label>
          </div>

          {settings.deux_facteurs && (
            <div style={styles.subOption}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="deux_facteurs_method"
                  value="email"
                  checked={settings.deux_facteurs_method === 'email'}
                  onChange={handleChange}
                  style={styles.radio}
                />
                <FiMail size={14} /> Par email
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="deux_facteurs_method"
                  value="sms"
                  checked={settings.deux_facteurs_method === 'sms'}
                  onChange={handleChange}
                  style={styles.radio}
                />
                <FiSmartphone size={14} /> Par SMS
              </label>
            </div>
          )}
        </div>

        {/* Session */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiClock size={20} color="#f59e0b" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Gestion des sessions</h3>
              <p style={styles.sectionDescription}>
                Contrôlez la durée et la sécurité de vos sessions
              </p>
            </div>
          </div>
          
          <div style={styles.optionRow}>
            <label htmlFor="session_timeout" style={styles.labelInline}>
              Délai d'expiration de session (minutes)
            </label>
            <input
              type="number"
              id="session_timeout"
              name="session_timeout"
              value={settings.session_timeout}
              onChange={handleChange}
              min="5"
              max="120"
              step="5"
              style={styles.inputNumber}
            />
            <span style={styles.hint}>minutes d'inactivité avant déconnexion</span>
          </div>
        </div>

        {/* Politique des mots de passe */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiLock size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Politique des mots de passe</h3>
              <p style={styles.sectionDescription}>
                Configurez les règles de sécurité des mots de passe
              </p>
            </div>
          </div>
          
          <div style={styles.optionRow}>
            <label htmlFor="mdp_expiration" style={styles.labelInline}>
              Expiration du mot de passe (jours)
            </label>
            <input
              type="number"
              id="mdp_expiration"
              name="mdp_expiration"
              value={settings.mdp_expiration}
              onChange={handleChange}
              min="30"
              max="365"
              step="30"
              style={styles.inputNumber}
            />
            <span style={styles.hint}>jours avant expiration</span>
          </div>
          
          <div style={styles.optionRow}>
            <label htmlFor="tentative_connexion_max" style={styles.labelInline}>
              Tentatives de connexion max
            </label>
            <input
              type="number"
              id="tentative_connexion_max"
              name="tentative_connexion_max"
              value={settings.tentative_connexion_max}
              onChange={handleChange}
              min="3"
              max="10"
              style={styles.inputNumber}
            />
            <span style={styles.hint}>avant verrouillage</span>
          </div>
          
          <div style={styles.optionRow}>
            <label htmlFor="verrouillage_temporaire" style={styles.labelInline}>
              Durée de verrouillage (minutes)
            </label>
            <input
              type="number"
              id="verrouillage_temporaire"
              name="verrouillage_temporaire"
              value={settings.verrouillage_temporaire}
              onChange={handleChange}
              min="5"
              max="120"
              step="5"
              style={styles.inputNumber}
            />
            <span style={styles.hint}>après trop de tentatives</span>
          </div>
        </div>

        {/* Surveillance */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiEye size={20} color="#8b5cf6" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Surveillance et alertes</h3>
              <p style={styles.sectionDescription}>
                Recevez des alertes sur l'activité de votre compte
              </p>
            </div>
          </div>
          
          <div style={styles.option}>
            <input
              type="checkbox"
              id="historique_connexions"
              name="historique_connexions"
              checked={settings.historique_connexions}
              onChange={handleChange}
              style={styles.checkbox}
            />
            <label htmlFor="historique_connexions" style={styles.label}>
              <FiClock size={16} />
              <span>
                <strong>Historique des connexions</strong>
                <small>Conserver l'historique complet des connexions</small>
              </span>
            </label>
          </div>
          
          <div style={styles.option}>
            <input
              type="checkbox"
              id="notifications_connexion"
              name="notifications_connexion"
              checked={settings.notifications_connexion}
              onChange={handleChange}
              style={styles.checkbox}
            />
            <label htmlFor="notifications_connexion" style={styles.label}>
              <FiBell size={16} />
              <span>
                <strong>Alertes de connexion</strong>
                <small>Notifier en cas de nouvelle connexion</small>
              </span>
            </label>
          </div>
        </div>

        {/* Restriction IP */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiMapPin size={20} color="#ef4444" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Restriction IP</h3>
              <p style={styles.sectionDescription}>
                Limitez l'accès à des adresses IP spécifiques
              </p>
            </div>
          </div>
          
          <div style={styles.option}>
            <input
              type="checkbox"
              id="ip_restriction"
              name="ip_restriction"
              checked={settings.ip_restriction}
              onChange={handleChange}
              style={styles.checkbox}
            />
            <label htmlFor="ip_restriction" style={styles.label}>
              <FiMapPin size={16} />
              <span>
                <strong>Restriction par adresse IP</strong>
                <small>Limiter l'accès à certaines IP seulement</small>
              </span>
            </label>
          </div>

          {settings.ip_restriction && (
            <div style={styles.textareaGroup}>
              <label htmlFor="ip_whitelist" style={styles.labelTextarea}>
                Liste blanche d'IP (une par ligne)
              </label>
              <textarea
                id="ip_whitelist"
                name="ip_whitelist"
                value={settings.ip_whitelist}
                onChange={handleChange}
                placeholder="192.168.1.1&#10;10.0.0.1&#10;::1"
                rows="3"
                style={styles.textarea}
              />
              <span style={styles.hint}>
                <FiAlertTriangle size={12} /> Séparez chaque IP par un saut de ligne
              </span>
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button type="button" onClick={() => navigate('/parametres')} style={styles.cancelButton}>
            Annuler
          </button>
          <button type="submit" style={styles.saveButton} disabled={saving}>
            {saving ? (
              <>
                <div style={styles.savingSpinner}></div>
                Enregistrement...
              </>
            ) : (
              <>
                <FiSave /> Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  headerLeft: {
    flex: 1
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    marginBottom: '1rem'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#475569'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#065f46',
    fontSize: '0.875rem'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#991b1b',
    fontSize: '0.875rem'
  },
  form: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #f1f5f9'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  sectionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  sectionDescription: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    margin: '0.25rem 0 0 0'
  },
  option: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 0',
    borderRadius: '10px'
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 0',
    flexWrap: 'wrap'
  },
  checkbox: {
    marginTop: '0.125rem',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#2563eb'
  },
  label: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    cursor: 'pointer',
    flex: 1,
    fontSize: '0.875rem',
    color: '#334155'
  },
  labelInline: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    minWidth: '220px'
  },
  labelTextarea: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem'
  },
  subOption: {
    marginLeft: '2rem',
    padding: '0.5rem 0 0.5rem 1rem',
    borderLeft: '2px solid #e5e7eb',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569',
    cursor: 'pointer'
  },
  radio: {
    cursor: 'pointer',
    accentColor: '#2563eb'
  },
  inputNumber: {
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    width: '80px',
    fontSize: '0.875rem'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
    resize: 'vertical'
  },
  textareaGroup: {
    marginTop: '0.75rem',
    marginLeft: '1.75rem'
  },
  hint: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1rem'
  },
  cancelButton: {
    padding: '0.625rem 1.5rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#475569'
  },
  saveButton: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  savingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid white',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
  }
};

// Ajout des animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Securite;
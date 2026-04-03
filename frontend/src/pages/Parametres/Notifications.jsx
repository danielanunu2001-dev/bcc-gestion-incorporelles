import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiBell, FiMail, FiSmartphone, 
  FiAlertCircle, FiCalendar, FiUsers, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiSettings
} from 'react-icons/fi';

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState({
    email_alertes: true,
    email_rapports: true,
    email_activite: false,
    app_alertes: true,
    app_rapports: true,
    email_fin_licence: true,
    email_maintenance: true,
    app_fin_licence: true,
    app_maintenance: true
  });

  useEffect(() => {
    // Charger les préférences depuis localStorage au lieu de l'API
    loadPreferencesFromLocalStorage();
  }, []);

  const loadPreferencesFromLocalStorage = () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('notification_preferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Erreur chargement préférences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setPreferences(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Sauvegarder dans localStorage
      localStorage.setItem('notification_preferences', JSON.stringify(preferences));
      setSuccess('Paramètres de notification enregistrés avec succès');
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
    setPreferences({
      email_alertes: true,
      email_rapports: true,
      email_activite: false,
      app_alertes: true,
      app_rapports: true,
      email_fin_licence: true,
      email_maintenance: true,
      app_fin_licence: true,
      app_maintenance: true
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement de vos préférences...</p>
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
              <FiBell size={28} color="#3b82f6" />
            </div>
            <div>
              <h1 style={styles.title}>Notifications</h1>
              <p style={styles.subtitle}>
                Gérez vos préférences de notification par email et in-app
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
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiMail size={20} color="#3b82f6" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Notifications par email</h3>
              <p style={styles.sectionDescription}>
                Recevez des alertes directement dans votre boîte de réception
              </p>
            </div>
          </div>
          <div style={styles.optionsGrid}>
            <div style={styles.option}>
              <input
                type="checkbox"
                id="email_alertes"
                name="email_alertes"
                checked={preferences.email_alertes}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="email_alertes" style={styles.label}>
                <FiAlertCircle size={16} />
                <span>
                  <strong>Alertes d'amortissement</strong>
                  <small>Notification lors des calculs d'amortissement</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="email_rapports"
                name="email_rapports"
                checked={preferences.email_rapports}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="email_rapports" style={styles.label}>
                <FiCalendar size={16} />
                <span>
                  <strong>Rapports mensuels</strong>
                  <small>Récapitulatif mensuel des activités</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="email_activite"
                name="email_activite"
                checked={preferences.email_activite}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="email_activite" style={styles.label}>
                <FiUsers size={16} />
                <span>
                  <strong>Activité des utilisateurs</strong>
                  <small>Notifications sur les actions des utilisateurs</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="email_fin_licence"
                name="email_fin_licence"
                checked={preferences.email_fin_licence}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="email_fin_licence" style={styles.label}>
                <FiAlertCircle size={16} />
                <span>
                  <strong>Fin de licence</strong>
                  <small>Alertes avant expiration des licences</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="email_maintenance"
                name="email_maintenance"
                checked={preferences.email_maintenance}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="email_maintenance" style={styles.label}>
                <FiSettings size={16} />
                <span>
                  <strong>Maintenance</strong>
                  <small>Alertes de maintenance préventive</small>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiSmartphone size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Notifications in-app</h3>
              <p style={styles.sectionDescription}>
                Recevez des notifications dans l'application
              </p>
            </div>
          </div>
          <div style={styles.optionsGrid}>
            <div style={styles.option}>
              <input
                type="checkbox"
                id="app_alertes"
                name="app_alertes"
                checked={preferences.app_alertes}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="app_alertes" style={styles.label}>
                <FiAlertCircle size={16} />
                <span>
                  <strong>Alertes d'amortissement</strong>
                  <small>Notifications dans l'application</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="app_rapports"
                name="app_rapports"
                checked={preferences.app_rapports}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="app_rapports" style={styles.label}>
                <FiCalendar size={16} />
                <span>
                  <strong>Rapports mensuels</strong>
                  <small>Rapports disponibles dans l'app</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="app_fin_licence"
                name="app_fin_licence"
                checked={preferences.app_fin_licence}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="app_fin_licence" style={styles.label}>
                <FiAlertCircle size={16} />
                <span>
                  <strong>Fin de licence</strong>
                  <small>Alertes d'expiration de licence</small>
                </span>
              </label>
            </div>
            
            <div style={styles.option}>
              <input
                type="checkbox"
                id="app_maintenance"
                name="app_maintenance"
                checked={preferences.app_maintenance}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label htmlFor="app_maintenance" style={styles.label}>
                <FiSettings size={16} />
                <span>
                  <strong>Maintenance</strong>
                  <small>Alertes de maintenance</small>
                </span>
              </label>
            </div>
          </div>
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
    maxWidth: '1000px',
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
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem'
  },
  option: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '10px'
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

export default Notifications;
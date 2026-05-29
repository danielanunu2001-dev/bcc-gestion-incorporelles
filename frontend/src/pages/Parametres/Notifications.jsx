import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiBell, FiMail, FiSmartphone, 
  FiAlertCircle, FiCalendar, FiUsers, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiSettings, FiShield,
  FiClock, FiTrendingUp, FiFileText
} from 'react-icons/fi';

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('email');
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

  const tabs = [
    { id: 'email', label: 'Email', icon: <FiMail size={16} /> },
    { id: 'app', label: 'In-app', icon: <FiSmartphone size={16} /> },
    { id: 'resume', label: 'Résumé', icon: <FiFileText size={16} /> }
  ];

  const emailOptions = [
    { id: 'email_alertes', name: 'Alertes d\'amortissement', icon: <FiAlertCircle size={16} />, description: 'Notification lors des calculs d\'amortissement', color: '#f59e0b' },
    { id: 'email_rapports', name: 'Rapports mensuels', icon: <FiCalendar size={16} />, description: 'Récapitulatif mensuel des activités', color: '#3b82f6' },
    { id: 'email_activite', name: 'Activité des utilisateurs', icon: <FiUsers size={16} />, description: 'Notifications sur les actions des utilisateurs', color: '#8b5cf6' },
    { id: 'email_fin_licence', name: 'Fin de licence', icon: <FiClock size={16} />, description: 'Alertes avant expiration des licences', color: '#ef4444' },
    { id: 'email_maintenance', name: 'Maintenance', icon: <FiSettings size={16} />, description: 'Alertes de maintenance préventive', color: '#10b981' }
  ];

  const appOptions = [
    { id: 'app_alertes', name: 'Alertes d\'amortissement', icon: <FiAlertCircle size={16} />, description: 'Notifications dans l\'application', color: '#f59e0b' },
    { id: 'app_rapports', name: 'Rapports mensuels', icon: <FiCalendar size={16} />, description: 'Rapports disponibles dans l\'app', color: '#3b82f6' },
    { id: 'app_fin_licence', name: 'Fin de licence', icon: <FiClock size={16} />, description: 'Alertes d\'expiration de licence', color: '#ef4444' },
    { id: 'app_maintenance', name: 'Maintenance', icon: <FiSettings size={16} />, description: 'Alertes de maintenance', color: '#10b981' }
  ];

  const getStats = () => {
    const emailEnabled = Object.keys(preferences).filter(k => k.startsWith('email_') && preferences[k]).length;
    const appEnabled = Object.keys(preferences).filter(k => k.startsWith('app_') && preferences[k]).length;
    const totalEmail = Object.keys(preferences).filter(k => k.startsWith('email_')).length;
    const totalApp = Object.keys(preferences).filter(k => k.startsWith('app_')).length;
    return { emailEnabled, appEnabled, totalEmail, totalApp };
  };

  const stats = getStats();

  const animationStyles = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .fade-slide-up {
      animation: fadeSlideUp 0.4s ease-out;
    }
    .spin-animation {
      animation: spin 1s linear infinite;
    }
  `;

  if (loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Chargement de vos préférences...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      
      {/* Fond dégradé comme les autres pages */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <div style={styles.container}>
          
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <button onClick={() => navigate('/parametres')} style={styles.backButton}>
                <FiArrowLeft size={18} /> Retour
              </button>
              <div style={styles.headerInfo}>
                <div style={styles.iconWrapper}>
                  <FiBell size={28} color="#fff" />
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

          {/* Cartes statistiques */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}>
                <FiMail size={20} color="#3b82f6" />
              </div>
              <div>
                <div style={styles.statValue}>{stats.emailEnabled}/{stats.totalEmail}</div>
                <div style={styles.statLabel}>Notifications email actives</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: '#d1fae5' }}>
                <FiSmartphone size={20} color="#10b981" />
              </div>
              <div>
                <div style={styles.statValue}>{stats.appEnabled}/{stats.totalApp}</div>
                <div style={styles.statLabel}>Notifications in-app actives</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7' }}>
                <FiBell size={20} color="#f59e0b" />
              </div>
              <div>
                <div style={styles.statValue}>{stats.emailEnabled + stats.appEnabled}</div>
                <div style={styles.statLabel}>Total notifications actives</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {success && (
            <div style={styles.successMessage}>
              <FiCheckCircle size={20} />
              <span style={{ color: '#065f46' }}>{success}</span>
            </div>
          )}
          {error && (
            <div style={styles.errorMessage}>
              <FiXCircle size={20} />
              <span style={{ color: '#991b1b' }}>{error}</span>
            </div>
          )}

          {/* Onglets */}
          <div style={styles.tabsContainer}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.tabActive : {})
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Notifications Email */}
            {activeTab === 'email' && (
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
                  {emailOptions.map(option => (
                    <div key={option.id} style={styles.option}>
                      <input
                        type="checkbox"
                        id={option.id}
                        name={option.id}
                        checked={preferences[option.id]}
                        onChange={handleChange}
                        style={styles.checkbox}
                      />
                      <label htmlFor={option.id} style={styles.label}>
                        <div style={{ ...styles.optionIcon, color: option.color }}>
                          {option.icon}
                        </div>
                        <div style={styles.optionContent}>
                          <strong style={{ color: '#000000' }}>{option.name}</strong>
                          <small style={{ color: '#64748b' }}>{option.description}</small>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications In-app */}
            {activeTab === 'app' && (
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
                  {appOptions.map(option => (
                    <div key={option.id} style={styles.option}>
                      <input
                        type="checkbox"
                        id={option.id}
                        name={option.id}
                        checked={preferences[option.id]}
                        onChange={handleChange}
                        style={styles.checkbox}
                      />
                      <label htmlFor={option.id} style={styles.label}>
                        <div style={{ ...styles.optionIcon, color: option.color }}>
                          {option.icon}
                        </div>
                        <div style={styles.optionContent}>
                          <strong style={{ color: '#000000' }}>{option.name}</strong>
                          <small style={{ color: '#64748b' }}>{option.description}</small>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Résumé */}
            {activeTab === 'resume' && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionIcon}>
                    <FiFileText size={20} color="#8b5cf6" />
                  </div>
                  <div>
                    <h3 style={styles.sectionTitle}>Résumé de vos préférences</h3>
                    <p style={styles.sectionDescription}>
                      Synthèse de vos notifications actives
                    </p>
                  </div>
                </div>
                
                <div style={styles.summaryGrid}>
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryHeader}>
                      <FiMail size={18} color="#3b82f6" />
                      <strong style={{ color: '#000000' }}>Notifications email</strong>
                    </div>
                    <div style={styles.summaryList}>
                      {emailOptions.filter(opt => preferences[opt.id]).map(opt => (
                        <div key={opt.id} style={styles.summaryItem}>
                          <FiCheckCircle size={14} color="#10b981" />
                          <span style={{ color: '#000000' }}>{opt.name}</span>
                        </div>
                      ))}
                      {emailOptions.filter(opt => !preferences[opt.id]).length === emailOptions.length && (
                        <div style={styles.summaryEmpty}>Aucune notification email active</div>
                      )}
                    </div>
                  </div>
                  
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryHeader}>
                      <FiSmartphone size={18} color="#10b981" />
                      <strong style={{ color: '#000000' }}>Notifications in-app</strong>
                    </div>
                    <div style={styles.summaryList}>
                      {appOptions.filter(opt => preferences[opt.id]).map(opt => (
                        <div key={opt.id} style={styles.summaryItem}>
                          <FiCheckCircle size={14} color="#10b981" />
                          <span style={{ color: '#000000' }}>{opt.name}</span>
                        </div>
                      ))}
                      {appOptions.filter(opt => !preferences[opt.id]).length === appOptions.length && (
                        <div style={styles.summaryEmpty}>Aucune notification in-app active</div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <FiShield size={16} color="#3b82f6" />
                  <small style={{ color: '#000000' }}>Les notifications critiques sont toujours envoyées indépendamment de vos préférences</small>
                </div>
              </div>
            )}

            {/* Actions */}
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

          {/* Footer */}
          <div style={styles.footer}>
            <small style={styles.footerText}>
              <FiShield size={12} /> Préférences de notification sauvegardées localement
            </small>
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { flex: 1 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'white', marginBottom: '1rem' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '1.5rem', fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: 0 },
  headerActions: { display: 'flex', gap: '0.75rem' },
  resetButton: { padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'white' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: '1.25rem', fontWeight: 'bold', color: '#000000' },
  statLabel: { fontSize: '0.7rem', color: '#64748b' },
  successMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' },
  errorMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' },
  tabsContainer: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.95)', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  tab: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b', transition: 'all 0.2s' },
  tabActive: { backgroundColor: '#3b82f6', color: 'white' },
  form: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  section: { marginBottom: '2rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  sectionIcon: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#000000', margin: 0 },
  sectionDescription: { fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0' },
  optionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' },
  option: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '10px' },
  checkbox: { marginTop: '0.125rem', width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' },
  label: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', flex: 1, fontSize: '0.875rem', color: '#334155' },
  optionIcon: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  optionContent: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  summaryCard: { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' },
  summaryHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' },
  summaryList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  summaryItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#000000' },
  summaryEmpty: { fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem' },
  infoBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '0.75rem', marginTop: '1rem' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' },
  cancelButton: { padding: '0.625rem 1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: '#000000' },
  saveButton: { padding: '0.625rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  savingSpinner: { width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '400px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' },
  loadingText: { color: '#000000', fontSize: '0.875rem' },
  footer: { textAlign: 'center', marginTop: '2rem', paddingTop: '1rem' },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }
};

export default Notifications;
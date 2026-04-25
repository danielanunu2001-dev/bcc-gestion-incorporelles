import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiMail, FiSend, FiShield, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertCircle,
  FiLock, FiUnlock, FiUsers, FiBell, FiFileText,
  FiTrendingUp, FiGlobe, FiDollarSign, FiClock,
  FiServer, FiDatabase, FiZap, FiSettings
} from 'react-icons/fi';

const NotificationMailBCC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('smtp');
  const [config, setConfig] = useState({
    // Configuration SMTP
    smtp_server: 'mail.bcc.cd',
    smtp_port: '587',
    smtp_user: 'notifications@bcc.cd',
    smtp_password: '',
    sender_name: 'Banque Centrale du Congo',
    sender_email: 'no-reply@bcc.cd',
    use_ssl: true,
    use_tls: true,
    auth_method: 'login',
    
    // Paramètres généraux
    notifications_actives: true,
    notification_level: 'all',
    max_recipients: 50,
    retry_count: 3,
    timeout_seconds: 30,
    
    // Types de notifications BCC
    notifications: {
      connexion_anormale: true,
      modification_critique: true,
      cloture_exercice: true,
      operation_monetaire: true,
      reserves_change: true,
      rapport_politique: true,
      alerte_securite: true,
      rappel_audit: false,
      nouveau_utilisateur: true,
      suppression_donnee: true
    },
    
    // Destinataires par défaut
    destinataires: {
      admin: ['admin@bcc.cd', 'securite@bcc.cd'],
      direction: ['direction@bcc.cd'],
      comite_monetaire: ['comite.monetaire@bcc.cd'],
      audit: ['audit@bcc.cd']
    },
    
    // Planification des rapports
    rapports_planifies: {
      quotidien: false,
      hebdomadaire: true,
      mensuel: true,
      destinataire_rapport: 'direction@bcc.cd'
    }
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    const saved = localStorage.getItem('bcc_email_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...config, ...parsed });
      } catch (e) {
        console.error('Erreur chargement config:', e);
      }
    }
  };

  const saveConfig = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        localStorage.setItem('bcc_email_config', JSON.stringify(config));
        setSaveStatus({ success: true, message: 'Configuration email enregistrée avec succès !' });
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (error) {
        setSaveStatus({ success: false, message: 'Erreur lors de l\'enregistrement' });
        setTimeout(() => setSaveStatus(null), 3000);
      }
      setLoading(false);
    }, 500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNotificationChange = (type) => {
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: !prev.notifications[type]
      }
    }));
  };

  const handleTest = () => {
    setTestStatus({ type: 'sending', message: 'Envoi du test en cours...' });
    setTimeout(() => {
      const success = Math.random() > 0.2;
      if (success) {
        setTestStatus({ type: 'success', message: 'Email de test envoyé avec succès !' });
      } else {
        setTestStatus({ type: 'error', message: 'Échec de l\'envoi. Vérifiez vos paramètres SMTP.' });
      }
      setTimeout(() => setTestStatus(null), 5000);
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveConfig();
  };

  const tabs = [
    { id: 'smtp', label: 'Serveur SMTP', icon: <FiServer size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <FiBell size={16} /> },
    { id: 'destinataires', label: 'Destinataires', icon: <FiUsers size={16} /> },
    { id: 'rapports', label: 'Rapports', icon: <FiFileText size={16} /> }
  ];

  const getNotificationIcon = (type) => {
    const icons = {
      connexion_anormale: <FiAlertCircle size={14} />,
      modification_critique: <FiFileText size={14} />,
      cloture_exercice: <FiClock size={14} />,
      operation_monetaire: <FiTrendingUp size={14} />,
      reserves_change: <FiGlobe size={14} />,
      rapport_politique: <FiFileText size={14} />,
      alerte_securite: <FiShield size={14} />,
      nouveau_utilisateur: <FiUsers size={14} />
    };
    return icons[type] || <FiBell size={14} />;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/parametres')} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.iconWrapper}>
            <FiMail size={28} color="#10b981" />
          </div>
          <div>
            <h1 style={styles.title}>Configuration Email - BCC</h1>
            <p style={styles.subtitle}>
              Paramètres de notification et d'alerte pour la Banque Centrale du Congo
            </p>
          </div>
        </div>
      </div>

      {/* Messages de statut */}
      {saveStatus && (
        <div style={saveStatus.success ? styles.successMessage : styles.errorMessage}>
          {saveStatus.success ? <FiCheckCircle size={20} /> : <FiXCircle size={20} />}
          <span>{saveStatus.message}</span>
        </div>
      )}
      {testStatus && (
        <div style={testStatus.type === 'success' ? styles.successMessage : 
                   testStatus.type === 'error' ? styles.errorMessage : 
                   styles.infoMessage}>
          {testStatus.type === 'success' && <FiCheckCircle size={20} />}
          {testStatus.type === 'error' && <FiXCircle size={20} />}
          {testStatus.type === 'sending' && <FiRefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />}
          <span>{testStatus.message}</span>
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
        {/* Serveur SMTP */}
        {activeTab === 'smtp' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FiServer style={styles.sectionIcon} /> Configuration SMTP
            </h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Serveur SMTP</label>
                <input
                  type="text"
                  name="smtp_server"
                  value={config.smtp_server}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="smtp.bcc.cd"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Port</label>
                <input
                  type="text"
                  name="smtp_port"
                  value={config.smtp_port}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="587"
                  required
                />
              </div>
            </div>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" name="use_ssl" checked={config.use_ssl} onChange={handleChange} />
                <FiLock size={14} /> Utiliser SSL
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" name="use_tls" checked={config.use_tls} onChange={handleChange} />
                <FiShield size={14} /> Utiliser TLS
              </label>
            </div>

            <h3 style={{ ...styles.sectionTitle, marginTop: '1.5rem' }}>
              <FiLock style={styles.sectionIcon} /> Authentification
            </h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom d'utilisateur</label>
              <input
                type="text"
                name="smtp_user"
                value={config.smtp_user}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mot de passe</label>
              <input
                type="password"
                name="smtp_password"
                value={config.smtp_password}
                onChange={handleChange}
                style={styles.input}
                placeholder="••••••••"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Méthode d'authentification</label>
              <select name="auth_method" value={config.auth_method} onChange={handleChange} style={styles.select}>
                <option value="login">LOGIN</option>
                <option value="plain">PLAIN</option>
                <option value="cram-md5">CRAM-MD5</option>
              </select>
            </div>

            <h3 style={{ ...styles.sectionTitle, marginTop: '1.5rem' }}>
              <FiSend style={styles.sectionIcon} /> Expéditeur
            </h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nom de l'expéditeur</label>
                <input type="text" name="sender_name" value={config.sender_name} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Adresse email</label>
                <input type="email" name="sender_email" value={config.sender_email} onChange={handleChange} style={styles.input} required />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Niveau de notification</label>
              <select name="notification_level" value={config.notification_level} onChange={handleChange} style={styles.select}>
                <option value="all">Toutes les notifications</option>
                <option value="important">Notifications importantes uniquement</option>
                <option value="critical">Critiques uniquement</option>
              </select>
            </div>

            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" name="notifications_actives" checked={config.notifications_actives} onChange={handleChange} />
                Activer l'envoi des notifications
              </label>
            </div>
          </div>
        )}

        {/* Types de notifications BCC */}
        {activeTab === 'notifications' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FiBell style={styles.sectionIcon} /> Notifications BCC
            </h3>
            <div style={styles.notificationGrid}>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.connexion_anormale} onChange={() => handleNotificationChange('connexion_anormale')} />
                {getNotificationIcon('connexion_anormale')} Connexions anormales
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.modification_critique} onChange={() => handleNotificationChange('modification_critique')} />
                {getNotificationIcon('modification_critique')} Modifications critiques
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.cloture_exercice} onChange={() => handleNotificationChange('cloture_exercice')} />
                {getNotificationIcon('cloture_exercice')} Clôture d'exercice
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.operation_monetaire} onChange={() => handleNotificationChange('operation_monetaire')} />
                {getNotificationIcon('operation_monetaire')} Opérations monétaires
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.reserves_change} onChange={() => handleNotificationChange('reserves_change')} />
                {getNotificationIcon('reserves_change')} Réserves de change
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.rapport_politique} onChange={() => handleNotificationChange('rapport_politique')} />
                {getNotificationIcon('rapport_politique')} Rapports politique monétaire
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.alerte_securite} onChange={() => handleNotificationChange('alerte_securite')} />
                {getNotificationIcon('alerte_securite')} Alertes de sécurité
              </label>
              <label style={styles.notificationLabel}>
                <input type="checkbox" checked={config.notifications.nouveau_utilisateur} onChange={() => handleNotificationChange('nouveau_utilisateur')} />
                {getNotificationIcon('nouveau_utilisateur')} Nouveaux utilisateurs
              </label>
            </div>

            <div style={styles.infoBox}>
              <FiInfo size={16} color="#3b82f6" />
              <small>Les notifications critiques sont envoyées immédiatement, les autres peuvent être regroupées</small>
            </div>
          </div>
        )}

        {/* Destinataires par défaut */}
        {activeTab === 'destinataires' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FiUsers style={styles.sectionIcon} /> Destinataires
            </h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Administrateurs BCC</label>
              <input
                type="text"
                value={config.destinataires.admin.join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  destinataires: { ...config.destinataires, admin: e.target.value.split(',').map(s => s.trim()) }
                })}
                style={styles.input}
                placeholder="admin1@bcc.cd, admin2@bcc.cd"
              />
              <small style={styles.helper}>Séparez plusieurs adresses par des virgules</small>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Direction</label>
              <input
                type="text"
                value={config.destinataires.direction.join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  destinataires: { ...config.destinataires, direction: e.target.value.split(',').map(s => s.trim()) }
                })}
                style={styles.input}
                placeholder="direction@bcc.cd"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Comité monétaire</label>
              <input
                type="text"
                value={config.destinataires.comite_monetaire.join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  destinataires: { ...config.destinataires, comite_monetaire: e.target.value.split(',').map(s => s.trim()) }
                })}
                style={styles.input}
                placeholder="comite.monetaire@bcc.cd"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Audit</label>
              <input
                type="text"
                value={config.destinataires.audit.join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  destinataires: { ...config.destinataires, audit: e.target.value.split(',').map(s => s.trim()) }
                })}
                style={styles.input}
                placeholder="audit@bcc.cd"
              />
            </div>

            <div style={styles.infoBox}>
              <FiInfo size={16} color="#3b82f6" />
              <small>Ces adresses recevront les notifications selon leur niveau de priorité</small>
            </div>
          </div>
        )}

        {/* Rapports planifiés */}
        {activeTab === 'rapports' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FiClock style={styles.sectionIcon} /> Rapports planifiés
            </h3>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={config.rapports_planifies.quotidien} onChange={(e) => setConfig({
                  ...config,
                  rapports_planifies: { ...config.rapports_planifies, quotidien: e.target.checked }
                })} />
                Rapport quotidien
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={config.rapports_planifies.hebdomadaire} onChange={(e) => setConfig({
                  ...config,
                  rapports_planifies: { ...config.rapports_planifies, hebdomadaire: e.target.checked }
                })} />
                Rapport hebdomadaire
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={config.rapports_planifies.mensuel} onChange={(e) => setConfig({
                  ...config,
                  rapports_planifies: { ...config.rapports_planifies, mensuel: e.target.checked }
                })} />
                Rapport mensuel
              </label>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Destinataire des rapports</label>
              <input
                type="email"
                value={config.rapports_planifies.destinataire_rapport}
                onChange={(e) => setConfig({
                  ...config,
                  rapports_planifies: { ...config.rapports_planifies, destinataire_rapport: e.target.value }
                })}
                style={styles.input}
                placeholder="direction@bcc.cd"
              />
            </div>

            <div style={styles.infoBox}>
              <FiInfo size={16} color="#3b82f6" />
              <small>Les rapports sont envoyés à 8h00 le matin pour la période correspondante</small>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button type="submit" style={styles.saveButton} disabled={loading}>
            {loading ? <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} /> : <FiSave />}
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" onClick={handleTest} style={styles.testButton}>
            <FiSend /> Tester la configuration
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' },
  backButton: { padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.875rem', color: '#64748b', margin: 0 },
  successMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '10px', marginBottom: '1.5rem', color: '#065f46', fontSize: '0.875rem' },
  errorMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.875rem' },
  infoMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#e0f2fe', border: '1px solid #3b82f6', borderRadius: '10px', marginBottom: '1.5rem', color: '#075985', fontSize: '0.875rem' },
  tabsContainer: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: 'white', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  tab: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b', transition: 'all 0.2s' },
  tabActive: { backgroundColor: '#10b981', color: 'white' },
  form: { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  section: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  sectionIcon: { color: '#10b981' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: '500', color: '#64748b' },
  input: { width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' },
  select: { width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' },
  checkboxGroup: { display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#1e293b' },
  notificationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' },
  notificationLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#1e293b', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' },
  infoBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '0.75rem', color: '#3b82f6', marginTop: '1rem' },
  helper: { display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' },
  actions: { display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' },
  saveButton: { padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' },
  testButton: { padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}

export default NotificationMailBCC;
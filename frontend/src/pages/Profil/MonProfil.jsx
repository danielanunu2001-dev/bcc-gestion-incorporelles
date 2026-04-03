import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import { fetchMyProfile, updateMyProfile, changeMyPassword } from '../../store/usersSlice';
import { getMyRecentActivity } from '../../services/userService';
import {
  FiUser, FiMail, FiShield, FiCalendar,
  FiClock, FiSave, FiLock, FiLogOut,
  FiActivity, FiRefreshCw, FiEye, FiEyeOff
} from 'react-icons/fi';

const MonProfil = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: reduxUser } = useSelector((state) => state.auth);
  
  // ✅ Utilisation du state Redux pour le profil
  const { profile, loading, updating, error: reduxError } = useSelector((state) => state.users);
  
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Édition profil
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', email: '' });
  
  // Changement mot de passe
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    chargerProfil();
    chargerActivite();
  }, []);

  // ✅ Mettre à jour l'état local quand le profil Redux change
  useEffect(() => {
    if (profile) {
      setUser(profile);
      setEditForm({ full_name: profile.full_name, email: profile.email });
    }
  }, [profile]);

  // ✅ Gérer les erreurs Redux
  useEffect(() => {
    if (reduxError) {
      setError(reduxError);
      setTimeout(() => setError(''), 3000);
    }
  }, [reduxError]);

  const chargerProfil = async () => {
    try {
      const result = await dispatch(fetchMyProfile()).unwrap();
      setUser(result);
      setEditForm({ full_name: result.full_name, email: result.email });
    } catch (err) {
      setError('Erreur lors du chargement du profil');
      setTimeout(() => setError(''), 3000);
    }
  };

  const chargerActivite = async () => {
    try {
      setLoadingActivity(true);
      const data = await getMyRecentActivity(15);
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error('Erreur chargement activité:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await dispatch(updateMyProfile(editForm)).unwrap();
      setUser(updated);
      setIsEditing(false);
      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err || 'Erreur lors de la mise à jour');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setChangingPassword(true);
      await dispatch(changeMyPassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      })).unwrap();
      setSuccess('Mot de passe modifié avec succès');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err || 'Erreur lors du changement de mot de passe');
      setTimeout(() => setError(''), 3000);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleRefresh = () => {
    chargerActivite();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours} h`;
    if (days < 7) return `il y a ${days} j`;
    return formatDate(date);
  };

  const getActionIcon = (action) => {
    const icons = {
      'CREATE': '📝',
      'UPDATE': '✏️',
      'DELETE': '🗑️'
    };
    return icons[action] || '📌';
  };

  const getActionColor = (action) => {
    const colors = {
      'CREATE': '#10b981',
      'UPDATE': '#f59e0b',
      'DELETE': '#ef4444'
    };
    return colors[action] || '#6b7280';
  };

  const getEntityName = (tableName) => {
    const names = {
      'users': 'Utilisateur',
      'actifs': 'Actif',
      'contrats': 'Contrat',
      'categories_amortissement': 'Catégorie',
      'audit_logs': 'Log',
      'reevaluations': 'Réévaluation',
      'depreciations': 'Dépréciation',
      'documents': 'Document',
      'mouvements': 'Mouvement'
    };
    return names[tableName] || tableName;
  };

  const getRoleBadge = (role) => {
    const colors = {
      'admin': { bg: '#fee2e2', color: '#b91c1c' },
      'comptable': { bg: '#dbeafe', color: '#1e40af' },
      'auditeur': { bg: '#fef3c7', color: '#92400e' },
      'juridique': { bg: '#dcfce7', color: '#166534' },
      'informatique': { bg: '#e0f2fe', color: '#0369a1' },
      'inventoriste': { bg: '#f3e8ff', color: '#6b21a8' },
      'gestionnaire': { bg: '#f1f5f9', color: '#334155' }
    };
    const style = colors[role] || colors['gestionnaire'];
    return (
      <span style={{
        ...styles.roleBadge,
        backgroundColor: style.bg,
        color: style.color
      }}>
        {role}
      </span>
    );
  };

  // ✅ Amélioration de la description de l'activité
  const getActionDescription = (activity) => {
    const actions = {
      'CREATE': `Création d'un(e) ${getEntityName(activity.entity_type)}`,
      'UPDATE': `Modification d'un(e) ${getEntityName(activity.entity_type)}`,
      'DELETE': `Suppression d'un(e) ${getEntityName(activity.entity_type)}`
    };
    return activity.description || actions[activity.action] || `Action ${activity.action}`;
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement de votre profil...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Mon profil</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>
          <FiLogOut /> Déconnexion
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div style={styles.successMessage}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={styles.errorMessage}>
          ❌ {error}
        </div>
      )}

      {/* Onglets */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('info')}
          style={activeTab === 'info' ? styles.tabActive : styles.tab}
        >
          <FiUser /> Informations
        </button>
        <button
          onClick={() => setActiveTab('activite')}
          style={activeTab === 'activite' ? styles.tabActive : styles.tab}
        >
          <FiActivity /> Mon activité
        </button>
      </div>

      <div style={styles.tabContent}>
        {/* Onglet Informations */}
        {activeTab === 'info' && user && (
          <div style={styles.infoCard}>
            <div style={styles.infoHeader}>
              <div style={styles.avatar}>
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={styles.infoHeaderText}>
                {!isEditing ? (
                  <>
                    <h2 style={styles.userName}>{user.full_name}</h2>
                    <div style={styles.userEmail}>{user.email}</div>
                  </>
                ) : (
                  <div style={styles.editForm}>
                    <input
                      type="text"
                      name="full_name"
                      value={editForm.full_name}
                      onChange={handleEditChange}
                      placeholder="Nom complet"
                      style={styles.editInput}
                    />
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      placeholder="Email"
                      style={styles.editInput}
                    />
                    <div style={styles.editActions}>
                      <button onClick={handleSaveProfile} style={styles.saveButton} disabled={updating}>
                        <FiSave /> {updating ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button onClick={() => setIsEditing(false)} style={styles.cancelButton}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} style={styles.editProfileButton}>
                  <FiUser /> Modifier mon profil
                </button>
              )}
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <FiShield />
                <div>
                  <span style={styles.infoLabel}>Rôle</span>
                  <div>{getRoleBadge(user.role)}</div>
                </div>
              </div>

              <div style={styles.infoItem}>
                <FiCalendar />
                <div>
                  <span style={styles.infoLabel}>Compte créé le</span>
                  <span style={styles.infoValue}>{formatDate(user.created_at)}</span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <FiClock />
                <div>
                  <span style={styles.infoLabel}>Dernière modification</span>
                  <span style={styles.infoValue}>{formatDate(user.updated_at)}</span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <FiMail />
                <div>
                  <span style={styles.infoLabel}>Email</span>
                  <span style={styles.infoValue}>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Section changement mot de passe */}
            <div style={styles.passwordSection}>
              {!showPasswordForm ? (
                <button onClick={() => setShowPasswordForm(true)} style={styles.changePasswordButton}>
                  <FiLock /> Changer mon mot de passe
                </button>
              ) : (
                <form onSubmit={handleChangePassword} style={styles.passwordForm}>
                  <h4 style={styles.passwordTitle}>Changer le mot de passe</h4>
                  
                  <div style={styles.passwordField}>
                    <label>Ancien mot de passe</label>
                    <div style={styles.passwordInputWrapper}>
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                        required
                        style={styles.passwordInput}
                      />
                      <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} style={styles.eyeButton}>
                        {showOldPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={styles.passwordField}>
                    <label>Nouveau mot de passe</label>
                    <div style={styles.passwordInputWrapper}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                        style={styles.passwordInput}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}>
                        {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={styles.passwordField}>
                    <label>Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      style={styles.passwordInput}
                    />
                  </div>

                  <div style={styles.passwordActions}>
                    <button type="submit" disabled={changingPassword} style={styles.saveButton}>
                      {changingPassword ? 'Changement...' : 'Changer le mot de passe'}
                    </button>
                    <button type="button" onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }} style={styles.cancelButton}>
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Onglet Activité récente */}
        {activeTab === 'activite' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.sectionTitle}>
                <FiActivity /> Mon activité récente
              </h3>
              <button onClick={handleRefresh} style={styles.refreshButton}>
                <FiRefreshCw /> Rafraîchir
              </button>
            </div>

            {loadingActivity ? (
              <div style={styles.loadingSmall}>
                <div style={styles.spinnerSmall}></div>
                <p>Chargement de votre activité...</p>
              </div>
            ) : activities.length === 0 ? (
              <div style={styles.emptyState}>
                <FiActivity size={48} color="#cbd5e1" />
                <p>Aucune activité récente</p>
              </div>
            ) : (
              <div style={styles.activityList}>
                {activities.map((activity) => (
                  <div key={activity.id} style={styles.activityItem}>
                    <div style={{ ...styles.activityIcon, backgroundColor: `${getActionColor(activity.action)}20` }}>
                      <span style={{ color: getActionColor(activity.action) }}>{getActionIcon(activity.action)}</span>
                    </div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityHeader}>
                        <span style={styles.activityAction}>{getActionDescription(activity)}</span>
                        <span style={styles.activityTime}>{formatRelativeTime(activity.created_at)}</span>
                      </div>
                      <div style={styles.activityDetails}>
                        <span style={styles.activityEntity}>
                          {getEntityName(activity.entity_type)}
                        </span>
                        {activity.ip_address && (
                          <span style={styles.activityIp}>IP: {activity.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '1.75rem',
    color: '#1e293b',
    margin: 0
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0.5rem'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tabActive: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tabContent: {
    marginTop: '1.5rem'
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  infoHeaderText: {
    flex: 1
  },
  userName: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.5rem',
    color: '#1e293b'
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  editProfileButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569'
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  editInput: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    width: '250px'
  },
  editActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  saveButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem'
  },
  cancelButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  infoValue: {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  roleBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  passwordSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  changePasswordButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569'
  },
  passwordForm: {
    backgroundColor: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '1rem'
  },
  passwordTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    color: '#1e293b'
  },
  passwordField: {
    marginBottom: '1rem'
  },
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  passwordInput: {
    width: '100%',
    padding: '0.5rem 2rem 0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem'
  },
  eyeButton: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b'
  },
  passwordActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  refreshButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#475569'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  activityItem: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  activityIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem'
  },
  activityContent: {
    flex: 1
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '0.5rem'
  },
  activityAction: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  activityTime: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  activityDetails: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.7rem',
    color: '#64748b'
  },
  activityEntity: {
    padding: '0.125rem 0.5rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px'
  },
  activityIp: {
    fontFamily: 'monospace'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
  },
  loadingSmall: {
    textAlign: 'center',
    padding: '2rem'
  },
  spinner: {
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  spinnerSmall: {
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #2563eb',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 0.5rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#94a3b8'
  }
};

export default MonProfil;
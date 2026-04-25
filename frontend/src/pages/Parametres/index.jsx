import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiBell, FiShield, FiBook, FiCalendar, FiArchive,
  FiEye, FiDownload, FiMail, FiSettings, FiUser,
  FiLock, FiDatabase, FiFileText, FiGlobe, FiZap,
  FiChevronRight, FiHome
} from 'react-icons/fi';

const Parametres = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const userRole = user?.role;

  const sections = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Gérer les préférences de notification',
      icon: <FiBell size={24} />,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      path: '/parametres/notifications',
      allowedRoles: ['admin', 'super_admin', 'auditeur', 'comptable', 'informatique', 'user', 'gestionnaire', 'inventoriste', 'juridique'],
    },
    {
      id: 'securite',
      title: 'Sécurité',
      description: 'Paramètres de sécurité et authentification',
      icon: <FiShield size={24} />,
      iconBg: '#d1fae5',
      iconColor: '#10b981',
      path: '/parametres/securite',
      allowedRoles: ['admin', 'super_admin', 'auditeur', 'comptable', 'informatique', 'user', 'gestionnaire', 'inventoriste', 'juridique'],
    },
    {
      id: 'plan-comptable',
      title: 'Plan comptable GCEC',
      description: 'Configuration du plan comptable',
      icon: <FiBook size={24} />,
      iconBg: '#fed7aa',
      iconColor: '#f59e0b',
      path: '/parametres/plan-comptable',
      allowedRoles: ['admin', 'super_admin', 'comptable'],
    },
    {
      id: 'exercices-comptables',
      title: 'Exercices comptables',
      description: 'Gestion des exercices fiscaux',
      icon: <FiCalendar size={24} />,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      path: '/parametres/exercices-comptables',
      allowedRoles: ['admin', 'super_admin', 'comptable'],
    },
    {
      id: 'archive-legale',
      title: 'Archive légale',
      description: 'Archivage des documents légaux',
      icon: <FiArchive size={24} />,
      iconBg: '#f3e8ff',
      iconColor: '#8b5cf6',
      path: '/parametres/archive-legale',
      allowedRoles: ['admin', 'super_admin', 'auditeur', 'comptable', 'informatique', 'gestionnaire', 'inventoriste', 'juridique'],
    },
    {
      id: 'piste-audit',
      title: "Piste d'audit",
      description: "Configuration de la piste d'audit",
      icon: <FiEye size={24} />,
      iconBg: '#fce7f3',
      iconColor: '#ec4899',
      path: '/parametres/piste-audit',
      allowedRoles: ['admin', 'super_admin', 'auditeur'],
    },
    {
      id: 'export-donnees',
      title: 'Export de données',
      description: "Paramètres d'export des données",
      icon: <FiDownload size={24} />,
      iconBg: '#ccfbf1',
      iconColor: '#14b8a6',
      path: '/parametres/export-donnees',
      allowedRoles: ['admin', 'super_admin', 'auditeur', 'comptable', 'informatique', 'gestionnaire'],
    },
    {
      id: 'notification-mail',
      title: 'Notification mail',
      description: 'Configuration des emails',
      icon: <FiMail size={24} />,
      iconBg: '#ffedd5',
      iconColor: '#f97316',
      path: '/parametres/notification-mail',
      allowedRoles: ['admin', 'super_admin'],
    },
  ];

  // Filtrer les sections selon le rôle
  const filteredSections = sections.filter(section => 
    section.allowedRoles.includes(userRole)
  );

  // Vérifier si on est sur la page d'accueil des paramètres (exactement /parametres)
  const isMainPage = location.pathname === '/parametres';

  // Vérifier si une section est active
  const isSectionActive = (path) => {
    return location.pathname === path;
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  // Si on est sur une sous-page (pas la page principale), afficher uniquement l'Outlet
  if (!isMainPage) {
    return (
      <div style={styles.subPageContainer}>
        <div style={styles.subPageHeader}>
          <button 
            onClick={() => navigate('/parametres')} 
            style={styles.backButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
          >
            <FiChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            <span>Retour aux paramètres</span>
          </button>
          <div style={styles.subPageTitle}>
            <div style={styles.subPageIcon}>
              {filteredSections.find(s => location.pathname === s.path)?.icon}
            </div>
            <div>
              <h1 style={styles.subPageHeading}>
                {filteredSections.find(s => location.pathname === s.path)?.title}
              </h1>
              <p style={styles.subPageDesc}>
                {filteredSections.find(s => location.pathname === s.path)?.description}
              </p>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    );
  }

  // Page d'accueil des paramètres (affichage des cartes)
  return (
    <div style={styles.container}>
      {/* Header avec gradient */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerIcon}>
            <FiSettings size={32} color="#ffffff" />
          </div>
          <div>
            <h1 style={styles.title}>Paramètres</h1>
            <p style={styles.subtitle}>
              Gérez la configuration de votre application
            </p>
          </div>
        </div>
        <div style={styles.roleContainer}>
          <FiUser size={14} color="#64748b" />
          <span style={styles.roleLabel}>Rôle actuel</span>
          <span style={styles.roleBadge}>{userRole || 'Non défini'}</span>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiDatabase size={18} color="#3b82f6" /></div>
          <div><div style={styles.statValue}>{filteredSections.length}</div><div style={styles.statLabel}>Modules disponibles</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiLock size={18} color="#10b981" /></div>
          <div><div style={styles.statValue}>{sections.filter(s => s.allowedRoles.includes('admin')).length}</div><div style={styles.statLabel}>Réservés admin</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiGlobe size={18} color="#f59e0b" /></div>
          <div><div style={styles.statValue}>{sections.length - filteredSections.length}</div><div style={styles.statLabel}>Non accessibles</div></div>
        </div>
      </div>

      {/* Grille des paramètres */}
      <div style={styles.grid}>
        {filteredSections.map((item, index) => (
          <div
            key={index}
            style={styles.card}
            onClick={() => handleNavigate(item.path)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ ...styles.cardIconWrapper, backgroundColor: item.iconBg }}>
              <div style={{ ...styles.cardIcon, color: item.iconColor }}>
                {item.icon}
              </div>
            </div>
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardDescription}>{item.description}</p>
            </div>
            <div style={styles.cardArrow}>
              <FiChevronRight size={20} color="#cbd5e1" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          <FiSettings size={12} style={{ marginRight: '0.5rem' }} />
          Configuration avancée — Certains modules sont restreints selon votre profil
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  subPageContainer: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  subPageHeader: {
    marginBottom: '2rem',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    marginBottom: '1.5rem',
    transition: 'all 0.2s',
  },
  subPageTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  subPageIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#e0e7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPageHeading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0',
  },
  subPageDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  roleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '40px',
    border: '1px solid #e2e8f0',
  },
  roleLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  roleBadge: {
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
    textTransform: 'capitalize',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#64748b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    border: '1px solid #f1f5f9',
  },
  cardIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIcon: {
    fontSize: '1.5rem',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 0.25rem 0',
    color: '#1e293b',
  },
  cardDescription: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: 0,
  },
  cardArrow: {
    opacity: 0,
    transition: 'opacity 0.2s, transform 0.2s',
  },
  footer: {
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Animation pour la flèche au survol
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    div[style*="cursor: pointer"]:hover .card-arrow,
    .card:hover .card-arrow {
      opacity: 1 !important;
      transform: translateX(4px);
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Parametres;
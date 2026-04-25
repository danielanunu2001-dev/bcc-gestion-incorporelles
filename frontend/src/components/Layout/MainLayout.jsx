// frontend/src/components/Layout/MainLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
import FuturisticBackground from '../FuturisticBackground';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import usePermissions from '../../hooks/usePermissions';
import RoutePersister from './RoutePersister';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FiHome, FiPackage, FiTrendingDown, FiActivity,
  FiUsers, FiFileText, FiSettings, FiLogOut,
  FiMenu, FiX, FiBell, FiUser, FiChevronDown, FiCamera,
  FiAlertCircle, FiBarChart2, FiDollarSign, FiGrid,
  FiDatabase, FiTool, FiMail, FiSun, FiMoon, FiCheck,
  FiTrash2, FiCommand, FiSearch, FiRefreshCw,
  FiHelpCircle, FiShield, FiClipboard, FiStar, FiGithub,
  FiArrowUp, FiArrowDown, FiArrowLeft, FiArrowRight
} from 'react-icons/fi';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { can } = usePermissions();
  
  // États UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [actifAlertCount, setActifAlertCount] = useState(0);
  const [loadingAlertCount, setLoadingAlertCount] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(localStorage.getItem('lastSync') || 'Jamais');
  
  const searchInputRef = useRef(null);

  // Menu items avec icônes améliorées et couleurs
  const menuItems = [
    { 
      path: '/dashboard', 
      label: 'Tableau de bord', 
      icon: <FiHome />, 
      roles: ['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste'],
      color: '#3b82f6',
      shortcut: '⌘D'
    },
    { 
      path: '/actifs', 
      label: 'Actifs', 
      icon: <FiPackage />, 
      roles: ['admin', 'comptable', 'juridique', 'informatique'],
      color: '#10b981',
      shortcut: '⌘A'
    },
    { 
      path: '/inventaire', 
      label: 'Inventaire', 
      icon: <FiCamera />, 
      roles: ['admin', 'inventoriste'],
      color: '#f59e0b',
      shortcut: '⌘I'
    },
    { 
      path: '/audit', 
      label: 'Audit', 
      icon: <FiActivity />, 
      roles: ['admin', 'auditeur'],
      color: '#8b5cf6',
      shortcut: '⌘U'
    },
    { 
      path: '/utilisateurs', 
      label: 'Utilisateurs', 
      icon: <FiUsers />, 
      roles: ['admin'],
      color: '#ec4899',
      shortcut: '⌘E'
    },
    { 
      path: '/contrats', 
      label: 'Contrats', 
      icon: <FiFileText />, 
      roles: ['admin', 'juridique'],
      color: '#14b8a6',
      shortcut: '⌘C'
    },
    { 
      path: '/categories-amortissement', 
      label: 'Catégories', 
      icon: <FiGrid />, 
      roles: ['admin', 'comptable'],
      color: '#a855f7'
    },
    { 
      path: '/parametres/taux-change', 
      label: 'Taux de change', 
      icon: <FiDollarSign />, 
      roles: ['admin', 'comptable'],
      color: '#eab308'
    },
    { 
      path: '/parametres', 
      label: 'Paramètres', 
      icon: <FiSettings />, 
      roles: ['admin', 'comptable'],
      color: 'var(--text-secondary)'
    },
    { 
      path: '/rapports', 
      label: 'Rapports', 
      icon: <FiBarChart2 />, 
      roles: ['admin', 'comptable', 'auditeur'],
      color: '#ef4444'
    }
  ];

  // Filtrer les items selon les permissions
  const filteredMenu = menuItems.filter(item => 
    item.roles.some(role => can([role]))
  );

  // Raccourcis clavier
  const shortcuts = [
    { keys: ['⌘', 'K'], action: 'Ouvrir la command palette', icon: <FiCommand size={14} /> },
    { keys: ['⌘', 'D'], action: 'Tableau de bord', icon: <FiHome size={14} /> },
    { keys: ['⌘', 'A'], action: 'Liste des actifs', icon: <FiPackage size={14} /> },
    { keys: ['⌘', 'N'], action: 'Nouvel actif', icon: <FiPackage size={14} /> },
    { keys: ['⌘', 'R'], action: 'Rafraîchir les données', icon: <FiRefreshCw size={14} /> },
    { keys: ['⌘', '/'], action: 'Aide et raccourcis', icon: <FiHelpCircle size={14} /> },
    { keys: ['⌘', 'L'], action: 'Se déconnecter', icon: <FiLogOut size={14} /> },
    { keys: ['⌘', 'B'], action: 'Basculer la sidebar', icon: <FiMenu size={14} /> },
    { keys: ['ESC'], action: 'Fermer les modals', icon: <FiX size={14} /> }
  ];

  // Effet pour le message de bienvenue et l'heure
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 12) setGreeting('Bonjour');
      else if (hour < 18) setGreeting('Bon après-midi');
      else setGreeting('Bonsoir');
      
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Effet pour le statut en ligne
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      toast.success('Connexion rétablie', { icon: '🟢' });
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      toast.warning('Connexion perdue', { icon: '🔴', description: 'Vérifiez votre connexion internet' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effet pour les raccourcis clavier améliorés
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (modKey && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
      if (modKey && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      if (modKey && e.key === 'l') {
        e.preventDefault();
        handleLogout();
      }
      if (modKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setShowNotifications(false);
        setUserMenuOpen(false);
        setShowShortcuts(false);
        setShowHelpModal(false);
      }
      
      // Navigation rapide
      if (modKey && e.key === 'd') {
        e.preventDefault();
        navigate('/dashboard');
      }
      if (modKey && e.key === 'a') {
        e.preventDefault();
        navigate('/actifs');
      }
      if (modKey && e.key === 'n') {
        e.preventDefault();
        navigate('/actifs/nouveau');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Charger le nombre d'alertes pour les actifs
  useEffect(() => {
    const fetchActifAlertCount = async () => {
      try {
        setLoadingAlertCount(true);
        const response = await api.get('/reports/alertes');
        const alertes = response.data;
        
        let count = 0;
        count += alertes.finLicence?.length || 0;
        count += alertes.actifsEnMaintenance?.length || 0;
        count += alertes.anomalies?.length || 0;
        
        setActifAlertCount(count);
      } catch (err) {
        console.error('Erreur chargement compteur alertes actifs:', err);
        setActifAlertCount(0);
      } finally {
        setLoadingAlertCount(false);
      }
    };
    
    fetchActifAlertCount();
    const interval = setInterval(fetchActifAlertCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Charger les notifications depuis localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    } else {
      const defaultNotifications = [
        { id: 1, message: '3 licences expirent dans 30 jours', type: 'warning', time: 'Il y a 2h', read: false, date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { id: 2, message: 'Nouvel actif ajouté: PC-DELL-2025-001', type: 'info', time: 'Il y a 5h', read: false, date: new Date(Date.now() - 5 * 60 * 60 * 1000) },
        { id: 3, message: 'Amortissement mensuel calculé avec succès', type: 'success', time: 'Il y a 1j', read: false, date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { id: 4, message: 'Contrat de maintenance à renouveler', type: 'warning', time: 'Il y a 2j', read: false, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { id: 5, message: 'Rapport trimestriel disponible', type: 'info', time: 'Il y a 3j', read: false, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      ];
      setNotifications(defaultNotifications);
      localStorage.setItem('notifications', JSON.stringify(defaultNotifications));
    }
  }, []);

  // Sauvegarder les notifications dans localStorage
  const saveNotifications = (newNotifications) => {
    setNotifications(newNotifications);
    localStorage.setItem('notifications', JSON.stringify(newNotifications));
  };

  // Marquer une notification comme lue
  const markAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(notif =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    saveNotifications(updatedNotifications);
    toast.success('Notification marquée comme lue');
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
    saveNotifications(updatedNotifications);
    toast.success('Toutes les notifications ont été marquées comme lues');
  };

  // Supprimer une notification
  const deleteNotification = (notificationId) => {
    const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
    saveNotifications(updatedNotifications);
    toast.info('Notification supprimée');
  };

  // Supprimer toutes les notifications lues
  const clearReadNotifications = () => {
    const unreadNotifications = notifications.filter(notif => !notif.read);
    saveNotifications(unreadNotifications);
    toast.success('Notifications lues supprimées');
  };

  // Voir toutes les notifications
  const viewAllNotifications = () => {
    setShowNotifications(false);
    navigate('/parametres/notifications');
  };

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        api.get('/actifs'),
        api.get('/contrats'),
        api.get('/audit-logs/stats')
      ]);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('lastSync', timeStr);
      toast.success('Données synchronisées', { description: `Dernière sync: ${timeStr}` });
    } catch (err) {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compter les notifications non lues
  const unreadCount = notifications.filter(n => !n.read).length;

  // ==================== FONCTION HANDLELOGOUT CORRIGÉE ====================
  const handleLogout = () => {
    // 1. Afficher une confirmation avant de déconnecter
    const confirmLogout = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
    
    if (confirmLogout) {
      // 2. Dispatch l'action de logout du Redux store
      dispatch(logout());
      
      // 3. Supprimer le token du localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 4. Supprimer tous les headers d'authentification
      delete api.defaults.headers.common['Authorization'];
      
      // 5. Afficher un message de confirmation
      toast.success('Déconnexion réussie', {
        icon: '👋',
        description: 'À bientôt !'
      });
      
      // 6. Rediriger vers la page de connexion
      navigate('/login');
    }
  };
  // ==================== FIN DE LA MODIFICATION ====================

  const isActive = (path) => {
    if (path === '/rapports' && location.pathname.startsWith('/rapports')) return true;
    if (path === '/parametres' && location.pathname.startsWith('/parametres')) return true;
    return location.pathname === path;
  };

  const getPageTitle = () => {
    const activeItem = menuItems.find(item => isActive(item.path));
    if (activeItem) return activeItem.label;
    if (location.pathname === '/parametres/taux-change') return 'Taux de change';
    return 'Accueil';
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'warning': return <FiAlertCircle color="#f59e0b" size={16} />;
      case 'success': return <FiCheck color="#10b981" size={16} />;
      case 'info': return <FiBell color="#3b82f6" size={16} />;
      default: return <FiBell color='var(--text-secondary)' size={16} />;
    }
  };

  const filteredCommands = filteredMenu.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <FuturisticBackground />
      <RoutePersister>
      <div style={{ ...styles.container, backgroundColor: 'transparent' }}>
        {/* Statut en ligne */}
        <div style={{
          ...styles.onlineStatus,
          backgroundColor: onlineStatus ? '#10b981' : '#ef4444'
        }} />
        
        {/* Sidebar animée */}
        <motion.div
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
          style={{
            ...styles.sidebar,
            width: sidebarOpen ? '280px' : '80px',
            backgroundColor: darkMode ? '#0a0f1a' : 'var(--text-primary)'
          }}
        >
          <div style={styles.logoContainer}>
            <motion.div 
              style={styles.logoWrapper}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {sidebarOpen ? (
                <>
                  <span style={styles.logoIcon}>🇨🇩</span>
                  <h1 style={styles.logo}>BCC Gestion</h1>
                </>
              ) : (
                <h1 style={styles.logoMini}>🇨🇩</h1>
              )}
            </motion.div>
            <motion.button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={styles.menuToggle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </motion.button>
          </div>

          <nav style={styles.nav}>
            {filteredMenu.map((item, index) => (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(item.path)}
                style={{
                  ...styles.navItem,
                  backgroundColor: isActive(item.path) ? `${item.color}20` : 'transparent',
                  color: isActive(item.path) ? item.color : '#94a3b8',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  padding: sidebarOpen ? '0.75rem 1rem' : '0.75rem',
                  borderLeft: isActive(item.path) ? `3px solid ${item.color}` : '3px solid transparent'
                }}
                title={!sidebarOpen ? item.label : ''}
                whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.98 }}
              >
                <span style={{ ...styles.navIcon, color: isActive(item.path) ? item.color : '#94a3b8' }}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span style={styles.navLabel}>
                    {item.label}
                    {item.path === '/actifs' && actifAlertCount > 0 && (
                      <motion.span 
                        style={styles.badge}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        {actifAlertCount}
                      </motion.span>
                    )}
                    {sidebarOpen && (
                      <span style={styles.shortcutHint}>{item.shortcut}</span>
                    )}
                  </span>
                )}
              </motion.button>
            ))}
          </nav>

          {sidebarOpen && (
            <motion.div 
              style={styles.userInfo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div style={styles.userAvatar}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={styles.userDetails}>
                <div style={styles.userName}>{user?.full_name || 'Utilisateur'}</div>
                <div style={styles.userRole}>{user?.role || 'Rôle'}</div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Main content */}
        <div style={{
          ...styles.main,
          marginLeft: sidebarOpen ? '280px' : '80px'
        }}>
          <motion.header 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ ...styles.header, backgroundColor: darkMode ? '#1e293b' : 'var(--bg-card)' }}
          >
            <div style={styles.headerLeft}>
              <div style={styles.pageTitleWrapper}>
                <h2 style={{ ...styles.pageTitle, color: darkMode ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
                  {getPageTitle()}
                </h2>
                <span style={styles.pageTitleAccent}></span>
              </div>
              <div style={styles.syncInfo}>
                <FiRefreshCw size={12} />
                <span>Sync: {lastSyncTime}</span>
              </div>
            </div>
            
            <div style={styles.headerRight}>
              <div style={styles.timeWidget}>
                <span style={styles.timeIcon}>🕐</span>
                <span style={styles.timeText}>{currentTime}</span>
              </div>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRefresh}
                style={styles.iconButton}
                title="Rafraîchir (⌘R)"
                disabled={isRefreshing}
              >
                <FiRefreshCw className={isRefreshing ? 'spin' : ''} />
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDarkMode(!darkMode)} 
                style={styles.iconButton}
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {darkMode ? <FiSun /> : <FiMoon />}
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShortcuts(true)} 
                style={styles.iconButton}
                title="Aide (⌘/)"
              >
                <FiHelpCircle />
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setCommandPaletteOpen(true)} 
                style={styles.iconButton}
                title="Commandes (⌘K)"
              >
                <FiCommand />
              </motion.button>

              <div style={styles.notificationWrapper}>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNotifications(!showNotifications)} 
                  style={styles.iconButton}
                  title="Notifications"
                >
                  <FiBell />
                  {unreadCount > 0 && (
                    <motion.span 
                      style={styles.notificationBadge}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </motion.button>
                
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={styles.notificationDropdown}
                    >
                      <div style={styles.notificationHeader}>
                        <strong>Notifications</strong>
                        <div style={styles.notificationActions}>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={styles.markAllRead}>
                              <FiCheck size={12} /> Tout marquer lu
                            </button>
                          )}
                          {notifications.filter(n => n.read).length > 0 && (
                            <button onClick={clearReadNotifications} style={styles.clearRead}>
                              <FiTrash2 size={12} /> Supprimer lues
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div style={styles.notificationList}>
                        {notifications.length === 0 ? (
                          <div style={styles.noNotifications}>
                            <FiBell size={32} color="#cbd5e1" />
                            <p>Aucune notification</p>
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <motion.div 
                              key={notif.id} 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              style={{
                                ...styles.notificationItem,
                                backgroundColor: notif.read ? 'transparent' : '#fef3c7'
                              }}
                              onClick={() => markAsRead(notif.id)}
                              whileHover={{ backgroundColor: darkMode ? 'var(--text-primary)' : 'var(--bg-secondary)' }}
                            >
                              <div style={styles.notificationIcon}>
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div style={styles.notificationContent}>
                                <div style={styles.notificationMessage}>{notif.message}</div>
                                <div style={styles.notificationTime}>{notif.time}</div>
                              </div>
                              <motion.button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                style={styles.notificationDelete}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Supprimer"
                              >
                                <FiTrash2 size={12} />
                              </motion.button>
                            </motion.div>
                          ))
                        )}
                      </div>
                      
                      <button onClick={viewAllNotifications} style={styles.viewAllNotifications}>
                        Voir toutes les notifications →
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={styles.greetingWidget}>
                <span style={styles.greetingEmoji}>👋</span>
                <span style={styles.greetingText}>{greeting},</span>
                <strong style={styles.greetingName}>{user?.full_name?.split(' ')[0] || 'User'}</strong>
              </div>

              <div style={styles.userMenu}>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={styles.userMenuButton}
                >
                  <div style={styles.userMenuAvatar}>
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <FiChevronDown size={16} />
                </motion.button>
                
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={styles.userMenuDropdown}
                    >
                      <div style={styles.userMenuHeader}>
                        <div style={styles.userMenuAvatarLarge}>
                          {user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <strong>{user?.full_name || 'Utilisateur'}</strong>
                          <span>{user?.email || 'email@example.com'}</span>
                        </div>
                      </div>
                      <motion.button 
                        style={styles.userMenuItem} 
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/parametres/profil');
                        }}
                        whileHover={{ x: 4 }}
                      >
                        <FiUser /> Mon profil
                      </motion.button>
                      <motion.button 
                        style={styles.userMenuItem} 
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/parametres/notifications');
                        }}
                        whileHover={{ x: 4 }}
                      >
                        <FiBell /> Notifications
                        {unreadCount > 0 && <span style={styles.menuBadge}>{unreadCount}</span>}
                      </motion.button>
                      <motion.button 
                        style={styles.userMenuItem} 
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/parametres/securite');
                        }}
                        whileHover={{ x: 4 }}
                      >
                        <FiShield /> Sécurité
                      </motion.button>
                      <hr style={styles.userMenuDivider} />
                      <motion.button 
                        onClick={handleLogout} 
                        style={styles.userMenuItemLogout}
                        whileHover={{ x: 4, color: '#dc2626' }}
                      >
                        <FiLogOut /> Déconnexion (⌘L)
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.header>

          <main style={styles.content}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={styles.contentWrapper}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>

        {/* Command Palette améliorée */}
        <AnimatePresence>
          {commandPaletteOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.commandOverlay}
              onClick={() => setCommandPaletteOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -20 }}
                style={styles.commandPalette}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.commandSearch}>
                  <FiSearch size={20} color="#666" />
                  <input
                    type="text"
                    placeholder="Rechercher une action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.commandInput}
                    autoFocus
                    ref={searchInputRef}
                  />
                  <FiX size={20} color="#666" onClick={() => setCommandPaletteOpen(false)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={styles.commandList}>
                  {filteredCommands.map((item, index) => (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={styles.commandItem}
                      onClick={() => {
                        navigate(item.path);
                        setCommandPaletteOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        {item.label}
                      </span>
                      <span style={styles.commandShortcut}>{item.shortcut}</span>
                    </motion.div>
                  ))}
                  {filteredCommands.length === 0 && (
                    <div style={styles.noResults}>
                      <FiSearch size={32} color="#cbd5e1" />
                      <p>Aucun résultat trouvé</p>
                    </div>
                  )}
                </div>
                <div style={styles.commandFooter}>
                  <span><FiCommand size={12} /> pour commander</span>
                  <span><FiArrowUp size={12} /> <FiArrowDown size={12} /> naviguer</span>
                  <span><FiCheck size={12} /> sélectionner</span>
                  <span><FiX size={12} /> fermer</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal des raccourcis clavier */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.modalOverlay}
              onClick={() => setShowShortcuts(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -20 }}
                style={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.modalHeader}>
                  <h3 style={styles.modalTitle}>
                    <FiCommand size={18} /> Raccourcis clavier
                  </h3>
                  <button onClick={() => setShowShortcuts(false)} style={styles.modalClose}>
                    <FiX size={20} />
                  </button>
                </div>
                <div style={styles.shortcutsList}>
                  {shortcuts.map((shortcut, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      style={styles.shortcutItem}
                    >
                      <div style={styles.shortcutIcon}>{shortcut.icon}</div>
                      <div style={styles.shortcutAction}>{shortcut.action}</div>
                      <div style={styles.shortcutKeys}>
                        {shortcut.keys.map((key, i) => (
                          <kbd key={i} style={styles.shortcutKey}>{key}</kbd>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div style={styles.modalFooter}>
                  <button onClick={() => setShowShortcuts(false)} style={styles.modalButton}>
                    Fermer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </RoutePersister>
    </>
  );
};

// ============ STYLES CORRIGÉS ============

const styles = {
  container: {
    minHeight: '100vh',
    transition: 'background-color 0.3s ease'
  },
  onlineStatus: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    zIndex: 2000,
    transition: 'background-color 0.3s ease'
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    overflow: 'hidden',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, rgba(2,6,23,0.85) 0%, rgba(15,23,42,0.75) 50%, rgba(30,27,75,0.85) 100%)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    borderRight: '1px solid rgba(0,255,247,0.18)',
    boxShadow: '4px 0 40px rgba(0,0,0,0.5), inset -1px 0 0 rgba(0,255,247,0.1)'
  },
  logoContainer: {
    padding: '1.5rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  logoWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer'
  },
  logoIcon: {
    fontSize: '1.8rem'
  },
  logo: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '2px',
    textShadow: '0 0 20px rgba(0,255,247,0.5)',
    filter: 'drop-shadow(0 0 10px rgba(0,255,247,0.4))'
  },
  logoMini: {
    fontSize: '1.5rem',
    margin: 0,
    color: 'var(--bg-card)'
  },
  menuToggle: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  nav: {
    flex: 1,
    padding: '1rem 0.5rem',
    overflowY: 'auto'
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    border: '1px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    borderRadius: '12px',
    margin: '0.25rem 0',
    padding: '0.75rem 1rem',
    position: 'relative',
    backdropFilter: 'blur(8px)'
  },
  navIcon: {
    fontSize: '1.2rem',
    minWidth: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  navLabel: {
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1
  },
  badge: {
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    fontSize: '0.7rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '10px',
    marginLeft: '0.5rem'
  },
  shortcutHint: {
    fontSize: '0.6rem',
    color: '#94a3b8',
    marginLeft: 'auto',
    opacity: 0.6
  },
  userInfo: {
    padding: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '0.5rem'
  },
  userAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 50%, #ec4899 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff',
    border: '2px solid rgba(0,255,247,0.4)',
    boxShadow: '0 0 20px rgba(0,255,247,0.4), inset 0 0 10px rgba(255,255,255,0.2)'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--bg-card)'
  },
  userRole: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'capitalize'
  },
  main: {
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh'
  },
  header: {
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(30,41,59,0.55) 100%)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    borderBottom: '1px solid rgba(0,255,247,0.2)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.3), 0 0 20px rgba(0,255,247,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 999,
    transition: 'all 0.3s ease'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  syncInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-primary)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },
  pageTitleWrapper: {
    position: 'relative'
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.5px',
    filter: 'drop-shadow(0 0 10px rgba(0,255,247,0.4))',
    transition: 'color 0.3s ease'
  },
  pageTitleAccent: {
    position: 'absolute',
    bottom: '-4px',
    left: 0,
    width: '60px',
    height: '3px',
    background: 'linear-gradient(90deg, #00fff7, #7c3aed, transparent)',
    borderRadius: '2px',
    boxShadow: '0 0 10px rgba(0,255,247,0.6)'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  timeWidget: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(0,255,247,0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    fontSize: '0.875rem',
    color: '#00fff7',
    boxShadow: '0 0 15px rgba(0,255,247,0.1)'
  },
  timeIcon: {
    fontSize: '1rem'
  },
  timeText: {
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  iconButton: {
    background: 'rgba(15,23,42,0.4)',
    border: '1px solid rgba(0,255,247,0.15)',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#00fff7',
    padding: '0.5rem',
    borderRadius: '10px',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  notificationWrapper: {
    position: 'relative'
  },
  notificationBadge: {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    fontSize: '0.7rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '10px',
    minWidth: '18px',
    textAlign: 'center'
  },
  notificationDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: '380px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    marginTop: '0.5rem',
    zIndex: 1000,
    overflow: 'hidden'
  },
  notificationHeader: {
    padding: '1rem',
    borderBottom: `1px solid var(--border-color)`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  notificationActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  markAllRead: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },
  clearRead: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },
  notificationList: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  noNotifications: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8'
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderBottom: `1px solid var(--border-color)`,
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  notificationIcon: {
    marginTop: '0.125rem'
  },
  notificationContent: {
    flex: 1
  },
  notificationMessage: {
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
    color: 'var(--text-primary)'
  },
  notificationTime: {
    fontSize: '0.7rem',
    color: '#9ca3af'
  },
  notificationDelete: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '4px',
    transition: 'opacity 0.2s'
  },
  viewAllNotifications: {
    width: '100%',
    padding: '0.75rem',
    background: 'none',
    border: 'none',
    borderTop: `1px solid var(--border-color)`,
    color: '#3b82f6',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },
  greetingWidget: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.875rem',
    color: '#e2e8f0',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,255,247,0.1))',
    border: '1px solid rgba(0,255,247,0.25)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    boxShadow: '0 0 15px rgba(124,58,237,0.15)'
  },
  greetingEmoji: {
    fontSize: '1rem'
  },
  greetingText: {
    marginLeft: '0.25rem'
  },
  greetingName: {
    color: 'var(--text-primary)',
    marginLeft: '0.25rem'
  },
  userMenu: {
    position: 'relative'
  },
  userMenuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  },
  userMenuAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    border: '2px solid rgba(0,255,247,0.4)',
    boxShadow: '0 0 15px rgba(0,255,247,0.4)'
  },
  userMenuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: '280px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    marginTop: '0.5rem',
    zIndex: 1000,
    overflow: 'hidden'
  },
  userMenuHeader: {
    padding: '1rem',
    borderBottom: `1px solid var(--border-color)`,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userMenuAvatarLarge: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  userMenuItem: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    transition: 'background-color 0.2s',
    textAlign: 'left',
    position: 'relative'
  },
  userMenuItemLogout: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9rem',
    color: '#ef4444',
    transition: 'background-color 0.2s',
    textAlign: 'left'
  },
  menuBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    fontSize: '0.7rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '10px'
  },
  userMenuDivider: {
    margin: '0.5rem 0',
    border: 'none',
    borderTop: `1px solid var(--border-color)`
  },
  content: {
    padding: '2rem'
  },
  contentWrapper: {
    animation: 'fadeIn 0.3s ease'
  },
  // Command Palette
  commandOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '10vh',
    zIndex: 1100,
    backdropFilter: 'blur(4px)'
  },
  commandPalette: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '90%',
    maxWidth: '640px',
    overflow: 'hidden'
  },
  commandSearch: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    borderBottom: `1px solid var(--border-color)`
  },
  commandInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    backgroundColor: 'transparent'
  },
  commandList: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  commandItem: {
    padding: '0.875rem 1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.95rem',
    borderBottom: `1px solid var(--border-color)`,
    justifyContent: 'space-between'
  },
  commandShortcut: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  commandFooter: {
    padding: '0.75rem 1rem',
    borderTop: `1px solid var(--border-color)`,
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#94a3b8',
    backgroundColor: 'var(--bg-secondary)'
  },
  noResults: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8'
  },
  // Modals
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: `1px solid var(--border-color)`
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  shortcutsList: {
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  shortcutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px'
  },
  shortcutIcon: {
    width: '28px',
    color: 'var(--text-secondary)'
  },
  shortcutAction: {
    flex: 1,
    fontSize: '0.875rem'
  },
  shortcutKeys: {
    display: 'flex',
    gap: '0.25rem'
  },
  shortcutKey: {
    padding: '0.125rem 0.375rem',
    backgroundColor: 'var(--border-color)',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  modalFooter: {
    padding: '1rem 1.5rem',
    borderTop: `1px solid var(--border-color)`,
    display: 'flex',
    justifyContent: 'flex-end'
  },
  modalButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};

// Ajout des animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  button {
    transition: all 0.2s ease;
  }
  
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;
document.head.appendChild(styleSheet);

export default MainLayout;
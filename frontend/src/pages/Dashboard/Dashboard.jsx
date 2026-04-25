// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchActifs, 
  selectActifs, 
  selectActifsLoading, 
  selectActifsStatistiques,
  selectTotalActifs,
  selectValeurNetteTotale
} from '../../store/actifSlice';
import { fetchAuditLogs, selectAuditLogs, selectAuditLoading } from '../../store/auditSlice';
import { fetchUsers, selectUsers, selectUsersLoading } from '../../store/usersSlice';
import usePermissions from '../../hooks/usePermissions';
import api from '../../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart
} from 'recharts';
import {
  FiPackage, FiDollarSign, FiTrendingUp, FiClock,
  FiEye, FiRefreshCw, FiHome, FiUsers, FiActivity,
  FiFileText, FiAlertCircle, FiTrendingDown, FiGrid, FiList,
  FiMoon, FiSun, FiDownload, FiSearch, FiCommand, FiFilter, FiX, FiCalendar, FiBarChart2,
  FiShield, FiBell, FiCheckCircle, FiPieChart
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ==================== COMPOSANT TYPEWRITER PERSONNALISÉ ====================
const Typewriter = ({ words, loop = true, cursor = true, typeSpeed = 70, deleteSpeed = 50, delaySpeed = 2000 }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  useEffect(() => {
    let timeout;

    const handleTyping = () => {
      const currentWord = words[currentIndex];
      
      if (isDeleting) {
        setCurrentText(prev => prev.slice(0, -1));
        
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % words.length);
          if (!loop && loopCount + 1 >= words.length) {
            return;
          }
          setLoopCount(prev => prev + 1);
        }
        timeout = setTimeout(handleTyping, deleteSpeed);
      } else {
        if (currentText.length < currentWord.length) {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
          timeout = setTimeout(handleTyping, typeSpeed);
        } else {
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, delaySpeed);
        }
      }
    };

    timeout = setTimeout(handleTyping, typeSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, isDeleting, words, typeSpeed, deleteSpeed, delaySpeed, loop, loopCount]);

  return (
    <span>
      {currentText}
      {cursor && <span className="typewriter-cursor">|</span>}
    </span>
  );
};

// ==================== COMMAND PALETTE ====================
const CommandPalette = ({ isOpen, onClose, navigate, darkMode }) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  const commands = [
    { id: 'actifs', label: 'Voir tous les actifs', icon: <FiPackage />, action: () => navigate('/actifs') },
    { id: 'add-actif', label: 'Ajouter un actif', icon: <FiPackage />, action: () => navigate('/actifs/nouveau') },
    { id: 'users', label: 'Gestion utilisateurs', icon: <FiUsers />, action: () => navigate('/utilisateurs') },
    { id: 'rapports', label: 'Rapports et alertes', icon: <FiFileText />, action: () => navigate('/rapports/alertes') },
    { id: 'export', label: 'Exporter les données', icon: <FiDownload />, action: () => toast.success('Export lancé !') },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.commandOverlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: -20 }}
          style={{...styles.commandPalette, backgroundColor: darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)'}}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{...styles.commandSearch, borderBottomColor: darkMode ? 'rgba(0,255,247,0.15)' : '#e2e8f0'}}>
            <FiSearch size={20} style={{ color: darkMode ? '#64748b' : '#94a3b8' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher une action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{...styles.commandInput, color: darkMode ? '#e2e8f0' : '#1e293b'}}
            />
            <FiX size={20} onClick={onClose} style={{ cursor: 'pointer', color: darkMode ? '#64748b' : '#94a3b8' }} />
          </div>
          <div style={styles.commandList}>
            {filteredCommands.map((cmd, index) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{...styles.commandItem, borderBottomColor: darkMode ? 'rgba(0,255,247,0.08)' : '#e2e8f0'}}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: darkMode ? '#e2e8f0' : '#1e293b' }}>
                  {cmd.icon}
                  {cmd.label}
                </span>
              </motion.div>
            ))}
            {filteredCommands.length === 0 && (
              <div style={styles.noResults}>Aucun résultat trouvé</div>
            )}
          </div>
          <div style={{...styles.commandFooter, borderTopColor: darkMode ? 'rgba(0,255,247,0.15)' : '#e2e8f0', backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : '#f8f9fa'}}>
            <span><FiCommand size={12} /> pour commander</span>
            <span><FiSearch size={12} /> pour rechercher</span>
            <span><FiX size={12} /> pour fermer</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { can } = usePermissions();
  
  // SÉLECTEURS
  const actifs = useSelector(selectActifs);
  const actifsLoading = useSelector(selectActifsLoading);
  const totalActifs = useSelector(selectTotalActifs);
  const valeurNetteTotale = useSelector(selectValeurNetteTotale);
  
  const auditLogs = useSelector(selectAuditLogs);
  const auditLoading = useSelector(selectAuditLoading);
  
  const users = useSelector(selectUsers);
  const usersLoading = useSelector(selectUsersLoading);
  
  const { user = {} } = useSelector((state) => state.auth || {});
  
  // DÉTERMINER SI L'UTILISATEUR PEUT VOIR L'AUDIT
  const role = user?.role || 'guest';
  const canViewAudit = ['admin', 'auditeur'].includes(role);
  const canViewUsers = ['admin', 'auditeur'].includes(role);
  
  // États locaux
  const [alertes, setAlertes] = useState({ 
    finLicence: [], 
    maintenance: [], 
    anomalies: [],
    echeancesContrats: [],
    actifsEnMaintenance: [] 
  });
  const [loadingAlertes, setLoadingAlertes] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);
  const [targetValue, setTargetValue] = useState(0);
  const [displayType, setDisplayType] = useState('grid');
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  
  // Nouveaux états
  const [darkMode, setDarkMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('6months');

  const isAdmin = user?.role === 'admin';

  // FONCTIONS UTILITAIRES
  const getTypeLabel = (type) => {
    const labels = {
      'logiciel': 'Logiciel',
      'brevet': 'Brevet',
      'licence': 'Licence',
      'fonds_commercial': 'Fonds commercial',
      'materiel': 'Matériel',
      'vehicule': 'Véhicule',
      'bâtiment': 'Bâtiment',
      'terrain': 'Terrain',
      'autres': 'Autres'
    };
    return labels[type] || type;
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `${(value || 0).toLocaleString()} FC`;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const COLORS = ['#00fff7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  // Fonction memoïsée pour charger les alertes
  const fetchAlertes = useCallback(async () => {
    try {
      setLoadingAlertes(true);
      const res = await api.get('/reports/alertes');
      setAlertes(res.data);
    } catch (err) {
      console.error('Erreur chargement alertes:', err);
    } finally {
      setLoadingAlertes(false);
    }
  }, []);

  // Effet pour charger les données
  useEffect(() => {
    if (dispatch) {
      dispatch(fetchActifs({}));
      
      if (canViewAudit && typeof fetchAuditLogs === 'function') {
        dispatch(fetchAuditLogs({ limit: 10 }));
      }
      
      if (typeof fetchUsers === 'function' && isAdmin) {
        dispatch(fetchUsers({}));
      }
    }
    fetchAlertes();
    
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('Bonjour');
    else if (hour < 18) setTimeOfDay('Bon après-midi');
    else setTimeOfDay('Bonsoir');
  }, [dispatch, isAdmin, fetchAlertes, canViewAudit]);

  // Effet pour l'animation du compteur
  useEffect(() => {
    const totalValue = actifs?.reduce((sum, a) => sum + (parseFloat(a.cout_acquisition) || 0), 0) || 0;
    setTargetValue(totalValue);
    setCurrentValue(0);
    
    const interval = setInterval(() => {
      setCurrentValue(prev => {
        if (prev >= targetValue) return targetValue;
        return Math.min(prev + Math.ceil(targetValue / 50), targetValue);
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [actifs]);

  // Effet pour le message de bienvenue animé
  useEffect(() => {
    const messages = ['🌟', '📊', '💰', '📈', '🎯'];
    let index = 0;
    const interval = setInterval(() => {
      setGreeting(messages[index % messages.length]);
      index++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Effet pour le raccourci CMD+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============ DONNÉES POUR LES GRAPHIQUES ============
  
  const evolutionData = useMemo(() => {
    if (!actifs || actifs.length === 0) return [];
    
    const data = [];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthsCount = timeFilter === '1year' ? 12 : 6;
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      
      const actifsMonth = actifs.filter(a => {
        if (!a.date_acquisition) return false;
        const aDate = new Date(a.date_acquisition);
        return aDate.getMonth() === monthIndex && aDate.getFullYear() === year;
      });
      
      data.push({
        name: months[monthIndex],
        actifs: actifsMonth.length,
        valeur: actifsMonth.reduce((sum, a) => sum + (parseFloat(a.cout_acquisition) || 0), 0) / 1000000,
      });
    }
    return data;
  }, [actifs, timeFilter]);

  const typeData = useMemo(() => {
    if (!actifs || actifs.length === 0) return [];
    
    const types = {};
    actifs.forEach(a => {
      const type = a.type || 'autres';
      types[type] = (types[type] || 0) + 1;
    });
    
    return Object.entries(types).map(([name, value]) => ({
      name: getTypeLabel(name),
      value
    }));
  }, [actifs]);

  const amortissementData = useMemo(() => {
    if (!actifs || actifs.length === 0) return [];
    
    return actifs.slice(0, 8).map(a => ({
      name: a.nom?.substring(0, 15) || 'N/A',
      valeurBrute: parseFloat(a.cout_acquisition) || 0,
      valeurNette: parseFloat(a.valeur_nette) || parseFloat(a.cout_acquisition) || 0,
    }));
  }, [actifs]);

  const natureData = useMemo(() => {
    return [
      { name: 'Corporel', value: actifs?.filter(a => a.type_immobilisation === 'corporel').length || 0 },
      { name: 'Incorporel', value: actifs?.filter(a => a.type_immobilisation === 'incorporel').length || 0 }
    ];
  }, [actifs]);

  const derniersAjouts = useMemo(() => {
    return actifs && actifs.length > 0
      ? [...actifs]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 8)
      : [];
  }, [actifs]);

  const topActifsParValeur = useMemo(() => {
    return actifs && actifs.length > 0
      ? [...actifs]
          .sort((a, b) => (parseFloat(b.cout_acquisition) || 0) - (parseFloat(a.cout_acquisition) || 0))
          .slice(0, 5)
          .map(a => ({
            name: a.nom?.substring(0, 20) || 'N/A',
            valeur: (parseFloat(a.cout_acquisition) || 0) / 1000000
          }))
      : [];
  }, [actifs]);

  const totalAlertes = useMemo(() => {
    return (alertes.finLicence?.length || 0) + 
           (alertes.maintenance?.length || 0) + 
           (alertes.anomalies?.length || 0) +
           (alertes.echeancesContrats?.length || 0) +
           (alertes.actifsEnMaintenance?.length || 0);
  }, [alertes]);

  const totalNette = useMemo(() => {
    return actifs?.reduce((sum, a) => sum + (parseFloat(a.valeur_nette) || parseFloat(a.cout_acquisition) || 0), 0) || 0;
  }, [actifs]);

  // Styles dynamiques
  const bgColor = darkMode ? '#0f172a' : '#f1f5f9';
  const cardBg = darkMode ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.9)';
  const textColor = darkMode ? '#e2e8f0' : '#1e293b';
  const textMuted = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? 'rgba(0,255,247,0.15)' : '#e2e8f0';

  if (actifsLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: textMuted }}>Chargement des données...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{...styles.container, backgroundColor: bgColor}}
    >
      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        navigate={navigate}
        darkMode={darkMode}
      />

      {/* Barre d'actions supérieure */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{...styles.actionBar, backgroundColor: cardBg, borderColor: borderColor}}
      >
        <div style={styles.actionBarLeft}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCommandPaletteOpen(true)}
            style={styles.commandButton}
          >
            <FiCommand size={16} />
            <span>Rechercher</span>
            <kbd style={styles.kbd}>⌘K</kbd>
          </motion.button>
          
          <div style={styles.filterContainer}>
            <FiCalendar size={16} style={{ color: textMuted }} />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{...styles.timeSelect, backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#fff', color: textColor, borderColor: borderColor}}
            >
              <option value="7days">7 derniers jours</option>
              <option value="30days">30 derniers jours</option>
              <option value="90days">90 derniers jours</option>
              <option value="6months">6 derniers mois</option>
              <option value="1year">1 an</option>
            </select>
          </div>
        </div>

        <div style={styles.actionBarRight}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {
            dispatch(fetchActifs({}));
            fetchAlertes();
            toast.success('Données actualisées !');
          }} style={styles.iconButton}>
            <FiRefreshCw size={18} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDarkMode(!darkMode)} style={styles.iconButton}>
            {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </motion.button>
        </div>
      </motion.div>

      {/* En-tête dynamique */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={styles.header}
      >
        <h1 style={styles.title}>
          <Typewriter
            words={['Tableau de bord', 'Bienvenue', 'Gestion des actifs', 'Analyse en temps réel']}
            loop={true}
            cursor={true}
            typeSpeed={70}
            deleteSpeed={50}
            delaySpeed={2000}
          />
        </h1>
        <p style={{...styles.subtitle, color: textMuted}}>
          {timeOfDay}, <strong>{user?.full_name || 'Utilisateur'}</strong> {greeting}
        </p>
      </motion.div>
      
      {/* LIGNE 1: Cartes récapitulatives */}
      <div style={styles.cardsGrid}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor, cursor: 'pointer'}}
          onClick={() => navigate('/actifs')}
        >
          <div style={styles.statIconWrapper}>
            <FiPackage size={24} style={{ color: '#00fff7' }} />
          </div>
          <div>
            <div style={{...styles.statLabel, color: textMuted}}>Total actifs</div>
            <div style={{...styles.statValue, color: textColor}}>{totalActifs}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <div style={styles.statIconWrapper}>
            <FiDollarSign size={24} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{...styles.statLabel, color: textMuted}}>Valeur brute</div>
            <div style={{...styles.statValue, color: textColor}}>{formatCurrency(currentValue)}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <div style={styles.statIconWrapper}>
            <FiTrendingUp size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div style={{...styles.statLabel, color: textMuted}}>Valeur nette</div>
            <div style={{...styles.statValue, color: textColor}}>{formatCurrency(totalNette)}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          style={{...styles.statCard, backgroundColor: totalAlertes > 0 ? (darkMode ? 'rgba(239,68,68,0.15)' : '#fef2f2') : cardBg, borderColor: borderColor, cursor: 'pointer'}}
          onClick={() => navigate('/rapports/alertes')}
        >
          <div style={styles.statIconWrapper}>
            <FiAlertCircle size={24} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <div style={{...styles.statLabel, color: textMuted}}>Alertes</div>
            <div style={{...styles.statValue, color: totalAlertes > 0 ? '#ef4444' : textColor}}>{totalAlertes}</div>
          </div>
        </motion.div>
      </div>

      {/* LIGNE 2: Statistiques par nature */}
      <div style={styles.natureGrid}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          style={{...styles.natureCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <span style={styles.natureIcon}>🏭</span>
          <div>
            <div style={{...styles.natureLabel, color: textMuted}}>Actifs corporels</div>
            <div style={{...styles.natureValue, color: textColor}}>{natureData[0]?.value || 0}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          style={{...styles.natureCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <span style={styles.natureIcon}>📄</span>
          <div>
            <div style={{...styles.natureLabel, color: textMuted}}>Actifs incorporels</div>
            <div style={{...styles.natureValue, color: textColor}}>{natureData[1]?.value || 0}</div>
          </div>
        </motion.div>
      </div>

      {/* LIGNE 3: Graphiques principaux */}
      <div style={styles.chartsGrid}>
        {/* Graphique d'évolution */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(0,255,247,0.15)' : '0 8px 24px rgba(0,0,0,0.15)' }}
          style={{...styles.chartCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <h5 style={{...styles.chartTitle, color: textColor}}>Évolution des actifs</h5>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#475569' : '#e2e8f0'} />
              <XAxis dataKey="name" stroke={darkMode ? '#94a3b8' : '#666'} />
              <YAxis yAxisId="left" stroke={darkMode ? '#94a3b8' : '#666'} />
              <YAxis yAxisId="right" orientation="right" stroke={darkMode ? '#94a3b8' : '#666'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: textColor }} />
              <Bar yAxisId="left" dataKey="actifs" fill="#00fff7" name="Nombre d'actifs" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="valeur" stroke="#10b981" name="Valeur (M FC)" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Graphique de répartition par type */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(0,255,247,0.15)' : '0 8px 24px rgba(0,0,0,0.15)' }}
          style={{...styles.chartCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <h5 style={{...styles.chartTitle, color: textColor}}>Répartition par type</h5>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={darkMode ? '#1e293b' : '#fff'} strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: textColor }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* LIGNE 4: Top actifs + Répartition nature */}
      <div style={styles.chartsGrid}>
        {/* Top actifs par valeur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(0,255,247,0.15)' : '0 8px 24px rgba(0,0,0,0.15)' }}
          style={{...styles.chartCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <h5 style={{...styles.chartTitle, color: textColor}}>Top 5 actifs par valeur</h5>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topActifsParValeur} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#475569' : '#e2e8f0'} />
              <XAxis type="number" tickFormatter={(v) => `${v}M`} stroke={darkMode ? '#94a3b8' : '#666'} />
              <YAxis type="category" dataKey="name" width={120} stroke={darkMode ? '#94a3b8' : '#666'} />
              <Tooltip formatter={(value) => `${value} millions FC`} contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="valeur" fill="#f59e0b" name="Valeur (millions FC)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Graphique nature des actifs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(0,255,247,0.15)' : '0 8px 24px rgba(0,0,0,0.15)' }}
          style={{...styles.chartCard, backgroundColor: cardBg, borderColor: borderColor}}
        >
          <h5 style={{...styles.chartTitle, color: textColor}}>Répartition Corporel / Incorporel</h5>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={natureData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={5}
              >
                <Cell fill="#00fff7" stroke={darkMode ? '#1e293b' : '#fff'} strokeWidth={2} />
                <Cell fill="#10b981" stroke={darkMode ? '#1e293b' : '#fff'} strokeWidth={2} />
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: textColor }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* LIGNE 5: Widget Alertes détaillé */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        style={{...styles.alertCard, backgroundColor: cardBg, borderColor: borderColor}}
      >
        <h5 style={{...styles.alertTitle, color: textColor}}>
          <FiAlertCircle /> Alertes et échéances
        </h5>
        
        <div style={styles.alertGrid}>
          {[
            { key: 'finLicence', icon: FiClock, color: '#f59e0b', label: 'fin(s) de licence imminente(s)' },
            { key: 'echeancesContrats', icon: FiFileText, color: '#00fff7', label: 'contrat(s) arrivant à échéance' },
            { key: 'maintenance', icon: FiPackage, color: '#10b981', label: 'échéance(s) maintenance' },
            { key: 'actifsEnMaintenance', icon: FiActivity, color: '#ef4444', label: 'actif(s) en maintenance/réparation' },
            { key: 'anomalies', icon: FiAlertCircle, color: '#f97316', label: 'bien(s) manquant(s)' }
          ].map((alert, index) => (
            alertes[alert.key]?.length > 0 && (
              <motion.div
                key={alert.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.05 }}
                style={{...styles.alertItem, backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc'}}
              >
                <alert.icon color={alert.color} size={18} />
                <span style={{ color: textColor }}>
                  <strong>{alertes[alert.key].length}</strong> {alert.label}
                </span>
                {alertes[alert.key][0]?.date && (
                  <small style={{ marginLeft: 'auto', color: textMuted }}>
                    {formatDate(alertes[alert.key][0].date)}
                  </small>
                )}
              </motion.div>
            )
          ))}
        </div>
        
        {totalAlertes === 0 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{...styles.noAlert, color: textMuted}}
          >
            🎉 Aucune alerte pour le moment, tout est en ordre !
          </motion.p>
        )}
      </motion.div>

      {/* LIGNE 6: Derniers actifs ajoutés */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        style={{...styles.recentCard, backgroundColor: cardBg, borderColor: borderColor}}
      >
        <div style={styles.recentHeader}>
          <h5 style={{...styles.recentTitle, color: textColor}}>📦 Derniers actifs ajoutés</h5>
          <div style={styles.viewToggle}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{...styles.toggleBtn, ...(displayType === 'grid' ? styles.toggleActive : styles.toggleInactive)}}
              onClick={() => setDisplayType('grid')}
            >
              <FiGrid size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{...styles.toggleBtn, ...(displayType === 'list' ? styles.toggleActive : styles.toggleInactive)}}
              onClick={() => setDisplayType('list')}
            >
              <FiList size={16} />
            </motion.button>
          </div>
        </div>
        
        {displayType === 'grid' ? (
          <div style={styles.recentGrid}>
            {derniersAjouts.map((actif, index) => (
              <motion.div 
                key={actif.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 + index * 0.03 }}
                whileHover={{ scale: 1.02 }}
                style={{...styles.recentCardItem, backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', cursor: 'pointer'}}
                onClick={() => navigate(`/actifs/${actif.id}`)}
              >
                <div style={styles.recentCardCode}>{actif.code}</div>
                <div style={{...styles.recentCardName, color: textColor}}>{actif.nom}</div>
                <div style={{...styles.recentCardType, color: textMuted}}>{getTypeLabel(actif.type)}</div>
                <div style={{...styles.recentCardDate, color: textMuted}}>
                  <FiClock size={12} /> {formatDate(actif.date_acquisition)}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={styles.recentList}>
            {derniersAjouts.map((actif, index) => (
              <motion.div 
                key={actif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 + index * 0.03 }}
                style={{...styles.recentListItem, backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', cursor: 'pointer'}}
                onClick={() => navigate(`/actifs/${actif.id}`)}
              >
                <code style={styles.recentListCode}>{actif.code}</code>
                <span style={{ color: textColor }}>{actif.nom}</span>
                <small style={{ marginLeft: 'auto', color: textMuted }}>
                  {formatDate(actif.date_acquisition)}
                </small>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        .typewriter-cursor {
          opacity: 0.7;
          animation: blink 1s infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

// ============ STYLES FUTURISTES ============
const styles = {
  container: {
    minHeight: '100vh',
    padding: '1.5rem',
    transition: 'background-color 0.3s ease'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid rgba(0,255,247,0.2)',
    borderTop: '3px solid #00fff7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    border: '1px solid',
    marginBottom: '1.5rem'
  },
  actionBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  commandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.75rem',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: '#00fff7',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  kbd: {
    padding: '0.125rem 0.375rem',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontFamily: 'monospace'
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  timeSelect: {
    padding: '0.4rem 0.75rem',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  actionBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  iconButton: {
    padding: '0.4rem',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: '#00fff7',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '0.9rem'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '20px',
    border: '1px solid',
    transition: 'all 0.3s ease'
  },
  statIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'rgba(0,255,247,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  natureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  natureCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '20px',
    border: '1px solid',
    transition: 'all 0.3s ease'
  },
  natureIcon: {
    fontSize: '2rem'
  },
  natureLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase'
  },
  natureValue: {
    fontSize: '1.2rem',
    fontWeight: '700'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  chartCard: {
    padding: '1rem',
    borderRadius: '20px',
    border: '1px solid',
    transition: 'all 0.3s ease'
  },
  chartTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  alertCard: {
    padding: '1rem',
    borderRadius: '20px',
    border: '1px solid',
    marginBottom: '1.5rem'
  },
  alertTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  alertGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '12px'
  },
  noAlert: {
    textAlign: 'center',
    padding: '1rem'
  },
  recentCard: {
    padding: '1rem',
    borderRadius: '20px',
    border: '1px solid'
  },
  recentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  recentTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: 0
  },
  viewToggle: {
    display: 'flex',
    gap: '0.25rem'
  },
  toggleBtn: {
    padding: '0.4rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  toggleActive: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none'
  },
  toggleInactive: {
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.2)',
    color: '#00fff7'
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem'
  },
  recentCardItem: {
    padding: '0.75rem',
    borderRadius: '12px',
    transition: 'all 0.2s ease'
  },
  recentCardCode: {
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    padding: '0.125rem 0.375rem',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '4px',
    display: 'inline-block',
    marginBottom: '0.5rem',
    color: '#00fff7'
  },
  recentCardName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '0.25rem'
  },
  recentCardType: {
    fontSize: '0.7rem',
    marginBottom: '0.25rem'
  },
  recentCardDate: {
    fontSize: '0.65rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  recentListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    borderRadius: '12px',
    flexWrap: 'wrap'
  },
  recentListCode: {
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    padding: '0.125rem 0.375rem',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '4px',
    color: '#00fff7'
  },
  commandOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '10vh',
    zIndex: 1100
  },
  commandPalette: {
    borderRadius: '20px',
    width: '90%',
    maxWidth: '640px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  commandSearch: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid'
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
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid'
  },
  commandFooter: {
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem'
  },
  noResults: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  }
};

export default Dashboard;
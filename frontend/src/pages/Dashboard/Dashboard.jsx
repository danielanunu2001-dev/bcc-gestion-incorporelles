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
  ResponsiveContainer, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  FiPackage, FiDollarSign, FiTrendingUp, FiClock,
  FiEye, FiRefreshCw, FiHome, FiUsers, FiActivity,
  FiFileText, FiAlertCircle, FiTrendingDown, FiGrid, FiList,
  FiMoon, FiSun, FiDownload, FiSearch, FiCommand, FiFilter, FiX, FiCalendar, FiBarChart2
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
      {cursor && <span style={{ opacity: 0.7, animation: 'blink 1s infinite' }}>|</span>}
    </span>
  );
};

// ==================== COMMAND PALETTE ====================
const CommandPalette = ({ isOpen, onClose, navigate }) => {
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
          style={styles.commandPalette}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.commandSearch}>
            <FiSearch size={20} color="#666" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher une action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.commandInput}
            />
            <FiX size={20} color="#666" onClick={onClose} style={{ cursor: 'pointer' }} />
          </div>
          <div style={styles.commandList}>
            {filteredCommands.map((cmd, index) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={styles.commandItem}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {cmd.icon}
                  {cmd.label}
                </span>
              </motion.div>
            ))}
            {filteredCommands.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                Aucun résultat trouvé
              </div>
            )}
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
  
  // ✅ SÉLECTEURS MÉMOÏSÉS - Évite les rendus inutiles
  const actifs = useSelector(selectActifs);
  const actifsLoading = useSelector(selectActifsLoading);
  const actifsStatistiques = useSelector(selectActifsStatistiques);
  const totalActifs = useSelector(selectTotalActifs);
  const valeurNetteTotale = useSelector(selectValeurNetteTotale);
  
  const auditLogs = useSelector(selectAuditLogs);
  const auditLoading = useSelector(selectAuditLoading);
  
  const users = useSelector(selectUsers);
  const usersLoading = useSelector(selectUsersLoading);
  
  const { user = {} } = useSelector((state) => state.auth || {});
  
  // États locaux
  const [chartType, setChartType] = useState('line');
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
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(false);

  // ✅ Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin';

  // ✅ FONCTIONS UTILITAIRES (DÉFINIES AVANT LES useMemo)
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

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // ✅ Fonction memoïsée pour charger les alertes
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
      if (typeof fetchAuditLogs === 'function') {
        dispatch(fetchAuditLogs({ limit: 10 }));
      }
      // ✅ Appeler fetchUsers UNIQUEMENT si l'utilisateur est admin
      if (typeof fetchUsers === 'function' && isAdmin) {
        dispatch(fetchUsers({}));
      }
    }
    fetchAlertes();
    
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('Bonjour');
    else if (hour < 18) setTimeOfDay('Bon après-midi');
    else setTimeOfDay('Bonsoir');
  }, [dispatch, isAdmin, fetchAlertes]);

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

  // Export CSV
  const exportToCSV = useCallback(() => {
    try {
      const csvContent = [
        ['Code', 'Nom', 'Type', 'Coût acquisition', 'Date acquisition'],
        ...actifs.map(a => [
          a.code,
          a.nom,
          getTypeLabel(a.type),
          a.cout_acquisition || 0,
          formatDate(a.date_acquisition)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `actifs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Export CSV réussi !');
    } catch (err) {
      toast.error('Erreur lors de l\'export');
    }
  }, [actifs]);

  // ============ DONNÉES POUR LES GRAPHIQUES (memoïsées) ============
  
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
        valeurNette: actifsMonth.reduce((sum, a) => sum + (parseFloat(a.valeur_nette) || parseFloat(a.cout_acquisition) || 0), 0) / 1000000
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
    
    return actifs.slice(0, 5).map(a => ({
      name: a.nom?.substring(0, 15) || 'N/A',
      valeurBrute: parseFloat(a.cout_acquisition) || 0,
      valeurNette: parseFloat(a.valeur_nette) || parseFloat(a.cout_acquisition) || 0,
      amortissement: (parseFloat(a.cout_acquisition) || 0) - (parseFloat(a.valeur_nette) || parseFloat(a.cout_acquisition) || 0)
    }));
  }, [actifs]);

  const performanceData = useMemo(() => {
    const types = ['Logiciel', 'Matériel', 'Véhicule', 'Licence', 'Brevet'];
    return types.map(type => {
      const count = actifs.filter(a => getTypeLabel(a.type) === type).length;
      const value = actifs
        .filter(a => getTypeLabel(a.type) === type)
        .reduce((sum, a) => sum + (parseFloat(a.cout_acquisition) || 0), 0) / 1000000;
      
      return {
        type,
        count,
        value: parseFloat(value.toFixed(2)),
        fullMark: 100
      };
    });
  }, [actifs]);

  const derniersAjouts = useMemo(() => {
    return actifs && actifs.length > 0
      ? [...actifs]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 6)
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

  const natureStats = useMemo(() => {
    return {
      corporel: actifs?.filter(a => a.type_immobilisation === 'corporel').length || 0,
      incorporel: actifs?.filter(a => a.type_immobilisation === 'incorporel').length || 0
    };
  }, [actifs]);

  // Affichage du chargement
  if (actifsLoading) {
    return (
      <div style={darkMode ? { ...styles.loading, ...darkStyles.loading } : styles.loading}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={styles.spinner}
        />
        <p>Chargement des données...</p>
      </div>
    );
  }

  // Fusion des styles pour dark mode
  const currentStyles = darkMode ? { ...styles, ...darkStyles } : styles;

  return (
    <div style={currentStyles.container}>
      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        navigate={navigate}
      />

      {/* Barre d'actions supérieure */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={currentStyles.topBar}
      >
        <div style={currentStyles.topBarLeft}>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={currentStyles.commandButton}
            title="Ouvrir la command palette (Ctrl+K)"
          >
            <FiCommand size={16} />
            <span>Rechercher</span>
            <kbd style={currentStyles.kbd}>⌘K</kbd>
          </button>
          
          <div style={currentStyles.filterGroup}>
            <FiCalendar size={16} />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={currentStyles.filterSelect}
            >
              <option value="7days">7 derniers jours</option>
              <option value="30days">30 derniers jours</option>
              <option value="90days">90 derniers jours</option>
              <option value="6months">6 derniers mois</option>
              <option value="1year">1 an</option>
            </select>
          </div>
        </div>

        <div style={currentStyles.topBarRight}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToCSV}
            style={currentStyles.actionButton}
            title="Exporter en CSV"
          >
            <FiDownload size={18} />
            <span>Exporter</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              dispatch(fetchActifs({}));
              fetchAlertes();
              toast.success('Données actualisées !');
            }}
            style={currentStyles.actionButton}
            title="Actualiser"
          >
            <FiRefreshCw size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDarkMode(!darkMode)}
            style={currentStyles.themeToggle}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </motion.button>
        </div>
      </motion.div>

      {/* En-tête dynamique avec Typewriter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={currentStyles.header}
      >
        <h1 style={currentStyles.pageTitle}>
          <Typewriter
            words={['Tableau de bord', 'Bienvenue', 'Gestion des actifs', 'Analyse en temps réel']}
            loop={true}
            cursor={true}
            typeSpeed={70}
            deleteSpeed={50}
            delaySpeed={2000}
          />
        </h1>
        <p style={currentStyles.welcomeMessage}>
          {timeOfDay}, <strong>{user?.full_name || 'Utilisateur'}</strong> {greeting}
        </p>
      </motion.div>
      
      {/* Cartes récapitulatives animées */}
      <div style={currentStyles.statsGrid}>
        {[
          { icon: FiPackage, label: 'Total actifs', value: totalActifs, color: '#2563eb', link: '/actifs' },
          { icon: FiDollarSign, label: 'Valeur brute', value: formatCurrency(currentValue), color: '#10b981' },
          { icon: FiTrendingUp, label: 'Valeur nette estimée', value: formatCurrency(totalNette), color: '#f59e0b' },
          { icon: FiUsers, label: 'Utilisateurs', value: users?.length || 0, color: '#8b5cf6', link: '/utilisateurs' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, boxShadow: darkMode ? '0 8px 24px rgba(37,99,235,0.3)' : '0 8px 24px rgba(0,0,0,0.15)' }}
            style={currentStyles.statCard}
            onClick={() => stat.link && navigate(stat.link)}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <stat.icon size={24} color={stat.color} />
            </motion.div>
            <div>
              <div style={currentStyles.statLabel}>{stat.label}</div>
              <div style={currentStyles.statValue}>
                <span className="counter">{stat.value}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Widget Alertes */}
        {totalAlertes > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            style={{ ...currentStyles.statCard, backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2' }}
            onClick={() => navigate('/rapports/alertes')}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <FiAlertCircle size={24} color="#ef4444" />
            </motion.div>
            <div>
              <div style={currentStyles.statLabel}>Alertes</div>
              <div style={currentStyles.statValue}>{totalAlertes}</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Statistiques par nature */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={currentStyles.natureStats}
      >
        <motion.div whileHover={{ scale: 1.02 }} style={currentStyles.natureCard}>
          <span style={currentStyles.natureIcon}>🏭</span>
          <div>
            <div style={currentStyles.natureLabel}>Actifs corporels</div>
            <div style={currentStyles.natureValue}>{natureStats.corporel}</div>
          </div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} style={currentStyles.natureCard}>
          <span style={currentStyles.natureIcon}>📄</span>
          <div>
            <div style={currentStyles.natureLabel}>Actifs incorporels</div>
            <div style={currentStyles.natureValue}>{natureStats.incorporel}</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Toggle pour graphiques avancés */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={currentStyles.advancedToggle}
      >
        <button
          onClick={() => setShowAdvancedCharts(!showAdvancedCharts)}
          style={currentStyles.advancedButton}
        >
          <FiBarChart2 size={18} />
          <span>{showAdvancedCharts ? 'Masquer' : 'Afficher'} les graphiques avancés</span>
        </button>
      </motion.div>

      {/* Graphiques principaux */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={currentStyles.chartsGrid}
      >
        {/* Évolution des actifs */}
        <motion.div 
          whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(37,99,235,0.3)' : '0 8px 24px rgba(0,0,0,0.15)' }}
          style={currentStyles.chartCard}
        >
          <div style={currentStyles.chartHeader}>
            <h3 style={currentStyles.chartTitle}>Évolution des actifs</h3>
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value)}
              style={currentStyles.chartSelect}
            >
              <option value="line">Courbe</option>
              <option value="bar">Barres</option>
              <option value="area">Aire</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' && (
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'var(--text-primary)' : 'var(--border-color)'} />
                <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#666'} />
                <YAxis yAxisId="left" stroke={darkMode ? '#9ca3af' : '#666'} />
                <YAxis yAxisId="right" orientation="right" stroke={darkMode ? '#9ca3af' : '#666'} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#fff', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="actifs" stroke="#2563eb" name="Nombre d'actifs" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="valeur" stroke="#10b981" name="Valeur (M FC)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            )}
            {chartType === 'bar' && (
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'var(--text-primary)' : 'var(--border-color)'} />
                <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#666'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#666'} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#fff', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="actifs" fill="#2563eb" name="Nombre d'actifs" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
            {chartType === 'area' && (
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'var(--text-primary)' : 'var(--border-color)'} />
                <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#666'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#666'} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#fff', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="valeur" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} name="Valeur (M FC)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Répartition par type */}
        <motion.div 
          whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(37,99,235,0.3)' : '0 8px 24px rgba(0,0,0,0.15)' }}
          style={currentStyles.chartCard}
        >
          <h3 style={currentStyles.chartTitle}>Répartition par type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#fff', border: 'none', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Graphiques avancés */}
      <AnimatePresence>
        {showAdvancedCharts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={currentStyles.chartsGrid}
          >
            {/* Graphique d'amortissement */}
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(37,99,235,0.3)' : '0 8px 24px rgba(0,0,0,0.15)' }}
              style={currentStyles.chartCard}
            >
              <h3 style={currentStyles.chartTitle}>Amortissement (Top 5 actifs)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={amortissementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'var(--text-primary)' : 'var(--border-color)'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#666'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#666'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="valeurBrute" fill="#2563eb" name="Valeur brute" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valeurNette" fill="#10b981" name="Valeur nette" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="amortissement" fill="#ef4444" name="Amortissement" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Graphique radar de performance */}
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ boxShadow: darkMode ? '0 8px 24px rgba(37,99,235,0.3)' : '0 8px 24px rgba(0,0,0,0.15)' }}
              style={currentStyles.chartCard}
            >
              <h3 style={currentStyles.chartTitle}>Performance par type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceData}>
                  <PolarGrid stroke={darkMode ? 'var(--text-primary)' : 'var(--border-color)'} />
                  <PolarAngleAxis dataKey="type" stroke={darkMode ? '#9ca3af' : '#666'} />
                  <PolarRadiusAxis stroke={darkMode ? '#9ca3af' : '#666'} />
                  <Radar name="Nombre" dataKey="count" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Alertes détaillé */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={currentStyles.alertesWidget}
      >
        <div style={currentStyles.alertesHeader}>
          <h3 style={currentStyles.sectionTitle}>
            <FiAlertCircle style={{ marginRight: '0.5rem' }} />
            Alertes et échéances
          </h3>
          <button onClick={() => navigate('/rapports/alertes')} style={currentStyles.viewAllButton}>
            Voir toutes les alertes →
          </button>
        </div>
        
        <div style={currentStyles.alertesList}>
          {[
            { key: 'finLicence', icon: FiClock, color: '#f59e0b', label: 'fin(s) de licence imminente(s)' },
            { key: 'echeancesContrats', icon: FiFileText, color: '#2563eb', label: 'contrat(s) arrivant à échéance' },
            { key: 'maintenance', icon: FiPackage, color: '#10b981', label: 'échéance(s) maintenance' },
            { key: 'actifsEnMaintenance', icon: FiActivity, color: '#ef4444', label: 'actif(s) en maintenance/réparation' },
            { key: 'anomalies', icon: FiAlertCircle, color: '#dc2626', label: 'bien(s) manquant(s)' }
          ].map((alert, index) => (
            alertes[alert.key]?.length > 0 && (
              <motion.div
                key={alert.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                style={currentStyles.alerteItem}
                className={alert.key === 'finLicence' ? 'alert-pulse' : ''}
              >
                <alert.icon color={alert.color} size={18} />
                <span>
                  <strong>{alertes[alert.key].length}</strong> {alert.label}
                </span>
                {alertes[alert.key][0]?.date && (
                  <small style={currentStyles.alerteDate}>
                    Prochaine: {formatDate(alertes[alert.key][0].date)}
                  </small>
                )}
              </motion.div>
            )
          ))}
          
          {totalAlertes === 0 && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={currentStyles.noAlertes}
            >
              🎉 Aucune alerte pour le moment, tout est en ordre !
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* Derniers ajouts - Vue améliorée */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        style={currentStyles.recentSection}
      >
        <div style={currentStyles.recentHeader}>
          <h3 style={currentStyles.sectionTitle}>📦 Derniers actifs ajoutés</h3>
          <div style={currentStyles.displayToggle}>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDisplayType('grid')}
              style={displayType === 'grid' ? currentStyles.displayActive : currentStyles.displayButton}
              title="Vue grille"
            >
              <FiGrid />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDisplayType('list')}
              style={displayType === 'list' ? currentStyles.displayActive : currentStyles.displayButton}
              title="Vue liste"
            >
              <FiList />
            </motion.button>
          </div>
        </div>
        
        {displayType === 'grid' ? (
          <div style={currentStyles.recentGrid}>
            {derniersAjouts.map((actif, index) => (
              <motion.div 
                key={actif.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, boxShadow: darkMode ? '0 8px 24px rgba(37,99,235,0.3)' : '0 8px 24px rgba(0,0,0,0.15)' }}
                style={currentStyles.recentCard}
                onClick={() => navigate(`/actifs/${actif.id}`)}
              >
                <div style={currentStyles.recentCardCode}>{actif.code}</div>
                <div style={currentStyles.recentCardNom}>{actif.nom}</div>
                <div style={currentStyles.recentCardType}>{getTypeLabel(actif.type)}</div>
                <div style={currentStyles.recentCardDate}>
                  <FiClock size={12} /> {formatDate(actif.date_acquisition)}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={currentStyles.recentList}>
            {derniersAjouts.map((actif, index) => (
              <motion.div 
                key={actif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ backgroundColor: darkMode ? 'var(--text-primary)' : '#f3f4f6' }}
                style={currentStyles.recentItem}
                onClick={() => navigate(`/actifs/${actif.id}`)}
              >
                <div style={currentStyles.recentInfo}>
                  <span style={currentStyles.recentCode}>{actif.code}</span>
                  <span style={currentStyles.recentNom}>{actif.nom}</span>
                </div>
                <div style={currentStyles.recentDate}>
                  {formatDate(actif.date_acquisition)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ============ STYLES ============

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: 'var(--bg-secondary)',
    minHeight: '100vh',
    transition: 'all 0.3s ease'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  topBarLeft: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  topBarRight: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  commandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    transition: 'all 0.2s'
  },
  kbd: {
    padding: '0.125rem 0.375rem',
    backgroundColor: 'var(--border-color)',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  filterSelect: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    cursor: 'pointer'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  header: {
    marginBottom: '2rem'
  },
  pageTitle: {
    fontSize: '2.5rem',
    color: '#1e3a8a',
    marginBottom: '0.5rem',
    fontWeight: 'bold'
  },
  welcomeMessage: {
    fontSize: '1rem',
    color: '#666'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    fontSize: '1.2rem',
    color: '#666',
    minHeight: '400px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    marginBottom: '1rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid transparent'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#666',
    marginBottom: '0.25rem'
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#111'
  },
  natureStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  natureCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 0.3s ease'
  },
  natureIcon: {
    fontSize: '2rem'
  },
  natureLabel: {
    fontSize: '0.75rem',
    color: '#666'
  },
  natureValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111'
  },
  advancedToggle: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  advancedButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  chartCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease'
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  chartSelect: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    cursor: 'pointer'
  },
  alertesWidget: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  alertesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    display: 'flex',
    alignItems: 'center'
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.5rem',
    transition: 'all 0.2s'
  },
  alertesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  alerteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  },
  alerteDate: {
    marginLeft: 'auto',
    fontSize: '0.8rem',
    color: '#666'
  },
  noAlertes: {
    textAlign: 'center',
    padding: '1rem',
    color: '#666'
  },
  recentSection: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  recentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  displayToggle: {
    display: 'flex',
    gap: '0.25rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '0.25rem'
  },
  displayButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  displayActive: {
    padding: '0.5rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1rem'
  },
  recentCard: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '10px',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid transparent'
  },
  recentCardCode: {
    fontFamily: 'monospace',
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    display: 'inline-block',
    marginBottom: '0.5rem',
    color: '#0369a1'
  },
  recentCardNom: {
    fontWeight: '600',
    marginBottom: '0.25rem',
    color: '#111'
  },
  recentCardType: {
    fontSize: '0.8rem',
    color: '#666',
    marginBottom: '0.5rem'
  },
  recentCardDate: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  recentInfo: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  recentCode: {
    fontFamily: 'monospace',
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    color: '#0369a1'
  },
  recentNom: {
    fontSize: '0.9rem',
    color: '#111'
  },
  recentDate: {
    fontSize: '0.875rem',
    color: '#666'
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
    zIndex: 1000,
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
    borderBottom: '1px solid #e5e7eb'
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
    borderBottom: '1px solid #f3f4f6'
  }
};

// Dark Mode Styles (sans doublons)
const darkStyles = {
  container: {
    backgroundColor: 'var(--text-primary)',
    color: '#f3f4f6'
  },
  loading: {
    backgroundColor: 'var(--text-primary)',
    color: '#f3f4f6'
  },
  topBar: {
    backgroundColor: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },
  commandButton: {
    backgroundColor: 'var(--text-primary)',
    color: '#f3f4f6'
  },
  kbd: {
    backgroundColor: '#4b5563',
    color: '#f3f4f6'
  },
  filterSelect: {
    backgroundColor: 'var(--text-primary)',
    color: '#f3f4f6',
    borderColor: '#4b5563'
  },
  themeToggle: {
    backgroundColor: 'var(--text-primary)',
    color: '#f3f4f6'
  },
  pageTitle: {
    color: '#60a5fa'
  },
  welcomeMessage: {
    color: '#9ca3af'
  },
  statCard: {
    backgroundColor: 'var(--text-primary)',
    borderColor: 'var(--text-primary)'
  },
  statLabel: {
    color: '#9ca3af'
  },
  statValue: {
    color: '#f3f4f6'
  },
  natureCard: {
    backgroundColor: 'var(--text-primary)'
  },
  natureLabel: {
    color: '#9ca3af'
  },
  natureValue: {
    color: '#f3f4f6'
  },
  chartCard: {
    backgroundColor: 'var(--text-primary)'
  },
  chartTitle: {
    color: '#f3f4f6'
  },
  chartSelect: {
    backgroundColor: 'var(--text-primary)',
    color: '#f3f4f6',
    borderColor: '#4b5563'
  },
  alertesWidget: {
    backgroundColor: 'var(--text-primary)'
  },
  sectionTitle: {
    color: '#f3f4f6'
  },
  alerteItem: {
    backgroundColor: 'var(--text-primary)'
  },
  alerteDate: {
    color: '#9ca3af'
  },
  noAlertes: {
    color: '#9ca3af'
  },
  recentSection: {
    backgroundColor: 'var(--text-primary)'
  },
  displayToggle: {
    backgroundColor: 'var(--text-primary)'
  },
  displayButton: {
    color: '#9ca3af'
  },
  recentCard: {
    backgroundColor: 'var(--text-primary)',
    borderColor: '#4b5563'
  },
  recentCardNom: {
    color: '#f3f4f6'
  },
  recentCardType: {
    color: '#9ca3af'
  },
  recentItem: {
    backgroundColor: 'var(--text-primary)'
  },
  recentNom: {
    color: '#f3f4f6'
  },
  recentDate: {
    color: '#9ca3af'
  },
  commandPalette: {
    backgroundColor: 'var(--text-primary)'
  },
  commandSearch: {
    borderBottomColor: 'var(--text-primary)'
  },
  commandInput: {
    color: '#f3f4f6'
  },
  commandItem: {
    borderBottomColor: 'var(--text-primary)'
  }
};

// Animations CSS
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .counter {
    transition: all 0.3s ease;
  }
  
  .alert-pulse {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
      background-color: #fef3c7;
    }
    100% {
      opacity: 1;
    }
  }

  /* Scrollbar custom styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Hover effects */
  button:hover {
    transform: translateY(-1px);
  }

  /* Dark mode scrollbar */
  @media (prefers-color-scheme: dark) {
    ::-webkit-scrollbar-track {
      background: #1f2937;
    }
    ::-webkit-scrollbar-thumb {
      background: #4b5563;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Dashboard;
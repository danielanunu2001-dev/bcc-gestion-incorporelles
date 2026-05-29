// frontend/src/pages/Actifs/ActifList.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { fetchActifs, deleteActif } from '../../store/actifSlice';
import { addNotification } from '../../store/uiSlice';
import AdvancedFilters from '../../components/Filters/AdvancedFilters';
import ExportButtons from '../../components/Export/ExportButtons';
import usePermissions from '../../hooks/usePermissions';

// Imports des sélecteurs mémoïsés
import { 
  selectActifs,
  selectActifsLoading,
  selectActifsError,
  selectActifsPagination,
  selectFilteredActifs,
  selectActifsStats,
  makeSelectSortedActifs
} from '../../store/selectors/actifSelectors';

import {
  FiEye, FiEdit, FiTrash2, FiPlus,
  FiRefreshCw, FiGrid, FiList, FiDownload,
  FiCheckCircle, FiAlertCircle, FiInfo, FiPackage,
  FiChevronLeft, FiChevronRight, FiX, FiCalendar,
  FiMapPin, FiTag, FiDollarSign, FiTrendingUp,
  FiUser, FiBriefcase, FiCpu, FiAward, FiBarChart2
} from 'react-icons/fi';

import { motion, AnimatePresence } from 'framer-motion';

const ActifList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { can } = usePermissions();

  // Sélecteurs stables
  const actifs = useSelector(selectActifs);
  const loading = useSelector(selectActifsLoading);
  const error = useSelector(selectActifsError);
  const pagination = useSelector(selectActifsPagination, shallowEqual);
  const filteredActifs = useSelector(selectFilteredActifs);
  const stats = useSelector(selectActifsStats, shallowEqual);
  
  // États locaux
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('actifViewMode') || 'grid');
  const [selectedActifs, setSelectedActifs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actifToDelete, setActifToDelete] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);

  // Sauvegarder le mode d'affichage
  useEffect(() => {
    localStorage.setItem('actifViewMode', viewMode);
  }, [viewMode]);

  // Factory de sélecteur de tri
  const selectSortedActifs = useMemo(() => makeSelectSortedActifs(), []);
  
  // Sélecteur de tri avec paramètres
  const sortedActifs = useSelector(
    state => selectSortedActifs(state, sortConfig.key, sortConfig.direction),
    shallowEqual
  );

  // Filtrage par recherche
  const filteredBySearch = useMemo(() => {
    if (!searchTerm) return sortedActifs;
    const term = searchTerm.toLowerCase();
    return sortedActifs.filter(actif => 
      actif.code?.toLowerCase().includes(term) ||
      actif.nom?.toLowerCase().includes(term) ||
      actif.fournisseur?.toLowerCase().includes(term) ||
      actif.localisation?.toLowerCase().includes(term)
    );
  }, [sortedActifs, searchTerm]);

  // Effet pour charger les actifs
  useEffect(() => {
    dispatch(fetchActifs({}));
  }, [dispatch]);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      dispatch(addNotification({ type: 'error', message: error, duration: 5000 }));
    }
  }, [error, dispatch]);

  // Handlers optimisés
  const handleRefresh = useCallback(() => {
    dispatch(fetchActifs({}));
  }, [dispatch]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleDeleteClick = useCallback((id, nom) => {
    setActifToDelete({ id, nom });
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!actifToDelete) return;
    
    const { id, nom } = actifToDelete;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!id) {
      dispatch(addNotification({ type: 'error', message: 'ID actif manquant', duration: 5000 }));
      setShowDeleteModal(false);
      return;
    }
    
    if (!uuidRegex.test(id)) {
      dispatch(addNotification({ type: 'error', message: `ID actif invalide: ${id}`, duration: 5000 }));
      setShowDeleteModal(false);
      return;
    }
    
    const result = await dispatch(deleteActif(id));
    if (deleteActif.fulfilled.match(result)) {
      dispatch(addNotification({ type: 'success', message: `Actif "${nom}" supprimé avec succès`, duration: 3000 }));
      handleRefresh();
    } else {
      dispatch(addNotification({ type: 'error', message: result.error?.message || 'Erreur lors de la suppression', duration: 5000 }));
    }
    setShowDeleteModal(false);
    setActifToDelete(null);
  }, [actifToDelete, dispatch, handleRefresh]);

  const handleBulkDelete = useCallback(() => {
    if (selectedActifs.length === 0) return;
    if (window.confirm(`Supprimer ${selectedActifs.length} actif(s) ?`)) {
      selectedActifs.forEach(id => dispatch(deleteActif(id)));
      setSelectedActifs([]);
      dispatch(addNotification({ type: 'success', message: `${selectedActifs.length} actif(s) supprimé(s)`, duration: 3000 }));
      handleRefresh();
    }
  }, [selectedActifs, dispatch, handleRefresh]);

  const toggleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedActifs(filteredBySearch.map(a => a.id));
    } else {
      setSelectedActifs([]);
    }
  }, [filteredBySearch]);

  const toggleSelectActif = useCallback((id) => {
    setSelectedActifs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  // Fonctions utilitaires
  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${Math.round(value || 0).toLocaleString()} FC`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getTypeLabel = (type) => {
    const types = {
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
    return types[type] || type || 'N/A';
  };

  const getEtatLabel = (etat) => {
    const etats = {
      'neuf': 'Neuf',
      'bon': 'Bon état',
      'moyen': 'État moyen',
      'mauvais': 'Mauvais état',
      'reforme': 'Réformé',
      'reparation': 'En réparation',
      'hors_service': 'Hors service'
    };
    return etats[etat] || etat || 'N/A';
  };

  const getEtatColor = (etat) => {
    const colors = {
      'neuf': '#10b981',
      'bon': '#3b82f6',
      'moyen': '#f59e0b',
      'mauvais': '#ef4444',
      'reforme': '#6b7280',
      'reparation': '#f59e0b',
      'hors_service': '#ef4444'
    };
    return colors[etat] || '#6b7280';
  };

  const getEtatIcon = (etat) => {
    const icons = {
      'neuf': '✨',
      'bon': '👍',
      'moyen': '👌',
      'mauvais': '⚠️',
      'reforme': '📦',
      'reparation': '🔧',
      'hors_service': '❌'
    };
    return icons[etat] || '📋';
  };

  const getTypeIcon = (type) => {
    const icons = {
      'logiciel': <FiCpu size={14} />,
      'brevet': <FiAward size={14} />,
      'licence': <FiBriefcase size={14} />,
      'fonds_commercial': <FiBriefcase size={14} />,
      'materiel': <FiCpu size={14} />,
      'vehicule': '🚗',
      'bâtiment': '🏠',
      'terrain': '🌳',
      'autres': '📦'
    };
    return icons[type] || '📋';
  };

  const getValeurNette = (actif) => {
    return actif.valeur_nette || actif.cout_acquisition;
  };

  const getTauxAmortissement = (actif) => {
    if (actif.taux_amortissement) return `${actif.taux_amortissement}%`;
    if (actif.duree_utile_ans) return `${(100 / actif.duree_utile_ans).toFixed(2)}%`;
    return 'N/A';
  };

  // Statistiques améliorées
  const enhancedStats = useMemo(() => {
    const total = filteredBySearch.length;
    const valeurTotale = filteredBySearch.reduce((sum, a) => sum + (a.cout_acquisition || 0), 0);
    const valeurNetteTotale = filteredBySearch.reduce((sum, a) => sum + getValeurNette(a), 0);
    const amortissementTotal = valeurTotale - valeurNetteTotale;
    
    return {
      total,
      valeurTotale,
      valeurNetteTotale,
      amortissementTotal,
      tauxAmortissementGlobal: valeurTotale > 0 ? (amortissementTotal / valeurTotale * 100).toFixed(2) : 0
    };
  }, [filteredBySearch]);

  const bgColor = darkMode ? '#0f172a' : '#f8fafc';
  const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#0f172a';
  const textMuted = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{...styles.container, backgroundColor: bgColor}}
    >
      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -20 }}
              style={{...styles.modalContent, backgroundColor: cardBg, borderColor: borderColor}}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h5 style={{...styles.modalTitle, color: textColor}}>
                  <FiAlertCircle size={20} style={{ color: '#ef4444' }} /> Confirmer la suppression
                </h5>
                <button onClick={() => setShowDeleteModal(false)} style={styles.modalClose}>
                  <FiX size={20} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <p style={{ color: textColor, fontSize: '1rem', marginBottom: '0.5rem' }}>
                  Êtes-vous sûr de vouloir supprimer l'actif <strong style={{ color: '#ef4444' }}>"{actifToDelete?.nom}"</strong> ?
                </p>
                <p style={{...styles.modalNote, color: textMuted}}>
                  Cette action est irréversible et supprimera toutes les données associées.
                </p>
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => setShowDeleteModal(false)} style={styles.cancelButton}>Annuler</button>
                <button onClick={confirmDelete} style={styles.confirmButton}>Confirmer la suppression</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header avec stats amélioré */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            <FiPackage size={28} style={{ color: '#3b82f6' }} />
            Gestion des Actifs
          </h1>
          <p style={{...styles.subtitle, color: textMuted}}>
            {enhancedStats.total} actif(s) • Valeur totale: {formatCurrency(enhancedStats.valeurTotale)} • Amortissement: {enhancedStats.tauxAmortissementGlobal}%
          </p>
        </div>
        
        <div style={styles.actions}>
          {/* Barre de recherche */}
          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="Rechercher un actif..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Boutons d'export */}
          {can(['admin', 'comptable', 'auditeur', 'gestionnaire']) && (
            <ExportButtons data={filteredBySearch} filename="liste_actifs" type="actifs" />
          )}
          
          {/* Toggle vue */}
          <div style={styles.viewToggle}>
            <button 
              onClick={() => setViewMode('table')} 
              style={{...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : styles.toggleInactive)}}
              title="Vue tableau"
            >
              <FiList size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              style={{...styles.toggleBtn, ...(viewMode === 'grid' ? styles.toggleActive : styles.toggleInactive)}}
              title="Vue grille"
            >
              <FiGrid size={16} />
            </button>
          </div>
          
          {/* Rafraîchir */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh} 
            style={styles.refreshButton}
            disabled={loading}
            title="Rafraîchir"
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </motion.button>
          
          {/* Suppression groupée */}
          {selectedActifs.length > 0 && can(['admin', 'comptable']) && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkDelete} 
              style={styles.bulkDeleteButton}
            >
              <FiTrash2 size={16} /> {selectedActifs.length}
            </motion.button>
          )}
          
          {/* Nouvel actif */}
          {can(['admin', 'comptable']) && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/actifs/nouveau')} 
              style={styles.addButton}
            >
              <FiPlus size={16} /> Nouvel actif
            </motion.button>
          )}
        </div>
      </div>

      {/* Filtres avancés */}
      <AdvancedFilters type="actifs" darkMode={darkMode} />

      {/* Cartes statistiques */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor}}>
          <div style={styles.statIcon}><FiPackage size={20} style={{ color: '#3b82f6' }} /></div>
          <div>
            <div style={styles.statValue}>{enhancedStats.total}</div>
            <div style={styles.statLabel}>Total actifs</div>
          </div>
        </div>
        <div style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor}}>
          <div style={styles.statIcon}><FiDollarSign size={20} style={{ color: '#10b981' }} /></div>
          <div>
            <div style={styles.statValue}>{formatCurrency(enhancedStats.valeurTotale)}</div>
            <div style={styles.statLabel}>Valeur brute</div>
          </div>
        </div>
        <div style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor}}>
          <div style={styles.statIcon}><FiTrendingUp size={20} style={{ color: '#8b5cf6' }} /></div>
          <div>
            <div style={styles.statValue}>{formatCurrency(enhancedStats.valeurNetteTotale)}</div>
            <div style={styles.statLabel}>Valeur nette</div>
          </div>
        </div>
        <div style={{...styles.statCard, backgroundColor: cardBg, borderColor: borderColor}}>
          <div style={styles.statIcon}><FiBarChart2 size={20} style={{ color: '#f59e0b' }} /></div>
          <div>
            <div style={styles.statValue}>{enhancedStats.tauxAmortissementGlobal}%</div>
            <div style={styles.statLabel}>Amortissement global</div>
          </div>
        </div>
      </div>

      {/* Vue Tableau */}
      {viewMode === 'table' && (
        <div style={{...styles.tableCard, backgroundColor: cardBg, borderColor: borderColor}}>
          <div style={styles.tableWrapper}>
            {loading && !actifs.length ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={{ color: textMuted }}>Chargement des actifs...</p>
              </div>
            ) : filteredBySearch.length === 0 ? (
              <div style={styles.emptyState}>
                <FiPackage size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                <p style={{ color: textMuted }}>Aucun actif trouvé</p>
                {can(['admin', 'comptable']) && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/actifs/nouveau')} 
                    style={styles.emptyAddButton}
                  >
                    <FiPlus size={16} /> Créer votre premier actif
                  </motion.button>
                )}
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    {can(['admin', 'comptable']) && (
                      <th style={{ width: '40px', padding: '0.75rem 0.5rem' }}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={selectedActifs.length === filteredBySearch.length && filteredBySearch.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th onClick={() => handleSort('code')} style={styles.sortableHeader}>Code</th>
                    <th onClick={() => handleSort('nom')} style={styles.sortableHeader}>Nom</th>
                    <th onClick={() => handleSort('type')} style={styles.sortableHeader}>Type</th>
                    <th onClick={() => handleSort('type_immobilisation')} style={styles.sortableHeader}>Nature</th>
                    <th>État</th>
                    <th onClick={() => handleSort('localisation')} style={styles.sortableHeader}>Localisation</th>
                    <th onClick={() => handleSort('date_acquisition')} style={styles.sortableHeader}>Date acq.</th>
                    <th onClick={() => handleSort('cout_acquisition')} style={{...styles.sortableHeader, textAlign: 'right'}}>Coût</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBySearch.map((actif, index) => (
                    <motion.tr 
                      key={actif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.01 }}
                      style={{...styles.tableRow, borderBottomColor: borderColor}}
                    >
                      {can(['admin', 'comptable']) && (
                        <td><input type="checkbox" style={styles.checkbox} checked={selectedActifs.includes(actif.id)} onChange={() => toggleSelectActif(actif.id)} /></td>
                      )}
                      <td><code style={styles.code}>{actif.code}</code></td>
                      <td><span style={{ fontWeight: '600', color: textColor }}>{actif.nom}</span></td>
                      <td><span style={styles.typeText}>{getTypeIcon(actif.type)} {getTypeLabel(actif.type)}</span></td>
                      <td>
                        <span style={{...styles.natureBadge, backgroundColor: actif.type_immobilisation === 'corporel' ? '#dbeafe' : '#ede9fe', color: actif.type_immobilisation === 'corporel' ? '#1e40af' : '#6d28d9'}}>
                          {actif.type_immobilisation === 'corporel' ? '🏭 Corporel' : '📄 Incorporel'}
                        </span>
                      </td>
                      <td>
                        <span style={{...styles.etatBadge, backgroundColor: `${getEtatColor(actif.etat)}15`, color: getEtatColor(actif.etat)}}>
                          {getEtatIcon(actif.etat)} {getEtatLabel(actif.etat)}
                        </span>
                      </td>
                      <td><span style={{ color: textMuted }}>{actif.localisation || '-'}</span></td>
                      <td><span style={{ color: textMuted }}>{formatDate(actif.date_acquisition)}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>{formatCurrency(actif.cout_acquisition)}</td>
                      <td>
                        <div style={styles.actionButtons}>
                          <button onClick={() => navigate(`/actifs/${actif.id}`)} style={styles.viewButton} title="Voir"><FiEye size={14} /></button>
                          {can(['admin', 'comptable']) && (
                            <button onClick={() => navigate(`/actifs/modifier/${actif.id}`)} style={styles.editButton} title="Modifier"><FiEdit size={14} /></button>
                          )}
                          {can(['admin', 'comptable']) && (
                            <button onClick={() => handleDeleteClick(actif.id, actif.nom)} style={styles.deleteButton} title="Supprimer"><FiTrash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Vue Grille - ULTRA AMÉLIORÉE */}
      {viewMode === 'grid' && (
        <div>
          {loading && !actifs.length ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={{ color: textMuted }}>Chargement des actifs...</p>
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div style={styles.emptyState}>
              <FiPackage size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
              <p style={{ color: textMuted }}>Aucun actif trouvé</p>
            </div>
          ) : (
            <div style={styles.gridContainer}>
              {filteredBySearch.map((actif, index) => (
                <motion.div 
                  key={actif.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  onHoverStart={() => setHoveredCard(actif.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  style={{...styles.gridCard, backgroundColor: cardBg, borderColor: borderColor}}
                >
                  {/* Badge de sélection */}
                  {can(['admin', 'comptable']) && (
                    <div style={styles.gridSelectCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedActifs.includes(actif.id)}
                        onChange={() => toggleSelectActif(actif.id)}
                        style={styles.gridCheckbox}
                      />
                    </div>
                  )}

                  {/* En-tête avec code et statut */}
                  <div style={styles.gridCardHeader}>
                    <div style={styles.gridCardCodeWrapper}>
                      <FiTag size={12} style={{ color: '#3b82f6' }} />
                      <code style={styles.gridCardCode}>{actif.code}</code>
                    </div>
                    <div style={{...styles.gridCardStatus, backgroundColor: `${getEtatColor(actif.etat)}15`, color: getEtatColor(actif.etat)}}>
                      {getEtatIcon(actif.etat)} {getEtatLabel(actif.etat)}
                    </div>
                  </div>

                  {/* Titre et icône */}
                  <div style={styles.gridCardTitleRow}>
                    <div style={styles.gridCardIcon}>
                      {typeof getTypeIcon(actif.type) === 'string' ? 
                        <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(actif.type)}</span> : 
                        getTypeIcon(actif.type)}
                    </div>
                    <div>
                      <h3 style={{...styles.gridCardTitle, color: textColor}}>{actif.nom}</h3>
                      <p style={{...styles.gridCardSubtitle, color: textMuted}}>{getTypeLabel(actif.type)}</p>
                    </div>
                  </div>

                  {/* Détails */}
                  <div style={{...styles.gridCardDetails, backgroundColor: darkMode ? '#0f172a' : '#f8fafc'}}>
                    <div style={styles.gridDetailRow}>
                      <FiCalendar size={12} style={{ color: textMuted }} />
                      <span style={{ color: textMuted }}>Acquisition:</span>
                      <strong style={{ color: textColor }}>{formatDate(actif.date_acquisition)}</strong>
                    </div>
                    <div style={styles.gridDetailRow}>
                      <FiMapPin size={12} style={{ color: textMuted }} />
                      <span style={{ color: textMuted }}>Localisation:</span>
                      <strong style={{ color: textColor }}>{actif.localisation || '-'}</strong>
                    </div>
                    <div style={styles.gridDetailRow}>
                      <FiBriefcase size={12} style={{ color: textMuted }} />
                      <span style={{ color: textMuted }}>Fournisseur:</span>
                      <strong style={{ color: textColor }}>{actif.fournisseur || '-'}</strong>
                    </div>
                    <div style={styles.gridDetailRow}>
                      <FiDollarSign size={12} style={{ color: '#3b82f6' }} />
                      <span style={{ color: textMuted }}>Coût:</span>
                      <strong style={{ color: '#3b82f6' }}>{formatCurrency(actif.cout_acquisition)}</strong>
                    </div>
                    <div style={styles.gridDetailRow}>
                      <FiTrendingUp size={12} style={{ color: '#10b981' }} />
                      <span style={{ color: textMuted }}>Taux amortissement:</span>
                      <strong style={{ color: '#10b981' }}>{getTauxAmortissement(actif)}</strong>
                    </div>
                  </div>

                  {/* Nature et amortissement */}
                  <div style={styles.gridCardTags}>
                    <span style={{...styles.gridNatureTag, backgroundColor: actif.type_immobilisation === 'corporel' ? '#dbeafe15' : '#ede9fe15', color: actif.type_immobilisation === 'corporel' ? '#3b82f6' : '#8b5cf6'}}>
                      {actif.type_immobilisation === 'corporel' ? '🏭 Corporel' : '📄 Incorporel'}
                    </span>
                    <span style={{...styles.gridAmortTag, backgroundColor: '#10b98115', color: '#10b981'}}>
                      {getTauxAmortissement(actif)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={styles.gridCardActions}>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/actifs/${actif.id}`)} 
                      style={styles.gridViewButton}
                    >
                      <FiEye size={14} /> Détails
                    </motion.button>
                    {can(['admin', 'comptable']) && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/actifs/modifier/${actif.id}`)} 
                        style={styles.gridEditButton}
                      >
                        <FiEdit size={14} />
                      </motion.button>
                    )}
                    {can(['admin', 'comptable']) && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteClick(actif.id, actif.nom)} 
                        style={styles.gridDeleteButton}
                      >
                        <FiTrash2 size={14} />
                      </motion.button>
                    )}
                  </div>

                  {/* Valeur nette en bas */}
                  <div style={styles.gridCardFooterValue}>
                    <span style={{ color: textMuted }}>Valeur nette:</span>
                    <strong style={{ color: '#8b5cf6', fontSize: '1rem' }}>{formatCurrency(getValeurNette(actif))}</strong>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={styles.paginationContainer}>
              <button disabled={pagination.page === 1} style={{...styles.paginationButton, opacity: pagination.page === 1 ? 0.5 : 1}}>
                <FiChevronLeft size={14} /> Précédent
              </button>
              <span style={{ color: textMuted }}>Page {pagination.page} sur {pagination.totalPages}</span>
              <button disabled={pagination.page === pagination.totalPages} style={{...styles.paginationButton, opacity: pagination.page === pagination.totalPages ? 0.5 : 1}}>
                Suivant <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </motion.div>
  );
};

// ============ STYLES PROFESSIONNELS ============
const styles = {
  container: { padding: '1.5rem', minHeight: '100vh', transition: 'background-color 0.3s ease' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' },
  headerLeft: { flex: 1 },
  title: { fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' },
  subtitle: { fontSize: '0.85rem' },
  actions: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' },
  searchBar: { position: 'relative' },
  searchInput: { padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', width: '220px', fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' },
  viewToggle: { display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
  toggleBtn: { padding: '0.5rem 0.75rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' },
  toggleActive: { background: '#3b82f6', color: '#fff', border: 'none' },
  toggleInactive: { background: 'transparent', color: '#64748b', border: 'none' },
  refreshButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', cursor: 'pointer' },
  bulkDeleteButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#ef4444', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: '500' },
  addButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#3b82f6', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: '500' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '16px', border: '1px solid', transition: 'all 0.2s' },
  statIcon: { width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },

  tableCard: { borderRadius: '16px', border: '1px solid', overflow: 'hidden' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  sortableHeader: { padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' },
  tableRow: { borderBottom: '1px solid', transition: 'background-color 0.2s' },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' },
  code: { fontSize: '0.7rem', fontFamily: 'monospace', padding: '0.125rem 0.375rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569' },
  typeText: { fontSize: '0.8rem', color: '#334155' },
  natureBadge: { padding: '0.125rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' },
  etatBadge: { padding: '0.125rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' },
  actionButtons: { display: 'flex', gap: '0.25rem', justifyContent: 'center' },
  viewButton: { padding: '0.25rem 0.5rem', background: '#eef2ff', border: 'none', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer' },
  editButton: { padding: '0.25rem 0.5rem', background: '#fffbeb', border: 'none', borderRadius: '6px', color: '#f59e0b', cursor: 'pointer' },
  deleteButton: { padding: '0.25rem 0.5rem', background: '#fef2f2', border: 'none', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' },

  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' },
  gridCard: { position: 'relative', borderRadius: '20px', border: '1px solid', overflow: 'hidden', transition: 'all 0.3s ease' },
  gridSelectCheckbox: { position: 'absolute', top: '12px', left: '12px', zIndex: 10 },
  gridCheckbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' },
  gridCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1rem 0.5rem 1rem' },
  gridCardCodeWrapper: { display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '8px' },
  gridCardCode: { fontSize: '0.7rem', fontFamily: 'monospace', color: '#475569' },
  gridCardStatus: { padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '500' },
  gridCardTitleRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem' },
  gridCardIcon: { width: '48px', height: '48px', borderRadius: '16px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gridCardTitle: { fontSize: '1rem', fontWeight: '700', margin: 0 },
  gridCardSubtitle: { fontSize: '0.7rem', margin: 0 },
  gridCardDetails: { margin: '0.5rem 1rem', padding: '0.75rem', borderRadius: '12px' },
  gridDetailRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0' },
  gridCardTags: { display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem' },
  gridNatureTag: { padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '500' },
  gridAmortTag: { padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '500' },
  gridCardActions: { display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' },
  gridViewButton: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', background: '#eef2ff', border: 'none', borderRadius: '10px', color: '#3b82f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '500' },
  gridEditButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: '#fffbeb', border: 'none', borderRadius: '10px', color: '#f59e0b', cursor: 'pointer' },
  gridDeleteButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: '#fef2f2', border: 'none', borderRadius: '10px', color: '#ef4444', cursor: 'pointer' },
  gridCardFooterValue: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' },

  paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem', marginTop: '1rem' },
  paginationButton: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer' },
  
  loadingContainer: { textAlign: 'center', padding: '3rem' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' },
  emptyState: { textAlign: 'center', padding: '3rem' },
  emptyAddButton: { marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  modalContent: { borderRadius: '16px', border: '1px solid', width: '90%', maxWidth: '500px', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: '1rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  modalClose: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '1.5rem' },
  modalNote: { fontSize: '0.75rem', marginTop: '0.5rem' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' },
  cancelButton: { padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer' },
  confirmButton: { padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }
};

export default React.memo(ActifList);
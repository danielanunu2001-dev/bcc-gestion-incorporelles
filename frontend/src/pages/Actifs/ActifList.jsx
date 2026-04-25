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
  FiChevronLeft, FiChevronRight, FiX
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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('actifViewMode') || 'table');
  const [selectedActifs, setSelectedActifs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actifToDelete, setActifToDelete] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

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
      setSelectedActifs(sortedActifs.map(a => a.id));
    } else {
      setSelectedActifs([]);
    }
  }, [sortedActifs]);

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
      'neuf': '#22c55e',
      'bon': '#3b82f6',
      'moyen': '#eab308',
      'mauvais': '#ef4444',
      'reforme': '#6b7280',
      'reparation': '#eab308',
      'hors_service': '#ef4444'
    };
    return colors[etat] || '#6b7280';
  };

  const getStatusColor = (actif) => {
    if (!actif.actif) return '#ef4444';
    const valeurNette = actif.valeur_nette || actif.cout_acquisition;
    if (valeurNette <= (actif.valeur_residuelle || 0)) return '#eab308';
    return '#22c55e';
  };

  const getStatusText = (actif) => {
    if (!actif.actif) return 'Inactif';
    const valeurNette = actif.valeur_nette || actif.cout_acquisition;
    if (valeurNette <= (actif.valeur_residuelle || 0)) return 'Amorti';
    return 'Actif';
  };

  const getTypeIcon = (type) => {
    const icons = {
      'logiciel': '💻',
      'brevet': '📜',
      'licence': '📄',
      'fonds_commercial': '🏢',
      'materiel': '🖥️',
      'vehicule': '🚗',
      'bâtiment': '🏠',
      'terrain': '🌳',
      'autres': '📦'
    };
    return icons[type] || '📋';
  };

  // Styles dynamiques avec meilleur contraste
  const bgColor = darkMode ? '#0a0a0f' : '#f0f2f5';
  const cardBg = darkMode ? '#1a1a2e' : '#ffffff';
  const textColor = darkMode ? '#ffffff' : '#111827';
  const textMuted = darkMode ? '#cbd5e1' : '#4b5563';
  const borderColor = darkMode ? '#334155' : '#e5e7eb';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
                <p style={{ color: textColor, fontWeight: 'bold' }}>Êtes-vous sûr de vouloir supprimer l'actif <strong style={{ color: '#ef4444' }}>"{actifToDelete?.nom}"</strong> ?</p>
                <p style={{...styles.modalNote, color: textMuted, fontWeight: 'bold'}}>Cette action est irréversible et supprimera toutes les données associées.</p>
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => setShowDeleteModal(false)} style={styles.cancelButton}>Annuler</button>
                <button onClick={confirmDelete} style={styles.confirmButton}>Confirmer la suppression</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header avec stats */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <FiPackage size={32} /> Gestion des Actifs
          </h1>
          <p style={{...styles.subtitle, color: textMuted, fontWeight: 'bold'}}>
            {stats.total} actif(s) trouvé(s)
            {selectedActifs.length > 0 && <span style={styles.selectedBadge}>{selectedActifs.length} sélectionné(s)</span>}
          </p>
          <div style={styles.statsBadges}>
            <span style={{...styles.badge, backgroundColor: '#dbeafe', color: '#1e40af'}}>
              🏭 Corporel: {stats.corporel}
            </span>
            <span style={{...styles.badge, backgroundColor: '#ede9fe', color: '#6d28d9'}}>
              📄 Incorporel: {stats.incorporel}
            </span>
            <span style={{...styles.badge, backgroundColor: '#d1fae5', color: '#065f46'}}>
              ✅ Actif: {stats.actifsActifs}
            </span>
            {stats.actifsInactifs > 0 && (
              <span style={{...styles.badge, backgroundColor: '#fee2e2', color: '#991b1b'}}>
                ❌ Inactif: {stats.actifsInactifs}
              </span>
            )}
          </div>
        </div>
        
        <div style={styles.actions}>
          {/* Boutons d'export */}
          {can(['admin', 'comptable', 'auditeur', 'gestionnaire']) && (
            <ExportButtons data={sortedActifs} filename="liste_actifs" type="actifs" />
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
            <span className="d-none d-md-inline">Rafraîchir</span>
          </motion.button>
          
          {/* Suppression groupée */}
          {selectedActifs.length > 0 && can(['admin', 'comptable']) && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkDelete} 
              style={styles.bulkDeleteButton}
            >
              <FiTrash2 size={16} /> Supprimer ({selectedActifs.length})
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

      {/* Vue Tableau */}
      {viewMode === 'table' && (
        <div style={{...styles.tableCard, backgroundColor: cardBg, borderColor: borderColor}}>
          <div style={styles.tableWrapper}>
            {loading && !actifs.length ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={{ color: textMuted, fontWeight: 'bold' }}>Chargement des actifs...</p>
              </div>
            ) : sortedActifs.length === 0 ? (
              <div style={styles.emptyState}>
                <FiPackage size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
                <p style={{ color: textMuted, fontWeight: 'bold' }}>Aucun actif trouvé</p>
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
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={selectedActifs.length === sortedActifs.length && sortedActifs.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th onClick={() => handleSort('code')} style={styles.sortableHeader}>
                      Code {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('nom')} style={styles.sortableHeader}>
                      Nom {sortConfig.key === 'nom' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('type')} style={styles.sortableHeader}>
                      Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('type_immobilisation')} style={styles.sortableHeader}>
                      Nature {sortConfig.key === 'type_immobilisation' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>N° Inventaire</th>
                    <th>État</th>
                    <th onClick={() => handleSort('localisation')} style={styles.sortableHeader}>
                      Localisation {sortConfig.key === 'localisation' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('date_acquisition')} style={styles.sortableHeader}>
                      Date acq.
                    </th>
                    <th onClick={() => handleSort('cout_acquisition')} style={{...styles.sortableHeader, textAlign: 'right'}}>
                      Coût
                    </th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedActifs.map((actif, index) => (
                    <motion.tr 
                      key={actif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      style={styles.tableRow}
                    >
                      {can(['admin', 'comptable']) && (
                        <td>
                          <input
                            type="checkbox"
                            style={styles.checkbox}
                            checked={selectedActifs.includes(actif.id)}
                            onChange={() => toggleSelectActif(actif.id)}
                          />
                        </td>
                      )}
                      {/* Code */}
                      <td><code style={styles.code}>{actif.code}</code></td>
                      
                      {/* Nom */}
                      <td>
                        <div style={{...styles.actifName, color: textColor, fontWeight: 'bold'}}>{actif.nom}</div>
                        {actif.description && (
                          <small style={{...styles.actifDesc, color: textMuted, fontWeight: 'bold'}}>
                            {actif.description.substring(0, 50)}
                            {actif.description.length > 50 && '...'}
                          </small>
                        )}
                      </td>
                      
                      {/* TYPE - NOIR FONCÉ */}
                      <td>
                        <span style={styles.typeIcon}>{getTypeIcon(actif.type)}</span>
                        <span style={{ color: '#000000', fontWeight: 'bold' }}>{getTypeLabel(actif.type)}</span>
                      </td>
                      
                      {/* NATURE - BLEU FONCÉ / VIOLET FONCÉ */}
                      <td>
                        {actif.type_immobilisation === 'corporel' ? (
                          <span style={{...styles.natureBadge, backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 'bold'}}>🏭 Corporel</span>
                        ) : actif.type_immobilisation === 'incorporel' ? (
                          <span style={{...styles.natureBadge, backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 'bold'}}>📄 Incorporel</span>
                        ) : (
                          <span style={{...styles.natureBadge, backgroundColor: '#f3f4f6', color: '#4b5563', fontWeight: 'bold'}}>❓ Non défini</span>
                        )}
                      </td>
                      
                      {/* N° Inventaire */}
                      <td><code style={styles.inventaireCode}>{actif.numero_inventaire || 'N/A'}</code></td>
                      
                      {/* ÉTAT - COULEUR VISIBLE */}
                      <td>
                        {actif.etat && (
                          <span style={{...styles.etatBadge, backgroundColor: `${getEtatColor(actif.etat)}20`, color: getEtatColor(actif.etat), fontWeight: 'bold'}}>
                            {getEtatLabel(actif.etat)}
                          </span>
                        )}
                      </td>
                      
                      {/* LOCALISATION - NOIR FONCÉ */}
                      <td><span style={{ color: '#000000', fontWeight: 'bold' }}>{actif.localisation || 'N/A'}</span></td>
                      
                      {/* DATE ACQUISITION - GRIS FONCÉ */}
                      <td><span style={{ color: '#374151', fontWeight: 'bold' }}>{formatDate(actif.date_acquisition)}</span></td>
                      
                      {/* COÛT - BLEU FONCÉ */}
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e40af' }}>{formatCurrency(actif.cout_acquisition)}</td>
                      
                      {/* Actions */}
                      <td>
                        <div style={styles.actionButtons}>
                          {can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'gestionnaire']) && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => navigate(`/actifs/${actif.id}`)} 
                              style={styles.viewButton}
                              title="Voir détails"
                            >
                              <FiEye size={14} />
                            </motion.button>
                          )}
                          {can(['admin', 'comptable']) && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => navigate(`/actifs/modifier/${actif.id}`)} 
                              style={styles.editButton}
                              title="Modifier"
                            >
                              <FiEdit size={14} />
                            </motion.button>
                          )}
                          {can(['admin', 'comptable']) && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteClick(actif.id, actif.nom)} 
                              style={styles.deleteButton}
                              title="Supprimer"
                            >
                              <FiTrash2 size={14} />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={styles.paginationContainer}>
              <button 
                disabled={pagination.page === 1} 
                onClick={() => {/* handlePageChange */}}
                style={{...styles.paginationButton, opacity: pagination.page === 1 ? 0.5 : 1}}
              >
                <FiChevronLeft size={14} /> Précédent
              </button>
              <span style={{ color: textMuted, fontWeight: 'bold' }}>Page {pagination.page} sur {pagination.totalPages}</span>
              <button 
                disabled={pagination.page === pagination.totalPages} 
                onClick={() => {/* handlePageChange */}}
                style={{...styles.paginationButton, opacity: pagination.page === pagination.totalPages ? 0.5 : 1}}
              >
                Suivant <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vue Grille */}
      {viewMode === 'grid' && (
        <div>
          {loading && !actifs.length ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={{ color: textMuted, fontWeight: 'bold' }}>Chargement des actifs...</p>
            </div>
          ) : sortedActifs.length === 0 ? (
            <div style={styles.emptyState}>
              <FiPackage size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
              <p style={{ color: textMuted, fontWeight: 'bold' }}>Aucun actif trouvé</p>
            </div>
          ) : (
            <div style={styles.gridContainer}>
              {sortedActifs.map((actif, index) => (
                <motion.div 
                  key={actif.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ y: -4 }}
                  style={{...styles.gridCard, backgroundColor: cardBg, borderColor: borderColor}}
                >
                  <div style={styles.gridCardBody}>
                    {/* En-tête de la carte */}
                    <div style={styles.gridCardHeader}>
                      <code style={styles.gridCardCode}>{actif.code}</code>
                      <span style={{...styles.gridCardStatus, backgroundColor: `${getStatusColor(actif)}20`, color: getStatusColor(actif), fontWeight: 'bold'}}>
                        {getStatusText(actif)}
                      </span>
                    </div>
                    
                    {/* Titre */}
                    <h5 style={{...styles.gridCardTitle, color: textColor, fontWeight: 'bold'}}>{actif.nom}</h5>
                    <p style={{...styles.gridCardType, color: textMuted, fontWeight: 'bold'}}>
                      <span>{getTypeIcon(actif.type)}</span> <span style={{ color: '#000000', fontWeight: 'bold' }}>{getTypeLabel(actif.type)}</span>
                    </p>
                    
                    {/* Informations */}
                    <div style={styles.gridCardInfo}>
                      <div style={styles.gridInfoRow}>
                        <span style={{ color: textMuted, fontWeight: 'bold' }}>Nature:</span>
                        <span style={{ color: actif.type_immobilisation === 'corporel' ? '#1e40af' : '#6d28d9', fontWeight: 'bold'}}>
                          {actif.type_immobilisation === 'corporel' ? '🏭 Corporel' : '📄 Incorporel'}
                        </span>
                      </div>
                      {actif.numero_inventaire && (
                        <div style={styles.gridInfoRow}>
                          <span style={{ color: textMuted, fontWeight: 'bold' }}>N° Inventaire:</span>
                          <code style={styles.gridInfoCode}>{actif.numero_inventaire}</code>
                        </div>
                      )}
                      {actif.etat && (
                        <div style={styles.gridInfoRow}>
                          <span style={{ color: textMuted, fontWeight: 'bold' }}>État:</span>
                          <span style={{ color: getEtatColor(actif.etat), fontWeight: 'bold' }}>{getEtatLabel(actif.etat)}</span>
                        </div>
                      )}
                      {actif.localisation && (
                        <div style={styles.gridInfoRow}>
                          <span style={{ color: textMuted, fontWeight: 'bold' }}>Localisation:</span>
                          <strong style={{ color: '#000000', fontWeight: 'bold' }}>{actif.localisation}</strong>
                        </div>
                      )}
                    </div>
                    
                    <hr style={styles.gridDivider} />
                    
                    {/* Valeurs financières */}
                    <div style={styles.gridFinancial}>
                      <div style={styles.gridFinancialRow}>
                        <span style={{ color: textMuted, fontWeight: 'bold' }}>Acquisition:</span>
                        <span style={{ color: '#374151', fontWeight: 'bold' }}>{formatDate(actif.date_acquisition)}</span>
                      </div>
                      <div style={styles.gridFinancialRow}>
                        <span style={{ color: textMuted, fontWeight: 'bold' }}>Coût:</span>
                        <span style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatCurrency(actif.cout_acquisition)}</span>
                      </div>
                      <div style={styles.gridFinancialRow}>
                        <span style={{ color: textMuted, fontWeight: 'bold' }}>Valeur nette:</span>
                        <span style={{ fontWeight: 'bold', color: getStatusColor(actif) }}>
                          {formatCurrency(actif.valeur_nette || actif.cout_acquisition)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer avec boutons d'action */}
                  <div style={styles.gridCardFooter}>
                    <div style={styles.gridActions}>
                      {can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'gestionnaire']) && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/actifs/${actif.id}`)} 
                          style={styles.gridViewButton}
                        >
                          <FiEye size={14} /> Voir
                        </motion.button>
                      )}
                      {can(['admin', 'comptable']) && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/actifs/modifier/${actif.id}`)} 
                          style={styles.gridEditButton}
                          title="Modifier"
                        >
                          <FiEdit size={14} />
                        </motion.button>
                      )}
                      {can(['admin', 'comptable']) && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDeleteClick(actif.id, actif.nom)} 
                          style={styles.gridDeleteButton}
                          title="Supprimer"
                        >
                          <FiTrash2 size={14} />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Pagination pour la vue grille */}
          {pagination.totalPages > 1 && (
            <div style={styles.paginationContainer}>
              <button 
                disabled={pagination.page === 1} 
                onClick={() => {/* handlePageChange */}}
                style={{...styles.paginationButton, opacity: pagination.page === 1 ? 0.5 : 1}}
              >
                <FiChevronLeft size={14} /> Précédent
              </button>
              <span style={{ color: textMuted, fontWeight: 'bold' }}>Page {pagination.page} sur {pagination.totalPages}</span>
              <button 
                disabled={pagination.page === pagination.totalPages} 
                onClick={() => {/* handlePageChange */}}
                style={{...styles.paginationButton, opacity: pagination.page === pagination.totalPages ? 0.5 : 1}}
              >
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
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </motion.div>
  );
};

// ============ STYLES AVEC COULEURS TRÈS VISIBLES ============
const styles = {
  container: {
    padding: '1.5rem',
    minHeight: '100vh',
    transition: 'background-color 0.3s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#1e3a8a'
  },
  subtitle: {
    fontSize: '0.85rem',
    marginBottom: '0.5rem'
  },
  selectedBadge: {
    marginLeft: '0.5rem',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#2563eb',
    borderRadius: '20px',
    fontSize: '0.7rem',
    color: '#ffffff',
    fontWeight: 'bold'
  },
  statsBadges: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 'bold'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  toggleBtn: {
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: 'bold'
  },
  toggleActive: {
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    color: '#ffffff',
    border: 'none'
  },
  toggleInactive: {
    background: 'transparent',
    color: '#4b5563',
    border: 'none'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.75rem',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    color: '#4b5563',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  bulkDeleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.75rem',
    background: '#dc2626',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.75rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  tableCard: {
    borderRadius: '12px',
    border: '1px solid',
    overflow: 'hidden'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  sortableHeader: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '2px solid #e5e7eb',
    color: '#4b5563',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#2563eb'
  },
  code: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    padding: '0.125rem 0.375rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    color: '#4b5563',
    fontWeight: 'bold'
  },
  actifName: {
    fontWeight: 'bold',
    fontSize: '0.85rem'
  },
  actifDesc: {
    fontSize: '0.7rem',
    display: 'block'
  },
  typeIcon: {
    marginRight: '0.25rem'
  },
  natureBadge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 'bold'
  },
  inventaireCode: {
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: '0.125rem 0.25rem',
    borderRadius: '4px',
    color: '#4b5563'
  },
  etatBadge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 'bold'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.25rem'
  },
  viewButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  editButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '6px',
    color: '#d97706',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  deleteButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  paginationButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#4b5563',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem'
  },
  emptyAddButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem'
  },
  gridCard: {
    borderRadius: '12px',
    border: '1px solid',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  gridCardBody: {
    padding: '1rem'
  },
  gridCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  gridCardCode: {
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    padding: '0.125rem 0.375rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    color: '#4b5563',
    fontWeight: 'bold'
  },
  gridCardStatus: {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.65rem',
    fontWeight: 'bold'
  },
  gridCardTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem'
  },
  gridCardType: {
    fontSize: '0.7rem',
    marginBottom: '0.75rem'
  },
  gridCardInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '0.5rem',
    marginBottom: '0.75rem'
  },
  gridInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    padding: '0.25rem 0'
  },
  gridInfoCode: {
    fontSize: '0.65rem',
    fontFamily: 'monospace'
  },
  gridDivider: {
    margin: '0.75rem 0',
    borderColor: '#e5e7eb'
  },
  gridFinancial: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  gridFinancialRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem'
  },
  gridCardFooter: {
    padding: '0.75rem 1rem',
    borderTop: '1px solid #e5e7eb'
  },
  gridActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  gridViewButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    padding: '0.4rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: 'bold'
  },
  gridEditButton: {
    flex: 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    color: '#d97706',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  gridDeleteButton: {
    flex: 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100
  },
  modalContent: {
    borderRadius: '12px',
    border: '1px solid',
    width: '90%',
    maxWidth: '500px',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  modalBody: {
    padding: '1.5rem'
  },
  modalNote: {
    fontSize: '0.75rem',
    marginTop: '0.5rem'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#4b5563',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  confirmButton: {
    padding: '0.5rem 1rem',
    background: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default React.memo(ActifList);
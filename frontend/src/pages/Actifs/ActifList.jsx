import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActifs, deleteActif } from '../../store/actifSlice';
import { addNotification } from '../../store/uiSlice';
import AdvancedFilters from '../../components/Filters/AdvancedFilters';
import ExportButtons from '../../components/Export/ExportButtons';
import usePermissions from '../../hooks/usePermissions';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import { selectActifs, selectActifsLoading, selectActifsError } from '../../store/selectors';
import {
  FiEye, FiEdit, FiTrash2, FiPlus,
  FiRefreshCw, FiDownload, FiGrid, FiList,
  FiSearch, FiX
} from 'react-icons/fi';

const ActifList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { can } = usePermissions();

  // ✅ Utilisation des sélecteurs mémoïsés
  const actifs = useSelector(selectActifs);
  const loading = useSelector(selectActifsLoading);
  const error = useSelector(selectActifsError);
  
  // ✅ Sécurisation des useSelector avec valeurs par défaut (fallback)
  const { filters: reduxFilters = {} } = useSelector((state) => state.ui || {});
  
  // ✅ UTILISATION DU HOOK PERSISTED FILTERS AVEC AJOUT DE typeImmobilisation
  const { filters, updateFilters, resetFilters } = usePersistedFilters({
    search: '',
    type: '',
    typeImmobilisation: '',
    statut: '',
    page: 1,
    limit: 20
  });
  
  // États locaux
  const [viewMode, setViewMode] = useState('table');
  const [selectedActifs, setSelectedActifs] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Effets
  useEffect(() => {
    const params = {
      search: filters.search,
      type: filters.type,
      typeImmobilisation: filters.typeImmobilisation,
      statut: filters.statut,
      page: filters.page,
      limit: filters.limit
    };
    console.log('📤 Envoi des paramètres:', params);
    dispatch(fetchActifs(params));
  }, [dispatch, filters.search, filters.type, filters.typeImmobilisation, filters.statut, filters.page, filters.limit]);

  useEffect(() => {
    if (error) {
      dispatch(addNotification({
        type: 'error',
        message: error,
        duration: 5000
      }));
    }
  }, [error, dispatch]);

  // ✅ HANDLERS AVEC PERSISTANCE DES FILTRES
  const handleSearchChange = (e) => {
    updateFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleTypeChange = (e) => {
    updateFilters({ ...filters, type: e.target.value, page: 1 });
  };

  const handleTypeImmobilisationChange = (e) => {
    console.log('🔄 Changement filtre Nature:', e.target.value);
    updateFilters({ ...filters, typeImmobilisation: e.target.value, page: 1 });
  };

  const handleStatutChange = (e) => {
    updateFilters({ ...filters, statut: e.target.value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    updateFilters({ ...filters, page: newPage });
  };

  const handleResetFilters = () => {
    resetFilters();
  };

  const handleRefresh = () => {
    const params = {
      search: filters.search,
      type: filters.type,
      typeImmobilisation: filters.typeImmobilisation,
      statut: filters.statut,
      page: filters.page,
      limit: filters.limit
    };
    dispatch(fetchActifs(params));
  };

  // Fonctions de gestion
  const handleDelete = async (id, nom) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!id) {
      console.error('❌ ID manquant');
      alert('ID actif manquant');
      return;
    }
    
    if (!uuidRegex.test(id)) {
      console.error('❌ ID invalide (format UUID attendu):', id);
      alert(`ID actif invalide: ${id}`);
      return;
    }
    
    if (window.confirm(`Supprimer l'actif "${nom}" ?`)) {
      console.log('📡 Envoi de la requête DELETE:', `/actifs/${id}`);
      
      const result = await dispatch(deleteActif(id));
      
      console.log('📥 Résultat de la suppression:', result);
      
      if (deleteActif.fulfilled.match(result)) {
        dispatch(addNotification({
          type: 'success',
          message: 'Actif supprimé avec succès',
          duration: 3000
        }));
        handleRefresh();
      } else {
        console.error('❌ Erreur suppression:', result.error);
        dispatch(addNotification({
          type: 'error',
          message: result.error?.message || 'Erreur lors de la suppression',
          duration: 5000
        }));
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedActifs.length === 0) return;
    
    if (window.confirm(`Supprimer ${selectedActifs.length} actif(s) ?`)) {
      selectedActifs.forEach(id => dispatch(deleteActif(id)));
      setSelectedActifs([]);
      dispatch(addNotification({
        type: 'success',
        message: `${selectedActifs.length} actif(s) supprimé(s)`,
        duration: 3000
      }));
      handleRefresh();
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Fonctions utilitaires
  const getSortedActifs = () => {
    if (!actifs || actifs.length === 0) return [];
    
    return [...actifs].sort((a, b) => {
      if (sortConfig.direction === 'asc') {
        return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
      } else {
        return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
      }
    });
  };

  const getNatureStats = () => {
    if (!actifs || actifs.length === 0) return { corporel: 0, incorporel: 0, nonDefini: 0 };
    
    const corporel = actifs.filter(a => a.type_immobilisation === 'corporel').length;
    const incorporel = actifs.filter(a => a.type_immobilisation === 'incorporel').length;
    const nonDefini = actifs.filter(a => !a.type_immobilisation).length;
    
    return { corporel, incorporel, nonDefini };
  };

  const natureStats = getNatureStats();

  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0 FC';
    }
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
    return types[type] || type;
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
      'reforme': 'var(--text-secondary)',
      'reparation': '#f59e0b',
      'hors_service': '#ef4444'
    };
    return colors[etat] || 'var(--text-secondary)';
  };

  const getStatusColor = (actif) => {
    if (!actif.actif) return '#dc2626';
    const valeurNette = actif.valeur_nette || actif.cout_acquisition;
    if (valeurNette <= (actif.valeur_residuelle || 0)) return '#f59e0b';
    return '#10b981';
  };

  const getStatusText = (actif) => {
    if (!actif.actif) return 'Inactif';
    const valeurNette = actif.valeur_nette || actif.cout_acquisition;
    if (valeurNette <= (actif.valeur_residuelle || 0)) return 'Amorti';
    return 'Actif';
  };

  const sortedActifs = getSortedActifs();
  const totalPages = Math.ceil((actifs?.length || 0) / (filters.limit || 20));

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des Actifs</h1>
          <p style={styles.subtitle}>
            {actifs?.length || 0} actif(s) trouvé(s)
            {selectedActifs.length > 0 && ` • ${selectedActifs.length} sélectionné(s)`}
          </p>
          {(natureStats.corporel > 0 || natureStats.incorporel > 0) && (
            <div style={styles.natureStats}>
              <span style={styles.corporelStat}>🏭 Corporel: {natureStats.corporel}</span>
              <span style={styles.incorporelStat}>📄 Incorporel: {natureStats.incorporel}</span>
              {natureStats.nonDefini > 0 && (
                <span style={styles.nonDefiniStat}>❓ Non défini: {natureStats.nonDefini}</span>
              )}
            </div>
          )}
        </div>
        <div style={styles.headerActions}>
          {can(['admin', 'comptable', 'auditeur']) && (
            <ExportButtons data={sortedActifs} filename="liste_actifs" type="actifs" />
          )}
          
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('table')} style={viewMode === 'table' ? styles.viewActive : styles.viewButton} title="Vue tableau">
              <FiList />
            </button>
            <button onClick={() => setViewMode('grid')} style={viewMode === 'grid' ? styles.viewActive : styles.viewButton} title="Vue grille">
              <FiGrid />
            </button>
          </div>
          
          <button onClick={handleRefresh} style={styles.refreshButton} disabled={loading} title="Rafraîchir">
            <FiRefreshCw className={loading ? 'spin' : ''} />
          </button>
          
          {selectedActifs.length > 0 && can(['admin', 'comptable']) && (
            <button onClick={handleBulkDelete} style={styles.bulkDeleteButton}>
              <FiTrash2 /> Supprimer ({selectedActifs.length})
            </button>
          )}
          
          {can(['admin', 'comptable']) && (
            <button onClick={() => navigate('/actifs/nouveau')} style={styles.createButton}>
              <FiPlus /> Nouvel actif
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrapper}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par code, nom ou numéro d'inventaire..."
            value={filters.search}
            onChange={handleSearchChange}
            style={styles.searchInput}
          />
          {filters.search && (
            <button onClick={handleResetFilters} style={styles.clearButton}>
              <FiX />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={styles.filterToggleButton}>
          <FiSearch /> Filtres
        </button>
      </div>

      {/* Filtres avancés */}
      {showFilters && can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique']) && (
        <AdvancedFilters type="actifs" />
      )}

      {/* Filtres supplémentaires */}
      {showFilters && can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique']) && (
        <div style={styles.filtersPanel}>
          <div style={styles.filtersRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Type d'actif</label>
              <select value={filters.type} onChange={handleTypeChange} style={styles.filterSelect}>
                <option value="">Tous les types</option>
                <option value="logiciel">Logiciel</option>
                <option value="brevet">Brevet</option>
                <option value="licence">Licence</option>
                <option value="fonds_commercial">Fonds commercial</option>
                <option value="materiel">Matériel</option>
                <option value="vehicule">Véhicule</option>
                <option value="bâtiment">Bâtiment</option>
                <option value="terrain">Terrain</option>
                <option value="autres">Autres</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Nature</label>
              <select value={filters.typeImmobilisation} onChange={handleTypeImmobilisationChange} style={styles.filterSelect}>
                <option value="">Tous</option>
                <option value="corporel">🏭 Corporel (matériel, véhicule, bâtiment)</option>
                <option value="incorporel">📄 Incorporel (logiciel, brevet, licence)</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Statut</label>
              <select value={filters.statut} onChange={handleStatutChange} style={styles.filterSelect}>
                <option value="">Tous</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
            <button onClick={handleResetFilters} style={styles.resetButton}>
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Vue Tableau */}
      {viewMode === 'table' && (
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Chargement des actifs...</p>
            </div>
          ) : sortedActifs.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Aucun actif trouvé</p>
              {can(['admin', 'comptable']) && (
                <button onClick={() => navigate('/actifs/nouveau')} style={styles.createButton}>
                  <FiPlus /> Créer votre premier actif
                </button>
              )}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {can(['admin', 'comptable']) && (
                    <th style={styles.thCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedActifs.length === sortedActifs.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedActifs(sortedActifs.map(a => a.id));
                          } else {
                            setSelectedActifs([]);
                          }
                        }}
                      />
                    </th>
                  )}
                  <th style={styles.th} onClick={() => handleSort('code')}>
                    Code {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={styles.th} onClick={() => handleSort('nom')}>
                    Nom {sortConfig.key === 'nom' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={styles.th} onClick={() => handleSort('type')}>
                    Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={styles.th} onClick={() => handleSort('type_immobilisation')}>
                    Nature {sortConfig.key === 'type_immobilisation' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={styles.th} onClick={() => handleSort('numero_inventaire')}>
                    N° Inventaire
                  </th>
                  <th style={styles.th} onClick={() => handleSort('etat')}>
                    État
                  </th>
                  <th style={styles.th} onClick={() => handleSort('localisation')}>
                    Localisation
                  </th>
                  <th style={styles.th} onClick={() => handleSort('date_acquisition')}>
                    Date acq.
                  </th>
                  <th style={styles.th} onClick={() => handleSort('cout_acquisition')}>
                    Coût
                  </th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedActifs.map((actif, index) => (
                  <tr key={actif.id} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                    {can(['admin', 'comptable']) && (
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={selectedActifs.includes(actif.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedActifs([...selectedActifs, actif.id]);
                            } else {
                              setSelectedActifs(selectedActifs.filter(id => id !== actif.id));
                            }
                          }}
                        />
                      </td>
                    )}
                    <td style={styles.td}><span style={styles.code}>{actif.code}</span></td>
                    <td style={styles.td}>
                      <span style={styles.nom}>{actif.nom}</span>
                      {actif.description && (
                        <span style={styles.description}>
                          {actif.description.substring(0, 30)}
                          {actif.description.length > 30 && '...'}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{getTypeLabel(actif.type)}</td>
                    <td style={styles.td}>
                      {actif.type_immobilisation === 'corporel' ? (
                        <span style={styles.natureBadgeCorporel}>🏭 Corporel</span>
                      ) : actif.type_immobilisation === 'incorporel' ? (
                        <span style={styles.natureBadgeIncorporel}>📄 Incorporel</span>
                      ) : (
                        <span style={styles.natureBadgeDefault}>❓ Non défini</span>
                      )}
                    </td>
                    <td style={styles.td}><span style={styles.inventaire}>{actif.numero_inventaire || 'N/A'}</span></td>
                    <td style={styles.td}>
                      {actif.etat && (
                        <span style={{
                          ...styles.etatBadge,
                          backgroundColor: getEtatColor(actif.etat) + '20',
                          color: getEtatColor(actif.etat)
                        }}>
                          {getEtatLabel(actif.etat)}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{actif.localisation || 'N/A'}</td>
                    <td style={styles.td}>{formatDate(actif.date_acquisition)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {formatCurrency(actif.cout_acquisition)}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique']) && (
                          <button onClick={() => navigate(`/actifs/${actif.id}`)} style={styles.actionButton.view} title="Voir détails">
                            <FiEye />
                          </button>
                        )}
                        {can(['admin', 'comptable']) && (
                          <button onClick={() => navigate(`/actifs/modifier/${actif.id}`)} style={styles.actionButton.edit} title="Modifier">
                            <FiEdit />
                          </button>
                        )}
                        {can(['admin', 'comptable']) && (
                          <button onClick={() => handleDelete(actif.id, actif.nom)} style={styles.actionButton.delete} title="Supprimer">
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1} style={styles.pageButton}>
                ← Précédent
              </button>
              <span style={styles.pageInfo}>Page {filters.page} sur {totalPages}</span>
              <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === totalPages} style={styles.pageButton}>
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vue Grille */}
      {viewMode === 'grid' && (
        <div style={styles.gridContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Chargement...</p>
            </div>
          ) : sortedActifs.length === 0 ? (
            <div style={styles.emptyState}>
              <p>Aucun actif trouvé</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {sortedActifs.map((actif) => (
                <div key={actif.id} style={styles.gridCard}>
                  <div style={styles.gridHeader}>
                    <span style={styles.gridCode}>{actif.code}</span>
                    <span style={{
                      ...styles.gridStatus,
                      backgroundColor: getStatusColor(actif) + '20',
                      color: getStatusColor(actif)
                    }}>
                      {getStatusText(actif)}
                    </span>
                  </div>
                  <h3 style={styles.gridTitle}>{actif.nom}</h3>
                  <p style={styles.gridType}>{getTypeLabel(actif.type)}</p>
                  <div style={styles.gridMetaInfo}>
                    <div style={styles.gridMetaItem}>
                      <span>Nature:</span>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: actif.type_immobilisation === 'corporel' ? '#dbeafe' : '#fef3c7',
                        color: actif.type_immobilisation === 'corporel' ? '#1e40af' : '#b45309'
                      }}>
                        {actif.type_immobilisation === 'corporel' ? '🏭 Corporel' : '📄 Incorporel'}
                      </span>
                    </div>
                    {actif.numero_inventaire && (
                      <div style={styles.gridMetaItem}>
                        <span>N° Inventaire:</span>
                        <strong>{actif.numero_inventaire}</strong>
                      </div>
                    )}
                    {actif.etat && (
                      <div style={styles.gridMetaItem}>
                        <span>État:</span>
                        <span style={{ color: getEtatColor(actif.etat), fontWeight: '500' }}>
                          {getEtatLabel(actif.etat)}
                        </span>
                      </div>
                    )}
                    {actif.localisation && (
                      <div style={styles.gridMetaItem}>
                        <span>Localisation:</span>
                        <strong>{actif.localisation}</strong>
                      </div>
                    )}
                  </div>
                  <div style={styles.gridDetails}>
                    <div style={styles.gridDetail}>
                      <span style={styles.gridLabel}>Acquisition</span>
                      <span style={styles.gridValue}>{formatDate(actif.date_acquisition)}</span>
                    </div>
                    <div style={styles.gridDetail}>
                      <span style={styles.gridLabel}>Coût</span>
                      <span style={styles.gridValue}>{formatCurrency(actif.cout_acquisition)}</span>
                    </div>
                    <div style={styles.gridDetail}>
                      <span style={styles.gridLabel}>Valeur nette</span>
                      <span style={{ ...styles.gridValue, color: getStatusColor(actif), fontWeight: 'bold' }}>
                        {formatCurrency(actif.valeur_nette)}
                      </span>
                    </div>
                  </div>
                  <div style={styles.gridActions}>
                    {can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique']) && (
                      <button onClick={() => navigate(`/actifs/${actif.id}`)} style={styles.gridButton}>
                        <FiEye /> Voir
                      </button>
                    )}
                    {can(['admin', 'comptable']) && (
                      <button onClick={() => navigate(`/actifs/modifier/${actif.id}`)} style={styles.gridButton}>
                        <FiEdit /> Modifier
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1} style={styles.pageButton}>
                ← Précédent
              </button>
              <span style={styles.pageInfo}>Page {filters.page} sur {totalPages}</span>
              <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === totalPages} style={styles.pageButton}>
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ STYLES ============

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh'
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
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: 0
  },
  subtitle: {
    color: '#666',
    marginTop: '0.5rem',
    fontSize: '0.9rem'
  },
  natureStats: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
    fontSize: '0.8rem'
  },
  corporelStat: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px'
  },
  incorporelStat: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px'
  },
  nonDefiniStat: {
    backgroundColor: '#f3f4f6',
    color: 'var(--text-secondary)',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    alignItems: 'center'
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
    maxWidth: '400px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)',
    transition: 'border-color 0.2s'
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center'
  },
  filterToggleButton: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  },
  filtersPanel: {
    backgroundColor: 'var(--bg-card)',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  filtersRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  filterGroup: {
    flex: 1,
    minWidth: '200px'
  },
  filterLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
    textTransform: 'uppercase'
  },
  filterSelect: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.25rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '4px',
    padding: '0.25rem',
    border: '1px solid #e5e7eb'
  },
  viewButton: {
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewActive: {
    padding: '0.5rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  refreshButton: {
    padding: '0.5rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  bulkDeleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  createButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tableContainer: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto',
    marginTop: '1rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap'
  },
  thCheckbox: {
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb',
    width: '30px'
  },
  trEven: {
    backgroundColor: 'var(--bg-card)'
  },
  trOdd: {
    backgroundColor: '#fafafa'
  },
  td: {
    padding: '1rem',
    color: '#4b5563',
    fontSize: '0.875rem'
  },
  code: {
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    display: 'inline-block',
    fontFamily: 'monospace'
  },
  nom: {
    display: 'block',
    fontWeight: '500',
    marginBottom: '0.25rem'
  },
  description: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#666',
    marginTop: '0.25rem'
  },
  inventaire: {
    fontFamily: 'monospace',
    fontSize: '0.8rem'
  },
  etatBadge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    display: 'inline-block'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  actionButton: {
    view: {
      padding: '0.4rem',
      backgroundColor: '#3b82f6',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      transition: 'opacity 0.2s'
    },
    edit: {
      padding: '0.4rem',
      backgroundColor: '#f59e0b',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    },
    delete: {
      padding: '0.4rem',
      backgroundColor: '#ef4444',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    }
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  pageButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)'
  },
  gridContainer: {
    marginTop: '1rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  gridCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, boxShadow 0.2s'
  },
  gridHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  gridCode: {
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    fontFamily: 'monospace'
  },
  gridStatus: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem'
  },
  gridTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#111'
  },
  gridType: {
    fontSize: '0.8rem',
    color: '#666',
    marginBottom: '1rem'
  },
  gridMetaInfo: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    padding: '0.75rem',
    marginBottom: '1rem',
    fontSize: '0.8rem'
  },
  gridMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
    ':last-child': {
      marginBottom: 0
    }
  },
  gridDetails: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
    marginBottom: '1rem'
  },
  gridDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.875rem'
  },
  gridLabel: {
    fontSize: '0.75rem',
    color: '#666'
  },
  gridValue: {
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  gridActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  gridButton: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    transition: 'all 0.2s'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem'
  },
  emptyText: {
    color: '#666',
    marginBottom: '1rem'
  },
  natureBadgeCorporel: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500',
    backgroundColor: '#dbeafe',
    color: '#1e40af'
  },
  natureBadgeIncorporel: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500',
    backgroundColor: '#fef3c7',
    color: '#b45309'
  },
  natureBadgeDefault: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500',
    backgroundColor: '#f3f4f6',
    color: 'var(--text-secondary)'
  }
};

// Animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ActifList;
// components/Filters/AdvancedFilters.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { setFilters, resetFilters } from '../../store/uiSlice';
import { fetchActifs } from '../../store/actifSlice';
import { 
  FiSearch, FiFilter, FiX, FiCalendar,
  FiDollarSign, FiClock, FiTrendingUp,
  FiChevronDown, FiChevronUp, FiHash, FiTag,
  FiTrash2, FiSliders, FiBarChart2, FiAlertCircle
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const AdvancedFilters = ({ type = 'actifs', onFilterChange, showStats = true }) => {
  const dispatch = useDispatch();
  
  // Récupération des filtres depuis le store
  const currentFilters = useSelector(
    state => state.ui?.filters?.[type] || {},
    shallowEqual
  );
  
  // État local des filtres
  const [localFilters, setLocalFilters] = useState({
    recherche: '',
    code: '',
    type: '',
    statut: '',
    mode: '',
    typeImmobilisation: '',
    dateDebut: '',
    dateFin: '',
    montantMin: '',
    montantMax: '',
    dureeMin: '',
    dureeMax: '',
    ...currentFilters
  });
  
  const [expanded, setExpanded] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Synchronisation avec les filtres du store
  useEffect(() => {
    setLocalFilters(prev => ({ ...prev, ...currentFilters }));
  }, [currentFilters]);

  // Options pour les selects (mémoïsées)
  const typeOptions = useMemo(() => [
    { value: '', label: 'Tous les types', icon: '📋' },
    { value: 'logiciel', label: 'Logiciel', icon: '💻' },
    { value: 'brevet', label: 'Brevet', icon: '📜' },
    { value: 'licence', label: 'Licence', icon: '📄' },
    { value: 'fonds_commercial', label: 'Fonds commercial', icon: '🏢' },
    { value: 'materiel', label: 'Matériel', icon: '🖥️' },
    { value: 'vehicule', label: 'Véhicule', icon: '🚗' },
    { value: 'bâtiment', label: 'Bâtiment', icon: '🏠' },
    { value: 'terrain', label: 'Terrain', icon: '🌳' },
    { value: 'autres', label: 'Autres', icon: '📦' }
  ], []);

  const statutOptions = useMemo(() => [
    { value: '', label: 'Tous les statuts', variant: 'secondary' },
    { value: 'actif', label: 'Actif', variant: 'success' },
    { value: 'inactif', label: 'Inactif', variant: 'danger' },
    { value: 'amorti', label: 'Amorti', variant: 'info' }
  ], []);

  const modeOptions = useMemo(() => [
    { value: '', label: 'Tous les modes' },
    { value: 'lineaire', label: 'Linéaire' },
    { value: 'degressif', label: 'Dégressif' }
  ], []);

  const natureOptions = useMemo(() => [
    { value: '', label: 'Toutes les natures' },
    { value: 'corporel', label: 'Corporel' },
    { value: 'incorporel', label: 'Incorporel' }
  ], []);

  // Filtres rapides prédéfinis
  const quickFilters = useMemo(() => [
    { id: 'high_value', label: 'Valeur élevée', condition: { montantMin: 1000000 }, icon: '💰' },
    { id: 'recent', label: 'Acquis récemment', condition: { dateDebut: getLastMonthDate() }, icon: '🆕' },
    { id: 'almost_amortized', label: 'Presque amortis', condition: { statut: 'actif', dureeMin: 8 }, icon: '⚠️' },
    { id: 'fully_amortized', label: 'Fully amortis', condition: { statut: 'amorti' }, icon: '✅' }
  ], []);

  function getLastMonthDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  // Statistiques des filtres
  const filterStats = useMemo(() => {
    const activeFilters = Object.entries(localFilters).filter(([_, v]) => v && v !== '');
    return {
      total: activeFilters.length,
      categories: {
        recherche: localFilters.recherche ? 1 : 0,
        code: localFilters.code ? 1 : 0,
        type: localFilters.type ? 1 : 0,
        statut: localFilters.statut ? 1 : 0,
        mode: localFilters.mode ? 1 : 0,
        nature: localFilters.typeImmobilisation ? 1 : 0,
        date: (localFilters.dateDebut || localFilters.dateFin) ? 1 : 0,
        montant: (localFilters.montantMin || localFilters.montantMax) ? 1 : 0,
        duree: (localFilters.dureeMin || localFilters.dureeMax) ? 1 : 0
      }
    };
  }, [localFilters]);

  // Fonction de mise à jour des filtres avec debounce
  const updateFilters = useCallback((newFilters) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Nettoyer les filtres vides
      const cleanedFilters = Object.entries(newFilters).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined && value !== 0) {
          acc[key] = value;
        }
        return acc;
      }, {});

      // Mettre à jour le store
      if (dispatch && setFilters) {
        dispatch(setFilters({ type, filters: cleanedFilters }));
      }
      
      // Appeler le callback
      if (onFilterChange && typeof onFilterChange === 'function') {
        onFilterChange(cleanedFilters);
      }
      
      // Recharger les données
      if (dispatch && fetchActifs) {
        dispatch(fetchActifs(cleanedFilters));
      }
    }, 500);
  }, [dispatch, type, onFilterChange]);

  // Effet pour déclencher la mise à jour
  useEffect(() => {
    updateFilters(localFilters);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localFilters, updateFilters]);

  // Handlers
  const handleChange = useCallback((field, value) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleQuickFilter = useCallback((condition) => {
    setLocalFilters(prev => ({ ...prev, ...condition }));
    setShowQuickFilters(false);
  }, []);

  const handleReset = useCallback(() => {
    const resetValues = {
      recherche: '',
      code: '',
      type: '',
      statut: '',
      mode: '',
      typeImmobilisation: '',
      dateDebut: '',
      dateFin: '',
      montantMin: '',
      montantMax: '',
      dureeMin: '',
      dureeMax: ''
    };
    
    setLocalFilters(resetValues);
    if (dispatch && resetFilters) {
      dispatch(resetFilters(type));
    }
    if (dispatch && fetchActifs) {
      dispatch(fetchActifs({}));
    }
    if (onFilterChange) {
      onFilterChange({});
    }
  }, [dispatch, type, onFilterChange]);

  const removeFilter = useCallback((filterKey) => {
    setLocalFilters(prev => ({ ...prev, [filterKey]: '' }));
  }, []);

  // Comptage des filtres actifs
  const countActiveFilters = useMemo(() => {
    return filterStats.total;
  }, [filterStats]);

  // Styles d'animation
  const animationStyles = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .filter-slide-down {
      animation: slideDown 0.3s ease-out;
    }
    .filter-fade-in {
      animation: fadeIn 0.2s ease-out;
    }
    .filter-badge {
      transition: all 0.2s ease;
    }
    .filter-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="card shadow-sm mb-4 border-0 filter-fade-in">
        <div className="card-body">
          {/* Barre de recherche principale */}
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <FiSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Rechercher par nom, description..."
                  value={localFilters.recherche}
                  onChange={(e) => handleChange('recherche', e.target.value)}
                />
                {localFilters.recherche && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => handleChange('recherche', '')}
                    type="button"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <FiHash className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Code d'identification..."
                  value={localFilters.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <select
                className="form-select"
                value={localFilters.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2">
              <div className="d-flex gap-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="btn btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                >
                  <FiFilter size={14} />
                  {countActiveFilters > 0 && (
                    <span className="badge bg-primary rounded-pill">{countActiveFilters}</span>
                  )}
                  {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                </button>
                
                {quickFilters.length > 0 && (
                  <div className="dropdown">
                    <button
                      className="btn btn-outline-primary dropdown-toggle"
                      onClick={() => setShowQuickFilters(!showQuickFilters)}
                      type="button"
                    >
                      <FiSliders size={14} />
                    </button>
                    {showQuickFilters && (
                      <div className="dropdown-menu dropdown-menu-end show" style={{ position: 'absolute', top: '100%', right: 0 }}>
                        {quickFilters.map(filter => (
                          <button
                            key={filter.id}
                            className="dropdown-item d-flex align-items-center gap-2"
                            onClick={() => handleQuickFilter(filter.condition)}
                          >
                            <span>{filter.icon}</span>
                            <span>{filter.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filtres actifs (badges) */}
          {countActiveFilters > 0 && (
            <div className="mt-3 d-flex flex-wrap gap-2">
              {localFilters.recherche && (
                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 filter-badge">
                  <FiSearch size={12} className="me-1" />
                  Recherche: {localFilters.recherche}
                  <button onClick={() => removeFilter('recherche')} className="btn-close btn-close-sm ms-2"></button>
                </span>
              )}
              {localFilters.code && (
                <span className="badge bg-info bg-opacity-10 text-info px-3 py-2 filter-badge">
                  <FiHash size={12} className="me-1" />
                  Code: {localFilters.code}
                  <button onClick={() => removeFilter('code')} className="btn-close btn-close-sm ms-2"></button>
                </span>
              )}
              {localFilters.type && (
                <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 filter-badge">
                  <FiTag size={12} className="me-1" />
                  Type: {typeOptions.find(o => o.value === localFilters.type)?.label}
                  <button onClick={() => removeFilter('type')} className="btn-close btn-close-sm ms-2"></button>
                </span>
              )}
              {localFilters.statut && (
                <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2 filter-badge">
                  Statut: {statutOptions.find(o => o.value === localFilters.statut)?.label}
                  <button onClick={() => removeFilter('statut')} className="btn-close btn-close-sm ms-2"></button>
                </span>
              )}
              {(localFilters.montantMin || localFilters.montantMax) && (
                <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 filter-badge">
                  <FiDollarSign size={12} className="me-1" />
                  Montant: {localFilters.montantMin || '0'} - {localFilters.montantMax || '∞'}
                  <button onClick={() => { removeFilter('montantMin'); removeFilter('montantMax'); }} className="btn-close btn-close-sm ms-2"></button>
                </span>
              )}
            </div>
          )}

          {/* Filtres avancés */}
          {expanded && (
            <div className="mt-4 pt-3 border-top filter-slide-down">
              {/* Statistiques des filtres (optionnel) */}
              {showStats && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="bg-light rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <FiBarChart2 className="text-primary" />
                          <span className="small fw-semibold">Filtres actifs: {filterStats.total}</span>
                        </div>
                        <div className="d-flex gap-3 flex-wrap">
                          {Object.entries(filterStats.categories).map(([key, count]) => (
                            count > 0 && (
                              <span key={key} className="small text-muted">
                                {key}: {count}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="row g-3">
                {/* Filtre par statut */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                    <FiAlertCircle size={12} /> Statut
                  </label>
                  <select
                    className="form-select"
                    value={localFilters.statut}
                    onChange={(e) => handleChange('statut', e.target.value)}
                  >
                    {statutOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre par nature */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                    <FiTag size={12} /> Nature
                  </label>
                  <select
                    className="form-select"
                    value={localFilters.typeImmobilisation}
                    onChange={(e) => handleChange('typeImmobilisation', e.target.value)}
                  >
                    {natureOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre par mode d'amortissement */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                    <FiTrendingUp size={12} /> Mode d'amortissement
                  </label>
                  <select
                    className="form-select"
                    value={localFilters.mode}
                    onChange={(e) => handleChange('mode', e.target.value)}
                  >
                    {modeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Période d'acquisition */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                    <FiCalendar size={12} /> Période d'acquisition
                  </label>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Début"
                      value={localFilters.dateDebut}
                      onChange={(e) => handleChange('dateDebut', e.target.value)}
                    />
                    <span className="text-muted">→</span>
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Fin"
                      value={localFilters.dateFin}
                      onChange={(e) => handleChange('dateFin', e.target.value)}
                    />
                  </div>
                </div>

                {/* Montant d'acquisition */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                    <FiDollarSign size={12} /> Montant (CDF)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">Min</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={localFilters.montantMin}
                      onChange={(e) => handleChange('montantMin', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted">&nbsp;</label>
                  <div className="input-group">
                    <span className="input-group-text">Max</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Illimité"
                      value={localFilters.montantMax}
                      onChange={(e) => handleChange('montantMax', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* Durée d'utilité */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1">
                    <FiClock size={12} /> Durée d'utilité (ans)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">Min</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={localFilters.dureeMin}
                      onChange={(e) => handleChange('dureeMin', e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted">&nbsp;</label>
                  <div className="input-group">
                    <span className="input-group-text">Max</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Illimité"
                      value={localFilters.dureeMax}
                      onChange={(e) => handleChange('dureeMax', e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                {/* Bouton reset */}
                <div className="col-12">
                  <hr />
                  <div className="d-flex justify-content-end">
                    <button onClick={handleReset} className="btn btn-danger d-flex align-items-center gap-2">
                      <FiTrash2 size={16} /> Réinitialiser tous les filtres
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(AdvancedFilters);
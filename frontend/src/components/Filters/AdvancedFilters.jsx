import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters, resetFilters } from '../../store/uiSlice';
import { fetchActifs } from '../../store/actifSlice';
import { 
  FiSearch, FiFilter, FiX, FiCalendar,
  FiDollarSign, FiClock, FiTrendingUp,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const AdvancedFilters = ({ type = 'actifs', onFilterChange }) => {
  const dispatch = useDispatch();
  
  // ✅ CORRECTION : Sécurisation de l'accès à state.ui
  const uiState = useSelector((state) => state.ui || {});
  const filters = uiState.filters || {};
  const currentFilters = filters[type] || {};
  
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    recherche: '',
    type: '',
    statut: '',
    dateDebut: '',
    dateFin: '',
    montantMin: '',
    montantMax: '',
    dureeMin: '',
    dureeMax: '',
    mode: '',
    ...currentFilters
  });

  const [searchTimeout, setSearchTimeout] = useState(null);

  // Options pour les selects
  const typeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'logiciel', label: 'Logiciel' },
    { value: 'brevet', label: 'Brevet' },
    { value: 'licence', label: 'Licence' },
    { value: 'fonds_commercial', label: 'Fonds commercial' },
    { value: 'materiel', label: 'Matériel' },
    { value: 'vehicule', label: 'Véhicule' },
    { value: 'bâtiment', label: 'Bâtiment' },
    { value: 'terrain', label: 'Terrain' },
    { value: 'autres', label: 'Autres' }
  ];

  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'inactif', label: 'Inactif' },
    { value: 'amorti', label: 'Amorti' }
  ];

  const modeOptions = [
    { value: '', label: 'Tous les modes' },
    { value: 'lineaire', label: 'Linéaire' },
    { value: 'degressif', label: 'Dégressif' }
  ];

  // Recherche en temps réel avec debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      // Mettre à jour les filtres dans le store
      if (dispatch && setFilters) {
        dispatch(setFilters({ type, filters: localFilters }));
      }
      
      // Appeler le callback si fourni
      if (onFilterChange) {
        onFilterChange(localFilters);
      }
      
      // Recharger les données avec les filtres
      if (dispatch && fetchActifs) {
        dispatch(fetchActifs(localFilters));
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [localFilters, dispatch, type, onFilterChange]);

  const handleChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReset = () => {
    const resetValues = {
      recherche: '',
      type: '',
      statut: '',
      dateDebut: '',
      dateFin: '',
      montantMin: '',
      montantMax: '',
      dureeMin: '',
      dureeMax: '',
      mode: ''
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
  };

  const countActiveFilters = () => {
    return Object.values(localFilters).filter(v => v && v !== '').length;
  };

  return (
    <div style={styles.container}>
      {/* Barre de recherche principale */}
      <div style={styles.searchBar}>
        <FiSearch style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Rechercher par nom, code, description..."
          value={localFilters.recherche}
          onChange={(e) => handleChange('recherche', e.target.value)}
          style={styles.searchInput}
        />
        {localFilters.recherche && (
          <button
            onClick={() => handleChange('recherche', '')}
            style={styles.clearButton}
          >
            <FiX />
          </button>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          style={styles.filterToggle}
        >
          <FiFilter />
          {countActiveFilters() > 0 && (
            <span style={styles.filterBadge}>{countActiveFilters()}</span>
          )}
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {/* Filtres avancés (expandables) */}
      {expanded && (
        <div style={styles.expandedFilters}>
          <div style={styles.filterGrid}>
            {/* Filtre par type */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiFilter /> Type d'actif
              </label>
              <select
                value={localFilters.type}
                onChange={(e) => handleChange('type', e.target.value)}
                style={styles.filterSelect}
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filtre par statut */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiTrendingUp /> Statut
              </label>
              <select
                value={localFilters.statut}
                onChange={(e) => handleChange('statut', e.target.value)}
                style={styles.filterSelect}
              >
                {statutOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filtre par mode d'amortissement */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiClock /> Mode d'amortissement
              </label>
              <select
                value={localFilters.mode}
                onChange={(e) => handleChange('mode', e.target.value)}
                style={styles.filterSelect}
              >
                {modeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filtre par période */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiCalendar /> Période d'acquisition
              </label>
              <div style={styles.dateRange}>
                <input
                  type="date"
                  value={localFilters.dateDebut}
                  onChange={(e) => handleChange('dateDebut', e.target.value)}
                  style={styles.dateInput}
                  placeholder="Date début"
                />
                <span style={styles.dateSeparator}>-</span>
                <input
                  type="date"
                  value={localFilters.dateFin}
                  onChange={(e) => handleChange('dateFin', e.target.value)}
                  style={styles.dateInput}
                  placeholder="Date fin"
                />
              </div>
            </div>

            {/* Filtre par montant */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiDollarSign /> Montant d'acquisition
              </label>
              <div style={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min (FC)"
                  value={localFilters.montantMin}
                  onChange={(e) => handleChange('montantMin', e.target.value)}
                  style={styles.rangeInput}
                  min="0"
                />
                <span style={styles.rangeSeparator}>-</span>
                <input
                  type="number"
                  placeholder="Max (FC)"
                  value={localFilters.montantMax}
                  onChange={(e) => handleChange('montantMax', e.target.value)}
                  style={styles.rangeInput}
                  min="0"
                />
              </div>
            </div>

            {/* Filtre par durée */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <FiClock /> Durée d'utilité
              </label>
              <div style={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min (ans)"
                  value={localFilters.dureeMin}
                  onChange={(e) => handleChange('dureeMin', e.target.value)}
                  style={styles.rangeInput}
                  min="0"
                />
                <span style={styles.rangeSeparator}>-</span>
                <input
                  type="number"
                  placeholder="Max (ans)"
                  value={localFilters.dureeMax}
                  onChange={(e) => handleChange('dureeMax', e.target.value)}
                  style={styles.rangeInput}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={styles.filterActions}>
            <button onClick={handleReset} style={styles.resetButton}>
              Réinitialiser tous les filtres
            </button>
            <div style={styles.activeFilters}>
              {countActiveFilters() > 0 && (
                <span>{countActiveFilters()} filtre(s) actif(s)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem'
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    position: 'relative'
  },
  searchIcon: {
    color: '#9ca3af',
    marginRight: '0.75rem'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.95rem',
    padding: '0.5rem 0',
    '::placeholder': {
      color: '#9ca3af'
    }
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    marginRight: '0.5rem'
  },
  filterToggle: {
    background: 'none',
    border: 'none',
    color: '#4b5563',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    position: 'relative'
  },
  filterBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    fontSize: '0.7rem',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  expandedFilters: {
    padding: '1.5rem'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  filterLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  filterSelect: {
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem',
    backgroundColor: 'var(--bg-card)'
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  dateInput: {
    flex: 1,
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem'
  },
  dateSeparator: {
    color: '#9ca3af'
  },
  rangeInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  rangeInput: {
    flex: 1,
    padding: '0.625rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem'
  },
  rangeSeparator: {
    color: '#9ca3af'
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  activeFilters: {
    color: '#2563eb',
    fontSize: '0.875rem',
    fontWeight: '500'
  }
};

export default AdvancedFilters;
// frontend/src/hooks/usePersistedFilters.js

import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters } from '../store/navigationSlice';
import { useLocation } from 'react-router-dom';

const usePersistedFilters = (defaultFilters = {}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigation = useSelector((state) => state.navigation);
  
  const pathKey = location.pathname;
  const savedFilters = navigation?.filters?.[pathKey] || defaultFilters;
  
  const [filters, setFiltersState] = useState(savedFilters);
  
  // ✅ Mettre à jour les filtres
  const updateFilters = useCallback((newFilters) => {
    setFiltersState(newFilters);
    dispatch(setFilters({ path: pathKey, filters: newFilters }));
  }, [dispatch, pathKey]);
  
  // ✅ Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    updateFilters(defaultFilters);
  }, [updateFilters, defaultFilters]);
  
  // ✅ Synchroniser uniquement quand le chemin change
  useEffect(() => {
    const newFilters = navigation?.filters?.[pathKey] || defaultFilters;
    setFiltersState(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);
  
  return { filters, updateFilters, resetFilters };
};

export default usePersistedFilters;
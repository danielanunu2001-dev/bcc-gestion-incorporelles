// frontend/src/hooks/usePersistedTab.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentTab } from '../store/navigationSlice';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const usePersistedTab = (defaultTab = 'infos') => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // ✅ Pour avoir l'ID de l'actif
  const navigation = useSelector((state) => state.navigation);
  
  const pathKey = location.pathname;
  const savedTab = navigation?.currentTab?.[pathKey] || defaultTab;
  
  const [activeTab, setActiveTab] = useState(savedTab);
  const isInitialMount = useRef(true);
  
  // Changer d'onglet
  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) return; // ✅ Éviter les mises à jour inutiles
    
    setActiveTab(tab);
    dispatch(setCurrentTab({ path: pathKey, tab }));
    
    // ✅ Mettre à jour l'URL avec le paramètre tab
    const newUrl = `${pathKey}?tab=${tab}`;
    navigate(newUrl, { replace: true });
  }, [activeTab, dispatch, navigate, pathKey]);
  
  // Synchroniser quand le chemin change
  useEffect(() => {
    const urlTab = new URLSearchParams(location.search).get('tab');
    const newTab = urlTab || navigation?.currentTab?.[pathKey] || defaultTab;
    
    if (newTab !== activeTab && !isInitialMount.current) {
      setActiveTab(newTab);
    }
    isInitialMount.current = false;
  }, [location.search, pathKey, navigation?.currentTab, defaultTab, activeTab]);
  
  return { activeTab, handleTabChange };
};

export default usePersistedTab;
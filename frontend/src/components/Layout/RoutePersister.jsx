// frontend/src/components/Layout/RoutePersister.jsx

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentPath, setScrollPosition } from '../../store/navigationSlice';

const RoutePersister = ({ children }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigation = useSelector((state) => state.navigation) || { scrollPosition: {} };
  
  const scrollPosition = navigation.scrollPosition || {};

  // Sauvegarder le chemin actuel
  useEffect(() => {
    dispatch(setCurrentPath(location.pathname + location.search));
  }, [location.pathname, location.search, dispatch]);

  // Restaurer la position de scroll
  useEffect(() => {
    const savedPosition = scrollPosition[location.pathname];
    if (savedPosition && typeof savedPosition === 'number') {
      window.scrollTo(0, savedPosition);
    }
  }, [location.pathname, scrollPosition]);

  // Sauvegarder la position de scroll
  useEffect(() => {
    const handleScroll = () => {
      dispatch(setScrollPosition({
        path: location.pathname,
        position: window.scrollY
      }));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, dispatch]);

  return children;
};

export default RoutePersister;
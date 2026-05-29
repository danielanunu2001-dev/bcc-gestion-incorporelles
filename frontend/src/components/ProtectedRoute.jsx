// frontend/src/components/ProtectedRoute.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSession } from '../hooks/useSession';

const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/login',
  unauthorizedRedirect = '/unauthorized'
}) => {
  // ✅ Ajouter un état pour savoir si le premier chargement est terminé
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  // Récupération depuis Redux
  const { isAuthenticated: reduxIsAuthenticated, user: reduxUser } = useSelector((state) => state.auth || {});
  
  // Récupération depuis le hook session
  const { isAuthenticated: sessionIsAuthenticated, session: sessionUser, loading } = useSession();
  
  // Utiliser Redux d'abord, puis session comme fallback
  const isAuthenticated = reduxIsAuthenticated || sessionIsAuthenticated;
  const user = reduxUser || sessionUser;
  
  console.log('🔐 ProtectedRoute - Auth:', isAuthenticated, 'loading:', loading, 'initialCheckDone:', initialCheckDone);
  
  // ✅ Marquer le premier chargement comme terminé après un court délai
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialCheckDone(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // ✅ Attendre que le chargement initial soit terminé
  if (!initialCheckDone || loading) {
    console.log('⏳ ProtectedRoute: Chargement initial...');
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }
  
  // ✅ Vérifier l'authentification
  if (!isAuthenticated || !user) {
    console.log('❌ ProtectedRoute: Non authentifié, redirection vers', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }
  
  // ✅ Vérifier les rôles
  const userRole = user?.role;
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.includes(userRole) || userRole === 'admin';
  
  if (!hasRequiredRole) {
    console.log(`❌ ProtectedRoute: Rôle ${userRole} non autorisé`);
    return <Navigate to={unauthorizedRedirect} replace />;
  }
  
  console.log('✅ ProtectedRoute: Accès autorisé');
  return children;
};

export default ProtectedRoute;
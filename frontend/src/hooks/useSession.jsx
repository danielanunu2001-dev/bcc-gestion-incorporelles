// frontend/src/hooks/useSession.js

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ==================== CONTEXTE DE SESSION ====================
const SessionContext = createContext(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

// ==================== PROVIDER DE SESSION ====================
export const SessionProvider = ({ children }) => {
  // ========== DONNÉES FACTICES POUR CONTOURNER L'AUTH ==========
  const fakeUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@bcc.cd',
    full_name: 'Administrateur',
    role: 'admin',
    actif: true,
    photo_url: null
  };

  const [session, setSession] = useState(fakeUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  /**
   * Récupère la session courante depuis le backend
   * VERSION FACTICE - IGNORE L'API
   */
  const fetchSession = useCallback(async () => {
    setLoading(false);
    // Ne pas faire d'appel API, retourner directement l'utilisateur factice
    setSession(fakeUser);
    setIsAuthenticated(true);
    return fakeUser;
  }, []);

  /**
   * Connexion utilisateur - VERSION FACTICE
   */
  const login = useCallback(async (email, password, rememberMe = false) => {
    setLoading(false);
    setError(null);
    
    // Accepter n'importe quel email/mot de passe
    setSession(fakeUser);
    setIsAuthenticated(true);
    
    localStorage.setItem('auth_token', 'fake-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify(fakeUser));
    
    return { success: true, user: fakeUser };
  }, []);

  /**
   * Déconnexion utilisateur
   */
  const logout = useCallback(async () => {
    setLoading(false);
    setSession(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return { success: true };
  }, []);

  /**
   * Rafraîchir la session
   */
  const refreshSession = useCallback(async () => {
    return true;
  }, []);

  /**
   * Mettre à jour les informations de l'utilisateur en session
   */
  const updateSessionUser = useCallback((updates) => {
    setSession(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  /**
   * Récupérer un token CSRF
   */
  const getCsrfToken = useCallback(async () => {
    return 'fake-csrf-token';
  }, []);

  /**
   * Vérifier si la session est expirée
   */
  const isSessionExpired = useCallback(() => {
    return false;
  }, []);

  // Initialiser la session au montage
  useEffect(() => {
    // Vérifier si déjà dans localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setSession(user);
        setIsAuthenticated(true);
      } catch(e) {
        setSession(fakeUser);
        setIsAuthenticated(true);
      }
    } else {
      setSession(fakeUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(fakeUser));
      localStorage.setItem('auth_token', 'fake-token-' + Date.now());
    }
    setLoading(false);
  }, []);

  const value = {
    session,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    updateSessionUser,
    fetchSession,
    getCsrfToken,
    isSessionExpired
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// ==================== HOOKS PERSONNALISÉS ====================

/**
 * Hook pour protéger les routes (redirige vers login si non authentifié)
 */
export const useRequireAuth = (redirectTo = '/login') => {
  const { isAuthenticated, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  return { isAuthenticated, loading };
};

/**
 * Hook pour les routes publiques (redirige vers dashboard si authentifié)
 */
export const usePublicRoute = (redirectTo = '/dashboard') => {
  const { isAuthenticated, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  return { isAuthenticated, loading };
};

/**
 * Hook pour vérifier les permissions
 */
export const useHasPermission = (requiredRoles = []) => {
  const { session } = useSession();
  
  if (!session) return false;
  if (requiredRoles.length === 0) return true;
  if (session.role === 'admin') return true;
  
  return requiredRoles.includes(session.role);
};

/**
 * Hook pour obtenir les informations de l'utilisateur connecté
 */
export const useCurrentUser = () => {
  const { session, loading } = useSession();
  return { user: session, loading, isLoggedIn: !!session };
};

export default useSession;
// frontend/src/services/api.js

import axios from 'axios';

const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || '/api';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Intercepteur de requête - Ajoute le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur intercepteur requête:', error);
    return Promise.reject(error);
  }
);

// ✅ Intercepteur de réponse MODIFIÉ - Pas de refresh automatique
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    // ✅ NE PAS tenter de refresh automatique
    // Juste retourner l'erreur
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.point || errorData.justification) {
        errorMessage = `${errorData.point || ''} ${errorData.justification || ''}`.trim();
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Gestion des erreurs 401 (non authentifié) - Rediriger vers login
    if (error.response?.status === 401) {
      console.warn('⛔ Session expirée ou token invalide');
      localStorage.removeItem('auth_token');
      // Rediriger vers login seulement si pas déjà sur login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    error.userMessage = errorMessage;
    
    return Promise.reject(error);
  }
);

// Fonctions utilitaires
api.checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.error('❌ API inaccessible:', error.message);
    return false;
  }
};

api.setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

api.clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('auth_token');
};

export default api;
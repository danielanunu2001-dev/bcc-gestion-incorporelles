import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // ← Doit être /api, pas /aoi
  withCredentials: true, // ← obligatoire pour envoyer les cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour gérer les erreurs 401 (token expiré)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Rediriger vers login si non authentifié
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from './store';
import { router } from './router';
import './index.css';  // CSS global unifié (contient tout : thème, variables, dark mode, etc.)

// Import des contextes (si besoin)
// import { ThemeProvider } from './context/ThemeContext'; // Décommenter si tu utilises ThemeContext

// Configuration globale (optionnel)
const isDevelopment = import.meta.env.DEV;
const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Logs uniquement en développement
if (isDevelopment) {
  console.log('🚀 Application BCC Gestion des Incorporelles démarrée');
  console.log(`📦 Version: ${appVersion}`);
  console.log(`🌍 Environnement: ${import.meta.env.MODE}`);
  console.log(`🕐 Heure de démarrage: ${new Date().toLocaleString()}`);
}

// Composant de fallback en cas d'erreur (optionnel)
const AppFallback = () => {
  console.error('❌ Erreur critique dans l\'application');
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: '#fef2f2',
      color: '#b91c1c'
    }}>
      <h1>⚠️ Une erreur est survenue</h1>
      <p>L'application n'a pas pu démarrer correctement.</p>
      <button 
        onClick={() => window.location.reload()}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer'
        }}
      >
        Recharger la page
      </button>
    </div>
  );
};

// Point d'entrée principal avec gestion d'erreur
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Élément root non trouvé dans le DOM');
  throw new Error('Élément root non trouvé');
}

// Rendu principal
ReactDOM.createRoot(rootElement).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);

// Optionnel: Gestion des erreurs globales
if (isDevelopment) {
  // Capture des erreurs non gérées en développement
  window.addEventListener('error', (event) => {
    console.error('🔥 Erreur globale capturée:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔥 Promesse rejetée non gérée:', event.reason);
  });
}

// Optionnel: Service Worker pour PWA (si nécessaire)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Décommenter si tu utilises un service worker
    // navigator.serviceWorker.register('/sw.js').then(registration => {
    //   console.log('✅ Service Worker enregistré:', registration);
    // }).catch(error => {
    //   console.error('❌ Erreur Service Worker:', error);
    // });
  });
}
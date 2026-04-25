// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from './store';
import { router } from './router';
import './index.css';

// Configuration globale
const isDevelopment = import.meta.env.DEV;
const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Logs uniquement en développement
if (isDevelopment) {
  console.log('🚀 Application BCC Gestion des Incorporelles démarrée');
  console.log(`📦 Version: ${appVersion}`);
  console.log(`🌍 Environnement: ${import.meta.env.MODE}`);
  console.log(`🕐 Heure de démarrage: ${new Date().toLocaleString()}`);
}

// Point d'entrée principal
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Élément root non trouvé dans le DOM');
  throw new Error('Élément root non trouvé');
}

// Rendu principal avec StrictMode
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

// Gestion des erreurs globales (uniquement en développement)
if (isDevelopment) {
  window.addEventListener('error', (event) => {
    console.error('🔥 Erreur globale capturée:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔥 Promesse rejetée non gérée:', event.reason);
  });
}
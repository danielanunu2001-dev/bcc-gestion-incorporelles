// frontend/src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import actifReducer from './actifSlice';
import navigationReducer from './navigationSlice';
import usersReducer from './usersSlice';  // ✅ AJOUT : Import du usersSlice

export const store = configureStore({
  reducer: {
    auth: authReducer,
    actifs: actifReducer,
    navigation: navigationReducer,
    users: usersReducer,  // ✅ AJOUT : Déclaration du reducer users
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // ✅ Pour éviter les erreurs avec les dates
    }),
});

// ✅ Pour déboguer
console.log('Store initialisé avec navigation:', store.getState().navigation);
console.log('Store initialisé avec users:', store.getState().users); // ✅ Vérification ajoutéex    
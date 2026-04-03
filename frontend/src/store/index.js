// frontend/src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import actifReducer from './actifSlice';
import navigationReducer from './navigationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    actifs: actifReducer,
    navigation: navigationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // ✅ Pour éviter les erreurs avec les dates
    }),
});

// ✅ Pour déboguer
console.log('Store initialisé avec navigation:', store.getState().navigation);
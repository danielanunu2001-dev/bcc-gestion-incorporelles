// frontend/src/store/store.js

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import actifReducer from './actifSlice';
import navigationReducer from './navigationSlice'; // ✅ Vérifie que le chemin est correct

export const store = configureStore({
  reducer: {
    auth: authReducer,
    actifs: actifReducer,
    navigation: navigationReducer, // ✅ Le nom doit correspondre
  },
});
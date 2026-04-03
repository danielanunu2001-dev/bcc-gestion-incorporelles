// frontend/src/store/selectors.js

import { createSelector } from '@reduxjs/toolkit';

// Sélecteurs de base
const selectActifsState = (state) => state.actifs;
const selectAuthState = (state) => state.auth;
const selectUiState = (state) => state.ui;
const selectNavigationState = (state) => state.navigation;

// ✅ Sélecteurs mémoïsés pour les actifs
export const selectActifs = createSelector(
  [selectActifsState],
  (actifsState) => actifsState?.actifs || []
);

export const selectActifsLoading = createSelector(
  [selectActifsState],
  (actifsState) => actifsState?.loading || false
);

export const selectActifsError = createSelector(
  [selectActifsState],
  (actifsState) => actifsState?.error || null
);

export const selectActifsPagination = createSelector(
  [selectActifsState],
  (actifsState) => ({
    page: actifsState?.page || 1,
    total: actifsState?.total || 0,
    limit: actifsState?.limit || 20
  })
);

// ✅ Sélecteur pour les statistiques
export const selectActifsStats = createSelector(
  [selectActifs],
  (actifs) => ({
    total: actifs.length,
    actifsActifs: actifs.filter(a => a.actif).length,
    actifsInactifs: actifs.filter(a => !a.actif).length,
    valeurBrute: actifs.reduce((sum, a) => sum + (parseFloat(a.cout_acquisition) || 0), 0),
    valeurNette: actifs.reduce((sum, a) => sum + (parseFloat(a.valeur_nette) || 0), 0)
  })
);

// ✅ Sélecteur pour le tableau de bord
export const selectDashboardData = createSelector(
  [selectActifs, selectActifsStats, selectActifsLoading],
  (actifs, stats, loading) => ({
    actifs,
    stats,
    loading
  })
);

// ✅ Sélecteurs pour l'authentification
export const selectUser = createSelector(
  [selectAuthState],
  (authState) => authState?.user || null
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (authState) => !!authState?.user
);

// ✅ Sélecteurs pour l'UI
export const selectNotifications = createSelector(
  [selectUiState],
  (uiState) => uiState?.notifications || []
);

// ✅ Sélecteurs pour la navigation
export const selectCurrentPath = createSelector(
  [selectNavigationState],
  (navState) => navState?.currentPath || '/dashboard'
);

export const selectCurrentTab = createSelector(
  [selectNavigationState, (state, path) => path],
  (navState, path) => navState?.currentTab?.[path] || 'infos'
);

export const selectScrollPosition = createSelector(
  [selectNavigationState, (state, path) => path],
  (navState, path) => navState?.scrollPosition?.[path] || 0
);

export const selectFilters = createSelector(
  [selectNavigationState, (state, path) => path],
  (navState, path) => navState?.filters?.[path] || {}
);
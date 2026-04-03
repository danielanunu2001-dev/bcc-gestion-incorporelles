import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'light',
    sidebarOpen: true,
    notifications: [],
    loading: false,
    filters: {
      actifs: {
        recherche: '',
        type: '',
        statut: ''
      }
    }
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setFilters: (state, action) => {
      const { type, filters } = action.payload;
      state.filters[type] = { ...state.filters[type], ...filters };
    },
    resetFilters: (state, action) => {
      const type = action.payload;
      state.filters[type] = {
        recherche: '',
        type: '',
        statut: ''
      };
    }
  }
});

export const {
  toggleSidebar,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setFilters,
  resetFilters
} = uiSlice.actions;

export default uiSlice.reducer;
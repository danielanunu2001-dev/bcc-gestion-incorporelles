// frontend/src/store/navigationSlice.js

import { createSlice } from '@reduxjs/toolkit';

// État initial
const initialState = {
  currentPath: '/dashboard',
  currentTab: {},
  scrollPosition: {},
  filters: {}
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentPath: (state, action) => {
      state.currentPath = action.payload;
    },
    setCurrentTab: (state, action) => {
      const { path, tab } = action.payload;
      state.currentTab[path] = tab;
    },
    setScrollPosition: (state, action) => {
      const { path, position } = action.payload;
      state.scrollPosition[path] = position;
    },
    setFilters: (state, action) => {
      const { path, filters } = action.payload;
      state.filters[path] = filters;
    },
    clearNavigation: (state) => {
      state.currentPath = '/dashboard';
      state.currentTab = {};
      state.scrollPosition = {};
      state.filters = {};
    }
  }
});

export const { 
  setCurrentPath, 
  setCurrentTab, 
  setScrollPosition, 
  setFilters, 
  clearNavigation 
} = navigationSlice.actions;

export default navigationSlice.reducer;
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/auth';

// Récupérer l'utilisateur stocké
const storedUser = authService.getStoredUser();

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message || 'Erreur de connexion');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const checkAuth = createAsyncThunk('auth/check', async () => {
  const user = await authService.getCurrentUser();
  return user;
});

const demoUser = {
  id: 1,
  email: 'demo@bcc.cd',
  name: 'Utilisateur Démo',
  full_name: 'Utilisateur Démo',
  role: 'admin',
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: demoUser,
    isAuthenticated: true,
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Check Auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        }
      });
  }
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
// frontend/src/store/usersSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// ==================== ACTIONS EXISTANTES ====================

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/users?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des utilisateurs');
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement de l\'utilisateur');
    }
  }
);

export const createUser = createAsyncThunk(
  'users/create',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors de la création');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors de la modification');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/users/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue('Erreur lors de la suppression');
    }
  }
);

// ==================== FONCTIONS POUR LE PROFIL ====================

export const fetchMyProfile = createAsyncThunk(
  'users/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement du profil');
    }
  }
);

export const updateMyProfile = createAsyncThunk(
  'users/updateMyProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    }
  }
);

export const changeMyPassword = createAsyncThunk(
  'users/changeMyPassword',
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/change-password', { oldPassword, newPassword });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
    }
  }
);

export const fetchMyActivity = createAsyncThunk(
  'users/fetchMyActivity',
  async (limit = 15, { rejectWithValue }) => {
    try {
      const response = await api.get('/audit/me/activity', { params: { limit } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement de l\'activité');
    }
  }
);

// ==================== ÉTAT INITIAL ====================

const initialState = {
  users: [],
  userCourant: null,
  profile: null,
  myActivities: [],
  loading: false,
  error: null,
  success: null,
  updating: false,
};

// ==================== SLICE ====================

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.success = null;
    },
    clearProfile: (state) => {
      state.profile = null;
    },
    clearMyActivities: (state) => {
      state.myActivities = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // ===== Fetch all users =====
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Fetch user by id =====
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.userCourant = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Create user =====
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users.push(action.payload);
        state.success = 'Utilisateur créé avec succès';
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Update user =====
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.userCourant = action.payload;
        state.success = 'Utilisateur modifié avec succès';
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Delete user =====
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(u => u.id !== action.payload);
        state.success = 'Utilisateur supprimé avec succès';
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Fetch My Profile =====
      .addCase(fetchMyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Update My Profile =====
      .addCase(updateMyProfile.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateMyProfile.fulfilled, (state, action) => {
        state.updating = false;
        state.profile = action.payload;
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.success = 'Profil mis à jour avec succès';
      })
      .addCase(updateMyProfile.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      
      // ===== Change My Password =====
      .addCase(changeMyPassword.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.success = null;
      })
      .addCase(changeMyPassword.fulfilled, (state, action) => {
        state.updating = false;
        state.success = action.payload?.message || 'Mot de passe modifié avec succès';
      })
      .addCase(changeMyPassword.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      
      // ===== Fetch My Activity =====
      .addCase(fetchMyActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.myActivities = action.payload?.activities || [];
      })
      .addCase(fetchMyActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// ==================== SÉLECTEURS MÉMOÏSÉS ====================

export const selectUsers = (state) => state.users?.users || [];
export const selectUsersLoading = (state) => state.users?.loading || false;
export const selectUsersError = (state) => state.users?.error || null;
export const selectUsersSuccess = (state) => state.users?.success || null;
export const selectUserCourant = (state) => state.users?.userCourant || null;
export const selectProfile = (state) => state.users?.profile || null;
export const selectMyActivities = (state) => state.users?.myActivities || [];
export const selectUsersUpdating = (state) => state.users?.updating || false;

// ==================== EXPORTS ====================

export const { clearMessages, clearProfile, clearMyActivities } = usersSlice.actions;
export default usersSlice.reducer;
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Récupérer les logs d'audit
export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchLogs',
  async ({ page = 1, limit = 20, ...filters } = {}, { rejectWithValue, getState }) => {
    try {
      // ✅ Vérifier les permissions avant l'appel API
      const state = getState();
      const userRole = state.auth?.user?.role || 'guest';
      const canViewAudit = ['admin', 'auditeur'].includes(userRole);
      
      if (!canViewAudit) {
        return rejectWithValue('Accès non autorisé - Réservé aux administrateurs et auditeurs');
      }
      
      const params = new URLSearchParams({
        page,
        limit,
        ...filters
      });
      const response = await api.get(`/audit-logs?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des logs');
    }
  }
);

// Récupérer les logs d'un enregistrement spécifique
export const fetchRecordLogs = createAsyncThunk(
  'audit/fetchRecordLogs',
  async ({ tableName, recordId }, { rejectWithValue, getState }) => {
    try {
      // ✅ Vérifier les permissions avant l'appel API
      const state = getState();
      const userRole = state.auth?.user?.role || 'guest';
      const canViewAudit = ['admin', 'auditeur'].includes(userRole);
      
      if (!canViewAudit) {
        return rejectWithValue('Accès non autorisé - Réservé aux administrateurs et auditeurs');
      }
      
      const response = await api.get(`/audit-logs/${tableName}/${recordId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des logs');
    }
  }
);

// Récupérer les statistiques d'audit
export const fetchAuditStats = createAsyncThunk(
  'audit/fetchStats',
  async (period = 'month', { rejectWithValue, getState }) => {
    try {
      // ✅ Vérifier les permissions avant l'appel API
      const state = getState();
      const userRole = state.auth?.user?.role || 'guest';
      const canViewAudit = ['admin', 'auditeur'].includes(userRole);
      
      if (!canViewAudit) {
        return rejectWithValue('Accès non autorisé - Réservé aux administrateurs et auditeurs');
      }
      
      const response = await api.get(`/audit-logs/stats?period=${period}`);
      return response.data;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des statistiques');
    }
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState: {
    logs: [],
    recordLogs: [],
    stats: null,
    total: 0,
    loading: false,
    error: null
  },
  reducers: {
    clearRecordLogs: (state) => {
      state.recordLogs = [];
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs || action.payload;
        state.total = action.payload.total || action.payload.length;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // ✅ Ne pas mettre de logs vides si erreur de permission
        if (action.payload === 'Accès non autorisé - Réservé aux administrateurs et auditeurs') {
          state.logs = [];
          state.total = 0;
        }
      })
      
      // Fetch record logs
      .addCase(fetchRecordLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecordLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.recordLogs = action.payload;
      })
      .addCase(fetchRecordLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // ✅ Ne pas mettre de logs vides si erreur de permission
        if (action.payload === 'Accès non autorisé - Réservé aux administrateurs et auditeurs') {
          state.recordLogs = [];
        }
      })
      
      // Fetch stats
      .addCase(fetchAuditStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAuditStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // ✅ Ne pas mettre de stats vides si erreur de permission
        if (action.payload === 'Accès non autorisé - Réservé aux administrateurs et auditeurs') {
          state.stats = null;
        }
      });
  }
});

// ==================== SÉLECTEURS MÉMOÏSÉS ====================
// Ces sélecteurs évitent les rendus inutiles en retournant les mêmes références

/**
 * Sélecteur pour récupérer tous les logs d'audit
 */
export const selectAuditLogs = (state) => state.audit?.logs || [];

/**
 * Sélecteur pour récupérer les logs d'un enregistrement spécifique
 */
export const selectRecordLogs = (state) => state.audit?.recordLogs || [];

/**
 * Sélecteur pour récupérer l'état de chargement
 */
export const selectAuditLoading = (state) => state.audit?.loading || false;

/**
 * Sélecteur pour récupérer l'erreur
 */
export const selectAuditError = (state) => state.audit?.error || null;

/**
 * Sélecteur pour récupérer les statistiques d'audit
 */
export const selectAuditStats = (state) => state.audit?.stats || null;

/**
 * Sélecteur pour récupérer le nombre total de logs
 */
export const selectAuditTotal = (state) => state.audit?.total || 0;

/**
 * Sélecteur mémoïsé pour les logs paginés (si nécessaire)
 */
export const selectPaginatedLogs = (state) => ({
  logs: state.audit?.logs || [],
  total: state.audit?.total || 0,
  loading: state.audit?.loading || false
});

export const { clearRecordLogs, clearError } = auditSlice.actions;
export default auditSlice.reducer;
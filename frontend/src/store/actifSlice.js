// frontend/src/store/actifSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import actifService from '../services/actif';
import api from '../services/api';

// ==================== ACTIONS ASYNCHRONES ====================

// ✅ Action pour récupérer les actifs
export const fetchActifs = createAsyncThunk(
  'actifs/fetchActifs',
  async (params = {}, { rejectWithValue }) => {
    try {
      console.log('📤 fetchActifs appelé avec params:', params);
      
      // Nettoyer les paramètres vides
      const cleanParams = {};
      if (params.search) cleanParams.search = params.search;
      if (params.type) cleanParams.type = params.type;
      if (params.typeImmobilisation) cleanParams.typeImmobilisation = params.typeImmobilisation;
      if (params.statut) cleanParams.statut = params.statut;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      
      console.log('📤 Envoi vers API:', cleanParams);
      
      const response = await api.get('/actifs', { params: cleanParams });
      return response.data;
    } catch (error) {
      console.error('❌ fetchActifs - Erreur:', error);
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors du chargement des actifs');
    }
  }
);

export const fetchActifById = createAsyncThunk(
  'actifs/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      // PROTECTION : Vérifie que l'ID est valide
      if (!id || id === 'dashboard' || id.length < 10) {
        console.warn('⚠️ ID invalide pour fetchActifById:', id);
        return rejectWithValue('ID invalide');
      }
      
      const response = await actifService.getById(id);
      return response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors du chargement de l\'actif');
    }
  }
);

export const createActif = createAsyncThunk(
  'actifs/create',
  async (actifData, { rejectWithValue }) => {
    try {
      const response = await actifService.create(actifData);
      return response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors de la création');
    }
  }
);

export const updateActif = createAsyncThunk(
  'actifs/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // PROTECTION : Vérifie que l'ID est valide
      if (!id || id === 'dashboard' || id.length < 10) {
        console.warn('⚠️ ID invalide pour updateActif:', id);
        return rejectWithValue('ID invalide');
      }
      
      const response = await actifService.update(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors de la modification');
    }
  }
);

export const deleteActif = createAsyncThunk(
  'actifs/deleteActif',
  async (id, { rejectWithValue }) => {
    console.log('📡 deleteActif - ID reçu:', id);
    console.log('📡 deleteActif - Type ID:', typeof id);
    
    try {
      const response = await api.delete(`/actifs/${id}`);
      console.log('✅ deleteActif - Réponse:', response.data);
      return id; // Retourne l'ID pour le supprimer du store
    } catch (error) {
      console.error('❌ deleteActif - Erreur:', error);
      console.error('❌ deleteActif - Response:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  }
);

export const fetchAmortissements = createAsyncThunk(
  'actifs/fetchAmortissements',
  async (actifId, { rejectWithValue }) => {
    try {
      // PROTECTION : Vérifie que l'ID est valide
      if (!actifId || actifId === 'dashboard' || actifId.length < 10) {
        console.warn('⚠️ ID invalide pour fetchAmortissements:', actifId);
        return rejectWithValue('ID invalide');
      }
      
      const response = await actifService.getAmortissements(actifId);
      return { actifId, amortissements: response };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors du chargement des amortissements');
    }
  }
);

// ==================== ÉTAT INITIAL ====================

const initialState = {
  actifs: [],
  actifCourant: null,
  amortissements: [],
  loading: false,
  error: null,
  success: null,
  filtres: {},
  statistiques: {
    totalActifs: 0,
    valeurNette: 0,
    actifsRecents: []
  }
};

// ==================== SLICE ====================

const actifSlice = createSlice({
  name: 'actifs',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.success = null;
    },
    updateFiltres: (state, action) => {
      state.filtres = action.payload;
    },
    resetActifCourant: (state) => {
      state.actifCourant = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ===== FETCH ALL ACTIFS =====
      .addCase(fetchActifs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActifs.fulfilled, (state, action) => {
        state.loading = false;
        
        // Extraction sécurisée des données
        const payload = action.payload;
        let list = [];
        
        if (Array.isArray(payload)) {
          list = payload;
        } else if (payload?.data && Array.isArray(payload.data)) {
          list = payload.data;
        } else if (payload?.actifs && Array.isArray(payload.actifs)) {
          list = payload.actifs;
        } else if (payload?.rows && Array.isArray(payload.rows)) {
          list = payload.rows;
        }

        state.actifs = list;
        
        // Calcul des statistiques
        const totalValeurNette = list.reduce((sum, a) => sum + Number(a?.valeur_nette || 0), 0);
        const actifsRecents = [...list]
          .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
          .slice(0, 5);

        state.statistiques = {
          totalActifs: list.length,
          valeurNette: totalValeurNette,
          actifsRecents
        };
      })
      .addCase(fetchActifs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Erreur lors du chargement';
      })
      
      // ===== FETCH ACTIF BY ID =====
      .addCase(fetchActifById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActifById.fulfilled, (state, action) => {
        state.loading = false;
        state.actifCourant = action.payload;
      })
      .addCase(fetchActifById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== CREATE ACTIF =====
      .addCase(createActif.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createActif.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.actifs = [action.payload, ...state.actifs];
          state.actifCourant = action.payload;
          
          const totalValeurNette = state.actifs.reduce((sum, a) => sum + Number(a?.valeur_nette || 0), 0);
          state.statistiques = {
            ...state.statistiques,
            totalActifs: state.actifs.length,
            valeurNette: totalValeurNette
          };
        }
        state.success = 'Actif créé avec succès';
      })
      .addCase(createActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== UPDATE ACTIF =====
      .addCase(updateActif.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateActif.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.actifs.findIndex(a => a?.id === action.payload.id);
          if (index !== -1) {
            state.actifs[index] = action.payload;
          }
          state.actifCourant = action.payload;
          
          const totalValeurNette = state.actifs.reduce((sum, a) => sum + Number(a?.valeur_nette || 0), 0);
          state.statistiques = {
            ...state.statistiques,
            valeurNette: totalValeurNette
          };
        }
        state.success = 'Actif modifié avec succès';
      })
      .addCase(updateActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== DELETE ACTIF =====
      .addCase(deleteActif.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(deleteActif.fulfilled, (state, action) => {
        state.loading = false;
        // action.payload est l'ID de l'actif supprimé
        state.actifs = state.actifs.filter(a => a?.id !== action.payload);
        
        if (state.actifCourant?.id === action.payload) {
          state.actifCourant = null;
        }
        
        const totalValeurNette = state.actifs.reduce((sum, a) => sum + Number(a?.valeur_nette || 0), 0);
        state.statistiques = {
          totalActifs: state.actifs.length,
          valeurNette: totalValeurNette,
          actifsRecents: [...state.actifs]
            .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
            .slice(0, 5)
        };
        
        state.success = 'Actif supprimé avec succès';
      })
      .addCase(deleteActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== FETCH AMORTISSEMENTS =====
      .addCase(fetchAmortissements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAmortissements.fulfilled, (state, action) => {
        state.loading = false;
        state.amortissements = action.payload.amortissements || [];
      })
      .addCase(fetchAmortissements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// ==================== SÉLECTEURS MÉMOÏSÉS ====================
// Ces sélecteurs évitent les rendus inutiles en retournant les mêmes références

/**
 * Sélecteur de base pour récupérer la liste des actifs
 */
export const selectActifs = (state) => state.actifs?.actifs || [];

/**
 * Sélecteur pour récupérer l'état de chargement
 */
export const selectActifsLoading = (state) => state.actifs?.loading || false;

/**
 * Sélecteur pour récupérer l'erreur
 */
export const selectActifsError = (state) => state.actifs?.error || null;

/**
 * Sélecteur pour récupérer le succès
 */
export const selectActifsSuccess = (state) => state.actifs?.success || null;

/**
 * Sélecteur pour récupérer l'actif courant
 */
export const selectActifCourant = (state) => state.actifs?.actifCourant || null;

/**
 * Sélecteur pour récupérer les amortissements
 */
export const selectAmortissements = (state) => state.actifs?.amortissements || [];

/**
 * Sélecteur pour récupérer les filtres
 */
export const selectActifsFiltres = (state) => state.actifs?.filtres || {};

/**
 * Sélecteur pour récupérer les statistiques (déjà mémoïsé car l'objet est recréé uniquement quand les données changent)
 */
export const selectActifsStatistiques = (state) => state.actifs?.statistiques || {
  totalActifs: 0,
  valeurNette: 0,
  actifsRecents: []
};

/**
 * Sélecteur mémoïsé pour le nombre total d'actifs
 */
export const selectTotalActifs = (state) => state.actifs?.statistiques?.totalActifs || 0;

/**
 * Sélecteur mémoïsé pour la valeur nette totale
 */
export const selectValeurNetteTotale = (state) => state.actifs?.statistiques?.valeurNette || 0;

/**
 * Sélecteur mémoïsé pour les actifs récents
 */
export const selectActifsRecents = (state) => state.actifs?.statistiques?.actifsRecents || [];

/**
 * Sélecteur mémoïsé pour filtrer les actifs par type
 * Utilise une fonction curry pour accepter le type en paramètre
 */
export const selectActifsByType = (type) => (state) => {
  const actifs = selectActifs(state);
  if (!type || type === 'tous') return actifs;
  return actifs.filter(actif => actif.type === type);
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par type d'immobilisation
 */
export const selectActifsByTypeImmobilisation = (typeImmobilisation) => (state) => {
  const actifs = selectActifs(state);
  if (!typeImmobilisation || typeImmobilisation === 'tous') return actifs;
  return actifs.filter(actif => actif.type_immobilisation === typeImmobilisation);
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par recherche textuelle
 */
export const selectActifsBySearch = (searchTerm) => (state) => {
  const actifs = selectActifs(state);
  if (!searchTerm) return actifs;
  const term = searchTerm.toLowerCase();
  return actifs.filter(actif => 
    actif.nom?.toLowerCase().includes(term) ||
    actif.code?.toLowerCase().includes(term) ||
    actif.numero_inventaire?.toLowerCase().includes(term)
  );
};

// ==================== EXPORTS ====================

export const { clearMessages, updateFiltres, resetActifCourant } = actifSlice.actions;
export default actifSlice.reducer;